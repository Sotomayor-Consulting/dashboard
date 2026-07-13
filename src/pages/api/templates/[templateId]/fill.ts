import type { APIRoute } from 'astro';
import { createSupabaseServerClient } from '@infrastructure/supabase';
import { SECURITY_HEADERS } from '@infrastructure/security/headers';
import { createLogger } from '@infrastructure/logging';
import { extractTokenRoleNames, hasAnyRole, ROLES } from '@shared/roles';
import { getTemplateById, getTemplateFileContent, getTemplateFileUrl } from '@domains/templates/templates';
import { fillPdfAcroForm } from '@domains/templates/fill-pdf';
import { fillWordCarbone } from '@domains/templates/fill-word';
import { resolveFieldData, fetchEntityRow } from '@domains/templates/schema-registry';
import { getTransformer } from '@domains/templates/transformers';
import type { FieldMapping } from '@domains/templates/types';
import type { ResolveContextIds } from '@domains/templates/schema-registry';
import type { EntityType } from '@domains/templates/entity-registry';

const log = createLogger('templates.fill');

const json = (status: number, payload: unknown) =>
	new Response(JSON.stringify(payload), {
		status,
		headers: SECURITY_HEADERS,
	});

export const prerender = false;

export const POST: APIRoute = async ({ params, request, cookies }) => {
	const { templateId } = params;
	if (!templateId) return json(400, { error: 'MISSING_ID' });

	const supabase = createSupabaseServerClient({ headers: request.headers, cookies });

	const { data: claims } = await supabase.auth.getClaims();
	if (!claims?.claims) return json(401, { error: 'NO_AUTH' });

	const roles = extractTokenRoleNames(claims.claims);
	if (!hasAnyRole(roles, [ROLES.ADMIN, ROLES.OPERACIONES])) return json(403, { error: 'FORBIDDEN' });

	let body: Record<string, unknown>;
	try {
		body = await request.json();
	} catch {
		return json(400, { error: 'INVALID_JSON' });
	}

	const template = await getTemplateById(supabase, templateId);
	if (!template) return json(404, { error: 'TEMPLATE_NOT_FOUND' });

	let mergedValues: Record<string, string | boolean | string[]> = {};

	const relatedToType = body.relatedToType as EntityType | undefined;
	const relatedToId = body.relatedToId as string | undefined;
	const contextIds = (body.contextIds as ResolveContextIds | undefined) ?? undefined;

	// Step 1: resolve field_mapping — supports multiple source entity types
	if (template.field_mapping && Object.keys(template.field_mapping).length > 0) {
		const sources = new Map<string, FieldMapping>(
			Object.entries(template.field_mapping).reduce((groups, [field, mapping]) => {
				if (mapping.source === 'static') {
					mergedValues[field] = mapping.static_value ?? '';
					return groups;
				}
				if (!mapping.source) return groups;
				const group = groups.find(([k]) => k === mapping.source);
				if (group) {
					group[1][field] = mapping;
				} else {
					groups.push([mapping.source, { [field]: mapping }]);
				}
				return groups;
			}, [] as [string, FieldMapping][]),
		);

		for (const [sourceType, sourceMapping] of sources) {
			let entityId: string | undefined;
			if (sourceType === 'planning_design_report' && relatedToType === 'incorporation_case') {
				entityId = relatedToId; // planning_design_reports.incorporation_id = empresa_incorporacion_id
			} else if (sourceType === relatedToType) {
				entityId = relatedToId;
			}
			if (!entityId) continue;

			try {
				const resolved = await resolveFieldData(
					sourceType,
					entityId,
					sourceMapping,
					contextIds,
				);
				Object.assign(mergedValues, resolved);
			} catch (err) {
				const detail = err instanceof Error ? err.message : 'unknown error';
				return json(400, { error: `FIELD_RESOLUTION_FAILED (${sourceType})`, detail });
			}
		}
	}

	// Step 2: run transformer if template has one (overrides field_mapping)
	if (template.transformer_id) {
		const transformer = getTransformer(template.transformer_id);
		if (!transformer) {
			return json(400, { error: `TRANSFORMER_NOT_FOUND: ${template.transformer_id}` });
		}
		if (transformer.entityType !== relatedToType) {
			return json(400, {
				error: 'TRANSFORMER_TYPE_MISMATCH',
				detail: `Transformer "${template.transformer_id}" expects "${transformer.entityType}" but got "${relatedToType}"`,
			});
		}
		if (relatedToType && relatedToId) {
			try {
				const row = await fetchEntityRow(transformer.entityType, relatedToId);
				const transformed = await transformer.evaluate(row);
				Object.assign(mergedValues, transformed);
			} catch (err) {
				const detail = err instanceof Error ? err.message : 'unknown error';
				return json(400, { error: 'TRANSFORMER_FAILED', detail });
			}
		}
	}

	// Step 3: user-supplied values override everything
	const userValues = body.fieldValues as Record<string, string | boolean | string[]> | undefined;
	if (userValues) {
		Object.assign(mergedValues, userValues);
	}

	if (template.template_type === 'word') {
		let templateUrl: string;
		try {
			templateUrl = await getTemplateFileUrl(template);
		} catch (err) {
			const detail = err instanceof Error ? err.message : 'unknown error';
			return json(500, { error: 'FILE_URL_FAILED', detail });
		}

		const fileName = `${template.name}.pdf`.replace(/"/g, '');

		try {
			const { pdf, warnings } = await fillWordCarbone(
				templateUrl,
				mergedValues as Record<string, unknown>,
				{ filename: fileName },
			);
			const pdfBlob = new Blob([pdf as BlobPart], { type: 'application/pdf' });

			return new Response(pdfBlob, {
				status: 200,
				headers: {
					'Content-Type': 'application/pdf',
					'Content-Disposition': `attachment; filename="${fileName}"`,
					'Content-Length': String(pdfBlob.size),
					'X-Content-Type-Options': SECURITY_HEADERS['X-Content-Type-Options'] ?? 'nosniff',
					'X-Template-Warnings': warnings.length > 0 ? encodeURIComponent(JSON.stringify(warnings)) : '',
				},
			});
		} catch (err) {
			const detail = err instanceof Error ? err.message : 'unknown error';
			log.error('WORD_FILL_FAILED', { detail });
			return json(500, { error: 'WORD_FILL_FAILED', detail });
		}
	}

	let fileContent: Awaited<ReturnType<typeof getTemplateFileContent>>;
	try {
		fileContent = await getTemplateFileContent(template);
	} catch (err) {
		const detail = err instanceof Error ? err.message : 'unknown error';
		return json(500, { error: 'FILE_RETRIEVAL_FAILED', detail });
	}

	const now = new Date();
	const dateStr = now.toLocaleDateString('en-US', {
		month: '2-digit',
		day: '2-digit',
		year: 'numeric',
	});

	try {
		const { pdf, warnings } = await fillPdfAcroForm(fileContent.content, mergedValues, {
			syntheticFields: [
				{ name: '_fecha_generacion', value: dateStr, x: 350, y: 36, width: 82, fontSize: 7 },
			],
		});
		const pdfBlob = new Blob([pdf as BlobPart], { type: 'application/pdf' });
		const fileName = fileContent.fileName.replace(/\.docx?$/i, '.pdf');
		const safeName = fileName.replace(/"/g, '');

		return new Response(pdfBlob, {
			status: 200,
			headers: {
				'Content-Type': 'application/pdf',
				'Content-Disposition': `attachment; filename="${safeName}"`,
				'Content-Length': String(pdfBlob.size),
				'X-Content-Type-Options': SECURITY_HEADERS['X-Content-Type-Options'] ?? 'nosniff',
				'X-Template-Warnings': warnings.length > 0 ? encodeURIComponent(JSON.stringify(warnings)) : '',
			},
		});
	} catch (err) {
		const detail = err instanceof Error ? err.message : 'unknown error';
		log.error('PDF_FILL_FAILED', { detail });
		return json(500, { error: 'PDF_FILL_FAILED', detail });
	}
};

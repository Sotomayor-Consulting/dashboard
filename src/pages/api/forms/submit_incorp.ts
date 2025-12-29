// src/pages/api/forms/submit.ts
export const prerender = false;

import type { APIRoute } from 'astro';
import { supabase } from '../../../lib/supabase';
import { createHash } from 'node:crypto';

type SaveBody = {
	form_id: string; // UUID de formularios.form_id (obligatorio)
	data: Record<string, any>; // respuestas SurveyJS (obligatorio)
	progress_percent?: number; // 0..100 (opcional)
	finalize?: boolean; // true => cambia a "submitted" (opcional)

	// (opcional) fallback si no viene en link/referer
	empresa_incorporacion_id?: string;
};

const UUID_RE =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function sha256(obj: any) {
	const json = typeof obj === 'string' ? obj : JSON.stringify(obj);
	return createHash('sha256').update(json).digest('hex');
}

// Intenta extraer ?empresa=... desde una URL (string)
function extractEmpresaIdFromUrl(
	urlStr: string | null | undefined,
): string | null {
	if (!urlStr) return null;
	try {
		const u = new URL(urlStr, 'http://localhost'); // base por si viene relativa
		const empresa = u.searchParams.get('empresa')?.trim();
		if (empresa && UUID_RE.test(empresa)) return empresa;
		return null;
	} catch {
		return null;
	}
}

export const POST: APIRoute = async ({ request, cookies }) => {
	const j = (code: number, payload: any) =>
		new Response(JSON.stringify(payload), {
			status: code,
			headers: { 'Content-Type': 'application/json' },
		});

	try {
		// 1) Sesión (usuario autenticado; sin admin)
		const at = cookies.get('sb-access-token');
		const rt = cookies.get('sb-refresh-token');
		if (!at || !rt) return j(401, { ok: false, error: 'NO_AUTH_COOKIES' });
		await supabase.auth.setSession({
			access_token: at.value,
			refresh_token: rt.value,
		});

		// 2) Usuario actual
		const { data: userRes, error: userErr } = await supabase.auth.getUser();
		if (userErr)
			return j(401, {
				ok: false,
				error: 'GET_USER_ERROR',
				detail: userErr.message,
			});
		const actor = userRes?.user;
		if (!actor) return j(401, { ok: false, error: 'NO_AUTH_USER' });

		// 3) Body
		const body = (await request.json().catch(() => ({}))) as SaveBody;
		const { form_id, data, progress_percent, finalize } = body || {};
		if (!form_id) return j(400, { ok: false, error: 'MISSING_form_id' });
		if (!data || typeof data !== 'object' || Array.isArray(data)) {
			return j(400, { ok: false, error: 'MISSING_or_INVALID_data' });
		}

		// 3.1) Tomar empresa_incorporacion_id desde link (endpoint query, referer o body)
		const empresaFromEndpointQuery = extractEmpresaIdFromUrl(request.url);
		const empresaFromReferer = extractEmpresaIdFromUrl(
			request.headers.get('referer'),
		);
		const empresaFromBody =
			body?.empresa_incorporacion_id &&
			UUID_RE.test(body.empresa_incorporacion_id)
				? body.empresa_incorporacion_id
				: null;

		const empresa_incorporacion_id =
			empresaFromEndpointQuery || empresaFromReferer || empresaFromBody;

		if (!empresa_incorporacion_id) {
			return j(400, {
				ok: false,
				error: 'MISSING_empresa_incorporacion_id',
				detail:
					'No se encontró ?empresa=... en la URL del endpoint ni en el referer, ni vino en el body.',
			});
		}

		const nowIso = new Date().toISOString();

		// 3.2) Validación de seguridad: la empresa debe pertenecer al usuario y estar activa
		const { data: empresaRow, error: empErr } = await supabase
			.from('empresas_incorporaciones')
			.select('empresa_incorporacion_id, user_id, estado')
			.eq('empresa_incorporacion_id', empresa_incorporacion_id)
			.eq('user_id', actor.id)
			.maybeSingle();

		if (empErr)
			return j(500, {
				ok: false,
				error: 'EMPRESA_LOOKUP_ERROR',
				detail: empErr.message,
			});
		if (!empresaRow) return j(403, { ok: false, error: 'EMPRESA_NOT_OWNED' });

		const estado = (empresaRow.estado ?? '').toString().trim().toLowerCase();
		if (estado !== 'activo') {
			return j(403, {
				ok: false,
				error: 'EMPRESA_NOT_ACTIVE',
				detail: `estado=${empresaRow.estado}`,
			});
		}

		// 4) Buscar envío existente del usuario para ese form + esa empresa (borrador o ya enviado)
		const { data: existingRow, error: findErr } = await supabase
			.from('formularios_envios')
			.select('*')
			.eq('form_id', form_id)
			.eq('user_id', actor.id)
			.eq('empresa_incorporacion_id', empresa_incorporacion_id)
			.in('status', ['in_progress', 'submitted'])
			.order('created_at', { ascending: false })
			.limit(1)
			.maybeSingle();

		if (findErr)
			return j(500, {
				ok: false,
				error: 'FIND_ERROR',
				detail: findErr.message,
			});

		// 5) Asegurar snapshot del schema (si no existe aún, leerlo de formularios.schema_json)
		let schema_snapshot: any | null = existingRow?.schema_snapshot ?? null;
		let schema_hash: string | null = existingRow?.schema_hash ?? null;

		if (!schema_snapshot) {
			const { data: formRow, error: formErr } = await supabase
				.from('formularios')
				.select('schema_json')
				.eq('form_id', form_id)
				.single();
			if (formErr || !formRow)
				return j(404, {
					ok: false,
					error: 'FORM_NOT_FOUND',
					detail: formErr?.message,
				});
			schema_snapshot = formRow.schema_json;
			schema_hash = sha256(schema_snapshot);
		}

		const desiredStatus = finalize ? 'submitted' : 'in_progress';

		// 6) Si ya existe fila:
		if (existingRow) {
			// Si ya estaba submitted y ahora quieres borrador, crea nueva fila (no pisar envío final)
			if (existingRow.status === 'submitted' && !finalize) {
				const insertPayload: Record<string, any> = {
					submission_id: undefined, // dejar que Postgres genere
					form_id,
					user_id: actor.id,
					empresa_incorporacion_id,
					status: 'in_progress',
					data_json: data,
					schema_snapshot,
					schema_hash,
					progress_percent:
						typeof progress_percent === 'number' ? progress_percent : null,
					created_at: nowIso,
					updated_at: nowIso,
					submitted_at: null,
				};

				const { data: ins, error: insErr } = await supabase
					.from('formularios_envios')
					.insert(insertPayload)
					.select('submission_id')
					.single();
				if (insErr)
					return j(500, {
						ok: false,
						error: 'INSERT_ERROR',
						detail: insErr.message,
					});

				return j(200, {
					ok: true,
					id: ins?.submission_id,
					status: 'in_progress',
				});
			}

			// Actualizar la fila existente (borrador o submit final)
			const updatePayload: Record<string, any> = {
				data_json: data,
				progress_percent:
					typeof progress_percent === 'number'
						? progress_percent
						: (existingRow.progress_percent ?? null),
				updated_at: nowIso,
				// Mantener la empresa asociada (por si tu fila vieja no la tenía)
				empresa_incorporacion_id,
				// Asegurar snapshot si no tenía
				...(existingRow.schema_snapshot
					? {}
					: { schema_snapshot, schema_hash }),
			};

			if (finalize) {
				updatePayload.status = 'submitted';
				updatePayload.submitted_at = nowIso;
			} else {
				updatePayload.status = 'in_progress';
				updatePayload.submitted_at = null;
			}

			const { error: updErr } = await supabase
				.from('formularios_envios')
				.update(updatePayload)
				.eq('submission_id', existingRow.submission_id)
				.eq('user_id', actor.id)
				.eq('empresa_incorporacion_id', empresa_incorporacion_id);

			if (updErr)
				return j(500, {
					ok: false,
					error: 'UPDATE_ERROR',
					detail: updErr.message,
				});

			return j(200, {
				ok: true,
				id: existingRow.submission_id,
				status: updatePayload.status,
			});
		}

		// 7) No existía: INSERT nuevo
		const insertPayload: Record<string, any> = {
			submission_id: undefined, // default uuid
			form_id,
			user_id: actor.id,
			empresa_incorporacion_id,
			status: desiredStatus,
			data_json: data,
			schema_snapshot,
			schema_hash,
			progress_percent:
				typeof progress_percent === 'number' ? progress_percent : null,
			created_at: nowIso,
			updated_at: nowIso,
			submitted_at: finalize ? nowIso : null,
		};

		const { data: inserted, error: insErr } = await supabase
			.from('formularios_envios')
			.insert(insertPayload)
			.select('submission_id')
			.single();
		if (insErr)
			return j(500, {
				ok: false,
				error: 'INSERT_ERROR',
				detail: insErr.message,
			});

		return j(200, {
			ok: true,
			id: inserted?.submission_id,
			status: desiredStatus,
		});
	} catch (e: any) {
		return j(500, {
			ok: false,
			error: 'UNEXPECTED',
			detail: e?.message ?? String(e),
		});
	}
};

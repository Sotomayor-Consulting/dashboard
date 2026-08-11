import crypto from 'node:crypto';
import { supabaseAdmin } from '@infrastructure/supabase/admin';
import { BUCKETS, storage } from '@infrastructure/storage';
import {
	safeFilename,
	insertDocumentWithLink,
} from '@domains/documents/helpers';
import type { SupabaseClient } from '@supabase/supabase-js';

import type {
	TemplateRow,
	TemplateWithDocument,
	TemplateDocumentInfo,
	CreateTemplateInput,
	UpdateTemplateInput,
	ListTemplatesOptions,
	TemplateFileContent,
} from './types';

const db = supabaseAdmin.schema('documents');

// Stable catalog slug for the "Other" document type (see migration
// document_types_drop_code_add_slug). Used as a placeholder for template
// source files since they don't fit the main document_types catalog.
const OTHER_DOCUMENT_TYPE_SLUG = 'other_generic';
let cachedOtherDocumentTypeId: number | null = null;

async function getOtherDocumentTypeId(): Promise<number> {
	if (cachedOtherDocumentTypeId != null) return cachedOtherDocumentTypeId;
	const { data, error } = await db
		.from('document_types')
		.select('id')
		.eq('slug', OTHER_DOCUMENT_TYPE_SLUG)
		.maybeSingle();
	if (error || !data) {
		throw new Error(
			`Missing document_types row with slug=${OTHER_DOCUMENT_TYPE_SLUG}. Run migration document_types_drop_code_add_slug.`,
		);
	}
	cachedOtherDocumentTypeId = Number((data as { id: number }).id);
	return cachedOtherDocumentTypeId;
}

function now(): string {
	return new Date().toISOString();
}

function toTemplateWithDocument(
	template: Record<string, unknown>,
	link: Record<string, unknown> | null,
): TemplateWithDocument {
	let document: TemplateDocumentInfo | null = null;

	if (link) {
		const docs = link.documents as Record<string, unknown> | null;
		if (docs) {
			document = {
				id: String(docs.id),
				file_name: String(docs.file_name),
				bucket_storage: String(docs.bucket_storage),
				bucket_path: String(docs.bucket_path),
				file_size_bytes: Number(docs.file_size_bytes),
				mime_type: docs.mime_type != null ? String(docs.mime_type) : null,
			};
		}
	}

	return {
		id: String(template.id),
		name: String(template.name),
		description:
			template.description != null ? String(template.description) : null,
		category: template.category != null ? String(template.category) : null,
		template_type: String(
			template.template_type,
		) as TemplateWithDocument['template_type'],
		related_to_type:
			(template.related_to_type as TemplateWithDocument['related_to_type']) ??
			null,
		field_mapping: (template.field_mapping ??
			{}) as TemplateWithDocument['field_mapping'],
		transformer_id:
			template.transformer_id != null ? String(template.transformer_id) : null,
		source_url:
			template.source_url != null ? String(template.source_url) : null,
		field_definitions: (template.field_definitions ??
			[]) as TemplateWithDocument['field_definitions'],
		is_active: Boolean(template.is_active),
		version: Number(template.version),
		created_by: String(template.created_by),
		updated_by:
			template.updated_by != null ? String(template.updated_by) : null,
		created_at: String(template.created_at),
		updated_at: String(template.updated_at),
		deleted_at:
			template.deleted_at != null ? String(template.deleted_at) : null,
		deleted_by:
			template.deleted_by != null ? String(template.deleted_by) : null,
		document,
	};
}

async function getDocumentLink(
	templateId: string,
): Promise<Record<string, unknown> | null> {
	const { data } = await db
		.from('document_links')
		.select(
			`
			document_id,
			documents:document_id(
				id,
				file_name,
				bucket_storage,
				bucket_path,
				file_size_bytes,
				mime_type
			)
		`,
		)
		.eq('related_to_type', 'template')
		.eq('related_to_id', templateId)
		.eq('relation_purpose', 'owner')
		.maybeSingle();

	return data as Record<string, unknown> | null;
}

async function getDocumentLinksForTemplates(
	templateIds: string[],
): Promise<Map<string, Record<string, unknown>>> {
	if (templateIds.length === 0) return new Map();

	const { data } = await db
		.from('document_links')
		.select(
			`
			related_to_id,
			document_id,
			documents:document_id(
				id,
				file_name,
				bucket_storage,
				bucket_path,
				file_size_bytes,
				mime_type
			)
		`,
		)
		.eq('related_to_type', 'template')
		.eq('relation_purpose', 'owner')
		.in('related_to_id', templateIds);

	const map = new Map<string, Record<string, unknown>>();
	for (const link of (data ?? []) as Record<string, unknown>[]) {
		map.set(String(link.related_to_id), link);
	}
	return map;
}

export async function listTemplates(
	supabase: SupabaseClient,
	options?: ListTemplatesOptions,
): Promise<TemplateWithDocument[]> {
	let query = supabase
		.schema('documents')
		.from('document_templates')
		.select('*');

	if (!options?.includeDeleted) {
		query = query.is('deleted_at', null);
	}
	if (!options?.includeInactive && !options?.includeDeleted) {
		query = query.eq('is_active', true);
	}
	if (options?.category) {
		query = query.eq('category', options.category);
	}
	if (options?.type) {
		query = query.eq('template_type', options.type);
	}
	if (options?.relatedToType) {
		query = query.eq('related_to_type', options.relatedToType);
	}

	query = query.order('created_at', { ascending: false });

	const { data, error } = await query;
	if (error) throw error;

	const templates = (data ?? []) as Record<string, unknown>[];
	const ids = templates.map((t) => String(t.id));
	const linksByTemplateId = await getDocumentLinksForTemplates(ids);

	return templates.map((t) =>
		toTemplateWithDocument(t, linksByTemplateId.get(String(t.id)) ?? null),
	);
}

export async function getTemplateById(
	supabase: SupabaseClient,
	templateId: string,
): Promise<TemplateWithDocument | null> {
	const { data, error } = await supabase
		.schema('documents')
		.from('document_templates')
		.select('*')
		.eq('id', templateId)
		.maybeSingle();

	if (error || !data) return null;

	const link = await getDocumentLink(templateId);
	return toTemplateWithDocument(data as Record<string, unknown>, link);
}

export async function createTemplate(
	supabase: SupabaseClient,
	input: CreateTemplateInput,
	userId: string,
): Promise<TemplateRow> {
	const timestamp = now();

	const { data, error } = await supabase
		.schema('documents')
		.from('document_templates')
		.insert({
			name: input.name,
			description: input.description ?? null,
			category: input.category ?? null,
			template_type: input.template_type,
			related_to_type: input.related_to_type ?? null,
			field_mapping: input.field_mapping ?? {},
			transformer_id: input.transformer_id ?? null,
			source_url: input.source_url ?? null,
			field_definitions: input.field_definitions ?? [],
			is_active: true,
			version: 1,
			created_by: userId,
			created_at: timestamp,
			updated_at: timestamp,
		})
		.select()
		.single();

	if (error) throw error;
	return data as unknown as TemplateRow;
}

export async function updateTemplate(
	supabase: SupabaseClient,
	templateId: string,
	input: UpdateTemplateInput,
	userId: string,
): Promise<TemplateRow> {
	const timestamp = now();

	const { data, error } = await supabase
		.schema('documents')
		.from('document_templates')
		.update({
			...input,
			updated_by: userId,
			updated_at: timestamp,
		})
		.eq('id', templateId)
		.select()
		.single();

	if (error) throw error;
	return data as unknown as TemplateRow;
}

export async function softDeleteTemplate(
	supabase: SupabaseClient,
	templateId: string,
	userId: string,
): Promise<void> {
	const timestamp = now();

	const { error } = await supabase
		.schema('documents')
		.from('document_templates')
		.update({
			is_active: false,
			deleted_at: timestamp,
			deleted_by: userId,
			updated_at: timestamp,
		})
		.eq('id', templateId);

	if (error) throw error;
}

export async function restoreTemplate(
	supabase: SupabaseClient,
	templateId: string,
	userId: string,
): Promise<TemplateRow> {
	const timestamp = now();

	const { data, error } = await supabase
		.schema('documents')
		.from('document_templates')
		.update({
			is_active: true,
			deleted_at: null,
			deleted_by: null,
			updated_by: userId,
			updated_at: timestamp,
		})
		.eq('id', templateId)
		.select()
		.single();

	if (error) throw error;
	return data as unknown as TemplateRow;
}

export async function hardDeleteTemplate(
	templateId: string,
	userId: string,
): Promise<void> {
	await deleteTemplateFile(templateId, userId);

	const { error } = await supabaseAdmin
		.schema('documents')
		.from('document_templates')
		.delete()
		.eq('id', templateId);

	if (error) throw error;
}

export async function uploadTemplateFile(
	templateId: string,
	file: File | Blob,
	userId: string,
	fileName?: string,
): Promise<{ documentId: string }> {
	const resolvedName = fileName || 'template';
	const filePath = `templates/${safeFilename(`${templateId}-${resolvedName}`)}`;
	const bucket = BUCKETS.templates;

	const arrayBuf = await file.arrayBuffer();

	// ── Subir/sobrescribir archivo en storage ──
	await storage.upload(bucket, filePath, arrayBuf, {
		upsert: true,
		contentType: file.type || 'application/octet-stream',
	});

	const timestamp = now();

	// ── Reutilizar documento existente o crear nuevo ──
	const oldLink = await getDocumentLink(templateId);
	const documentTypeId = await getOtherDocumentTypeId();

	let documentId: string;
	if (oldLink) {
		documentId = String(oldLink.document_id);
		const { error: updateError } = await db
			.from('documents')
			.update({
				file_name: resolvedName,
				bucket_storage: bucket,
				bucket_path: filePath,
				file_size_bytes: file.size,
				mime_type: file.type || null,
				updated_by: userId,
				updated_at: timestamp,
			})
			.eq('id', documentId);
		if (updateError) throw updateError;
	} else {
		documentId = crypto.randomUUID();
		await insertDocumentWithLink(
			db,
			bucket,
			filePath,
			{
				id: documentId,
				document_type_id: documentTypeId,
				file_name: resolvedName,
				bucket_storage: bucket,
				bucket_path: filePath,
				file_size_bytes: file.size,
				mime_type: file.type || null,
				status: 'uploaded',
				version: 1,
				uploaded_by: userId,
				uploaded_at: timestamp,
				created_by: userId,
				created_at: timestamp,
				updated_by: userId,
				updated_at: timestamp,
			},
			{
				document_id: documentId,
				related_to_type: 'template',
				related_to_id: templateId,
				relation_purpose: 'owner',
				created_by: userId,
				created_at: timestamp,
			},
		);
	}

	return { documentId };
}

export async function deleteTemplateFile(
	templateId: string,
	userId: string,
): Promise<void> {
	const link = await getDocumentLink(templateId);
	if (!link) return;

	const documentId = String(link.document_id);

	const { data: doc } = await db
		.from('documents')
		.select('bucket_storage, bucket_path')
		.eq('id', documentId)
		.maybeSingle();

	if (doc) {
		await storage.remove(String(doc.bucket_storage), [String(doc.bucket_path)]);
	}

	const timestamp = now();

	await db
		.from('documents')
		.update({ deleted_at: timestamp, deleted_by: userId })
		.eq('id', documentId);

	await db
		.from('document_links')
		.delete()
		.eq('document_id', documentId)
		.eq('related_to_type', 'template')
		.eq('related_to_id', templateId);
}

export async function getTemplateFileUrl(
	template: TemplateWithDocument,
): Promise<string> {
	if (template.source_url) return template.source_url;

	if (!template.document) {
		throw new Error('Template has no associated file or source URL');
	}

	return storage.createSignedUrl(
		template.document.bucket_storage,
		template.document.bucket_path,
	);
}

export async function getTemplateFileContent(
	template: TemplateWithDocument,
): Promise<TemplateFileContent> {
	if (template.source_url) {
		const response = await fetch(template.source_url);
		if (!response.ok) {
			throw new Error(`Failed to fetch template from URL: ${response.status}`);
		}
		const content = await response.arrayBuffer();
		return {
			content,
			fileName: template.document?.file_name || `${template.name}.pdf`,
			mimeType: template.document?.mime_type || 'application/pdf',
		};
	}

	if (!template.document) {
		throw new Error('Template has no associated file or source URL');
	}

	// Descarga directa: antes se firmaba una URL y se hacía fetch contra ella,
	// un round-trip de más para un archivo que el servidor ya puede leer.
	const { body } = await storage.download(
		template.document.bucket_storage,
		template.document.bucket_path,
	);

	return {
		content: body,
		fileName: template.document.file_name,
		mimeType: template.document.mime_type || 'application/octet-stream',
	};
}

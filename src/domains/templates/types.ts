import type { EntityType } from './schema-registry';

export type TemplateType = 'word' | 'pdf';

export interface TemplateFieldDefinition {
	name: string;
	type: string;
	label: string;
	required: boolean;
	default_value: string | null;
	widget: string;
	options: string[] | null;
}

export interface FieldMapping {
	[pdfFieldName: string]: {
		source: EntityType | 'static';
		path: string;
		transform?: 'uppercase' | 'lowercase' | 'concat' | 'date' | null;
		static_value?: string | null;
	};
}

export interface TemplateRow {
	id: string;
	name: string;
	description: string | null;
	category: string | null;
	template_type: TemplateType;
	related_to_type: EntityType | null;
	field_mapping: FieldMapping;
	source_url: string | null;
	field_definitions: TemplateFieldDefinition[];
	is_active: boolean;
	version: number;
	created_by: string;
	updated_by: string | null;
	created_at: string;
	updated_at: string;
	deleted_at: string | null;
	deleted_by: string | null;
}

export interface TemplateDocumentInfo {
	id: string;
	file_name: string;
	bucket_storage: string;
	bucket_path: string;
	file_size_bytes: number;
	mime_type: string | null;
}

export interface TemplateWithDocument extends TemplateRow {
	document: TemplateDocumentInfo | null;
}

export interface CreateTemplateInput {
	name: string;
	description?: string;
	category?: string;
	template_type: TemplateType;
	related_to_type?: EntityType | null;
	field_mapping?: FieldMapping;
	source_url?: string | null;
	field_definitions?: TemplateFieldDefinition[];
}

export interface UpdateTemplateInput {
	name?: string;
	description?: string | null;
	category?: string | null;
	template_type?: TemplateType;
	related_to_type?: EntityType | null;
	field_mapping?: FieldMapping;
	source_url?: string | null;
	field_definitions?: TemplateFieldDefinition[];
	is_active?: boolean;
}

export interface ListTemplatesOptions {
	category?: string;
	type?: TemplateType;
	relatedToType?: string;
	includeInactive?: boolean;
	includeDeleted?: boolean;
}

export interface TemplateFileContent {
	content: ArrayBuffer;
	fileName: string;
	mimeType: string;
}

export class TemplatesError extends Error {
	status: number;

	constructor(status: number, message: string) {
		super(message);
		this.status = status;
	}
}

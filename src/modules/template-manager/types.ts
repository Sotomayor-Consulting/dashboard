import type { TemplateWithDocument, TemplateType, FieldMapping } from '@domains/templates/types';
import type { EntityType } from '@domains/templates/schema-registry';

export type { TemplateWithDocument, TemplateType, FieldMapping, EntityType };

export interface TemplateManagerPageData {
	templates: TemplateWithDocument[];
}

export interface CreateTemplateForm {
	name: string;
	description: string;
	category: string;
	template_type: TemplateType;
	related_to_type: EntityType | '';
	source_url: string;
}

export interface UploadForm {
	templateId: string;
	file: File | null;
	fileName: string;
}

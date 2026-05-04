export interface FormulariosItem {
	submission_id: string;
	progress_percent: number | null;
	created_at: string | null;
	updated_at: string | null;
	submitted_at: string | null;
	status: string | null;
	formularios: {
		titulo: string;
		slug: string;
	} | null;
	usuarios: {
		nombre: string;
		apellido: string;
	} | null;
}

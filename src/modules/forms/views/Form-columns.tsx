import type { ColumnDef } from '@tanstack/react-table';
import { Badge } from '@components/components/ui/badge';
import type { FormulariosItem } from '@modules/forms/types';

export interface FormTableRow {
	submission_id: string;
	tituloFormulario: string;
	slugFormulario: string;
	nombreCompleto: string;
	porcentaje: number;
	creacion: string | null;
	actualizado: string | null;
	subido: string | null;
	status: string;
}

const formatDate = (value: string | null) => {
	if (!value) return 'Sin fecha';

	const parsed = new Date(value);
	if (Number.isNaN(parsed.getTime())) return value;

	return new Intl.DateTimeFormat('es-EC', {
		day: '2-digit',
		month: '2-digit',
		year: 'numeric',
	}).format(parsed);
};

export const mapFormsToRows = (
	formularios: FormulariosItem[],
): FormTableRow[] => {
	return formularios.map((formulario) => ({
		submission_id: formulario.submission_id,
		tituloFormulario: formulario.formularios?.titulo ?? 'Sin titulo',
		slugFormulario: formulario.formularios?.slug ?? 'Sin categoria',
		nombreCompleto:
			`${formulario.usuarios?.nombre ?? ''} ${formulario.usuarios?.apellido ?? ''}`.trim() ||
			'Sin usuario',
		porcentaje: formulario.progress_percent ?? 0,
		creacion: formulario.created_at ?? null,
		actualizado: formulario.updated_at ?? null,
		subido: formulario.submitted_at ?? null,
		status: formulario.status ?? 'draft',
	}));
};

export const formsColumns: ColumnDef<FormTableRow>[] = [
	{
		accessorKey: 'tituloFormulario',
		header: 'Formulario',
		cell: ({ row }) => (
			<a
				href={`/forms/validaciones/${row.original.submission_id}`}
				target="_blank"
				rel="noopener noreferrer"
				className="block min-w-0"
			>
				<span className="block font-medium text-gray-900 dark:text-white">
					{row.original.tituloFormulario}
				</span>
				<span className="text-muted-foreground block text-sm">
					{row.original.slugFormulario}
				</span>
			</a>
		),
	},
	{
		accessorKey: 'nombreCompleto',
		header: 'Subido por',
	},
	{
		accessorKey: 'porcentaje',
		header: 'Progreso',
		cell: ({ row }) => `${row.original.porcentaje}%`,
	},
	{
		accessorKey: 'creacion',
		header: 'Fecha de inicio',
		cell: ({ row }) => formatDate(row.original.creacion),
	},
	{
		accessorKey: 'actualizado',
		header: 'Ultima actualización',
		cell: ({ row }) => formatDate(row.original.actualizado),
	},
	{
		accessorKey: 'subido',
		header: 'Ultima subida',
		cell: ({ row }) => formatDate(row.original.subido),
	},
	{
		accessorKey: 'status',
		header: 'Estado',
		cell: ({ row }) => {
			const isSubmitted = row.original.status === 'submitted';

			return (
				<Badge variant={isSubmitted ? 'susess' : 'warning'}>
					{isSubmitted ? 'Terminado' : 'En progreso'}
				</Badge>
			);
		},
	},
];

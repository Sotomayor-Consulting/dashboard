import type { ColumnDef } from '@tanstack/react-table';
import type { IncorporationRelations } from '../types';

export const columns: ColumnDef<IncorporationRelations>[] = [
	{
		accessorKey: 'possible_names',
		header: 'Nombres potenciales',
		cell: ({ getValue }) => {
			const names = getValue<[string, string, string]>().filter(Boolean);
			if (!names.length) return '-';

			const [primary, ...alternatives] = names;

			return (
				<div className="flex flex-col">
					<span className="text-sm font-semibold">{primary}</span>
					{alternatives.length > 0 && (
						<div className="mt-0.5 flex text-slate-500">
							<span className="mt-0.5 text-xs text-slate-500">
								{alternatives.join(' - ')}
							</span>
						</div>
					)}
				</div>
			);
		},
	},
	{
		accessorFn: (row) => row.company?.legal_name ?? '-',
		id: 'legal_name',
		header: 'Company',
	},
	{
		accessorFn: (row) =>
			row.user ? `${row.user.nombre} ${row.user.apellido}` : '-',
		id: 'user_nombre',
		header: 'Usuario',
	},
	{
		accessorFn: (row) => row.company?.formation_country?.name ?? '-',
		id: 'formation_country',
		header: 'Jurisdicción',
	},
	{
		accessorFn: (row) => row.company?.incorporation_date ?? '-',
		id: 'incorporation_date',
		header: 'Fecha de Incorporación',
	},
	{
		accessorFn: (row) => row.company?.entity_type ?? '-',
		id: 'entity_type',
		header: 'Tipo de entidad',
	},
	{
		accessorFn: (row) => row.company?.tax_clasification ?? '-',
		id: 'tax_clasification',
		header: 'Tipo de tributación',
	},
];

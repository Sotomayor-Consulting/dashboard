import type { ColumnDef } from '@tanstack/react-table';
import type { IncorporationRelations } from '../types';

export const columns: ColumnDef<IncorporationRelations>[] = [
	{
		id: 'possible_names',
		accessorFn: (row) => row.possible_names.filter(Boolean).join(' '),
		header: 'Nombres potenciales',
		cell: ({ row }) => {
			const names = row.original.possible_names.filter(Boolean);
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
		accessorFn: (row) => row.business_type ?? '-',
		id: 'business_type',
		header: 'Tipo de negocio',
	},
	{
		accessorFn: (row) =>
			row.user ? `${row.user.nombre} ${row.user.apellido}` : '-',
		id: 'user_nombre',
		header: 'Usuario',
	},
	{
		accessorFn: (row) => row.state_of_incorporation ?? '-',
		id: 'state_of_incorporation',
		header: 'Estado de incorporación',
	},
	{
		accessorFn: (row) => row.current_stage_name ?? '-',
		id: 'current_stage_name',
		header: 'Etapa actual',
	},
	{
		accessorFn: (row) => row.workflow_status ?? 'not_started',
		id: 'workflow_status',
		header: 'Estado workflow',
	},
	{
		accessorFn: (row) => row.company_status ?? '-',
		id: 'company_status',
		header: 'Estado empresa',
	},
];

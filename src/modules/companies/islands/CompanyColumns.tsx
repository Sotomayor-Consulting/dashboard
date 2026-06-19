import type { ColumnDef } from '@tanstack/react-table';
import { Button } from '@components/ui/Button';
import { Badge } from '@components/ui/Badge';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@components/ui/DropdownMenu';
import { MoreHorizontal } from 'lucide-react';
import type { CompanyCrudRow } from '../types';

export const companiesColumns: ColumnDef<CompanyCrudRow>[] = [
	{ accessorKey: 'principal_name', header: 'ID' },
	{
		accessorKey: 'created_by_name',
		header: 'Usuario que la creo',
	},
	{
		accessorKey: 'tipo_de_negocio',
		header: 'Tipo de negocio',
		cell: ({ row }) => {
			return row.getValue('tipo_de_negocio') || 'Sin definir';
		},
	},
	{
		accessorKey: 'porcentaje_de_incorporacion',
		header: 'Estado de incorporacion',
		cell: ({ row }) => {
			const value = row.getValue('porcentaje_de_incorporacion');
			return typeof value === 'number' ? `${value}%` : '0%';
		},
	},
	{
		accessorKey: 'estado_de_incorporacion',
		header: 'Estado',
		cell: ({ row }) => {
			return row.getValue('estado_de_incorporacion') || 'Sin estado';
		},
	},
	{
		accessorKey: 'estado',
		header: 'Proceso',
		cell: ({ row }) => {
			const estado = String(row.getValue('estado') ?? 'Desconocido');
			const isActivo = estado.toLowerCase() === 'activo';

			return (
				<Badge variant={isActivo ? 'default' : 'secondary'}>{estado}</Badge>
			);
		},
	},
	{
		accessorKey: 'updated_at',
		header: 'Creado en',
		cell: ({ row }) => {
			const value = row.getValue('updated_at');
			if (!value) return 'Sin fecha';

			const parsed = new Date(String(value));
			if (Number.isNaN(parsed.getTime())) return String(value);

			return new Intl.DateTimeFormat('es-EC', {
				day: '2-digit',
				month: '2-digit',
				year: 'numeric',
			}).format(parsed);
		},
	},
	{
		id: 'actions',
		header: 'Acciones',
		enableHiding: false,
		cell: ({ row }) => {
			const companyId = row.original.id;

			return (
				<DropdownMenu>
					<DropdownMenuTrigger
						render={
							<Button
								variant="ghost"
								size="icon-sm"
								aria-label="Abrir acciones"
							/>
						}
					>
						<MoreHorizontal />
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end" className="w-44">
						<DropdownMenuGroup>
							<DropdownMenuItem
								render={
									<a
										href={`/incorporations/${companyId}`}
										target="_blank"
										rel="noopener noreferrer"
									/>
								}
							>
								Ir a la empresa
							</DropdownMenuItem>
						</DropdownMenuGroup>
					</DropdownMenuContent>
				</DropdownMenu>
			);
		},
	},
];

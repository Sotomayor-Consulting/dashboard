import * as React from 'react';
import type {
	ColumnDef,
	ColumnFiltersState,
	SortingState,
} from '@tanstack/react-table';
import {
	flexRender,
	getCoreRowModel,
	getFilteredRowModel,
	getPaginationRowModel,
	getSortedRowModel,
	useReactTable,
} from '@tanstack/react-table';
import { Badge } from '@components/ui/badge';
import { Button } from '@components/ui/button';
import { Input } from '@components/ui/input';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@components/ui/table';

type PaymentRow = {
	id: number;
	stripePaymentIntentId: string;
	payerName: string;
	companyName: string;
	companyId: string;
	serviceName: string;
	amountLabel: string;
	status: string;
	readByOperations: boolean;
	createdAt: string;
};

export interface RawPaymentItem {
	id_pagos?: number | null;
	stripe_payment_intent_id?: string | null;
	amount?: number | null;
	status?: string | null;
	visto_por_operaciones?: boolean | null;
	created_at?: string | null;
	usuarios?: {
		nombre?: string | null;
		apellido?: string | null;
	};
	empresas_incorporaciones?: {
		nombre_1?: string | null;
		empresa_incorporacion_id?: string | null;
	};
	servicios?: {
		nombre?: string | null;
	};
}

interface PagosRealizadosTableProps {
	data: RawPaymentItem[];
}

function formatDate(value: string) {
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return value;
	return date.toLocaleDateString('es-ES', {
		year: 'numeric',
		month: 'short',
		day: '2-digit',
	});
}

function mapPayments(items: RawPaymentItem[]): PaymentRow[] {
	return items.map((item, index) => ({
		id: item.id_pagos ?? index,
		stripePaymentIntentId: item.stripe_payment_intent_id ?? '— sin id —',
		payerName:
			`${item.usuarios?.nombre ?? ''} ${item.usuarios?.apellido ?? ''}`.trim(),
		companyName: item.empresas_incorporaciones?.nombre_1 ?? '—',
		companyId: item.empresas_incorporaciones?.empresa_incorporacion_id ?? '—',
		serviceName: item.servicios?.nombre ?? '—',
		amountLabel:
			typeof item.amount === 'number'
				? (item.amount / 100).toLocaleString('en-US', {
						style: 'currency',
						currency: 'USD',
						minimumFractionDigits: 2,
					})
				: '—',
		status: item.status ?? 'unknown',
		readByOperations: item.visto_por_operaciones === true,
		createdAt: item.created_at ?? '',
	}));
}

const columns: ColumnDef<PaymentRow>[] = [
	{
		accessorKey: 'stripePaymentIntentId',
		header: 'ID de Stripe',
		cell: ({ row }) => (
			<span className="font-medium text-neutral-800 dark:text-neutral-300">
				{row.original.stripePaymentIntentId}
			</span>
		),
	},
	{
		accessorKey: 'payerName',
		header: 'Pago hecho por',
		cell: ({ row }) => <span>{row.original.payerName || '—'}</span>,
	},
	{
		accessorKey: 'companyName',
		header: 'Empresa',
		cell: ({ row }) => (
			<div className="flex flex-col">
				<span>{row.original.companyName}</span>
				<span className="text-muted-foreground text-xs">
					{row.original.companyId}
				</span>
			</div>
		),
	},
	{
		accessorKey: 'serviceName',
		header: 'Servicio',
	},
	{
		accessorKey: 'amountLabel',
		header: 'Cantidad',
	},
	{
		accessorKey: 'status',
		header: 'Estado del pago',
		cell: ({ row }) => {
			const succeeded = row.original.status === 'succeeded';
			return (
				<Badge variant={succeeded ? 'susess' : 'warning'}>
					{succeeded ? 'Pago exitoso' : 'Error de pago'}
				</Badge>
			);
		},
	},
	{
		accessorKey: 'readByOperations',
		header: 'Leído',
		cell: ({ row }) => (
			<Badge variant={row.original.readByOperations ? 'susess' : 'warning'}>
				{row.original.readByOperations ? 'Leído' : 'Sin leer'}
			</Badge>
		),
	},
	{
		accessorKey: 'createdAt',
		header: 'Fecha de pago',
		cell: ({ row }) => <span>{formatDate(row.original.createdAt)}</span>,
	},
	{
		id: 'actions',
		header: 'Acciones',
		cell: ({ row }) => {
			if (row.original.readByOperations) {
				return (
					<span className="text-muted-foreground text-xs">Ya marcado</span>
				);
			}

			return (
				<form
					action="/api/update/operaciones-update-lectura-de-pagos"
					method="post"
				>
					<input type="hidden" name="pago_id" value={row.original.id} />
					<input type="hidden" name="marcar_como_visto" value="true" />
					<Button type="submit" variant="outline" size="sm">
						Marcar como leído
					</Button>
				</form>
			);
		},
	},
];

export default function PagosRealizadosTable({
	data,
}: PagosRealizadosTableProps) {
	const payments = React.useMemo(() => mapPayments(data), [data]);
	const [sorting, setSorting] = React.useState<SortingState>([]);
	const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
		[],
	);

	const table = useReactTable({
		data: payments,
		columns,
		onSortingChange: setSorting,
		onColumnFiltersChange: setColumnFilters,
		getCoreRowModel: getCoreRowModel(),
		getPaginationRowModel: getPaginationRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getFilteredRowModel: getFilteredRowModel(),
		state: {
			sorting,
			columnFilters,
		},
	});

	return (
		<div className="mt-10 space-y-4">
			<div className="flex items-center gap-2">
				<Input
					placeholder="Buscar por empresa o servicio..."
					value={
						((table.getColumn('companyName')?.getFilterValue() as string) ??
							'') ||
						((table.getColumn('serviceName')?.getFilterValue() as string) ?? '')
					}
					onChange={(event) => {
						const value = event.target.value;
						table.getColumn('companyName')?.setFilterValue(value);
						table.getColumn('serviceName')?.setFilterValue(value);
					}}
					className="max-w-md"
				/>
			</div>

			<div className="to-black-600 from-black-900 overflow-hidden rounded-md border bg-white dark:bg-linear-to-tr">
				<Table>
					<TableHeader>
						{table.getHeaderGroups().map((headerGroup) => (
							<TableRow key={headerGroup.id}>
								{headerGroup.headers.map((header) => (
									<TableHead key={header.id}>
										{header.isPlaceholder
											? null
											: flexRender(
													header.column.columnDef.header,
													header.getContext(),
												)}
									</TableHead>
								))}
							</TableRow>
						))}
					</TableHeader>
					<TableBody>
						{table.getRowModel().rows.length ? (
							table.getRowModel().rows.map((row) => (
								<TableRow key={row.id}>
									{row.getVisibleCells().map((cell) => (
										<TableCell key={cell.id}>
											{flexRender(
												cell.column.columnDef.cell,
												cell.getContext(),
											)}
										</TableCell>
									))}
								</TableRow>
							))
						) : (
							<TableRow>
								<TableCell
									colSpan={columns.length}
									className="h-16 text-center"
								>
									No hay pagos realizados
								</TableCell>
							</TableRow>
						)}
					</TableBody>
				</Table>
			</div>

			<div className="flex items-center justify-end gap-2">
				<Button
					variant="outline"
					size="sm"
					onClick={() => table.previousPage()}
					disabled={!table.getCanPreviousPage()}
				>
					Anterior
				</Button>
				<Button
					variant="outline"
					size="sm"
					onClick={() => table.nextPage()}
					disabled={!table.getCanNextPage()}
				>
					Siguiente
				</Button>
			</div>
		</div>
	);
}

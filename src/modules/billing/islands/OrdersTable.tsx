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
import { EyeIcon, MoreHorizontalIcon } from 'lucide-react';

import { Badge } from '@components/ui/Badge';
import { Button } from '@components/ui/Button';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@components/ui/DropdownMenu';
import { Input } from '@components/ui/Input';
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from '@components/ui/Sheet';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@components/ui/Table';
import type { OrderAdminRow } from '@domains/payments/orders';

interface OrdersTableProps {
	data: OrderAdminRow[];
}

const STATUS_LABEL: Record<string, string> = {
	draft: 'Borrador',
	pending_payment: 'Pago pendiente',
	confirmed: 'Confirmada',
	canceled: 'Cancelada',
};

function statusVariant(status: string): 'susess' | 'warning' | 'destructive' {
	if (status === 'confirmed') return 'susess';
	if (status === 'canceled') return 'destructive';
	return 'warning';
}

function fmtDate(value: string | null) {
	if (!value) return '—';
	const d = new Date(value);
	if (Number.isNaN(d.getTime())) return value;
	return d.toLocaleDateString('es-ES', {
		year: 'numeric',
		month: 'short',
		day: '2-digit',
	});
}

function fmtUsd(value: number | null | undefined) {
	if (typeof value !== 'number') return '—';
	return value.toLocaleString('en-US', {
		style: 'currency',
		currency: 'USD',
		minimumFractionDigits: 2,
	});
}

const columns: ColumnDef<OrderAdminRow>[] = [
	{
		accessorKey: 'order_number',
		header: 'Orden',
		cell: ({ row }) => (
			<span className="font-mono text-xs font-medium text-neutral-800 dark:text-neutral-300">
				{row.original.order_number}
			</span>
		),
	},
	{
		accessorKey: 'client_name',
		header: 'Cliente',
		cell: ({ row }) => <span>{row.original.client_name ?? '—'}</span>,
	},
	{
		accessorKey: 'incorporation_name',
		header: 'Empresa',
		cell: ({ row }) => <span>{row.original.incorporation_name ?? '—'}</span>,
	},
	{
		accessorKey: 'plan_name',
		header: 'Plan',
		cell: ({ row }) => <span>{row.original.plan_name ?? '—'}</span>,
	},
	{
		id: 'total',
		header: 'Total',
		cell: ({ row }) => fmtUsd(row.original.total),
	},
	{
		accessorKey: 'status',
		header: 'Estado',
		cell: ({ row }) => (
			<Badge variant={statusVariant(row.original.status)}>
				{STATUS_LABEL[row.original.status] ?? row.original.status}
			</Badge>
		),
	},
	{
		accessorKey: 'created_at',
		header: 'Realizado',
		cell: ({ row }) => <span>{fmtDate(row.original.created_at)}</span>,
	},
];

function DetailRow({
	label,
	value,
}: {
	label: string;
	value: React.ReactNode;
}) {
	return (
		<div>
			<p className="text-muted-foreground text-xs">{label}</p>
			<p className="font-medium">{value || '—'}</p>
		</div>
	);
}

export default function OrdersTable({ data }: OrdersTableProps) {
	const [sorting, setSorting] = React.useState<SortingState>([]);
	const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
		[],
	);
	const [selected, setSelected] = React.useState<OrderAdminRow | null>(null);
	const [open, setOpen] = React.useState(false);

	const table = useReactTable({
		data,
		columns,
		onSortingChange: setSorting,
		onColumnFiltersChange: setColumnFilters,
		getCoreRowModel: getCoreRowModel(),
		getPaginationRowModel: getPaginationRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getFilteredRowModel: getFilteredRowModel(),
		state: { sorting, columnFilters },
	});

	const openDetails = (order: OrderAdminRow) => {
		setSelected(order);
		setOpen(true);
	};

	return (
		<>
			<div className="mt-6 space-y-4">
				<div className="flex items-center gap-2">
					<Input
						placeholder="Buscar por cliente, empresa o plan..."
						value={
							((table.getColumn('client_name')?.getFilterValue() as string) ??
								'') ||
							((table
								.getColumn('incorporation_name')
								?.getFilterValue() as string) ??
								'') ||
							((table.getColumn('plan_name')?.getFilterValue() as string) ?? '')
						}
						onChange={(event) => {
							const value = event.target.value;
							table.getColumn('client_name')?.setFilterValue(value);
							table.getColumn('incorporation_name')?.setFilterValue(value);
							table.getColumn('plan_name')?.setFilterValue(value);
						}}
						className="max-w-md"
					/>
				</div>

				<div className="overflow-hidden rounded-md border bg-white dark:bg-neutral-900">
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
									<TableHead className="text-right">Acciones</TableHead>
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
										<TableCell className="text-right">
											<DropdownMenu>
												<DropdownMenuTrigger
													render={
														<Button
															variant="ghost"
															size="icon-sm"
															aria-label="Abrir menu"
														/>
													}
												>
													<MoreHorizontalIcon />
													<span className="sr-only">Abrir menu</span>
												</DropdownMenuTrigger>
												<DropdownMenuContent align="end" className="w-44">
													<DropdownMenuItem
														onClick={() => openDetails(row.original)}
													>
														<EyeIcon />
														Ver orden
													</DropdownMenuItem>
												</DropdownMenuContent>
											</DropdownMenu>
										</TableCell>
									</TableRow>
								))
							) : (
								<TableRow>
									<TableCell
										colSpan={columns.length + 1}
										className="h-16 text-center"
									>
										No hay ordenes registradas
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

			<Sheet open={open} onOpenChange={setOpen}>
				<SheetContent side="right" className="w-full sm:max-w-md">
					<SheetHeader>
						<SheetTitle>Orden {selected?.order_number ?? ''}</SheetTitle>
						<SheetDescription>
							Detalle de la orden y desglose de servicios.
						</SheetDescription>
					</SheetHeader>

					{selected ? (
						<div className="flex flex-col gap-4 overflow-y-auto px-4 pb-4">
							<div className="grid grid-cols-2 gap-3 text-sm">
								<DetailRow label="Cliente" value={selected.client_name} />
								<DetailRow
									label="Empresa"
									value={selected.incorporation_name}
								/>
								<DetailRow label="Plan" value={selected.plan_name} />
								<DetailRow
									label="Estado"
									value={
										<Badge variant={statusVariant(selected.status)}>
											{STATUS_LABEL[selected.status] ?? selected.status}
										</Badge>
									}
								/>
								<DetailRow
									label="Pago"
									value={selected.payment_status ?? 'sin pago'}
								/>
								<DetailRow
									label="Realizado"
									value={fmtDate(selected.created_at)}
								/>
							</div>

							<DetailRow
								label="Stripe Payment Intent"
								value={
									<span className="font-mono text-xs break-all">
										{selected.provider_transaction_id ?? '—'}
									</span>
								}
							/>

							<div>
								<p className="text-muted-foreground mb-2 text-xs">
									Desglose de servicios
								</p>
								<ul className="divide-border divide-y rounded-md border">
									{selected.lines.length ? (
										selected.lines.map((line, idx) => (
											<li
												key={idx}
												className="flex items-center justify-between gap-2 px-3 py-2 text-sm"
											>
												<div className="flex flex-col">
													<span className="font-medium">
														{line.service_name ?? '—'}
													</span>
													{line.service_plan_name ? (
														<span className="text-muted-foreground text-xs">
															{line.service_plan_name}
														</span>
													) : null}
												</div>
												<div className="flex items-center gap-3">
													<span className="text-muted-foreground text-xs">
														x{line.quantity ?? 1}
													</span>
													{selected.show_prices ? (
														<span className="font-medium tabular-nums">
															{fmtUsd(line.unit_price)}
														</span>
													) : null}
												</div>
											</li>
										))
									) : (
										<li className="text-muted-foreground px-3 py-2 text-sm">
											Sin líneas
										</li>
									)}
								</ul>
							</div>

							<div className="flex items-center justify-between border-t pt-3">
								<span className="text-muted-foreground text-sm">
									Total del plan
								</span>
								<span className="text-lg font-semibold tabular-nums">
									{fmtUsd(selected.total)}
								</span>
							</div>
							{!selected.show_prices ? (
								<p className="text-muted-foreground text-xs">
									El desglose por servicio no muestra precios.
								</p>
							) : null}
						</div>
					) : null}
				</SheetContent>
			</Sheet>
		</>
	);
}

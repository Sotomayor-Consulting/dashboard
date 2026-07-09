import * as React from 'react';
import type { ColumnDef, SortingState } from '@tanstack/react-table';
import {
	flexRender,
	getCoreRowModel,
	getFilteredRowModel,
	getPaginationRowModel,
	getSortedRowModel,
	useReactTable,
} from '@tanstack/react-table';
import { EyeIcon, MoreHorizontalIcon, SearchIcon } from 'lucide-react';

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
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@components/ui/Table';
import OrderDetailsSheet from '@components/display/orders/OrderDetailsSheet';
import {
	ORDER_STATUS_LABEL,
	formatDate,
	formatUsd,
	orderStatusVariant,
} from '@components/display/orders/order-format';
import type { OrderAdminRow } from '@domains/payments/orders';

interface OrdersTableProps {
	data: OrderAdminRow[];
}

// Campos sobre los que aplica la búsqueda global.
const SEARCHABLE_FIELDS = [
	'order_number',
	'client_name',
	'incorporation_name',
	'plan_name',
] as const;

export default function OrdersTable({ data }: OrdersTableProps) {
	const [sorting, setSorting] = React.useState<SortingState>([]);
	const [globalFilter, setGlobalFilter] = React.useState('');
	const [selected, setSelected] = React.useState<OrderAdminRow | null>(null);
	const [open, setOpen] = React.useState(false);

	const openDetails = React.useCallback((order: OrderAdminRow) => {
		setSelected(order);
		setOpen(true);
	}, []);

	const columns = React.useMemo<ColumnDef<OrderAdminRow>[]>(
		() => [
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
				cell: ({ row }) => (
					<span>{row.original.incorporation_name ?? '—'}</span>
				),
			},
			{
				accessorKey: 'plan_name',
				header: 'Plan',
				cell: ({ row }) => <span>{row.original.plan_name ?? '—'}</span>,
			},
			{
				id: 'total',
				header: 'Total',
				cell: ({ row }) => formatUsd(row.original.total),
			},
			{
				accessorKey: 'status',
				header: 'Estado',
				cell: ({ row }) => (
					<Badge variant={orderStatusVariant(row.original.status)}>
						{ORDER_STATUS_LABEL[row.original.status] ?? row.original.status}
					</Badge>
				),
			},
			{
				accessorKey: 'created_at',
				header: 'Realizada',
				cell: ({ row }) => <span>{formatDate(row.original.created_at)}</span>,
			},
			{
				id: 'actions',
				header: () => <div className="text-right">Acciones</div>,
				cell: ({ row }) => (
					<div className="text-right">
						<DropdownMenu>
							<DropdownMenuTrigger
								render={
									<Button
										variant="ghost"
										size="icon-sm"
										aria-label="Abrir menú"
									/>
								}
							>
								<MoreHorizontalIcon />
								<span className="sr-only">Abrir menú</span>
							</DropdownMenuTrigger>
							<DropdownMenuContent align="end" className="w-44">
								<DropdownMenuItem onClick={() => openDetails(row.original)}>
									<EyeIcon />
									Ver orden
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>
					</div>
				),
			},
		],
		[openDetails],
	);

	const table = useReactTable({
		data,
		columns,
		onSortingChange: setSorting,
		onGlobalFilterChange: setGlobalFilter,
		globalFilterFn: (row, _columnId, filterValue: string) => {
			const q = filterValue.trim().toLowerCase();
			if (!q) return true;
			return SEARCHABLE_FIELDS.some((field) =>
				String(row.original[field] ?? '')
					.toLowerCase()
					.includes(q),
			);
		},
		getCoreRowModel: getCoreRowModel(),
		getPaginationRowModel: getPaginationRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getFilteredRowModel: getFilteredRowModel(),
		state: { sorting, globalFilter },
	});

	return (
		<>
			<div className="mt-6 space-y-4">
				<div className="relative w-full max-w-sm">
					<SearchIcon
						size={16}
						className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 -translate-y-1/2"
					/>
					<Input
						placeholder="Buscar por orden, cliente, empresa o plan..."
						value={globalFilter}
						onChange={(event) => setGlobalFilter(event.target.value)}
						className="max-w-sm pl-9"
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
										No hay órdenes registradas
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

			<OrderDetailsSheet order={selected} open={open} onOpenChange={setOpen} />
		</>
	);
}

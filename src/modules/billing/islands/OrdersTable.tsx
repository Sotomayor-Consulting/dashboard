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

import { Button } from '@components/ui/Button';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@components/ui/Dialog';
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

type OrderRow = {
	id: number;
	producto: string;
	precio: string;
	metodoPago: string;
	cliente: string;
	empresa: string;
	realizado: string;
	stripePaymentIntentId: string;
	estado: string;
};

const ordersData: OrderRow[] = [
	{
		id: 1,
		producto: 'Incorporacion LLC',
		precio: '$299.00',
		metodoPago: 'Tarjeta',
		cliente: 'Juan Perez',
		empresa: 'Northwind Ventures LLC',
		realizado: '28 abr 2026',
		stripePaymentIntentId: 'pi_3Rt2sAxxxxxx01',
		estado: 'succeeded',
	},
	{
		id: 2,
		producto: 'EIN + Operating Agreement',
		precio: '$149.00',
		metodoPago: 'Tarjeta',
		cliente: 'Maria Gomez',
		empresa: 'Blue Harbor Studio LLC',
		realizado: '27 abr 2026',
		stripePaymentIntentId: 'pi_3Rt2sAxxxxxx02',
		estado: 'succeeded',
	},
	{
		id: 3,
		producto: 'Registered Agent',
		precio: '$99.00',
		metodoPago: 'Tarjeta',
		cliente: 'Carlos Ruiz',
		empresa: 'Summit Peak Holding LLC',
		realizado: '26 abr 2026',
		stripePaymentIntentId: 'pi_3Rt2sAxxxxxx03',
		estado: 'succeeded',
	},
];

const columns: ColumnDef<OrderRow>[] = [
	{
		accessorKey: 'producto',
		header: 'Producto',
		cell: ({ row }) => (
			<span className="font-medium text-neutral-800 dark:text-neutral-300">
				{row.original.producto}
			</span>
		),
	},
	{
		accessorKey: 'precio',
		header: 'Precio',
	},
	{
		accessorKey: 'metodoPago',
		header: 'Metodo de pago',
	},
	{
		accessorKey: 'cliente',
		header: 'Cliente',
	},
	{
		accessorKey: 'empresa',
		header: 'Empresa',
	},
	{
		accessorKey: 'realizado',
		header: 'Realizado',
	},
];

export default function OrdersTable() {
	const [sorting, setSorting] = React.useState<SortingState>([]);
	const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
		[],
	);
	const [selectedOrder, setSelectedOrder] = React.useState<OrderRow | null>(
		null,
	);
	const [detailsOpen, setDetailsOpen] = React.useState(false);

	const table = useReactTable({
		data: ordersData,
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

	const openDetails = (order: OrderRow) => {
		setSelectedOrder(order);
		setDetailsOpen(true);
	};

	return (
		<>
			<div className="mt-6 space-y-4">
				<div className="flex items-center gap-2">
					<Input
						placeholder="Buscar por producto, cliente o empresa..."
						value={
							((table.getColumn('producto')?.getFilterValue() as string) ??
								'') ||
							((table.getColumn('cliente')?.getFilterValue() as string) ??
								'') ||
							((table.getColumn('empresa')?.getFilterValue() as string) ?? '')
						}
						onChange={(event) => {
							const value = event.target.value;
							table.getColumn('producto')?.setFilterValue(value);
							table.getColumn('cliente')?.setFilterValue(value);
							table.getColumn('empresa')?.setFilterValue(value);
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

			<Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
				<DialogContent className="sm:max-w-lg">
					<DialogHeader>
						<DialogTitle>Detalle de la orden</DialogTitle>
						<DialogDescription>
							Vista inicial para luego agregar información mas especifica.
						</DialogDescription>
					</DialogHeader>

					{selectedOrder ? (
						<div className="grid gap-3 px-5 text-sm">
							<div className="grid grid-cols-2 gap-3">
								<div>
									<p className="text-muted-foreground text-xs">Producto</p>
									<p className="font-medium">{selectedOrder.producto}</p>
								</div>
								<div>
									<p className="text-muted-foreground text-xs">Precio</p>
									<p className="font-medium">{selectedOrder.precio}</p>
								</div>
								<div>
									<p className="text-muted-foreground text-xs">
										Método de pago
									</p>
									<p className="font-medium">{selectedOrder.metodoPago}</p>
								</div>
								<div>
									<p className="text-muted-foreground text-xs">Realizado</p>
									<p className="font-medium">{selectedOrder.realizado}</p>
								</div>
							</div>

							<div>
								<p className="text-muted-foreground text-xs">Cliente</p>
								<p className="font-medium">{selectedOrder.cliente}</p>
							</div>

							<div>
								<p className="text-muted-foreground text-xs">Empresa</p>
								<p className="font-medium">{selectedOrder.empresa}</p>
							</div>

							<div>
								<p className="text-muted-foreground text-xs">
									Stripe Payment Intent
								</p>
								<p className="font-mono text-xs">
									{selectedOrder.stripePaymentIntentId}
								</p>
							</div>

							<div>
								<p className="text-muted-foreground text-xs">Estado</p>
								<p className="font-medium">{selectedOrder.estado}</p>
							</div>
						</div>
					) : null}

					<DialogFooter showCloseButton />
				</DialogContent>
			</Dialog>
		</>
	);
}

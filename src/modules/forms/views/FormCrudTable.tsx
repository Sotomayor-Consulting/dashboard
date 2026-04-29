import * as React from 'react';
import type {
	ColumnFiltersState,
	RowSelectionState,
	SortingState,
	VisibilityState,
} from '@tanstack/react-table';
import {
	flexRender,
	getCoreRowModel,
	getFilteredRowModel,
	getPaginationRowModel,
	getSortedRowModel,
	useReactTable,
} from '@tanstack/react-table';
import { Button } from '@components/components/ui/button';

import {
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuLabel,
	DropdownMenuTrigger,
} from '@components/components/ui/dropdown-menu';
import { Input } from '@components/components/ui/input';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@components/components/ui/table';
import type { FormulariosItem } from '@modules/forms/types';
import { formsColumns, mapFormsToRows } from './Form-columns';

interface FormCrudTableProps {
	formularios: FormulariosItem[];
}

export default function FormCrudTable({ formularios }: FormCrudTableProps) {
	const data = React.useMemo(() => mapFormsToRows(formularios), [formularios]);

	const [sorting, setSorting] = React.useState<SortingState>([]);
	const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
		[],
	);
	const [columnVisibility, setColumnVisibility] =
		React.useState<VisibilityState>({});
	const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({});

	const table = useReactTable({
		data,
		columns: formsColumns,
		onSortingChange: setSorting,
		onColumnFiltersChange: setColumnFilters,
		onColumnVisibilityChange: setColumnVisibility,
		onRowSelectionChange: setRowSelection,
		getCoreRowModel: getCoreRowModel(),
		getPaginationRowModel: getPaginationRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getFilteredRowModel: getFilteredRowModel(),
		state: {
			sorting,
			columnFilters,
			columnVisibility,
			rowSelection,
		},
	});

	return (
		<section className="space-y-4 p-4 lg:p-6">
			<div className="p-4 shadow-xs">
				<div className="flex flex-col gap-4">
					<div className="flex flex-wrap items-center gap-2">
						<div className="relative w-full max-w-sm">
							<svg
								xmlns="http://www.w3.org/2000/svg"
								width="16"
								height="16"
								viewBox="0 0 24 24"
								className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 -translate-y-1/2"
							>
								<path
									fill="currentColor"
									d="M11 2c4.968 0 9 4.032 9 9s-4.032 9-9 9s-9-4.032-9-9s4.032-9 9-9m0 16c3.867 0 7-3.133 7-7s-3.133-7-7-7s-7 3.133-7 7s3.133 7 7 7m8.485.071l2.829 2.828l-1.415 1.415l-2.828-2.829z"
								/>
							</svg>
							<Input
								placeholder="Buscar por nombre del formulario..."
								value={
									(table.getColumn('tituloFormulario')?.getFilterValue() as string) ??
									''
								}
								onChange={(event) =>
									table
										.getColumn('tituloFormulario')
										?.setFilterValue(event.target.value)
								}
								className="dark:bg-black-700 w-full bg-white pl-9"
							/>
						</div>
						<DropdownMenu>
							<DropdownMenuTrigger
								render={<Button variant="outline" className="ml-auto" />}
							>
								Columnas
								<svg
									xmlns="http://www.w3.org/2000/svg"
									width="24"
									height="24"
									viewBox="0 0 24 24"
								>
									<path
										fill="currentColor"
										d="m11.95 7.95l-1.414 1.414L8 6.828V20H6V6.828L3.466 9.364L2.05 7.95L7 3zm10 8.1L17 21l-4.95-4.95l1.414-1.414l2.537 2.536L16 4h2v13.172l2.536-2.536z"
									/>
								</svg>
							</DropdownMenuTrigger>
							<DropdownMenuContent align="end" className="w-44">
								<DropdownMenuGroup>
									<DropdownMenuLabel>Visibilidad</DropdownMenuLabel>
									{table
										.getAllColumns()
										.filter(
											(column) =>
												column.getCanHide() && column.id !== 'tituloFormulario',
										)
										.map((column) => (
											<DropdownMenuCheckboxItem
												key={column.id}
												checked={column.getIsVisible()}
												onCheckedChange={(value) =>
													column.toggleVisibility(Boolean(value))
												}
											>
												{column.columnDef.header as string}
											</DropdownMenuCheckboxItem>
										))}
								</DropdownMenuGroup>
							</DropdownMenuContent>
						</DropdownMenu>
					</div>

					<div className="dark:bg-black-800 overflow-hidden rounded-md border bg-white">
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
											colSpan={formsColumns.length}
											className="h-20 text-center"
										>
											No hay formularios por validar.
										</TableCell>
									</TableRow>
								)}
							</TableBody>
						</Table>
					</div>

					<div className="flex items-center justify-between gap-2">
						<p className="text-muted-foreground text-sm">
							{table.getFilteredRowModel().rows.length} resultado(s) ·{' '}
							{table.getSelectedRowModel().rows.length} seleccionado(s)
						</p>
						<div className="flex items-center gap-2">
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
				</div>
			</div>
		</section>
	);
}

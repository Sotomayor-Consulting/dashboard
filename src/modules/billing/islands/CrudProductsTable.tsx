import * as React from 'react';
import { Badge } from '@components/ui/Badge';
import { Button } from '@components/ui/Button';
import { Input } from '@components/ui/Input';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@components/ui/Table';

interface ServiceItem {
	id?: number;
	nombre?: string | null;
	categoria?: string | null;
	descripcion?: string | null;
	precio?: number | string | null;
	created_at?: string | null;
	servicio_activo?: boolean | null;
}

interface CrudProductsTableProps {
	data: ServiceItem[];
}

const PAGE_SIZE = 10;

function formatDate(value?: string | null) {
	if (!value) return '—';
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return value;
	return date.toLocaleDateString('es-ES');
}

export default function CrudProductsTable({ data }: CrudProductsTableProps) {
	const [query, setQuery] = React.useState('');
	const [page, setPage] = React.useState(1);

	const filtered = React.useMemo(() => {
		const q = query.trim().toLowerCase();
		if (!q) return data;
		return data.filter((item) =>
			[item.nombre, item.categoria, item.descripcion]
				.filter(Boolean)
				.some((value) => String(value).toLowerCase().includes(q)),
		);
	}, [data, query]);

	const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
	const currentPage = Math.min(page, totalPages);
	const start = (currentPage - 1) * PAGE_SIZE;
	const rows = filtered.slice(start, start + PAGE_SIZE);

	React.useEffect(() => {
		setPage(1);
	}, [query]);

	return (
		<div className="space-y-4">
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
					placeholder="Buscar servicio..."
					value={query}
					onChange={(event) => setQuery(event.target.value)}
					className="max-w-sm pl-9"
				/>
			</div>

			<div className="overflow-hidden rounded-md border bg-white dark:bg-neutral-900">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Nombre del servicio</TableHead>
							<TableHead>Categoría</TableHead>
							<TableHead>Descripción</TableHead>
							<TableHead>ID</TableHead>
							<TableHead>Precio</TableHead>
							<TableHead>Fecha de creación</TableHead>
							<TableHead>Estado</TableHead>
							<TableHead>Acciones</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{rows.length ? (
							rows.map((sr, index) => (
								<TableRow key={`${sr.id ?? 's'}-${index}`}>
									<TableCell>{sr.nombre ?? '—'}</TableCell>
									<TableCell>{sr.categoria ?? '—'}</TableCell>
									<TableCell className="max-w-60 truncate">
										{sr.descripcion ?? '—'}
									</TableCell>
									<TableCell>#{sr.id ?? '—'}</TableCell>
									<TableCell>{sr.precio ? `$${sr.precio}` : '—'}</TableCell>
									<TableCell>{formatDate(sr.created_at)}</TableCell>
									<TableCell>
										<Badge variant={sr.servicio_activo ? 'susess' : 'warning'}>
											{sr.servicio_activo ? 'Activo' : 'Inactivo'}
										</Badge>
									</TableCell>
									<TableCell>
										<div className="flex flex-wrap items-center gap-2">
											<Button
												type="button"
												variant="outline"
												size="sm"
												data-service-update
												data-id={sr.id}
												data-nombre={sr.nombre ?? ''}
												data-precio={sr.precio ?? ''}
												data-categoria={sr.categoria ?? ''}
												data-descripcion={sr.descripcion ?? ''}
												data-drawer-target="drawer-update-product-default"
												data-drawer-show="drawer-update-product-default"
												data-drawer-placement="right"
											>
												Actualizar
											</Button>
											<Button
												type="button"
												variant="outline"
												size="sm"
												data-open-estado
												data-service-id={sr.id}
												data-drawer-target="drawer-delete-product-default"
												data-drawer-show="drawer-delete-product-default"
												data-drawer-placement="right"
											>
												Archivar
											</Button>
											<Button
												type="button"
												variant="outline"
												size="sm"
												data-open-desarchivado
												data-service-id={sr.id}
												data-drawer-target="desarchivar-menu"
												data-drawer-show="desarchivar-menu"
												data-drawer-placement="right"
											>
												Desarchivar
											</Button>
										</div>
									</TableCell>
								</TableRow>
							))
						) : (
							<TableRow>
								<TableCell colSpan={8} className="h-16 text-center">
									No hay servicios
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
					onClick={() => setPage((value) => Math.max(1, value - 1))}
					disabled={currentPage === 1}
				>
					Anterior
				</Button>
				<Button
					variant="outline"
					size="sm"
					onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
					disabled={currentPage >= totalPages}
				>
					Siguiente
				</Button>
			</div>
		</div>
	);
}

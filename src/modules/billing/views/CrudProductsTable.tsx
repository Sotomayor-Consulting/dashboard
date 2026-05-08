import * as React from 'react';
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
			<Input
				placeholder="Buscar servicio..."
				value={query}
				onChange={(event) => setQuery(event.target.value)}
				className="max-w-sm"
			/>

			<div className="to-black-600 from-black-900 overflow-hidden rounded-md border bg-white dark:bg-linear-to-tr">
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

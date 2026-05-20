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

interface FormItem {
	form_id?: string | number;
	titulo?: string | null;
	slug?: string | null;
	descripcion?: string | null;
	revision?: number | null;
	updated_at?: string | null;
	created_at?: string | null;
	estado?: boolean | null;
	schema_json?: unknown;
	tema_json?: unknown;
}

interface FormsCrudTableProps {
	data: FormItem[];
}

const PAGE_SIZE = 10;

function formatDate(value?: string | null) {
	if (!value) return '—';
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return value;
	return date.toLocaleDateString('es-ES');
}

export default function FormsCrudTable({ data }: FormsCrudTableProps) {
	const [query, setQuery] = React.useState('');
	const [page, setPage] = React.useState(1);

	const filtered = React.useMemo(() => {
		const q = query.trim().toLowerCase();
		if (!q) return data;
		return data.filter((item) =>
			[item.titulo, item.slug, item.descripcion]
				.filter(Boolean)
				.some((value) => String(value).toLowerCase().includes(q)),
		);
	}, [data, query]);

	const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
	const currentPage = Math.min(page, totalPages);
	const rows = filtered.slice(
		(currentPage - 1) * PAGE_SIZE,
		currentPage * PAGE_SIZE,
	);

	React.useEffect(() => {
		setPage(1);
	}, [query]);

	return (
		<div className="mt-5 space-y-4">
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
					placeholder="Buscar formulario..."
					value={query}
					onChange={(event) => setQuery(event.target.value)}
					className="max-w-sm pl-9"
				/>
			</div>

			<div className="overflow-hidden rounded-md border bg-white dark:bg-neutral-900">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Titulo</TableHead>
							<TableHead>Categoría</TableHead>
							<TableHead>Descripción</TableHead>
							<TableHead>Revision</TableHead>
							<TableHead>Fecha de actualización</TableHead>
							<TableHead>Fecha de creación</TableHead>
							<TableHead>Estado</TableHead>
							<TableHead>Acciones</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{rows.length ? (
							rows.map((sr, index) => (
								<TableRow key={`${sr.form_id ?? 'f'}-${index}`}>
									<TableCell>
										<div className="flex flex-col">
											<span>{sr.titulo ?? '—'}</span>
											<span className="text-muted-foreground text-xs">
												{sr.slug ?? '—'}
											</span>
										</div>
									</TableCell>
									<TableCell>{sr.slug ?? '—'}</TableCell>
									<TableCell className="max-w-64 truncate">
										{sr.descripcion ?? '—'}
									</TableCell>
									<TableCell>{sr.revision ?? 0}</TableCell>
									<TableCell>{formatDate(sr.updated_at)}</TableCell>
									<TableCell>{formatDate(sr.created_at)}</TableCell>
									<TableCell>
										<Badge variant={sr.estado ? 'susess' : 'warning'}>
											{sr.estado ? 'Activo' : 'Inactivo'}
										</Badge>
									</TableCell>
									<TableCell>
										<div className="flex flex-wrap gap-2">
											<Button
												type="button"
												variant="outline"
												size="sm"
												data-service-update
												data-id={sr.form_id}
												data-titulo={sr.titulo ?? ''}
												data-json={JSON.stringify(sr.schema_json ?? '')}
												data-tema={JSON.stringify(sr.tema_json ?? '')}
												data-slug={sr.slug ?? ''}
												data-descripcion={sr.descripcion ?? ''}
												data-estado={sr.estado ? 'true' : 'false'}
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
												data-link-share
												data-id={sr.form_id}
												data-modal-target="course-modal"
												data-modal-toggle="course-modal"
											>
												Compartir
											</Button>
											<Button
												type="button"
												variant="outline"
												size="sm"
												data-open-estado
												data-form-id={sr.form_id}
												data-form-titulo={String(sr.titulo ?? '').trim()}
												data-form-slug={String(sr.slug ?? '').trim()}
												data-form-descripcion={String(
													sr.descripcion ?? '',
												).trim()}
												data-form-estado={`${sr.estado}`}
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
												data-form-id={sr.form_id}
												data-form-titulo={String(sr.titulo ?? '').trim()}
												data-form-slug={String(sr.slug ?? '').trim()}
												data-form-descripcion={String(
													sr.descripcion ?? '',
												).trim()}
												data-form-estado={`${sr.estado}`}
												data-drawer-target="desarchivar-menu"
												data-drawer-show="desarchivar-menu"
												data-drawer-placement="right"
											>
												Desarchivar
											</Button>
											<Button
												render={
													<a
														href={`/forms/${sr.form_id}`}
														target="_blank"
														rel="noopener noreferrer"
													/>
												}
												variant="outline"
												size="sm"
											>
												Ver
											</Button>
										</div>
									</TableCell>
								</TableRow>
							))
						) : (
							<TableRow>
								<TableCell colSpan={8} className="h-16 text-center">
									No hay formularios
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

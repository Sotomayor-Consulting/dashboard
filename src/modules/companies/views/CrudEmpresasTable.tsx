import * as React from 'react';
import { Badge } from '@components/components/ui/badge';
import { Input } from '@components/components/ui/input';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@components/components/ui/table';

interface CompanyItem {
	empresa_incorporacion_id?: string;
	nombre_1?: string | null;
	tipo_de_negocio?: string | null;
	porcentaje_de_incorporacion?: number | null;
	estado_de_incorporacion?: string | null;
	estado?: string | null;
	updated_at?: string | null;
	usuarios?: Array<{
		nombre?: string | null;
		apellido?: string | null;
	}>;
}

interface CrudEmpresasTableProps {
	empresas: CompanyItem[];
}

const PAGE_SIZE = 10;

function formatDate(value?: string | null) {
	if (!value) return '—';
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return value;
	return date.toLocaleDateString('es-ES');
}

export default function CrudEmpresasTable({
	empresas,
}: CrudEmpresasTableProps) {
	const [query, setQuery] = React.useState('');
	const [page, setPage] = React.useState(1);

	const filtered = React.useMemo(() => {
		const q = query.trim().toLowerCase();
		if (!q) return empresas;
		return empresas.filter((empresa) =>
			[
				empresa.nombre_1,
				empresa.tipo_de_negocio,
				empresa.estado_de_incorporacion,
			]
				.filter(Boolean)
				.some((value) => String(value).toLowerCase().includes(q)),
		);
	}, [empresas, query]);

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
		<div className="space-y-4">
			<Input
				placeholder="Buscar empresa..."
				value={query}
				onChange={(event) => setQuery(event.target.value)}
				className="max-w-sm"
			/>

			<div className="overflow-hidden rounded-md border bg-white dark:bg-[#28314c]">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>ID</TableHead>
							<TableHead>Usuario que la creó</TableHead>
							<TableHead>Tipo de negocio</TableHead>
							<TableHead>Estado de incorporación</TableHead>
							<TableHead>Estado</TableHead>
							<TableHead>Proceso</TableHead>
							<TableHead>Creado en</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{rows.length ? (
							rows.map((empresa) => (
								<TableRow
									key={empresa.empresa_incorporacion_id}
									onClick={() => {
										if (!empresa.empresa_incorporacion_id) return;
										window.open(
											`/companies/${empresa.empresa_incorporacion_id}`,
											'_blank',
										);
									}}
									className="cursor-pointer"
								>
									<TableCell>{empresa.nombre_1 ?? '—'}</TableCell>
									<TableCell>
										{empresa.usuarios?.[0]?.nombre ?? ''}{' '}
										{empresa.usuarios?.[0]?.apellido ?? ''}
									</TableCell>
									<TableCell>{empresa.tipo_de_negocio ?? '—'}</TableCell>
									<TableCell>
										{empresa.porcentaje_de_incorporacion ?? 0}%
									</TableCell>
									<TableCell>
										{empresa.estado_de_incorporacion ?? '—'}
									</TableCell>
									<TableCell>
										<Badge
											variant={
												empresa.estado === 'Activo' ? 'susess' : 'warning'
											}
										>
											{empresa.estado ?? '—'}
										</Badge>
									</TableCell>
									<TableCell>{formatDate(empresa.updated_at)}</TableCell>
								</TableRow>
							))
						) : (
							<TableRow>
								<TableCell colSpan={7} className="h-16 text-center">
									No hay empresas
								</TableCell>
							</TableRow>
						)}
					</TableBody>
				</Table>
			</div>

			<div className="flex items-center justify-end gap-2">
				<button
					type="button"
					onClick={() => setPage((value) => Math.max(1, value - 1))}
					disabled={currentPage === 1}
					className="rounded-md border px-3 py-1.5 text-sm disabled:opacity-50"
				>
					Anterior
				</button>
				<button
					type="button"
					onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
					disabled={currentPage >= totalPages}
					className="rounded-md border px-3 py-1.5 text-sm disabled:opacity-50"
				>
					Siguiente
				</button>
			</div>
		</div>
	);
}

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

interface VerificationItem {
	submission_id?: string;
	progress_percent?: number | null;
	created_at?: string | null;
	updated_at?: string | null;
	submitted_at?: string | null;
	status?: string | null;
	usuarios?: {
		nombre?: string | null;
		apellido?: string | null;
	};
	formularios?: {
		titulo?: string | null;
		slug?: string | null;
	};
}

interface CrudVerificacionTableProps {
	data: VerificationItem[];
}

const PAGE_SIZE = 10;

function formatDate(value?: string | null) {
	if (!value) return '—';
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return value;
	return date.toLocaleDateString('es-ES');
}

export default function CrudVerificacionTable({
	data,
}: CrudVerificacionTableProps) {
	const [query, setQuery] = React.useState('');
	const [page, setPage] = React.useState(1);

	const filtered = React.useMemo(() => {
		const q = query.trim().toLowerCase();
		if (!q) return data;
		return data.filter((item) =>
			(item.formularios?.titulo ?? '').toLowerCase().includes(q),
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
		<div className="space-y-4">
			<Input
				placeholder="Buscar formulario..."
				value={query}
				onChange={(event) => setQuery(event.target.value)}
				className="max-w-sm"
			/>

			<div className="overflow-hidden rounded-md border bg-white dark:bg-[#28314c]">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Nombre del formulario</TableHead>
							<TableHead>Subido por</TableHead>
							<TableHead>Porcentaje de progreso</TableHead>
							<TableHead>Fecha inicio</TableHead>
							<TableHead>Ultima actualización</TableHead>
							<TableHead>Ultima subida</TableHead>
							<TableHead>Estado</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{rows.length ? (
							rows.map((item, index) => (
								<TableRow
									key={`${item.submission_id ?? 'v'}-${index}`}
									onClick={() => {
										if (!item.submission_id) return;
										window.open(
											`/forms/validaciones/${item.submission_id}`,
											'_blank',
										);
									}}
									className="cursor-pointer"
								>
									<TableCell>
										<div className="flex flex-col">
											<span>
												{item.formularios?.titulo ?? '— sin título —'}
											</span>
											<span className="text-muted-foreground text-xs">
												{item.formularios?.slug ?? '— sin categoria —'}
											</span>
										</div>
									</TableCell>
									<TableCell>
										{item.usuarios?.nombre ?? ''}{' '}
										{item.usuarios?.apellido ?? ''}
									</TableCell>
									<TableCell>% {item.progress_percent ?? 0}</TableCell>
									<TableCell>{formatDate(item.created_at)}</TableCell>
									<TableCell>{formatDate(item.updated_at)}</TableCell>
									<TableCell>{formatDate(item.submitted_at)}</TableCell>
									<TableCell>
										<Badge
											variant={
												item.status === 'submitted' ? 'susess' : 'warning'
											}
										>
											{item.status === 'submitted'
												? 'Terminado'
												: 'En progreso'}
										</Badge>
									</TableCell>
								</TableRow>
							))
						) : (
							<TableRow>
								<TableCell colSpan={7} className="h-16 text-center">
									No hay formularios a verificar
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

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

interface FormSubmissionItem {
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

interface SubmittedFormsTableProps {
	data: FormSubmissionItem[];
}

const PAGE_SIZE = 10;

function formatDate(value?: string | null) {
	if (!value) return '—';
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return value;
	return date.toLocaleDateString('es-ES');
}

export default function SubmittedFormsTable({ data }: SubmittedFormsTableProps) {
	const [query, setQuery] = React.useState('');
	const [page, setPage] = React.useState(1);

	const filtered = React.useMemo(() => {
		const q = query.trim().toLowerCase();
		if (!q) return data;
		return data.filter((item) => {
			const formTitle = item.formularios?.titulo ?? '';
			const userName = `${item.usuarios?.nombre ?? ''} ${item.usuarios?.apellido ?? ''}`;
			return [formTitle, userName].some((value) =>
				value.toLowerCase().includes(q),
			);
		});
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
		<div className="mt-10 space-y-4">
			<Input
				placeholder="Buscar por formulario o usuario..."
				value={query}
				onChange={(event) => setQuery(event.target.value)}
				className="max-w-sm"
			/>

			<div className="to-black-600 from-black-900 overflow-hidden rounded-md border bg-white dark:bg-linear-to-tr">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Id de formulario</TableHead>
							<TableHead>Subido por</TableHead>
							<TableHead>Porcentaje de progreso</TableHead>
							<TableHead>Fecha de inicio</TableHead>
							<TableHead>Ultima actualización</TableHead>
							<TableHead>Ultima subida</TableHead>
							<TableHead>Estado</TableHead>
							<TableHead>Acciones</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{rows.length ? (
							rows.map((sr, index) => (
								<TableRow key={`${sr.submission_id ?? 's'}-${index}`}>
									<TableCell>
										<div className="flex flex-col">
											<span>{sr.formularios?.titulo ?? '— sin titulo —'}</span>
											<span className="text-muted-foreground text-xs">
												{sr.formularios?.slug ?? '— sin categoria —'}
											</span>
										</div>
									</TableCell>
									<TableCell>
										{sr.usuarios?.nombre ?? ''} {sr.usuarios?.apellido ?? ''}
									</TableCell>
									<TableCell>{sr.progress_percent ?? 0}%</TableCell>
									<TableCell>{formatDate(sr.created_at)}</TableCell>
									<TableCell>{formatDate(sr.updated_at)}</TableCell>
									<TableCell>{formatDate(sr.submitted_at)}</TableCell>
									<TableCell>
										<Badge
											variant={sr.status === 'submitted' ? 'susess' : 'warning'}
										>
											{sr.status === 'submitted' ? 'Terminado' : 'En progreso'}
										</Badge>
									</TableCell>
									<TableCell>
										<Button
											render={
												<a
													href={`/forms/submitted/${sr.submission_id}`}
													target="_blank"
												/>
											}
											variant="outline"
											size="sm"
										>
											Ver respuestas
										</Button>
									</TableCell>
								</TableRow>
							))
						) : (
							<TableRow>
								<TableCell colSpan={8} className="h-16 text-center">
									No hay formularios para mostrar
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

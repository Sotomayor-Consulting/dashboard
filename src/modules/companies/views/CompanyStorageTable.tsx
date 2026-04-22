import * as React from 'react';
import { Badge } from '@components/components/ui/badge';
import { Button } from '@components/components/ui/button';
import { Input } from '@components/components/ui/input';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@components/components/ui/table';

interface StorageFile {
	name: string;
	updated_at?: string | null;
}

interface CompanyStorageTableProps {
	folderPath: StorageFile[];
	userId: string;
	companyId: string;
}

const PAGE_SIZE = 10;

function formatDate(value?: string | null) {
	if (!value) return '—';
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return value;
	return date.toLocaleDateString('es-ES').replace(/\//g, '-');
}

export default function CompanyStorageTable({
	folderPath,
	userId,
	companyId,
}: CompanyStorageTableProps) {
	const [query, setQuery] = React.useState('');
	const [page, setPage] = React.useState(1);

	const filtered = React.useMemo(() => {
		const q = query.trim().toLowerCase();
		if (!q) return folderPath;
		return folderPath.filter((file) => file.name.toLowerCase().includes(q));
	}, [folderPath, query]);

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
				placeholder="Buscar documento..."
				value={query}
				onChange={(event) => setQuery(event.target.value)}
				className="max-w-sm"
			/>

			<div className="overflow-hidden rounded-md border bg-white dark:bg-[#28314c]">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Nombre del documento</TableHead>
							<TableHead>Fecha</TableHead>
							<TableHead>Estado del documento</TableHead>
							<TableHead>Descargar</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{rows.length ? (
							rows.map((file) => (
								<TableRow key={file.name}>
									<TableCell className="font-semibold">{file.name}</TableCell>
									<TableCell>{formatDate(file.updated_at)}</TableCell>
									<TableCell>
										<Badge variant="susess">Subido</Badge>
									</TableCell>
									<TableCell>
										<Button
											type="button"
											variant="outline"
											size="sm"
											className="btn-ver-documento-table"
											data-path={`${userId}/companies/${companyId}/documents/${file.name}`}
										>
											Descargar
										</Button>
									</TableCell>
								</TableRow>
							))
						) : (
							<TableRow>
								<TableCell colSpan={4} className="h-16 text-center">
									No hay documentos de tu empresa
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

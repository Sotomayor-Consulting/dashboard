import { Icon } from '@iconify/react';

import { Button } from '@components/ui/Button';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@components/ui/Select';

interface Props {
	totalItems: number;
	page: number; // 1-indexed
	pageSize: number;
	onPageChange: (page: number) => void;
	onPageSizeChange: (size: number) => void;
	pageSizeOptions?: number[];
}

const DEFAULT_OPTIONS = [10, 20, 50, 100];

/** Paginación minimalista para la tabla de plantillas. */
export function TablePagination({
	totalItems,
	page,
	pageSize,
	onPageChange,
	onPageSizeChange,
	pageSizeOptions = DEFAULT_OPTIONS,
}: Props) {
	const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
	const start = totalItems === 0 ? 0 : (page - 1) * pageSize + 1;
	const end = Math.min(page * pageSize, totalItems);

	return (
		<div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-200 px-7 py-3 text-[12px] text-gray-500 dark:border-gray-800 dark:text-gray-400">
			<div className="flex items-center gap-2">
				<span>Filas por página</span>
				<Select value={String(pageSize)} onValueChange={(v) => onPageSizeChange(Number(v))}>
					<SelectTrigger className="!h-8 w-[72px] text-xs">
						<SelectValue placeholder="—" />
					</SelectTrigger>
					<SelectContent>
						{pageSizeOptions.map((opt) => (
							<SelectItem key={opt} value={String(opt)}>
								{opt}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>

			<span className="tabular-nums">
				{start}–{end} de {totalItems}
			</span>

			<div className="flex items-center gap-1">
				<Button
					variant="outline"
					size="sm"
					className="h-8 gap-1"
					disabled={page <= 1}
					onClick={() => onPageChange(page - 1)}
				>
					<Icon icon="ri:arrow-left-s-line" className="h-4 w-4" />
					Anterior
				</Button>
				<Button
					variant="outline"
					size="sm"
					className="h-8 gap-1"
					disabled={page >= totalPages}
					onClick={() => onPageChange(page + 1)}
				>
					Siguiente
					<Icon icon="ri:arrow-right-s-line" className="h-4 w-4" />
				</Button>
			</div>
		</div>
	);
}

import '@shared/iconify-ri';

import { Icon } from '@iconify/react';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';

import { Button } from '@components/ui/Button';
import { Input } from '@components/ui/Input';
import { Skeleton } from '@components/ui/Skeleton';
import { cn } from '@components/utils';

import { AdminQueryProvider } from '@modules/admin/lib/AdminQueryProvider';
import {
	EMPRESAS_FILTERS,
	type AdminEmpresa,
	type EmpresasFilter,
} from '@modules/admin/lib/empresa-types';
import { useDebouncedValue } from '@modules/admin/lib/use-debounced-value';
import { TablePagination } from '@modules/admin/usuarios/TablePagination';
import { EmpresaDrawer } from './drawer/EmpresaDrawer';
import { EmpresasTable } from './EmpresasTable';

async function fetchEmpresas(): Promise<AdminEmpresa[]> {
	const res = await fetch('/api/admin/empresas');
	if (!res.ok) throw new Error('No se pudo cargar la lista');
	return res.json() as Promise<AdminEmpresa[]>;
}

function readQueryParam(name: string): string | null {
	if (typeof window === 'undefined') return null;
	return new URLSearchParams(window.location.search).get(name);
}

function setQueryParam(name: string, value: string | null) {
	if (typeof window === 'undefined') return;
	const url = new URL(window.location.href);
	if (value && value.length > 0) url.searchParams.set(name, value);
	else url.searchParams.delete(name);
	window.history.replaceState({}, '', url.toString());
}

const FILTER_LABELS: Record<EmpresasFilter, string> = {
	todas: 'Todas',
	activas: 'Activas',
	draft: 'Borrador',
	suspended: 'Suspendidas',
};

function EmpresasPageInner() {
	const initialFilter = useMemo<EmpresasFilter>(() => {
		const q = readQueryParam('filter');
		return (EMPRESAS_FILTERS as readonly string[]).includes(q ?? '')
			? (q as EmpresasFilter)
			: 'todas';
	}, []);
	const [filter, setFilterRaw] = useState<EmpresasFilter>(initialFilter);
	const setFilter = (f: EmpresasFilter) => {
		setFilterRaw(f);
		setQueryParam('filter', f === 'todas' ? null : f);
	};

	const [search, setSearchRaw] = useState(() => readQueryParam('q') ?? '');
	const setSearch = (s: string) => {
		setSearchRaw(s);
		setQueryParam('q', s);
	};

	const [selectedId, setSelectedIdRaw] = useState<string | null>(() =>
		readQueryParam('empresa'),
	);
	const setSelectedId = (id: string | null) => {
		setSelectedIdRaw(id);
		setQueryParam('empresa', id);
	};

	const { data: empresas, isLoading } = useQuery({
		queryKey: ['admin', 'empresas-legal'],
		queryFn: fetchEmpresas,
	});

	const debouncedSearch = useDebouncedValue(search, 200);

	const filtered = useMemo(() => {
		if (!empresas) return [];
		const lower = debouncedSearch.toLowerCase().trim();
		return empresas.filter((e) => {
			if (filter === 'activas' && e.legalStatus !== 'active') return false;
			if (filter === 'draft' && e.legalStatus !== 'draft') return false;
			if (filter === 'suspended' && e.legalStatus !== 'suspended') return false;
			if (lower) {
				const haystack =
					`${e.legalName} ${e.ein ?? ''} ${e.filingNumber ?? ''} ${e.owner?.name ?? ''}`.toLowerCase();
				if (!haystack.includes(lower)) return false;
			}
			return true;
		});
	}, [empresas, filter, debouncedSearch]);

	const [page, setPage] = useState(1);
	const [pageSize, setPageSize] = useState(20);
	useEffect(() => {
		setPage(1);
	}, [filter, debouncedSearch, pageSize]);

	const paginated = useMemo(() => {
		const start = (page - 1) * pageSize;
		return filtered.slice(start, start + pageSize);
	}, [filtered, page, pageSize]);

	const counts = useMemo(() => {
		if (!empresas) return { total: 0, active: 0, draft: 0 };
		return {
			total: empresas.length,
			active: empresas.filter((e) => e.legalStatus === 'active').length,
			draft: empresas.filter((e) => e.legalStatus === 'draft').length,
		};
	}, [empresas]);

	return (
		<div className="flex min-h-[calc(100vh-3.5rem)] flex-col">
			<header className="flex items-end justify-between gap-4 border-b border-gray-200 px-7 pt-6 pb-4 dark:border-gray-800">
				<div>
					<p className="text-[11.5px] font-semibold tracking-wider text-gray-500 uppercase dark:text-gray-400">
						Empresas
					</p>
					<h1 className="mt-1 text-[22px] font-semibold text-gray-900 dark:text-gray-100">
						Entidades legales
					</h1>
					<p className="mt-1 text-[12.5px] text-gray-500 dark:text-gray-400">
						{counts.total} empresas · {counts.active} activas · {counts.draft}{' '}
						en borrador
					</p>
				</div>
				<Button variant="outline" size="sm" className="gap-1.5">
					<Icon icon="ri:download-2-line" className="h-4 w-4" />
					Exportar
				</Button>
			</header>

			<div className="border-b border-gray-200 px-7 py-3 dark:border-gray-800">
				<div className="flex items-center gap-2">
					<div className="relative w-64 shrink-0">
						<Icon
							icon="ri:search-line"
							className="pointer-events-none absolute top-1/2 left-2.5 z-10 h-4 w-4 -translate-y-1/2 text-gray-400"
						/>
						<Input
							value={search}
							onChange={(e) => setSearch(e.target.value)}
							placeholder="Buscar por nombre, EIN, owner…"
							className="!h-9 !border-gray-200 !bg-transparent pl-8 text-sm dark:!border-gray-800 dark:!bg-transparent"
						/>
					</div>

					<div className="flex items-center gap-1.5">
						{EMPRESAS_FILTERS.map((f) => {
							const isActive = filter === f;
							return (
								<button
									key={f}
									type="button"
									onClick={() => setFilter(f)}
									className={cn(
										'inline-flex shrink-0 items-center rounded-md border px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors',
										isActive
											? 'border-gray-900 bg-gray-900 text-white dark:border-white dark:bg-white dark:text-gray-900'
											: 'border-gray-200 bg-transparent text-gray-600 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-neutral-800',
									)}
								>
									{FILTER_LABELS[f]}
								</button>
							);
						})}
					</div>
				</div>
			</div>

			{isLoading ? (
				<div className="space-y-2 px-7 py-6">
					{Array.from({ length: 4 }).map((_, i) => (
						<Skeleton key={i} className="h-14 w-full" />
					))}
				</div>
			) : (
				<EmpresasTable
					empresas={paginated}
					selectedId={selectedId}
					onSelect={setSelectedId}
				/>
			)}

			{!isLoading && filtered.length > 0 && (
				<TablePagination
					totalItems={filtered.length}
					page={page}
					pageSize={pageSize}
					onPageChange={setPage}
					onPageSizeChange={setPageSize}
				/>
			)}

			<EmpresaDrawer
				empresaId={selectedId}
				onClose={() => setSelectedId(null)}
			/>
		</div>
	);
}

export default function EmpresasPage() {
	return (
		<AdminQueryProvider>
			<EmpresasPageInner />
		</AdminQueryProvider>
	);
}

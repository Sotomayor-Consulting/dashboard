import '@shared/iconify-ri';

import { Icon } from '@iconify/react';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';

import { Button } from '@components/ui/Button';
import { Skeleton } from '@components/ui/Skeleton';

import { AdminQueryProvider } from '@modules/admin/lib/AdminQueryProvider';
import {
	INCORPORATIONS_FILTERS,
	type AdminCompany,
	type IncorporationsFilter,
} from '@modules/admin/lib/incorporation-types';
import { useDebouncedValue } from '@modules/admin/lib/use-debounced-value';
import { useLocalStorageState } from '@modules/admin/lib/use-local-storage-state';
import { TablePagination } from '@modules/admin/usuarios/TablePagination';
import { CompanyDrawer } from './drawer/CompanyDrawer';
import {
	IncorporacionesTable,
	type IncorporacionesSortDir,
	type IncorporacionesSortKey,
} from './IncorporacionesTable';
import {
	IncorporacionesToolbar,
	type IncorporacionesColumnId,
} from './IncorporacionesToolbar';

const DEFAULT_VISIBLE: Record<IncorporacionesColumnId, boolean> = {
	client: true,
	stage: true,
	payment: true,
	lastActivity: true,
	actions: true,
};

async function fetchIncorporaciones(): Promise<AdminCompany[]> {
	const res = await fetch('/api/admin/incorporaciones');
	if (!res.ok) throw new Error('No se pudo cargar la lista');
	return res.json() as Promise<AdminCompany[]>;
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

function EmpresasPageInner() {
	// URL state
	const initialFilter = useMemo<IncorporationsFilter>(() => {
		const q = readQueryParam('filter');
		return (INCORPORATIONS_FILTERS as readonly string[]).includes(q ?? '')
			? (q as IncorporationsFilter)
			: 'todas';
	}, []);
	const [filter, setFilterRaw] = useState<IncorporationsFilter>(initialFilter);
	const setFilter = (f: IncorporationsFilter) => {
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

	// Selección por checkbox
	const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
	const isSelected = (id: string) => selectedIds.has(id);
	const toggleRow = (id: string) =>
		setSelectedIds((prev) => {
			const next = new Set(prev);
			if (next.has(id)) next.delete(id);
			else next.add(id);
			return next;
		});

	useEffect(() => {
		const onPop = () => {
			const f = readQueryParam('filter');
			setFilterRaw(
				(INCORPORATIONS_FILTERS as readonly string[]).includes(f ?? '')
					? (f as IncorporationsFilter)
					: 'todas',
			);
			setSearchRaw(readQueryParam('q') ?? '');
			setSelectedIdRaw(readQueryParam('empresa'));
		};
		window.addEventListener('popstate', onPop);
		return () => window.removeEventListener('popstate', onPop);
	}, []);

	const [visibleColumns, setVisibleColumns] = useLocalStorageState(
		'admin:incorporaciones:columns',
		DEFAULT_VISIBLE,
	);
	const toggleColumn = (id: IncorporacionesColumnId) =>
		setVisibleColumns((prev) => ({ ...prev, [id]: !prev[id] }));

	const [sort, setSort] = useState<{
		key: IncorporacionesSortKey;
		dir: IncorporacionesSortDir;
	}>({ key: 'lastActivity', dir: 'desc' });
	const onSort = (key: IncorporacionesSortKey) => {
		setSort((prev) =>
			prev.key === key
				? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
				: { key, dir: 'asc' },
		);
	};

	const { data: companies, isLoading } = useQuery({
		queryKey: ['admin', 'incorporaciones'],
		queryFn: fetchIncorporaciones,
	});

	const debouncedSearch = useDebouncedValue(search, 200);

	const filtered = useMemo(() => {
		if (!companies) return [];
		const lower = debouncedSearch.toLowerCase().trim();
		return companies.filter((c) => {
			if (filter === 'atencion') {
				if (c.priority === 'normal' && c.paymentStatus !== 'overdue')
					return false;
			} else if (filter === 'esperando_cliente') {
				if (c.awaiting !== 'cliente') return false;
			} else if (filter === 'esperando_ops') {
				if (c.awaiting !== 'ops') return false;
			} else if (filter === 'estancadas') {
				const longRunning =
					c.daysInProcess !== null && c.daysInProcess > 30 && c.progress < 100;
				if (!(c.priority === 'urgent' && c.progress < 100) && !longRunning) {
					return false;
				}
			}
			if (lower) {
				const haystack =
					`${c.name} ${c.client?.name ?? ''} ${c.client?.email ?? ''}`.toLowerCase();
				if (!haystack.includes(lower)) return false;
			}
			return true;
		});
	}, [companies, filter, debouncedSearch]);

	const sorted = useMemo(() => {
		const list = [...filtered];
		const cmp = (a: AdminCompany, b: AdminCompany): number => {
			let av: string | number = '';
			let bv: string | number = '';
			switch (sort.key) {
				case 'name':
					av = a.name.toLowerCase();
					bv = b.name.toLowerCase();
					break;
				case 'client':
					av = (a.client?.name ?? '').toLowerCase();
					bv = (b.client?.name ?? '').toLowerCase();
					break;
				case 'progress':
					av = a.progress;
					bv = b.progress;
					break;
				case 'lastActivity':
					av = a.lastActivityAt ? Date.parse(a.lastActivityAt) : 0;
					bv = b.lastActivityAt ? Date.parse(b.lastActivityAt) : 0;
					break;
				case 'payment':
					av = a.paymentStatus;
					bv = b.paymentStatus;
					break;
			}
			if (av < bv) return sort.dir === 'asc' ? -1 : 1;
			if (av > bv) return sort.dir === 'asc' ? 1 : -1;
			return 0;
		};
		return list.sort(cmp);
	}, [filtered, sort]);

	const [pageSize, setPageSize] = useLocalStorageState(
		'admin:incorporaciones:pageSize',
		20,
	);
	const [page, setPage] = useState(1);
	useEffect(() => {
		setPage(1);
		setSelectedIds(new Set());
	}, [filter, debouncedSearch, pageSize]);

	const paginated = useMemo(() => {
		const start = (page - 1) * pageSize;
		return sorted.slice(start, start + pageSize);
	}, [sorted, page, pageSize]);

	const visibleIds = useMemo(() => paginated.map((c) => c.id), [paginated]);
	const selectionMode: 'none' | 'some' | 'all' = useMemo(() => {
		if (visibleIds.length === 0) return 'none';
		const count = visibleIds.filter((id) => selectedIds.has(id)).length;
		if (count === 0) return 'none';
		return count === visibleIds.length ? 'all' : 'some';
	}, [visibleIds, selectedIds]);
	const toggleAll = () =>
		setSelectedIds((prev) => {
			const allSelected =
				visibleIds.length > 0 && visibleIds.every((id) => prev.has(id));
			const next = new Set(prev);
			if (allSelected) visibleIds.forEach((id) => next.delete(id));
			else visibleIds.forEach((id) => next.add(id));
			return next;
		});

	const counts = useMemo(() => {
		if (!companies)
			return {
				total: 0,
				atencion: 0,
				esperandoCliente: 0,
				esperandoOps: 0,
			};
		return {
			total: companies.length,
			atencion: companies.filter(
				(c) => c.priority !== 'normal' || c.paymentStatus === 'overdue',
			).length,
			esperandoCliente: companies.filter((c) => c.awaiting === 'cliente')
				.length,
			esperandoOps: companies.filter((c) => c.awaiting === 'ops').length,
		};
	}, [companies]);

	return (
		<div className="flex min-h-[calc(100vh-3.5rem)] flex-col">
			<header className="border-b border-gray-200 px-7 pt-6 pb-4 dark:border-gray-800">
				<div className="flex flex-col items-end justify-between gap-4 md:flex-row">
					<div>
						<p className="text-[11.5px] font-semibold tracking-wider text-gray-500 uppercase dark:text-gray-400">
							Incorporaciones
						</p>
						<h1 className="mt-1 text-[22px] font-semibold text-gray-900 dark:text-gray-100">
							Procesos de incorporación
						</h1>
					</div>
					<div className="flex items-center gap-2">
						<Button variant="outline" size="sm" className="gap-1.5">
							<Icon icon="ri:download-2-line" className="h-4 w-4" />
							Exportar
						</Button>
						<Button size="sm" className="gap-1.5" disabled>
							<Icon icon="ri:add-line" className="h-4 w-4" />
							Nueva incorporación
						</Button>
					</div>
				</div>

				{/* KPIs clickeables */}
				<div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-4">
					<KpiCard
						icon="ri:building-2-line"
						label="Total en curso"
						value={counts.total}
						active={filter === 'todas'}
						onClick={() => setFilter('todas')}
					/>
					<KpiCard
						icon="ri:alert-line"
						label="Requieren atención"
						value={counts.atencion}
						tone="red"
						active={filter === 'atencion'}
						onClick={() => setFilter('atencion')}
					/>
					<KpiCard
						icon="ri:user-line"
						label="Esperando cliente"
						value={counts.esperandoCliente}
						tone="amber"
						active={filter === 'esperando_cliente'}
						onClick={() => setFilter('esperando_cliente')}
					/>
					<KpiCard
						icon="ri:tools-line"
						label="Esperando ops"
						value={counts.esperandoOps}
						tone="indigo"
						active={filter === 'esperando_ops'}
						onClick={() => setFilter('esperando_ops')}
					/>
				</div>
			</header>

			<IncorporacionesToolbar
				companies={companies ?? []}
				activeFilter={filter}
				onFilterChange={setFilter}
				search={search}
				onSearchChange={setSearch}
				visibleColumns={visibleColumns}
				onToggleColumn={toggleColumn}
			/>

			{isLoading ? (
				<div className="space-y-2 px-7 py-6">
					{Array.from({ length: 6 }).map((_, i) => (
						<Skeleton key={i} className="h-14 w-full" />
					))}
				</div>
			) : (
				<IncorporacionesTable
					companies={paginated}
					selectedId={selectedId}
					onSelect={setSelectedId}
					visibleColumns={visibleColumns}
					sortKey={sort.key}
					sortDir={sort.dir}
					onSort={onSort}
					selectionMode={selectionMode}
					onToggleAll={toggleAll}
					isSelected={isSelected}
					onToggleRow={toggleRow}
				/>
			)}

			{!isLoading && sorted.length > 0 && (
				<TablePagination
					totalItems={sorted.length}
					page={page}
					pageSize={pageSize}
					onPageChange={setPage}
					onPageSizeChange={setPageSize}
				/>
			)}

			<CompanyDrawer
				companyId={selectedId}
				onClose={() => setSelectedId(null)}
			/>
		</div>
	);
}

interface KpiCardProps {
	icon: string;
	label: string;
	value: number;
	tone?: 'neutral' | 'red' | 'amber' | 'indigo';
	active?: boolean;
	onClick?: () => void;
}

function KpiCard({
	icon,
	label,
	value,
	tone = 'neutral',
	active,
	onClick,
}: KpiCardProps) {
	const TONE_ICON: Record<string, string> = {
		neutral: 'text-gray-400',
		red: 'text-red-500',
		amber: 'text-amber-500',
		indigo: 'text-indigo-500',
	};
	return (
		<button
			type="button"
			onClick={onClick}
			className={
				'flex items-center gap-3 rounded-lg border px-1 py-2.5 text-left transition-colors md:px-3 ' +
				(active
					? 'border-gray-900 bg-gray-50 dark:border-white dark:bg-neutral-900'
					: 'border-gray-200 bg-transparent hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-neutral-900')
			}
		>
			<div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-gray-100 dark:bg-neutral-800">
				<Icon icon={icon} className={'h-4 w-4 ' + (TONE_ICON[tone] ?? '')} />
			</div>
			<div className="min-w-0 flex-1">
				<p className="text-[10.5px] font-semibold tracking-wider text-gray-500 uppercase dark:text-gray-400">
					{label}
				</p>
				<p className="text-[16px] font-semibold text-gray-900 tabular-nums dark:text-gray-100">
					{value}
				</p>
			</div>
		</button>
	);
}

export default function EmpresasPage() {
	return (
		<AdminQueryProvider>
			<EmpresasPageInner />
		</AdminQueryProvider>
	);
}

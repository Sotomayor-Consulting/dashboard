import '@shared/iconify-ri'; // Registra el set `ri` de Remix Icons (side-effect).

import { Icon } from '@iconify/react';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';

import { Button } from '@components/ui/Button';
import { Skeleton } from '@components/ui/Skeleton';

import { AdminQueryProvider } from '@modules/admin/lib/AdminQueryProvider';
import { useDebouncedValue } from '@modules/admin/lib/use-debounced-value';
import { useLocalStorageState } from '@modules/admin/lib/use-local-storage-state';
import type { AdminUser, UserFilter, UserRole } from '@modules/admin/lib/types';
import { USER_FILTERS } from '@modules/admin/lib/types';
import { InviteUserDialog } from './InviteUserDialog';
import { TablePagination } from './TablePagination';
import { UsuariosTable } from './UsuariosTable';
import { UsuariosToolbar, type ColumnId } from './UsuariosToolbar';
import { UserDrawer } from './drawer/UserDrawer';

const DEFAULT_VISIBLE: Record<ColumnId, boolean> = {
	country: true,
	status: true,
	roles: true,
	actions: true,
};

interface Props {
	viewerRoles: UserRole[];
}

async function fetchUsers(): Promise<AdminUser[]> {
	const res = await fetch('/api/admin/users');
	if (!res.ok) throw new Error('No se pudo cargar la lista');
	return res.json() as Promise<AdminUser[]>;
}

/**
 * Lee un query param de la URL al montar (solo client-side).
 */
function readQueryParam(name: string): string | null {
	if (typeof window === 'undefined') return null;
	return new URLSearchParams(window.location.search).get(name);
}

/**
 * Actualiza la URL con un query param sin recargar la página.
 * Si el valor es null/empty/default, lo remueve.
 */
function setQueryParam(name: string, value: string | null) {
	if (typeof window === 'undefined') return;
	const url = new URL(window.location.href);
	if (value && value.length > 0) url.searchParams.set(name, value);
	else url.searchParams.delete(name);
	window.history.replaceState({}, '', url.toString());
}

function UsuariosPageInner({ viewerRoles }: Props) {
	const initialFilter = useMemo<UserFilter>(() => {
		const q = readQueryParam('filter');
		return (USER_FILTERS as readonly string[]).includes(q ?? '')
			? (q as UserFilter)
			: 'todos';
	}, []);
	const [filter, setFilterRaw] = useState<UserFilter>(initialFilter);
	const setFilter = (f: UserFilter) => {
		setFilterRaw(f);
		setQueryParam('filter', f === 'todos' ? null : f);
	};

	const [search, setSearchRaw] = useState(() => readQueryParam('q') ?? '');
	const setSearch = (s: string) => {
		setSearchRaw(s);
		setQueryParam('q', s);
	};

	const [selectedUserId, setSelectedUserIdRaw] = useState<string | null>(() =>
		readQueryParam('user'),
	);
	const setSelectedUserId = (id: string | null) => {
		setSelectedUserIdRaw(id);
		setQueryParam('user', id);
	};

	// Soporte para back/forward del browser
	useEffect(() => {
		const onPop = () => {
			const f = readQueryParam('filter');
			setFilterRaw(
				(USER_FILTERS as readonly string[]).includes(f ?? '')
					? (f as UserFilter)
					: 'todos',
			);
			setSearchRaw(readQueryParam('q') ?? '');
			setSelectedUserIdRaw(readQueryParam('user'));
		};
		window.addEventListener('popstate', onPop);
		return () => window.removeEventListener('popstate', onPop);
	}, []);

	const [visibleColumns, setVisibleColumns] = useLocalStorageState(
		'admin:usuarios:columns',
		DEFAULT_VISIBLE,
	);
	const toggleColumn = (id: ColumnId) =>
		setVisibleColumns((prev) => ({ ...prev, [id]: !prev[id] }));

	const [inviteOpen, setInviteOpen] = useState(false);

	type SortKey =
		| 'name'
		| 'email'
		| 'lastSignIn'
		| 'created'
		| 'country'
		| 'status';
	type SortDir = 'asc' | 'desc';
	const [sort, setSort] = useState<{ key: SortKey; dir: SortDir }>({
		key: 'created',
		dir: 'desc',
	});
	const onSort = (key: SortKey) => {
		setSort((prev) =>
			prev.key === key
				? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
				: { key, dir: 'asc' },
		);
	};

	const { data: users, isLoading } = useQuery({
		queryKey: ['admin', 'users'],
		queryFn: fetchUsers,
	});

	// Debounce 200ms para no filtrar en cada keystroke
	const debouncedSearch = useDebouncedValue(search, 200);

	const filtered = useMemo(() => {
		if (!users) return [];
		const lower = debouncedSearch.toLowerCase().trim();
		return users.filter((u) => {
			// filtro pill
			if (filter === 'cliente') {
				if (!u.roles.some((r) => r === 'cliente' || r === 'client')) return false;
			} else if (filter === 'ops') {
				if (!u.roles.some((r) => r === 'operaciones' || r === 'operations'))
					return false;
			} else if (filter === 'admin') {
				if (!u.roles.includes('admin')) return false;
			} else if (filter === 'partner') {
				if (!u.roles.includes('partner')) return false;
			} else if (filter === 'sin') {
				if (u.lastSignInAt !== null) return false;
			}
			// búsqueda
			if (lower) {
				const haystack = `${u.name} ${u.email}`.toLowerCase();
				if (!haystack.includes(lower)) return false;
			}
			return true;
		});
	}, [users, filter, debouncedSearch]);

	const sortedFiltered = useMemo(() => {
		const list = [...filtered];
		const cmp = (a: AdminUser, b: AdminUser): number => {
			let av: string | number = '';
			let bv: string | number = '';
			switch (sort.key) {
				case 'name':
					av = a.name.toLowerCase();
					bv = b.name.toLowerCase();
					break;
				case 'email':
					av = a.email.toLowerCase();
					bv = b.email.toLowerCase();
					break;
				case 'lastSignIn':
					av = a.lastSignInAt ? Date.parse(a.lastSignInAt) : 0;
					bv = b.lastSignInAt ? Date.parse(b.lastSignInAt) : 0;
					break;
				case 'created':
					av = a.createdAt ? Date.parse(a.createdAt) : 0;
					bv = b.createdAt ? Date.parse(b.createdAt) : 0;
					break;
				case 'country':
					av = (a.countryCode ?? '').toLowerCase();
					bv = (b.countryCode ?? '').toLowerCase();
					break;
				case 'status':
					// active primero, pending después
					av = a.status === 'active' ? 0 : 1;
					bv = b.status === 'active' ? 0 : 1;
					break;
			}
			if (av < bv) return sort.dir === 'asc' ? -1 : 1;
			if (av > bv) return sort.dir === 'asc' ? 1 : -1;
			return 0;
		};
		return list.sort(cmp);
	}, [filtered, sort]);

	// ── Paginación ────────────────────────────────────────────────
	const [pageSize, setPageSize] = useLocalStorageState(
		'admin:usuarios:pageSize',
		20,
	);
	const [page, setPage] = useState(1);
	useEffect(() => {
		setPage(1);
	}, [filter, debouncedSearch, pageSize]);

	const paginated = useMemo(() => {
		const start = (page - 1) * pageSize;
		return sortedFiltered.slice(start, start + pageSize);
	}, [sortedFiltered, page, pageSize]);
	// ──────────────────────────────────────────────────────────────

	const counts = useMemo(() => {
		if (!users) return { total: 0, ops: 0, admin: 0, partner: 0 };
		return {
			total: users.length,
			ops: users.filter((u) =>
				u.roles.some((r) => r === 'operaciones' || r === 'operations'),
			).length,
			admin: users.filter((u) => u.roles.includes('admin')).length,
			partner: users.filter((u) => u.roles.includes('partner')).length,
		};
	}, [users]);

	return (
		<div className="flex min-h-[calc(100vh-3.5rem)] flex-col">
			{/* Header */}
			<header className="flex items-end justify-between gap-4 border-b border-gray-200 px-7 pt-6 pb-4 dark:border-gray-800">
				<div>
					<p className="text-[11.5px] font-semibold tracking-wider text-gray-500 uppercase dark:text-gray-400">
						Usuarios
					</p>
					<h1 className="mt-1 text-[22px] font-semibold text-gray-900 dark:text-gray-100">
						Todos los usuarios
					</h1>
					<p className="mt-1 text-[12.5px] text-gray-500 dark:text-gray-400">
						{counts.total} usuarios · {counts.ops} operaciones · {counts.admin}{' '}
						admins · {counts.partner} partners
					</p>
				</div>
				<div className="flex items-center gap-2">
					<Button
						size="sm"
						className="gap-1.5"
						onClick={() => setInviteOpen(true)}
					>
						<Icon icon="ri:send-plane-line" className="h-4 w-4" />
						Invitar usuario
					</Button>
				</div>
			</header>

			<UsuariosToolbar
				users={users ?? []}
				activeFilter={filter}
				onFilterChange={(f: UserFilter) => setFilter(f)}
				search={search}
				onSearchChange={setSearch}
				visibleColumns={visibleColumns}
				onToggleColumn={toggleColumn}
			/>

			{isLoading ? (
				<div className="space-y-2 px-7 py-6">
					{Array.from({ length: 6 }).map((_, i) => (
						<Skeleton key={i} className="h-[52px] w-full" />
					))}
				</div>
			) : (
				<UsuariosTable
					users={paginated}
					selectedUserId={selectedUserId}
					onSelect={(id) => setSelectedUserId(id)}
					onEdit={(id) => setSelectedUserId(id)}
					canEdit={viewerRoles.includes('admin')}
					visibleColumns={visibleColumns}
					sortKey={sort.key}
					sortDir={sort.dir}
					onSort={onSort}
				/>
			)}

			{!isLoading && sortedFiltered.length > 0 && (
				<TablePagination
					totalItems={sortedFiltered.length}
					page={page}
					pageSize={pageSize}
					onPageChange={setPage}
					onPageSizeChange={setPageSize}
				/>
			)}

			<InviteUserDialog open={inviteOpen} onOpenChange={setInviteOpen} />

			<UserDrawer
				userId={selectedUserId}
				viewerRoles={viewerRoles}
				onClose={() => setSelectedUserId(null)}
			/>

		</div>
	);
}

/**
 * Root island — envuelve con TanStack Query provider.
 * Renderizado vía `client:only="react"` desde el .astro.
 */
export default function UsuariosPage(props: Props) {
	return (
		<AdminQueryProvider>
			<UsuariosPageInner {...props} />
		</AdminQueryProvider>
	);
}

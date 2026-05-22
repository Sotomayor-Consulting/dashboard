import '@shared/iconify-ri'; // Registra el set `ri` de Remix Icons (side-effect).

import { Icon } from '@iconify/react';
import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { NuqsAdapter } from 'nuqs/adapters/react';
import { parseAsString, parseAsStringLiteral, useQueryState } from 'nuqs';

import { Button } from '@components/ui/Button';
import { Skeleton } from '@components/ui/Skeleton';
import Toaster from '@components/ui/Sonner';

import { AdminQueryProvider } from '@modules/admin/lib/AdminQueryProvider';
import type { AdminUser, UserFilter, UserRole } from '@modules/admin/lib/types';
import { USER_FILTERS } from '@modules/admin/lib/types';
import { UsuariosTable } from './UsuariosTable';
import { UsuariosToolbar, type ColumnId } from './UsuariosToolbar';
import { UserDrawer } from './drawer/UserDrawer';

const DEFAULT_VISIBLE: Record<ColumnId, boolean> = {
	organization: true,
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

/** Inner — usa hooks de nuqs (requiere NuqsAdapter en árbol). */
function UsuariosPageInner({ viewerRoles }: Props) {
	const [filter, setFilter] = useQueryState(
		'filter',
		parseAsStringLiteral(USER_FILTERS).withDefault('todos'),
	);
	const [search, setSearch] = useQueryState('q', parseAsString.withDefault(''));
	const [selectedUserId, setSelectedUserId] = useQueryState(
		'user',
		parseAsString,
	);
	const [visibleColumns, setVisibleColumns] = useState(DEFAULT_VISIBLE);
	const toggleColumn = (id: ColumnId) =>
		setVisibleColumns((prev) => ({ ...prev, [id]: !prev[id] }));

	const { data: users, isLoading } = useQuery({
		queryKey: ['admin', 'users'],
		queryFn: fetchUsers,
	});

	const filtered = useMemo(() => {
		if (!users) return [];
		const lower = search.toLowerCase().trim();
		return users.filter((u) => {
			// filtro pill
			if (filter === 'cliente') {
				if (!u.roles.some((r) => r === 'cliente' || r === 'client')) return false;
			} else if (filter === 'ops') {
				if (!u.roles.some((r) => r === 'operaciones' || r === 'operations'))
					return false;
			} else if (filter === 'admin') {
				if (!u.roles.includes('admin')) return false;
			} else if (filter === 'sin') {
				if (u.lastSignInAt !== null) return false;
			}
			// búsqueda
			if (lower) {
				const haystack = `${u.name} ${u.email} ${u.organization ?? ''}`.toLowerCase();
				if (!haystack.includes(lower)) return false;
			}
			return true;
		});
	}, [users, filter, search]);

	const counts = useMemo(() => {
		if (!users) return { total: 0, ops: 0, admin: 0 };
		return {
			total: users.length,
			ops: users.filter((u) =>
				u.roles.some((r) => r === 'operaciones' || r === 'operations'),
			).length,
			admin: users.filter((u) => u.roles.includes('admin')).length,
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
						{counts.total} usuarios · {counts.ops} operaciones · {counts.admin} admins
					</p>
				</div>
				<div className="flex items-center gap-2">
					<Button variant="outline" size="sm" className="gap-1.5">
						<Icon icon="ri:add-line" className="h-4 w-4" />
						Añadir rol
					</Button>
					<Button size="sm" className="gap-1.5">
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
					users={filtered}
					selectedUserId={selectedUserId}
					onSelect={(id) => setSelectedUserId(id)}
					onEdit={(id) => setSelectedUserId(id)}
					canEdit={viewerRoles.includes('admin')}
					visibleColumns={visibleColumns}
				/>
			)}

			<UserDrawer
				userId={selectedUserId}
				viewerRoles={viewerRoles}
				onClose={() => setSelectedUserId(null)}
			/>

			<Toaster richColors position="bottom-right" />
		</div>
	);
}

/**
 * Root island — envuelve con providers (TanStack Query + Nuqs).
 * Renderizado vía `client:only="react"` desde el .astro.
 */
export default function UsuariosPage(props: Props) {
	return (
		<AdminQueryProvider>
			<NuqsAdapter>
				<UsuariosPageInner {...props} />
			</NuqsAdapter>
		</AdminQueryProvider>
	);
}

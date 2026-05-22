import { Icon } from '@iconify/react';

import { cn } from '@components/utils';

import { isoToFlag } from '@modules/admin/lib/country-flag';
import type { AdminUser } from '@modules/admin/lib/types';
import { EmptyState } from './cells/EmptyState';
import { RoleBadges } from './cells/RoleBadges';
import { StatusBadge } from './cells/StatusBadge';
import { UserCell } from './cells/UserCell';
import { UserRowActions } from './cells/UserRowActions';
import type { ColumnId } from './UsuariosToolbar';

export type UsuariosSortKey =
	| 'name'
	| 'email'
	| 'lastSignIn'
	| 'created'
	| 'organization'
	| 'country'
	| 'status';
export type UsuariosSortDir = 'asc' | 'desc';

interface Props {
	users: AdminUser[];
	selectedUserId: string | null;
	onSelect: (id: string) => void;
	onEdit: (id: string) => void;
	canEdit: boolean;
	visibleColumns: Record<ColumnId, boolean>;
	sortKey: UsuariosSortKey;
	sortDir: UsuariosSortDir;
	onSort: (key: UsuariosSortKey) => void;
}

/** Botón header con indicador ↑/↓ cuando es la columna activa. */
function SortableTh({
	label,
	keyId,
	active,
	dir,
	onClick,
	className,
}: {
	label: string;
	keyId: UsuariosSortKey;
	active: boolean;
	dir: UsuariosSortDir;
	onClick: (k: UsuariosSortKey) => void;
	className?: string;
}) {
	return (
		<th className={className}>
			<button
				type="button"
				onClick={() => onClick(keyId)}
				className="inline-flex items-center gap-1 uppercase tracking-wider hover:text-gray-900 dark:hover:text-gray-100"
			>
				{label}
				{active && (
					<Icon
						icon={dir === 'asc' ? 'ri:arrow-up-s-line' : 'ri:arrow-down-s-line'}
						className="h-3.5 w-3.5"
					/>
				)}
			</button>
		</th>
	);
}

/**
 * Tabla de usuarios. UI pura — la lógica de filtrado vive en UsuariosPage.
 * Click en fila → onSelect (abre drawer).
 */
export function UsuariosTable({
	users,
	selectedUserId,
	onSelect,
	onEdit,
	canEdit,
	visibleColumns,
	sortKey,
	sortDir,
	onSort,
}: Props) {
	if (users.length === 0) {
		return (
			<EmptyState
				title="Sin resultados"
				description="Ajusta los filtros o la búsqueda para encontrar usuarios."
			/>
		);
	}

	return (
		<div className="w-full overflow-x-auto">
			<table className="w-full text-sm">
				<thead className="border-b border-gray-200 text-[10.5px] font-medium tracking-wider text-gray-500 uppercase dark:border-gray-800 dark:text-gray-400">
					<tr>
						<SortableTh
							label="Usuario"
							keyId="name"
							active={sortKey === 'name'}
							dir={sortDir}
							onClick={onSort}
							className="px-7 py-3 text-left"
						/>
						{visibleColumns.organization && (
							<SortableTh
								label="Compañía / Cargo"
								keyId="organization"
								active={sortKey === 'organization'}
								dir={sortDir}
								onClick={onSort}
								className="py-3 pr-4 text-left"
							/>
						)}
						{visibleColumns.country && (
							<SortableTh
								label="País"
								keyId="country"
								active={sortKey === 'country'}
								dir={sortDir}
								onClick={onSort}
								className="py-3 pr-4 text-left"
							/>
						)}
						{visibleColumns.status && (
							<SortableTh
								label="Estado"
								keyId="status"
								active={sortKey === 'status'}
								dir={sortDir}
								onClick={onSort}
								className="py-3 pr-4 text-left"
							/>
						)}
						{visibleColumns.roles && (
							<th className="py-3 pr-4 text-left">
								<span className="uppercase tracking-wider">Roles</span>
							</th>
						)}
						{visibleColumns.actions && (
							<th className="w-12 py-3 pr-7 text-right">
								<span className="sr-only">Acciones</span>
							</th>
						)}
					</tr>
				</thead>
				<tbody>
					{users.map((u) => {
						const isSelected = selectedUserId === u.id;
						return (
							<tr
								key={u.id}
								onClick={() => onSelect(u.id)}
								className={cn(
									'h-[52px] cursor-pointer border-b border-gray-100 transition-colors dark:border-gray-800/60',
									isSelected
										? 'bg-gray-100 dark:bg-neutral-900'
										: 'hover:bg-gray-50 dark:hover:bg-neutral-900/60',
								)}
							>
								<td className="px-7">
									<UserCell user={u} />
								</td>
								{visibleColumns.organization && (
									<td className="pr-4">
										<div className="flex flex-col leading-tight">
											<span className="truncate text-[12.5px] text-gray-700 dark:text-gray-200">
												{u.organization || (
													<span className="text-gray-400 italic">
														Sin compañía
													</span>
												)}
											</span>
											<span className="truncate text-[11px] text-gray-500 dark:text-gray-400">
												{u.jobTitle || (
													<span className="text-gray-400 italic">Sin cargo</span>
												)}
											</span>
										</div>
									</td>
								)}
								{visibleColumns.country && (
									<td className="pr-4">
										{u.countryCode ? (
											<span className="inline-flex items-center gap-1.5 text-[12.5px] text-gray-700 dark:text-gray-300">
												<span className="text-base">{isoToFlag(u.countryCode)}</span>
												<span className="font-mono text-[11px] text-gray-500">
													{u.countryCode}
												</span>
											</span>
										) : (
											<span className="text-[11.5px] text-gray-400">—</span>
										)}
									</td>
								)}
								{visibleColumns.status && (
									<td className="pr-4">
										<StatusBadge user={u} />
									</td>
								)}
								{visibleColumns.roles && (
									<td className="pr-4">
										<RoleBadges roles={u.roles} />
									</td>
								)}
								{visibleColumns.actions && (
									<td className="pr-7 text-right">
										<UserRowActions
											user={u}
											canEdit={canEdit}
											onEdit={onEdit}
										/>
									</td>
								)}
							</tr>
						);
					})}
				</tbody>
			</table>
		</div>
	);
}

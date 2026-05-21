import { Icon } from '@iconify/react';

import { cn } from '@components/utils';

import { isoToFlag } from '@modules/admin/lib/country-flag';
import type { AdminUser } from '@modules/admin/lib/types';
import { RoleBadges } from './cells/RoleBadges';
import { StatusBadge } from './cells/StatusBadge';
import { UserCell } from './cells/UserCell';
import { UserRowActions } from './cells/UserRowActions';
import type { ColumnId } from './UsuariosToolbar';

interface Props {
	users: AdminUser[];
	selectedUserId: string | null;
	onSelect: (id: string) => void;
	onEdit: (id: string) => void;
	canEdit: boolean;
	visibleColumns: Record<ColumnId, boolean>;
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
}: Props) {
	if (users.length === 0) {
		return (
			<div className="flex flex-col items-center justify-center py-20 text-center">
				<Icon
					icon="ri:user-search-line"
					className="mb-3 h-10 w-10 text-gray-300 dark:text-gray-600"
				/>
				<p className="text-sm font-medium text-gray-900 dark:text-gray-100">
					Sin resultados
				</p>
				<p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
					Ajusta los filtros o la búsqueda para encontrar usuarios.
				</p>
			</div>
		);
	}

	return (
		<div className="w-full overflow-x-auto">
			<table className="w-full text-sm">
				<thead className="border-b border-gray-200 text-[10.5px] font-medium tracking-wider text-gray-500 uppercase dark:border-gray-800 dark:text-gray-400">
					<tr>
						<th className="px-7 py-3 text-left">Usuario</th>
						{visibleColumns.organization && (
							<th className="py-3 pr-4 text-left">Compañía / Cargo</th>
						)}
						{visibleColumns.country && (
							<th className="py-3 pr-4 text-left">País</th>
						)}
						{visibleColumns.status && (
							<th className="py-3 pr-4 text-left">Estado</th>
						)}
						{visibleColumns.roles && (
							<th className="py-3 pr-4 text-left">Roles</th>
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
										<StatusBadge status={u.status} />
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

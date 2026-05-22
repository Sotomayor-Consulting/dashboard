import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { Switch } from '@components/ui/Switch';
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from '@components/ui/Tooltip';

import type {
	AdminUserDetail,
	AnyRoleName,
	UserRole,
} from '@modules/admin/lib/types';
import { USER_ROLES } from '@modules/admin/lib/types';

const ROLE_DESC: Record<UserRole, string> = {
	admin: 'Acceso total al sistema',
	operaciones: 'Gestiona empresas y tareas',
	cliente: 'Ve sus propias empresas',
};

const ROLE_PILL: Record<UserRole, string> = {
	admin:
		'border border-red-200 bg-red-50 text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-400',
	operaciones:
		'border border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-900/50 dark:bg-indigo-950/40 dark:text-indigo-300',
	cliente:
		'border border-gray-200 bg-gray-50 text-gray-700 dark:border-gray-700 dark:bg-neutral-900 dark:text-gray-300',
};

interface Props {
	user: AdminUserDetail;
	canEdit: boolean;
}

/**
 * Sección "Roles asignados" del drawer. Switch por rol con optimistic update.
 * Si la API falla → rollback + toast de error.
 */
export function UserDrawerRoles({ user, canEdit }: Props) {
	const qc = useQueryClient();

	const mutation = useMutation({
		mutationFn: async ({
			role,
			enabled,
		}: {
			role: UserRole;
			enabled: boolean;
		}) => {
			const res = await fetch(`/api/admin/users/${user.id}/roles`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ role, enabled }),
			});
			if (!res.ok) {
				const data = (await res.json().catch(() => ({}))) as { error?: string };
				throw new Error(data.error ?? 'Falló la actualización');
			}
		},
		onMutate: async ({ role, enabled }) => {
			await qc.cancelQueries({ queryKey: ['admin', 'user', user.id] });
			await qc.cancelQueries({ queryKey: ['admin', 'users'] });

			const prevDetail = qc.getQueryData<AdminUserDetail>([
				'admin',
				'user',
				user.id,
			]);
			const prevList = qc.getQueryData<AdminUserDetail[]>(['admin', 'users']);

			// Optimistic on detail
			if (prevDetail) {
				const newRoles: AnyRoleName[] = enabled
					? Array.from(new Set([...prevDetail.roles, role]))
					: prevDetail.roles.filter((r) => r !== role);
				qc.setQueryData(['admin', 'user', user.id], {
					...prevDetail,
					roles: newRoles,
				});
			}
			// Optimistic on list
			if (prevList) {
				qc.setQueryData(
					['admin', 'users'],
					prevList.map((u) =>
						u.id === user.id
							? {
									...u,
									roles: enabled
										? Array.from(new Set([...u.roles, role]))
										: u.roles.filter((r) => r !== role),
								}
							: u,
					),
				);
			}
			return { prevDetail, prevList };
		},
		onError: (err, _vars, ctx) => {
			if (ctx?.prevDetail) {
				qc.setQueryData(['admin', 'user', user.id], ctx.prevDetail);
			}
			if (ctx?.prevList) {
				qc.setQueryData(['admin', 'users'], ctx.prevList);
			}
			toast.error(err instanceof Error ? err.message : 'No se pudo actualizar');
		},
		onSuccess: () => {
			toast.success('Rol actualizado');
		},
		onSettled: () => {
			qc.invalidateQueries({ queryKey: ['admin', 'user', user.id] });
			qc.invalidateQueries({ queryKey: ['admin', 'users'] });
		},
	});

	return (
		<section className="px-5 py-5">
			<div className="mb-3 flex items-center justify-between">
				<p className="text-[10px] font-semibold tracking-wider text-gray-500 uppercase dark:text-gray-400">
					Roles asignados
				</p>
				{canEdit && (
					<a
						href="#"
						onClick={(e) => e.preventDefault()}
						className="text-[11.5px] text-gray-500 underline-offset-2 hover:text-gray-900 hover:underline dark:text-gray-400 dark:hover:text-gray-100"
					>
						Editar
					</a>
				)}
			</div>
			<div className="space-y-2">
				{USER_ROLES.map((role) => {
					const checked = user.roles.includes(role);
					const isAdminRole = role === 'admin';
					const disabled = !canEdit || (isAdminRole && !canEdit);

					return (
						<div
							key={role}
							className="flex items-center justify-between rounded-md border border-gray-200 px-3 py-2.5 dark:border-gray-800"
						>
							<div className="flex items-center gap-2.5">
								<span
									className={`rounded-md px-2 py-0.5 text-[10.5px] font-medium ${ROLE_PILL[role]}`}
								>
									{role}
								</span>
								<span className="text-[11.5px] text-gray-500 dark:text-gray-400">
									{ROLE_DESC[role]}
								</span>
							</div>
							{disabled ? (
								<Tooltip>
									<TooltipTrigger
										render={
											<span>
												<Switch
													checked={checked}
													disabled
													aria-label={`Rol ${role}`}
												/>
											</span>
										}
									/>
									<TooltipContent>
										Solo administradores pueden modificar roles
									</TooltipContent>
								</Tooltip>
							) : (
								<Switch
									checked={checked}
									disabled={mutation.isPending}
									onCheckedChange={(c) =>
										mutation.mutate({ role, enabled: c === true })
									}
									aria-label={`Rol ${role}`}
								/>
							)}
						</div>
					);
				})}
			</div>
		</section>
	);
}

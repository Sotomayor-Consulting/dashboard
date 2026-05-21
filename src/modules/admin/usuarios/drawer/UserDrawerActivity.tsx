import { Icon } from '@iconify/react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

import type { AdminUserDetail } from '@modules/admin/lib/types';

interface ActivityItem {
	icon: string;
	color: string;
	label: string;
	at: string | null;
}

/**
 * Timeline de actividad del usuario. Como la tabla `audit_events` aún
 * no está poblada, derivamos eventos a partir de datos reales:
 *  - Creación de cuenta (`usuarios.created_at`).
 *  - Empresas creadas (por cada empresa vinculada).
 *
 * Cuando se implemente el log de auditoría real, este componente se
 * cambia a leer de `/api/admin/users/:id/activity`.
 */
function buildActivity(user: AdminUserDetail): ActivityItem[] {
	const items: ActivityItem[] = [];

	if (user.createdAt) {
		items.push({
			icon: 'ri:user-add-line',
			color: 'text-emerald-600 dark:text-emerald-400',
			label: 'Cuenta creada',
			at: user.createdAt,
		});
	}

	for (const c of user.companies.slice(0, 3)) {
		items.push({
			icon: 'ri:building-2-line',
			color: 'text-indigo-600 dark:text-indigo-400',
			label: `Empresa vinculada: ${c.name}`,
			at: null,
		});
	}

	return items;
}

export function UserDrawerActivity({ user }: { user: AdminUserDetail }) {
	const items = buildActivity(user);

	return (
		<section className="border-t border-gray-200 px-5 py-5 dark:border-gray-800">
			<p className="mb-3 text-[10px] font-semibold tracking-wider text-gray-500 uppercase dark:text-gray-400">
				Actividad
			</p>
			{items.length === 0 ? (
				<p className="text-[12px] text-gray-400 italic">Sin actividad registrada</p>
			) : (
				<ul className="space-y-3">
					{items.map((it, i) => (
						<li key={i} className="flex items-start gap-2.5">
							<Icon
								icon={it.icon}
								className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${it.color}`}
							/>
							<div className="min-w-0 flex-1">
								<p className="text-[12.5px] text-gray-700 dark:text-gray-200">
									{it.label}
								</p>
								{it.at && (
									<p className="mt-0.5 text-[10.5px] text-gray-500 dark:text-gray-400">
										{formatDistanceToNow(new Date(it.at), {
											addSuffix: true,
											locale: es,
										})}
									</p>
								)}
							</div>
						</li>
					))}
				</ul>
			)}
		</section>
	);
}

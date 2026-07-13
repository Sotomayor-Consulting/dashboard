import type { AdminUser } from '@modules/admin/lib/types';
import { InitialsAvatar } from './InitialsAvatar';

/**
 * Celda de usuario: avatar + nombre + email apilados.
 * Si hay avatarUrl se renderiza la imagen; si no, fallback a iniciales en
 * círculo de color suave seedeado por email/id.
 */
export function UserCell({ user }: { user: AdminUser }) {
	return (
		<div className="flex min-w-0 items-center gap-2.5">
			{user.avatarUrl ? (
				<img
					src={user.avatarUrl}
					alt={user.name}
					className="h-7 w-7 shrink-0 rounded-full object-cover"
				/>
			) : (
				<InitialsAvatar name={user.name} seed={user.email || user.id} />
			)}
			<div className="flex min-w-0 flex-col leading-tight">
				<span className="truncate text-[13px] font-medium text-gray-900 dark:text-gray-100">
					{user.name}
				</span>
				<span className="truncate text-[11.5px] text-gray-500 dark:text-gray-400">
					{user.email}
				</span>
			</div>
		</div>
	);
}

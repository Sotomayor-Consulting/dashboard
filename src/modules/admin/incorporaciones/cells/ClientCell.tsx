import { InitialsAvatar } from '@modules/admin/usuarios/cells/InitialsAvatar';
import type { AdminCompanyClient } from '@modules/admin/lib/incorporation-types';

/**
 * Celda de cliente: avatar + nombre. Fallback a "Sin cliente" si null.
 */
export function ClientCell({ client }: { client: AdminCompanyClient | null }) {
	if (!client) {
		return (
			<span className="text-[11.5px] text-gray-400 italic">Sin cliente</span>
		);
	}
	return (
		<div className="flex min-w-0 items-center gap-2">
			{client.avatarUrl ? (
				<img
					src={client.avatarUrl}
					alt={client.name}
					className="h-6 w-6 shrink-0 rounded-full object-cover"
				/>
			) : (
				<InitialsAvatar
					name={client.name}
					seed={client.email || client.id}
					size={24}
				/>
			)}
			<span className="truncate text-[12.5px] text-gray-700 dark:text-gray-200">
				{client.name}
			</span>
		</div>
	);
}

import { cn } from '@components/utils';

import type { AdminUser } from '@modules/admin/lib/types';

/**
 * Badge de estado de cuenta con status dot.
 * Acepta directamente el usuario o un status simple por compatibilidad.
 *
 * Variantes:
 *  - "Activo"      → verde — el usuario ha entrado al menos una vez
 *  - "Invitado"    → ámbar — invitación enviada pero nunca ingresó (nuevo)
 *  - "Pendiente"   → ámbar — estado interno legacy
 */
type Props =
	| { status: 'active' | 'pending'; user?: undefined }
	| { user: AdminUser; status?: undefined };

export function StatusBadge(props: Props) {
	let label: 'Activo' | 'Pendiente' | 'Invitado' = 'Activo';
	let tone: 'green' | 'amber' = 'green';

	if (props.user) {
		const u = props.user;
		if (u.status === 'pending') {
			label = 'Pendiente';
			tone = 'amber';
		} else if (u.lastSignInAt === null) {
			label = 'Invitado';
			tone = 'amber';
		} else {
			label = 'Activo';
			tone = 'green';
		}
	} else {
		label = props.status === 'active' ? 'Activo' : 'Pendiente';
		tone = props.status === 'active' ? 'green' : 'amber';
	}

	return (
		<span
			className={cn(
				'inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[10.5px] font-medium',
				tone === 'green'
					? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
					: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400',
			)}
		>
			<span
				className={cn(
					'h-1.5 w-1.5 rounded-full',
					tone === 'green' ? 'bg-emerald-500' : 'bg-amber-500',
				)}
			/>
			{label}
		</span>
	);
}

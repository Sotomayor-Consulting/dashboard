import { Icon } from '@iconify/react';

import { InitialsAvatar } from '@modules/admin/usuarios/cells/InitialsAvatar';
import type { AdminCompanyDetail } from '@modules/admin/lib/incorporation-types';

/**
 * Cards de Cliente y Responsable apilados en el drawer.
 * El responsable aún no está en el data model (no hay owner_id), así
 * que mostramos placeholder "Sin asignar".
 */
export function CompanyDrawerSummary({
	company,
}: {
	company: AdminCompanyDetail;
}) {
	return (
		<div className="grid grid-cols-2 gap-2 px-5 py-4">
			<Card eyebrow="Cliente">
				{company.client ? (
					<div className="flex items-center gap-2">
						{company.client.avatarUrl ? (
							<img
								src={company.client.avatarUrl}
								alt={company.client.name}
								className="h-6 w-6 shrink-0 rounded-full object-cover"
							/>
						) : (
							<InitialsAvatar
								name={company.client.name}
								seed={company.client.email || company.client.id}
								size={24}
							/>
						)}
						<span className="truncate text-[12px] font-medium text-gray-900 dark:text-gray-100">
							{company.client.name}
						</span>
					</div>
				) : (
					<span className="text-[12px] text-gray-400 italic">Sin cliente</span>
				)}
			</Card>

			<Card eyebrow="Responsable">
				<div className="flex items-center gap-2">
					<div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-100 dark:bg-neutral-800">
						<Icon
							icon="ri:user-line"
							className="h-3.5 w-3.5 text-gray-400"
						/>
					</div>
					<span className="text-[12px] text-gray-400 italic">Sin asignar</span>
				</div>
			</Card>
		</div>
	);
}

function Card({
	eyebrow,
	children,
}: {
	eyebrow: string;
	children: React.ReactNode;
}) {
	return (
		<div className="rounded-lg border border-gray-200 p-2.5 dark:border-gray-800">
			<p className="mb-1.5 text-[9.5px] font-semibold tracking-wider text-gray-500 uppercase dark:text-gray-400">
				{eyebrow}
			</p>
			{children}
		</div>
	);
}

import { Icon } from '@iconify/react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

import { isoToFlag } from '@modules/admin/lib/country-flag';
import { InitialsAvatar } from '../cells/InitialsAvatar';
import { StatusBadge } from '../cells/StatusBadge';
import type { AdminUserDetail } from '@modules/admin/lib/types';

export function UserDrawerHeader({ user }: { user: AdminUserDetail }) {
	return (
		<div className="border-b border-gray-200 px-5 py-5 dark:border-gray-800">
			<StatusBadge user={user} />
			<div className="mt-3 flex items-center gap-3">
				{user.avatarUrl ? (
					<img
						src={user.avatarUrl}
						alt={user.name}
						className="h-11 w-11 shrink-0 rounded-full object-cover"
					/>
				) : (
					<InitialsAvatar
						name={user.name}
						seed={user.email || user.id}
						size={44}
					/>
				)}
				<div className="min-w-0 flex-1">
					<p className="truncate text-[17px] font-semibold text-gray-900 dark:text-gray-100">
						{user.name}
					</p>
					<p className="mt-0.5 flex items-center gap-1.5 text-[12px] text-gray-500 dark:text-gray-400">
						<Icon icon="ri:mail-line" className="h-3.5 w-3.5" />
						<span className="truncate">{user.email}</span>
					</p>
				</div>
			</div>

			{/* Grid 3 columnas de stats */}
			<div className="mt-4 grid grid-cols-3 gap-2">
				<MiniStat label="Empresas" value={String(user.companiesCount)} />
				<MiniStat
					label="País"
					value={
						user.countryCode ? (
							<span className="inline-flex items-center gap-1.5">
								<span className="text-base leading-none">
									{isoToFlag(user.countryCode)}
								</span>
								<span>{user.countryCode}</span>
							</span>
						) : (
							'—'
						)
					}
				/>
				<MiniStat
					label="Último"
					value={
						user.lastSignInAt
							? formatDistanceToNow(new Date(user.lastSignInAt), {
									addSuffix: false,
									locale: es,
								})
							: 'nunca'
					}
				/>
			</div>
		</div>
	);
}

function MiniStat({
	label,
	value,
}: {
	label: string;
	value: React.ReactNode;
}) {
	return (
		<div className="rounded-md border border-gray-200 p-2.5 dark:border-gray-800">
			<p className="text-[9.5px] font-medium tracking-wider text-gray-500 uppercase dark:text-gray-400">
				{label}
			</p>
			<p className="mt-1 text-[15px] font-semibold text-gray-900 dark:text-gray-100">
				{value}
			</p>
		</div>
	);
}

import type { MemberItem } from '../../types';
import { InitialsAvatar } from './InitialsAvatar';
import { memberDisplayName, memberIdentification } from './member-display';

/**
 * Celda principal: avatar + nombre + línea secundaria con la identificación.
 */
export function MemberCell({ member }: { member: MemberItem | null }) {
	const name = memberDisplayName(member);
	const subtitle = memberIdentification(member);
	const seed = member?.id ?? member?.identification_number ?? name;
	return (
		<div className="flex min-w-0 items-center gap-2.5">
			<InitialsAvatar name={name} seed={seed} />
			<div className="flex min-w-0 flex-col leading-tight">
				<span className="truncate text-[13px] font-medium text-gray-900 dark:text-gray-100">
					{name}
				</span>
				<span className="truncate text-[11.5px] text-gray-500 dark:text-gray-400">
					{subtitle}
				</span>
			</div>
		</div>
	);
}

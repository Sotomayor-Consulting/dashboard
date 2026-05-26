import { cn } from '@components/utils';
import type { MemberItem } from '../../types';

const TYPE_LABEL: Record<MemberItem['person_type'], string> = {
	natural_person: 'Natural',
	juridical_person: 'Jurídica',
};

const TYPE_CLASS: Record<MemberItem['person_type'], string> = {
	natural_person:
		'border border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-400',
	juridical_person:
		'border border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/50 dark:bg-blue-950/40 dark:text-blue-300',
};

export function MemberTypeBadge({
	type,
}: {
	type?: MemberItem['person_type'] | null;
}) {
	if (!type) {
		return <span className="text-[11.5px] text-gray-400">—</span>;
	}
	return (
		<span
			className={cn(
				'inline-flex items-center rounded-md px-2 py-0.5 text-[10.5px] font-medium',
				TYPE_CLASS[type],
			)}
		>
			{TYPE_LABEL[type]}
		</span>
	);
}

import type { MemberItem } from '../../types';
import { memberDisplayName, memberIdentification } from './member-display';

/**
 * Celda principal de la tabla de miembros: nombre + línea secundaria con la
 * identificación. Sin avatar — los miembros son datos maestros y la columna
 * busca legibilidad, no identidad visual.
 */
export function MemberCell({ member }: { member: MemberItem | null }) {
	const name = memberDisplayName(member);
	const subtitle = memberIdentification(member);
	return (
		<div className="flex min-w-0 flex-col leading-tight">
			<span className="truncate text-[13px] font-medium text-gray-900 dark:text-gray-100">
				{name}
			</span>
			<span className="truncate text-[11.5px] text-gray-500 dark:text-gray-400">
				{subtitle}
			</span>
		</div>
	);
}

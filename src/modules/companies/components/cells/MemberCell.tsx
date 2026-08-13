import type { MemberItem } from '../../types';
import { memberDisplayName } from './member-display';

/**
 * Celda principal de la tabla de miembros: solo el nombre. La identificación
 * dejó de ir apilada aquí y vive en sus propias columnas (tipo y número), que
 * es lo que hace el dato filtrable y ordenable a simple vista.
 */
export function MemberCell({ member }: { member: MemberItem | null }) {
	return (
		<span className="block truncate text-[13px] font-medium text-gray-900 dark:text-gray-100">
			{memberDisplayName(member)}
		</span>
	);
}

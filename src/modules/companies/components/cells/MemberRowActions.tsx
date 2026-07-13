import { Icon } from '@iconify/react';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '@components/ui/DropdownMenu';
import type { CompanyMemberItem } from '../../types';

interface Props {
	row: CompanyMemberItem;
	canEdit: boolean;
	onEdit: (row: CompanyMemberItem) => void;
	onDelete: (row: CompanyMemberItem) => void;
}

/**
 * Menú contextual ⋯ → Editar / Eliminar. Mismo look que admin/usuarios.
 */
export function MemberRowActions({ row, canEdit, onEdit, onDelete }: Props) {
	return (
		<DropdownMenu>
			<DropdownMenuTrigger
				render={
					<button
						type="button"
						onClick={(e) => e.stopPropagation()}
						className="inline-flex h-7 w-7 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-neutral-800 dark:hover:text-gray-200"
						aria-label="Acciones"
						disabled={!canEdit}
					/>
				}
			>
				<Icon icon="ri:more-line" className="h-4 w-4" />
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="w-44">
				<DropdownMenuItem
					onClick={(e) => {
						e.stopPropagation();
						onEdit(row);
					}}
					disabled={!canEdit}
				>
					<Icon icon="ri:edit-line" className="h-4 w-4" />
					Editar
				</DropdownMenuItem>
				<DropdownMenuSeparator />
				<DropdownMenuItem
					onClick={(e) => {
						e.stopPropagation();
						onDelete(row);
					}}
					disabled={!canEdit}
					className="text-red-600 focus:text-red-600 dark:text-red-400 dark:focus:text-red-400"
				>
					<Icon icon="ri:archive-line" className="h-4 w-4" />
					Eliminar
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

import { Icon } from '@iconify/react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '@components/ui/DropdownMenu';

import type { AdminUser } from '@modules/admin/lib/types';

interface Props {
	user: AdminUser;
	canEdit: boolean;
	onEdit: (userId: string) => void;
}

/**
 * Menú contextual de fila: ⋯ → Editar / Archivar.
 * El click en el icono frena la propagación para no abrir el drawer
 * por el row-click handler.
 */
export function UserRowActions({ user, canEdit, onEdit }: Props) {
	const qc = useQueryClient();

	const archiveMut = useMutation({
		mutationFn: async () => {
			const res = await fetch(`/api/admin/users/${user.id}/archive`, {
				method: 'PATCH',
			});
			if (!res.ok) {
				const data = (await res.json().catch(() => ({}))) as {
					error?: string;
				};
				throw new Error(data.error ?? 'No se pudo archivar');
			}
		},
		onSuccess: () => {
			toast.success(`${user.name} archivado`);
			qc.invalidateQueries({ queryKey: ['admin', 'users'] });
		},
		onError: (err) => {
			toast.error(err instanceof Error ? err.message : 'No se pudo archivar');
		},
	});

	const handleArchive = (e: React.MouseEvent | Event) => {
		e.stopPropagation();
		if (
			window.confirm(
				`¿Archivar a ${user.name}? El usuario dejará de aparecer en listas activas.`,
			)
		) {
			archiveMut.mutate();
		}
	};

	return (
		<DropdownMenu>
			<DropdownMenuTrigger
				render={
					<button
						type="button"
						onClick={(e) => e.stopPropagation()}
						className="inline-flex h-7 w-7 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-neutral-800 dark:hover:text-gray-200"
						aria-label="Acciones"
					/>
				}
			>
				<Icon icon="ri:more-line" className="h-4 w-4" />
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="w-40">
				<DropdownMenuItem
					onClick={(e) => {
						e.stopPropagation();
						onEdit(user.id);
					}}
					disabled={!canEdit}
				>
					<Icon icon="ri:edit-line" className="h-4 w-4" />
					Editar
				</DropdownMenuItem>
				<DropdownMenuSeparator />
				<DropdownMenuItem
					onClick={handleArchive}
					disabled={!canEdit || archiveMut.isPending}
					className="text-red-600 focus:text-red-600 dark:text-red-400 dark:focus:text-red-400"
				>
					<Icon icon="ri:archive-line" className="h-4 w-4" />
					Archivar
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

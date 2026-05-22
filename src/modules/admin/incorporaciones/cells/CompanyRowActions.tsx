import { Icon } from '@iconify/react';

import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '@components/ui/DropdownMenu';

import type { AdminCompany } from '@modules/admin/lib/incorporation-types';

interface Props {
	company: AdminCompany;
}

/**
 * Menú contextual ⋯ por fila de empresa.
 * - "Ir a la empresa" → navega al panel completo (/incorporations/[id])
 * - "Copiar ID" → al portapapeles (útil para soporte)
 * - Acciones de gestión (reasignar, archivar) por hacer cuando exista owner_id.
 */
export function CompanyRowActions({ company }: Props) {
	const detailUrl = `/incorporations/${company.id}`;

	const handleCopyId = (e: Event | React.MouseEvent) => {
		e.stopPropagation();
		if (typeof navigator !== 'undefined' && navigator.clipboard) {
			void navigator.clipboard.writeText(company.id);
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
			<DropdownMenuContent align="end" className="w-48">
				<DropdownMenuItem
					onClick={(e) => {
						e.stopPropagation();
						window.location.href = detailUrl;
					}}
				>
					<Icon icon="ri:arrow-right-up-line" className="h-4 w-4" />
					Ir a la empresa
				</DropdownMenuItem>
				<DropdownMenuItem onClick={handleCopyId}>
					<Icon icon="ri:clipboard-line" className="h-4 w-4" />
					Copiar ID
				</DropdownMenuItem>
				<DropdownMenuSeparator />
				<DropdownMenuItem disabled>
					<Icon icon="ri:user-line" className="h-4 w-4" />
					Reasignar
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

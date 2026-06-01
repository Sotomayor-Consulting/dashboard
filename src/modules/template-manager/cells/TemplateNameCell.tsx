import { Icon } from '@iconify/react';

import { cn } from '@components/utils';

import type { TemplateWithDocument } from '@domains/templates/types';

const TYPE_ICON: Record<string, string> = {
	pdf: 'ri:file-text-line',
	word: 'ri:file-word-2-line',
};

const TYPE_ICON_TONE: Record<string, string> = {
	pdf: 'text-red-500 bg-red-50 dark:bg-red-950/40',
	word: 'text-blue-500 bg-blue-50 dark:bg-blue-950/40',
};

/**
 * Celda principal de la tabla: icono coloreado por tipo + nombre + descripción.
 * Sigue el patrón visual de UserCell en /admin/usuarios.
 */
export function TemplateNameCell({ template }: { template: TemplateWithDocument }) {
	const iconName = TYPE_ICON[template.template_type] ?? 'ri:file-line';
	const iconTone = TYPE_ICON_TONE[template.template_type] ?? 'text-gray-500 bg-gray-50';

	return (
		<div className="flex min-w-0 items-center gap-2.5">
			<div
				className={cn(
					'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
					iconTone,
				)}
			>
				<Icon icon={iconName} className="h-4 w-4" />
			</div>
			<div className="flex min-w-0 flex-col leading-tight">
				<span className="truncate text-[13px] font-medium text-gray-900 dark:text-gray-100">
					{template.name}
				</span>
				<span className="truncate text-[11.5px] text-gray-500 dark:text-gray-400">
					{template.description || (
						<span className="italic text-gray-400">Sin descripción</span>
					)}
				</span>
			</div>
		</div>
	);
}

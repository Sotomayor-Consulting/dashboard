import type { TemplateWithDocument } from '@domains/templates/types';

import { TemplateTypeIcon } from '@components/display/TemplateTypeIcon';

export function TemplateNameCell({ template }: { template: TemplateWithDocument }) {
	return (
		<div className="flex min-w-0 items-center gap-2.5">
			<TemplateTypeIcon type={template.template_type} className="h-5 w-5" />
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

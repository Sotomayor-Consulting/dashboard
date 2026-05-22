import { Icon } from '@iconify/react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

import { cn } from '@components/utils';

import type { AdminCompanyDetail } from '@modules/admin/lib/incorporation-types';

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
	pending: {
		label: 'Pendiente',
		cls: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400',
	},
	received: {
		label: 'Recibido',
		cls: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400',
	},
	rejected: {
		label: 'Rechazado',
		cls: 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400',
	},
};

export function TabDocumentos({ company }: { company: AdminCompanyDetail }) {
	if (company.documents.length === 0) {
		return (
			<div className="rounded-lg border border-dashed border-gray-300 p-6 text-center text-[12px] text-gray-500 dark:border-gray-700 dark:text-gray-400">
				Todos los documentos están en regla.
			</div>
		);
	}

	return (
		<div className="space-y-1.5">
			{company.documents.map((d) => {
				const meta = STATUS_LABEL[d.status] ?? STATUS_LABEL.pending!;
				return (
					<div
						key={d.id}
						className="flex items-center gap-3 rounded-lg border border-gray-200 p-3 dark:border-gray-800"
					>
						<Icon
							icon="ri:file-text-line"
							className="h-4 w-4 shrink-0 text-gray-400"
						/>
						<div className="min-w-0 flex-1">
							<p className="truncate text-[12.5px] font-medium text-gray-900 dark:text-gray-100">
								{d.name}
							</p>
							{d.uploadedAt && (
								<p className="mt-0.5 text-[10.5px] text-gray-500 dark:text-gray-400">
									{formatDistanceToNow(new Date(d.uploadedAt), {
										addSuffix: true,
										locale: es,
									})}
								</p>
							)}
						</div>
						<span
							className={cn(
								'inline-flex shrink-0 items-center rounded-md px-2 py-0.5 text-[10.5px] font-medium',
								meta.cls,
							)}
						>
							{meta.label}
						</span>
					</div>
				);
			})}
		</div>
	);
}

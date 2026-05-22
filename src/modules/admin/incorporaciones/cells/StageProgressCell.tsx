import type { AdminCompany } from '@modules/admin/lib/incorporation-types';

/**
 * Celda de etapa: nombre corto + porcentaje tabular + barra fina de progreso.
 */
export function StageProgressCell({ company }: { company: AdminCompany }) {
	const value = Math.min(100, Math.max(0, company.progress));
	return (
		<div className="flex min-w-0 flex-col gap-1">
			<div className="flex items-center gap-2 text-[12px]">
				<span className="font-medium tabular-nums text-gray-700 dark:text-gray-200">
					{value}%
				</span>
				<span className="truncate text-gray-500 dark:text-gray-400">
					{company.currentStage ?? company.status ?? '—'}
				</span>
			</div>
			<div className="h-[3px] w-full overflow-hidden rounded-full bg-gray-200 dark:bg-neutral-800">
				<div
					className="h-full rounded-full bg-gray-900 transition-all duration-300 dark:bg-gray-200"
					style={{ width: `${value}%` }}
				/>
			</div>
		</div>
	);
}

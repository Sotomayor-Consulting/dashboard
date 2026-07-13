import { Icon } from '@iconify/react';

import type { AdminCompanyDetail } from '@modules/admin/lib/incorporation-types';
import { PaymentBadge } from '../cells/PaymentBadge';

export function CompanyDrawerHeader({
	company,
}: {
	company: AdminCompanyDetail;
}) {
	return (
		<div className="border-b border-gray-200 px-5 py-5 dark:border-gray-800">
			<PaymentBadge
				status={company.paymentStatus}
				pendingDocs={company.pendingDocs}
			/>

			<div className="mt-3 flex items-center gap-3">
				<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gray-100 dark:bg-neutral-800">
					<Icon
						icon="ri:building-2-line"
						className="h-5 w-5 text-gray-500 dark:text-gray-400"
					/>
				</div>
				<div className="min-w-0 flex-1">
					<p className="truncate text-[16px] font-semibold text-gray-900 dark:text-gray-100">
						{company.name}
					</p>
					<p className="mt-0.5 truncate text-[11.5px] text-gray-500 dark:text-gray-400">
						{company.type ?? '—'} · {company.stateUs ?? 'Sin estado US'}
					</p>
				</div>
			</div>

			{/* Card de progreso */}
			<div className="mt-4 rounded-lg border border-gray-200 p-3 dark:border-gray-800">
				<div className="flex items-center justify-between text-[11.5px]">
					<span className="font-medium text-gray-700 dark:text-gray-200">
						Progreso de incorporación
					</span>
					<span className="font-mono tabular-nums text-gray-900 dark:text-gray-100">
						{company.progress}%
					</span>
				</div>
				<div className="mt-2 h-[5px] w-full overflow-hidden rounded-full bg-gray-200 dark:bg-neutral-800">
					<div
						className="h-full rounded-full bg-gray-900 transition-all duration-300 dark:bg-gray-200"
						style={{ width: `${Math.min(100, company.progress)}%` }}
					/>
				</div>
				{(company.currentStage || company.status) && (
					<div className="mt-2 flex items-center gap-1.5 text-[11px] text-gray-500 dark:text-gray-400">
						<Icon
							icon="ri:time-line"
							className="h-3.5 w-3.5 text-amber-500"
						/>
						<span>
							Etapa actual: {company.currentStage ?? company.status}
						</span>
					</div>
				)}
			</div>

			{/* Stats operativos */}
			<div className="mt-3 grid grid-cols-3 gap-2 text-center">
				<MiniStat
					label="Antigüedad"
					value={
						company.daysInProcess !== null
							? `${company.daysInProcess}d`
							: '—'
					}
				/>
				<MiniStat label="Tareas abiertas" value={String(company.openTasksCount)} />
				<MiniStat
					label="Esperando"
					value={
						company.awaiting === 'cliente'
							? 'Cliente'
							: company.awaiting === 'ops'
								? 'Ops'
								: 'Nadie'
					}
				/>
			</div>

			{/* Próxima tarea pendiente */}
			{company.nextTask && (
				<div className="mt-3 rounded-lg border border-dashed border-gray-300 p-2.5 dark:border-gray-700">
					<p className="text-[10px] font-semibold tracking-wider text-gray-500 uppercase dark:text-gray-400">
						Próxima tarea
					</p>
					<p className="mt-1 truncate text-[12.5px] font-medium text-gray-900 dark:text-gray-100">
						{company.nextTask.title}
					</p>
					{company.nextTask.assignedRole && (
						<p className="mt-0.5 flex items-center gap-1 text-[11px] text-gray-500 dark:text-gray-400">
							<Icon
								icon={
									company.nextTask.assignedRole === 'client'
										? 'ri:user-line'
										: 'ri:tools-line'
								}
								className="h-3 w-3"
							/>
							Asignada a {company.nextTask.assignedRole}
						</p>
					)}
				</div>
			)}
		</div>
	);
}

function MiniStat({ label, value }: { label: string; value: string }) {
	return (
		<div className="rounded-md border border-gray-200 p-2 dark:border-gray-800">
			<p className="text-[9.5px] font-semibold tracking-wider text-gray-500 uppercase dark:text-gray-400">
				{label}
			</p>
			<p className="mt-0.5 text-[13px] font-semibold text-gray-900 dark:text-gray-100">
				{value}
			</p>
		</div>
	);
}

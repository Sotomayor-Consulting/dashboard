import { Icon } from '@iconify/react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

import { cn } from '@components/utils';

import type {
	AdminCompanyDetail,
	IncorporationTask,
	TaskStatus,
} from '@modules/admin/lib/incorporation-types';

const STATUS_META: Record<
	TaskStatus,
	{ icon: string; cls: string; label: string }
> = {
	pending: {
		icon: 'ri:checkbox-blank-circle-line',
		cls: 'text-gray-400',
		label: 'Pendiente',
	},
	in_progress: {
		icon: 'ri:loader-4-line',
		cls: 'text-indigo-500',
		label: 'En progreso',
	},
	completed: {
		icon: 'ri:checkbox-circle-fill',
		cls: 'text-emerald-500',
		label: 'Completa',
	},
	blocked: {
		icon: 'ri:close-circle-line',
		cls: 'text-red-500',
		label: 'Bloqueada',
	},
	skipped: {
		icon: 'ri:skip-forward-line',
		cls: 'text-gray-400',
		label: 'Omitida',
	},
};

const PRIORITY_CLASS: Record<string, string> = {
	urgent: 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400',
	high: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400',
	normal: '',
	low: 'bg-gray-100 text-gray-600 dark:bg-neutral-800 dark:text-gray-400',
};

function TaskRow({ task }: { task: IncorporationTask }) {
	const meta = STATUS_META[task.status];
	const isCompleted = task.status === 'completed';
	return (
		<div className="flex items-start gap-2.5 rounded-lg border border-gray-200 p-3 dark:border-gray-800">
			<Icon
				icon={meta.icon}
				className={cn('mt-0.5 h-4 w-4 shrink-0', meta.cls)}
			/>
			<div className="min-w-0 flex-1">
				<div className="flex items-center gap-1.5">
					<p
						className={cn(
							'truncate text-[12.5px] font-medium',
							isCompleted
								? 'text-gray-400 line-through'
								: 'text-gray-900 dark:text-gray-100',
						)}
					>
						{task.title}
					</p>
					{task.priority && task.priority !== 'normal' && (
						<span
							className={cn(
								'rounded px-1.5 py-0.5 text-[9.5px] font-medium uppercase tracking-wide',
								PRIORITY_CLASS[task.priority],
							)}
						>
							{task.priority}
						</span>
					)}
				</div>
				<div className="mt-1 flex items-center gap-2 text-[11px] text-gray-500 dark:text-gray-400">
					{task.assignedRole && (
						<span className="inline-flex items-center gap-1">
							<Icon
								icon={
									task.assignedRole === 'client'
										? 'ri:user-line'
										: 'ri:tools-line'
								}
								className="h-3 w-3"
							/>
							{task.assignedRole}
						</span>
					)}
					{task.dueAt && (
						<span className="inline-flex items-center gap-1">
							<Icon icon="ri:time-line" className="h-3 w-3" />
							{formatDistanceToNow(new Date(task.dueAt), {
								addSuffix: true,
								locale: es,
							})}
						</span>
					)}
					{task.completedAt && isCompleted && (
						<span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
							<Icon icon="ri:check-line" className="h-3 w-3" />
							{formatDistanceToNow(new Date(task.completedAt), {
								addSuffix: true,
								locale: es,
							})}
						</span>
					)}
				</div>
			</div>
		</div>
	);
}

export function TabTareas({ company }: { company: AdminCompanyDetail }) {
	if (company.tasks.length === 0) {
		return (
			<div className="rounded-lg border border-dashed border-gray-300 p-6 text-center text-[12px] text-gray-500 dark:border-gray-700 dark:text-gray-400">
				Sin tareas. Esta incorporación aún no tiene workflow activo.
			</div>
		);
	}

	const open = company.tasks.filter(
		(t) => t.status === 'pending' || t.status === 'in_progress' || t.status === 'blocked',
	);
	const done = company.tasks.filter((t) => t.status === 'completed');

	return (
		<div className="space-y-4">
			{open.length > 0 && (
				<section>
					<p className="mb-2 text-[10px] font-semibold tracking-wider text-gray-500 uppercase dark:text-gray-400">
						Abiertas ({open.length})
					</p>
					<div className="space-y-1.5">
						{open.map((t) => (
							<TaskRow key={t.id} task={t} />
						))}
					</div>
				</section>
			)}

			{done.length > 0 && (
				<section>
					<p className="mb-2 text-[10px] font-semibold tracking-wider text-gray-500 uppercase dark:text-gray-400">
						Completadas ({done.length})
					</p>
					<div className="space-y-1.5">
						{done.map((t) => (
							<TaskRow key={t.id} task={t} />
						))}
					</div>
				</section>
			)}
		</div>
	);
}

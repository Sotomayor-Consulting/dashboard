import type { Priority, StageStatus, StatusTone, TaskStatus } from '../types';

export const priorityClass = (p: Priority) =>
	({
		urgent: 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300',
		high: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
		normal: 'bg-gray-100 text-gray-600 dark:bg-white/5 dark:text-gray-300',
		low: 'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300',
	})[p];

export const priorityLabel = (p: Priority) =>
	({
		urgent: 'Urgente',
		high: 'Alta',
		normal: 'Normal',
		low: 'Baja',
	})[p];

export const taskStatusBadge = (s: TaskStatus) =>
	({
		completed:
			'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
		in_progress:
			'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
		pending: 'bg-gray-100 text-gray-600 dark:bg-white/5 dark:text-gray-300',
	})[s];

export const taskStatusLabel = (s: TaskStatus) =>
	({
		completed: 'Completado',
		in_progress: 'En progreso',
		pending: 'Pendiente',
	})[s];

export const stageRingClass = (s: StageStatus) =>
	({
		completed:
			'border-emerald-200 bg-emerald-50 dark:border-emerald-500/30 dark:bg-emerald-500/10',
		in_progress:
			'border-amber-200 bg-amber-50 dark:border-amber-500/30 dark:bg-amber-500/10',
		pending: 'border-gray-200 bg-white dark:border-gray-700/60 dark:bg-white/5',
	})[s];

export const stageActiveRingClass = (s: StageStatus) =>
	({
		completed:
			'ring-2 ring-emerald-400 border-emerald-300 bg-emerald-100 dark:ring-emerald-500 dark:border-emerald-500/50 dark:bg-emerald-500/20',
		in_progress:
			'ring-2 ring-amber-400 border-amber-300 bg-amber-100 dark:ring-amber-500 dark:border-amber-500/50 dark:bg-amber-500/20',
		pending:
			'ring-2 ring-gray-400 border-gray-300 bg-gray-100 dark:ring-gray-500 dark:border-gray-600 dark:bg-white/10',
	})[s];

export const stageIcon = (s: StageStatus) =>
	({
		completed: 'ri:checkbox-circle-fill',
		in_progress: 'ri:time-fill',
		pending: 'ri:checkbox-blank-circle-line',
	})[s];

export const stageIconColor = (s: StageStatus) =>
	({
		completed: 'text-emerald-500 dark:text-emerald-400',
		in_progress: 'text-amber-500 dark:text-amber-400',
		pending: 'text-gray-400 dark:text-gray-500',
	})[s];

export const statTone = (t: StatusTone) =>
	({
		success:
			'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400',
		warning:
			'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400',
		danger: 'bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400',
		info: 'bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-400',
		neutral: 'bg-gray-100 text-gray-600 dark:bg-white/5 dark:text-gray-300',
	})[t];

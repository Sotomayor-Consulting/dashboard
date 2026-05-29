import type { StepMeta } from '../types';

/**
 * Metadata de los pasos del wizard. Los iconos son nombres iconify
 * (set `ri:` de Remix Icons, ya disponible en el proyecto via @iconify-json/ri).
 *
 * `estimatedTime` se usa en el stepper vertical del FormShell (rediseño)
 * para mostrar el tiempo estimado del paso actual.
 */
export const STEPS: ReadonlyArray<StepMeta & { estimatedTime: string }> = [
	{
		id: 1,
		title: 'Bienvenida',
		icon: 'ri:building-2-line',
		estimatedTime: '1 min',
	},
	{
		id: 2,
		title: 'Actividad',
		icon: 'ri:briefcase-line',
		estimatedTime: '3 min',
	},
	{
		id: 3,
		title: 'Miembros',
		icon: 'ri:group-line',
		estimatedTime: '5–8 min',
	},
	{
		id: 4,
		title: 'Manager',
		icon: 'ri:user-settings-line',
		estimatedTime: '1 min',
	},
	{
		id: 5,
		title: 'Confirmación',
		icon: 'ri:file-check-line',
		estimatedTime: '1 min',
	},
] as const;

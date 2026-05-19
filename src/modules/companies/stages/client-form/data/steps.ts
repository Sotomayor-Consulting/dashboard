import type { StepMeta } from '../types';

/**
 * Metadata de los pasos del wizard. Los iconos son nombres iconify
 * (set `ri:` de Remix Icons, ya disponible en el proyecto via @iconify-json/ri).
 */
export const STEPS: readonly StepMeta[] = [
	{ id: 1, title: 'Bienvenida', icon: 'ri:building-2-line' },
	{ id: 2, title: 'Actividad', icon: 'ri:briefcase-line' },
	{ id: 3, title: 'Miembros', icon: 'ri:group-line' },
	{ id: 4, title: 'Manager', icon: 'ri:user-settings-line' },
	{ id: 5, title: 'Confirmación', icon: 'ri:file-check-line' },
] as const;

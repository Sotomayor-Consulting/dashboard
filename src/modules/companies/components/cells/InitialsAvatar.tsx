import { cn } from '@components/utils';

/**
 * Avatar de iniciales en círculo con color seedeado por id/nombre.
 * Mismo patrón visual que el de admin/usuarios para mantener coherencia.
 */

const PALETTE = [
	{ bg: 'bg-blue-100 dark:bg-blue-950/60', fg: 'text-blue-700 dark:text-blue-300' },
	{ bg: 'bg-emerald-100 dark:bg-emerald-950/60', fg: 'text-emerald-700 dark:text-emerald-300' },
	{ bg: 'bg-amber-100 dark:bg-amber-950/60', fg: 'text-amber-800 dark:text-amber-300' },
	{ bg: 'bg-rose-100 dark:bg-rose-950/60', fg: 'text-rose-700 dark:text-rose-300' },
	{ bg: 'bg-indigo-100 dark:bg-indigo-950/60', fg: 'text-indigo-700 dark:text-indigo-300' },
	{ bg: 'bg-violet-100 dark:bg-violet-950/60', fg: 'text-violet-700 dark:text-violet-300' },
	{ bg: 'bg-teal-100 dark:bg-teal-950/60', fg: 'text-teal-700 dark:text-teal-300' },
	{ bg: 'bg-pink-100 dark:bg-pink-950/60', fg: 'text-pink-700 dark:text-pink-300' },
];

function hashSeed(seed: string): number {
	let h = 0;
	for (let i = 0; i < seed.length; i++) {
		h = (h << 5) - h + seed.charCodeAt(i);
		h |= 0;
	}
	return Math.abs(h);
}

function getInitials(name: string): string {
	const parts = name.trim().split(/\s+/);
	if (parts.length === 0 || !parts[0]) return '?';
	if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
	return (parts[0][0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

interface Props {
	name: string;
	seed?: string;
	size?: number;
	className?: string;
}

export function InitialsAvatar({ name, seed, size = 28, className }: Props) {
	const palette = PALETTE[hashSeed(seed ?? name) % PALETTE.length]!;
	const initials = getInitials(name || '?');
	return (
		<span
			className={cn(
				'inline-flex shrink-0 items-center justify-center rounded-full font-semibold',
				palette.bg,
				palette.fg,
				className,
			)}
			style={{ width: size, height: size, fontSize: Math.round(size * 0.4) }}
			aria-hidden="true"
		>
			{initials}
		</span>
	);
}

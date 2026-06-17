import type { ReactNode } from 'react';

import { cn } from '@components/utils';

/* ════════════════════════════════════════════════════════════════
   Divider — línea horizontal con padding vertical configurable.
   ════════════════════════════════════════════════════════════════ */
export function Divider({ pad = 28 }: { pad?: number }) {
	return (
		<div
			style={{
				height: 1,
				margin: `${pad}px 0`,
				background: 'var(--cf-line)',
			}}
		/>
	);
}

/* ════════════════════════════════════════════════════════════════
   KickerLabel — etiqueta mono uppercase tracking 0.14em.
   Para títulos cortos de sección o headers.
   ════════════════════════════════════════════════════════════════ */
export function KickerLabel({
	children,
	className,
}: {
	children: ReactNode;
	className?: string;
}) {
	return (
		<div
			className={cn(
				'cf-mono text-[10.5px] tracking-[0.14em] uppercase',
				className,
			)}
			style={{ color: 'var(--cf-ink-soft)' }}
		>
			{children}
		</div>
	);
}

/* ════════════════════════════════════════════════════════════════
   MetadataPill — pill rectangular con icono + label.
   Usada en pantalla 1 (10–15 min, Guardado automático, Datos cifrados).
   ════════════════════════════════════════════════════════════════ */
export function MetadataPill({
	icon,
	children,
}: {
	icon: ReactNode;
	children: ReactNode;
}) {
	return (
		<div
			className="inline-flex items-center gap-[7px] rounded-full border px-3 py-[7px] text-[12.5px] font-medium"
			style={{
				background: 'var(--cf-bg-subtle)',
				borderColor: 'var(--cf-line-soft)',
				color: 'var(--cf-ink)',
			}}
		>
			<span style={{ color: 'var(--cf-ink-mute)' }}>{icon}</span>
			{children}
		</div>
	);
}

/* ════════════════════════════════════════════════════════════════
   Callout — bloque destacado con borde y bg, ícono + título + desc.
   Variantes: 'accent' (verde) | 'neutral' (gris) | 'info' (azul sutil)
   ════════════════════════════════════════════════════════════════ */
type CalloutTone = 'accent' | 'neutral';

interface CalloutProps {
	tone?: CalloutTone;
	icon: ReactNode;
	title: string;
	children?: ReactNode;
}

export function Callout({
	tone = 'accent',
	icon,
	title,
	children,
}: CalloutProps) {
	const isAccent = tone === 'accent';
	return (
		<div
			className="flex items-start gap-3.5 rounded-[10px] border p-[18px_20px]"
			style={{
				background: isAccent ? 'var(--cf-accent-soft)' : 'var(--cf-bg-subtle)',
				borderColor: isAccent ? 'var(--cf-accent-border)' : 'var(--cf-line)',
			}}
		>
			<div
				className="grid h-[30px] w-[30px] shrink-0 place-items-center rounded-full border"
				style={{
					background: 'var(--cf-bg-card)',
					borderColor: isAccent ? 'var(--cf-accent-border)' : 'var(--cf-line)',
					color: isAccent ? 'var(--cf-accent-ink)' : 'var(--cf-ink-mute)',
				}}
			>
				{icon}
			</div>
			<div className="min-w-0">
				<div
					className="mb-[3px] text-[13.5px] font-semibold"
					style={{
						color: isAccent ? 'var(--cf-accent-ink)' : 'var(--cf-ink)',
					}}
				>
					{title}
				</div>
				{children && (
					<div
						className="text-[12.5px] leading-[1.55]"
						style={{
							color: isAccent ? 'var(--cf-accent-ink)' : 'var(--cf-ink-mute)',
							opacity: isAccent ? 0.92 : 1,
						}}
					>
						{children}
					</div>
				)}
			</div>
		</div>
	);
}

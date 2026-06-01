import { Icon } from '@iconify/react';

interface Props {
	/** Suma actual de porcentajes asignados (0–100+). */
	total: number;
}

/**
 * Pill compacto de participación: "PARTICIPACIÓN  100 / 100 ✓".
 * Verde cuando suma exactamente 100%; tono danger cuando falta o excede.
 */
export function MembersAllocationBar({ total }: Props) {
	const isValid = total === 100;
	const over = total > 100;

	return (
		<div
			className="inline-flex items-center gap-2.5 rounded-full border px-3.5 py-1.5"
			style={{
				background: isValid ? 'var(--cf-accent-soft)' : 'var(--cf-bg-subtle)',
				borderColor: isValid
					? 'var(--cf-accent-border)'
					: 'var(--cf-line-soft)',
			}}
		>
			<span
				className="text-[10.5px] font-semibold tracking-[0.1em] uppercase"
				style={{
					color: isValid ? 'var(--cf-accent-ink)' : 'var(--cf-ink-soft)',
				}}
			>
				Participación
			</span>

			<span className="flex items-baseline gap-1">
				<span
					className="text-[15px] font-semibold tabular-nums"
					style={{
						color: isValid ? 'var(--cf-ink)' : 'var(--cf-danger)',
					}}
				>
					{total}
				</span>
				<span
					className="text-[12px] tabular-nums"
					style={{ color: 'var(--cf-ink-soft)' }}
				>
					/ 100
				</span>
			</span>

			{isValid ? (
				<span
					className="grid h-[18px] w-[18px] place-items-center rounded-full"
					style={{ background: 'var(--cf-accent)' }}
				>
					<Icon icon="ri:check-line" className="h-3 w-3 text-white" />
				</span>
			) : (
				<span
					className="inline-flex items-center gap-1 text-[11px] font-medium"
					style={{ color: 'var(--cf-danger)' }}
				>
					<Icon icon="ri:alert-line" className="h-3.5 w-3.5" />
					{over ? `+${total - 100}%` : `faltan ${100 - total}%`}
				</span>
			)}
		</div>
	);
}

import { Icon } from '@iconify/react';

interface Props {
	/** Suma actual de porcentajes asignados (0–100+). */
	total: number;
	/** Lista de porcentajes por socio para colorear segmentos. */
	segments: number[];
}

/**
 * Pill con barra de % asignado. Calmada cuando es válida (100%), color
 * danger cuando suma ≠ 100 (faltan o excedente).
 *
 * Reemplaza el banner rojo grande que tenía el formulario anterior.
 */
export function MembersAllocationBar({ total, segments }: Props) {
	const isValid = total === 100;
	const over = total > 100;
	const labelColor = isValid
		? 'var(--cf-accent-ink)'
		: 'var(--cf-danger)';

	return (
		<div
			className="flex items-center gap-4 rounded-full border px-3.5 py-2"
			style={{
				background: 'var(--cf-bg-subtle)',
				borderColor: 'var(--cf-line-soft)',
			}}
		>
			<div className="flex items-center gap-1.5">
				<span
					className="cf-mono text-[11px] tracking-[0.08em] uppercase"
					style={{ color: 'var(--cf-ink-soft)' }}
				>
					Asignado
				</span>
				<span
					className="cf-mono text-[13.5px] font-semibold"
					style={{
						color: isValid ? 'var(--cf-ink)' : 'var(--cf-danger)',
					}}
				>
					{total}
					<span
						className="font-normal"
						style={{ color: 'var(--cf-ink-soft)' }}
					>
						%
					</span>
				</span>
			</div>

			<span
				className="block h-4 w-px"
				style={{ background: 'var(--cf-line)' }}
			/>

			<AllocationBar segments={segments} total={total} />

			<span
				className="inline-flex items-center gap-1 text-[11.5px] font-medium"
				style={{ color: labelColor }}
			>
				{isValid ? (
					<>
						<Icon
							icon="ri:check-line"
							className="h-3 w-3"
							style={{ color: 'var(--cf-accent)' }}
						/>
						Suma correcta
					</>
				) : (
					<>
						<Icon icon="ri:alert-line" className="h-3 w-3" />
						{over ? `Excedente ${total - 100}%` : `Faltan ${100 - total}%`}
					</>
				)}
			</span>
		</div>
	);
}

/* Barra dividida en segmentos por socio, color accent con opacidad
   decreciente para distinguir aporte de cada uno. Cuando excede 100%
   se pinta en danger. */
function AllocationBar({
	segments,
	total,
}: {
	segments: number[];
	total: number;
}) {
	const danger = total > 100 || total === 0;
	let cumulative = 0;
	return (
		<div
			className="relative h-1.5 w-[180px] overflow-hidden rounded-full"
			style={{ background: 'var(--cf-line)' }}
			role="progressbar"
			aria-valuenow={Math.min(100, total)}
			aria-valuemin={0}
			aria-valuemax={100}
		>
			{segments.map((seg, i) => {
				const start = cumulative;
				cumulative += seg;
				const clamped = Math.min(seg, 100 - start);
				if (clamped <= 0) return null;
				return (
					<div
						key={i}
						className="absolute top-0 bottom-0 rounded-full"
						style={{
							left: `${start}%`,
							width: `${clamped}%`,
							background: danger ? 'var(--cf-danger)' : 'var(--cf-accent)',
							opacity: danger ? 1 : 1 - i * 0.18,
						}}
					/>
				);
			})}
		</div>
	);
}

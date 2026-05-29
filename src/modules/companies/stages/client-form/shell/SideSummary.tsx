export interface SideSummaryItem {
	label: string;
	value: string;
}

interface Props {
	items: SideSummaryItem[];
}

/**
 * Card de resumen acumulado en el rail izquierdo.
 * Solo se renderiza cuando hay items (a partir del paso 2 en adelante).
 *
 * Muestra datos clave de pasos previos para que el usuario tenga
 * contexto sin tener que volver atrás.
 */
export function SideSummary({ items }: Props) {
	if (items.length === 0) return null;
	return (
		<div
			className="mt-5 rounded-[10px] border p-[18px]"
			style={{
				background: 'var(--cf-bg-card)',
				borderColor: 'var(--cf-line)',
			}}
		>
			<div
				className="cf-mono mb-2.5 text-[10px] tracking-[0.14em] uppercase"
				style={{ color: 'var(--cf-ink-soft)' }}
			>
				Tu progreso
			</div>
			<div className="flex flex-col gap-3">
				{items.map((item, idx) => (
					<div key={`${item.label}-${idx}`} className="flex flex-col gap-0.5">
						<div
							className="text-[11px]"
							style={{ color: 'var(--cf-ink-soft)' }}
						>
							{item.label}
						</div>
						<div
							className="text-[13px] font-medium tracking-[-0.005em]"
							style={{ color: 'var(--cf-ink)' }}
						>
							{item.value}
						</div>
					</div>
				))}
			</div>
		</div>
	);
}

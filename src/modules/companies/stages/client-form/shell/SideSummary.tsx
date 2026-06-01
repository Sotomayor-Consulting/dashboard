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
		<div className="mt-6 flex flex-col">
			{items.map((item, idx) => (
				<div
					key={`${item.label}-${idx}`}
					className="flex flex-col gap-1 py-3"
					style={{
						borderBottom:
							idx < items.length - 1
								? '1px solid var(--cf-line)'
								: 'none',
					}}
				>
					<div
						className="text-[11.5px]"
						style={{ color: 'var(--cf-ink-soft)' }}
					>
						{item.label}
					</div>
					<div
						className="text-[14px] font-semibold tracking-[-0.005em]"
						style={{ color: 'var(--cf-ink)' }}
					>
						{item.value}
					</div>
				</div>
			))}
		</div>
	);
}

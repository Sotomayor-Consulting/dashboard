interface Props {
	/** Kicker mono uppercase encima del título. Ej: "A · OPERACIÓN". */
	kicker?: string;
	title: string;
	desc?: string;
}

/**
 * Header de sección con kicker mono + título + descripción opcional.
 * Marca el inicio de una sub-sección dentro de un paso.
 */
export function SectionHeader({ kicker, title, desc }: Props) {
	return (
		<div className="mb-[18px]">
			{kicker && (
				<div
					className="cf-mono mb-1 text-[10.5px] tracking-[0.14em] uppercase"
					style={{ color: 'var(--cf-ink-soft)' }}
				>
					{kicker}
				</div>
			)}
			<div
				className="text-[16px] font-semibold tracking-[-0.01em]"
				style={{ color: 'var(--cf-ink)' }}
			>
				{title}
			</div>
			{desc && (
				<div
					className="mt-1 text-[13px] leading-[1.5]"
					style={{ color: 'var(--cf-ink-mute)' }}
				>
					{desc}
				</div>
			)}
		</div>
	);
}

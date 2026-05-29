import { Icon } from '@iconify/react';

interface Props {
	num: number;
	/** Iconify name (ej: 'ri:briefcase-line'). */
	icon: string;
	title: string;
	description: string;
	estimatedTime: string;
}

/**
 * Fila de la checklist de la pantalla de bienvenida.
 * Estructura: cuadrado con icono (38×38) · número + título · descripción · pill de tiempo.
 * Separador inferior `lineSoft`.
 */
export function ChecklistRow({
	num,
	icon,
	title,
	description,
	estimatedTime,
}: Props) {
	return (
		<div
			className="flex items-start gap-4 border-b py-[18px]"
			style={{ borderColor: 'var(--cf-line-soft)' }}
		>
			<div
				className="grid h-[38px] w-[38px] shrink-0 place-items-center rounded-[10px]"
				style={{
					background: 'var(--cf-bg-subtle)',
					color: 'var(--cf-ink)',
				}}
			>
				<Icon icon={icon} className="h-[18px] w-[18px]" />
			</div>
			<div className="min-w-0 flex-1">
				<div className="mb-0.5 flex items-center gap-2.5">
					<span
						className="cf-mono text-[11px]"
						style={{ color: 'var(--cf-ink-soft)' }}
					>
						{String(num).padStart(2, '0')}
					</span>
					<span
						className="text-[15px] font-semibold tracking-[-0.005em]"
						style={{ color: 'var(--cf-ink)' }}
					>
						{title}
					</span>
				</div>
				<div
					className="text-[13px] leading-[1.5]"
					style={{ color: 'var(--cf-ink-mute)' }}
				>
					{description}
				</div>
			</div>
			<div
				className="inline-flex h-[22px] shrink-0 items-center gap-1 self-center rounded-full border px-2.5 text-[11px]"
				style={{
					background: 'var(--cf-bg-subtle)',
					borderColor: 'var(--cf-line-soft)',
					color: 'var(--cf-ink-mute)',
				}}
			>
				<Icon
					icon="ri:time-line"
					className="h-[11px] w-[11px]"
					style={{ color: 'var(--cf-ink-soft)' }}
				/>
				{estimatedTime}
			</div>
		</div>
	);
}

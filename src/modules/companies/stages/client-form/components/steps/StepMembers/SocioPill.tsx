import { Icon } from '@iconify/react';

export type SocioStatus = 'complete' | 'inProgress' | 'empty';

interface Props {
	num: number;
	name: string;
	percentage: number;
	status: SocioStatus;
	pendingCount?: number;
	active: boolean;
	onClick: () => void;
	onDelete?: (() => void) | undefined;
}

/**
 * Card horizontal por socio. Estructura vertical:
 *   - Header row: "SOCIO 0X" mono · "60%" mono
 *   - Nombre completo (truncate ellipsis)
 *   - Status pill: ícono + label
 *
 * Estados:
 *   - complete:   check verde + "Completo"
 *   - inProgress: dot ámbar + "N pendientes"
 *   - empty:      dot gris + "Sin iniciar"
 *
 * Cuando `active`, borde ink + shadow sutil (efecto flotante).
 */
export function SocioPill({
	num,
	name,
	percentage,
	status,
	pendingCount,
	active,
	onClick,
	onDelete,
}: Props) {
	const meta = (() => {
		switch (status) {
			case 'complete':
				return {
					color: 'var(--cf-accent)',
					label: 'Completo',
					icon: 'ri:check-line' as const,
				};
			case 'inProgress':
				return {
					color: '#b45309',
					label:
						pendingCount !== undefined
							? `${pendingCount} pendiente${pendingCount === 1 ? '' : 's'}`
							: 'En progreso',
					icon: null,
				};
			default:
				return {
					color: 'var(--cf-ink-soft)',
					label: 'Sin iniciar',
					icon: null,
				};
		}
	})();

	return (
		<button
			type="button"
			onClick={onClick}
			className="relative flex min-w-0 flex-1 cursor-pointer flex-col gap-1.5 rounded-[12px] border-[1.5px] p-[14px_16px] text-left transition-all"
			style={{
				borderColor: active ? 'var(--cf-ink)' : 'var(--cf-line)',
				background: 'var(--cf-bg-card)',
				boxShadow: active ? 'var(--cf-shadow-active-card)' : 'none',
			}}
			aria-current={active ? 'true' : undefined}
		>
			<div className="flex items-center justify-between">
				<span
					className="cf-mono text-[10.5px] tracking-[0.12em] uppercase"
					style={{ color: 'var(--cf-ink-soft)' }}
				>
					Socio {String(num).padStart(2, '0')}
				</span>
				<div className="flex items-center gap-1.5">
					<span
						className="cf-mono text-[11px] font-semibold"
						style={{
							color:
								percentage > 0 ? 'var(--cf-ink)' : 'var(--cf-ink-faint)',
						}}
					>
						{percentage}%
					</span>
					{onDelete && (
						<span
							role="button"
							tabIndex={0}
							onClick={(e) => {
								e.stopPropagation();
								onDelete();
							}}
							onKeyDown={(e) => {
								if (e.key === 'Enter' || e.key === ' ') {
									e.stopPropagation();
									onDelete();
								}
							}}
							className="inline-flex rounded p-0.5 transition-colors hover:bg-red-100 dark:hover:bg-red-950"
							style={{ color: 'var(--cf-ink-soft)' }}
							aria-label="Eliminar socio"
						>
							<Icon icon="ri:close-line" className="h-3.5 w-3.5 hover:text-red-500" />
						</span>
					)}
				</div>
			</div>
			<div
				className="truncate text-[14px] font-semibold tracking-[-0.005em]"
				style={{
					color: name ? 'var(--cf-ink)' : 'var(--cf-ink-faint)',
				}}
			>
				{name || 'Sin nombre'}
			</div>
			<div
				className="inline-flex items-center gap-1.5 text-[11.5px] font-medium"
				style={{ color: meta.color }}
			>
				{meta.icon ? (
					<Icon icon={meta.icon} className="h-3 w-3" />
				) : (
					<span
						className="inline-block h-1.5 w-1.5 rounded-full"
						style={{ background: meta.color }}
					/>
				)}
				{meta.label}
			</div>
		</button>
	);
}

/**
 * Botón con borde dashed para agregar un nuevo socio.
 * `fill` → ocupa toda la celda (modo grilla con muchos socios).
 */
export function AddSocioButton({
	onClick,
	fill = false,
	disabled = false,
}: {
	onClick: () => void;
	fill?: boolean;
	disabled?: boolean;
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			className={`flex flex-col items-center justify-center gap-1.5 rounded-[12px] border-[1.5px] border-dashed p-[14px_14px] text-[13px] font-medium transition-colors ${
				disabled ? 'cursor-not-allowed opacity-40' : 'hover:opacity-80'
			} ${fill ? 'h-full w-full' : 'w-[140px] shrink-0'}`}
			style={{
				borderColor: 'var(--cf-line-strong)',
				background: 'transparent',
				color: 'var(--cf-ink-mute)',
			}}
			disabled={disabled}
		>
			<Icon icon="ri:add-line" className="h-4 w-4" />
			Agregar socio
		</button>
	);
}

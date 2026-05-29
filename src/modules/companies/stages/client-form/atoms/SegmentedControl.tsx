import { cn } from '@components/utils';

interface Option<T extends string> {
	value: T;
	label: string;
}

interface Props<T extends string> {
	options: ReadonlyArray<Option<T>>;
	value: T;
	onChange: (v: T) => void;
	size?: 'sm' | 'md';
	/** Si true, el control se muestra bloqueado (no responde a clics). */
	disabled?: boolean;
}

/**
 * Segmented control: dos o más opciones inline (Pública/Privada,
 * Dibujar/Escribir/Subir, etc.). La opción activa tiene fondo blanco con
 * sombra sutil, las inactivas son transparentes con color inkMute.
 *
 * Funciona con teclado: cada opción es un `<button>` con focus visible.
 */
export function SegmentedControl<T extends string>({
	options,
	value,
	onChange,
	size = 'md',
	disabled = false,
}: Props<T>) {
	const py = size === 'sm' ? 'py-1' : 'py-1.5';
	const px = size === 'sm' ? 'px-2.5' : 'px-3.5';
	const fs = size === 'sm' ? 'text-[11.5px]' : 'text-[12.5px]';

	return (
		<div
			className={cn(
				'inline-flex rounded-lg border p-[3px]',
				disabled && 'opacity-60',
			)}
			style={{
				background: 'var(--cf-bg-subtle)',
				borderColor: 'var(--cf-line-soft)',
			}}
		>
			{options.map((opt) => {
				const active = opt.value === value;
				return (
					<button
						key={opt.value}
						type="button"
						disabled={disabled}
						onClick={() => !disabled && onChange(opt.value)}
						className={cn(
							'rounded-md font-medium transition-all',
							py,
							px,
							fs,
							disabled ? 'cursor-not-allowed' : 'cursor-pointer',
						)}
						style={{
							background: active ? 'var(--cf-bg-card)' : 'transparent',
							color: active ? 'var(--cf-ink)' : 'var(--cf-ink-mute)',
							boxShadow: active ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
						}}
					>
						{opt.label}
					</button>
				);
			})}
		</div>
	);
}

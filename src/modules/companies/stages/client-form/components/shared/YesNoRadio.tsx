import { cn } from '@components/utils';
import { RadioGroup, RadioGroupItem } from '@components/ui/RadioGroup';

interface Props {
	value: boolean | null;
	onChange: (value: boolean) => void;
	name?: string;
	yesLabel?: string;
	noLabel?: string;
	className?: string;
}

/**
 * Patrón Sí/No usado repetidamente en el wizard.
 * Renderiza dos tarjetas radio que se resaltan al seleccionar.
 */
export function YesNoRadio({
	value,
	onChange,
	name,
	yesLabel = 'Sí',
	noLabel = 'No',
	className,
}: Props) {
	const current = value === null ? '' : value ? 'si' : 'no';
	return (
		<RadioGroup
			name={name}
			value={current}
			onValueChange={(v) => onChange(v === 'si')}
			className={cn('flex gap-4', className)}
		>
			<label
				className={cn(
					'flex flex-1 cursor-pointer items-center gap-3 rounded-lg border-2 px-4 py-3 transition-all',
					value === true
						? 'border-accent bg-accent/5'
						: 'border-border hover:border-accent/50',
				)}
			>
				<RadioGroupItem value="si" />
				<span className="font-medium">{yesLabel}</span>
			</label>
			<label
				className={cn(
					'flex flex-1 cursor-pointer items-center gap-3 rounded-lg border-2 px-4 py-3 transition-all',
					value === false
						? 'border-accent bg-accent/5'
						: 'border-border hover:border-accent/50',
				)}
			>
				<RadioGroupItem value="no" />
				<span className="font-medium">{noLabel}</span>
			</label>
		</RadioGroup>
	);
}

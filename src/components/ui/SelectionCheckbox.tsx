import { Checkbox as CheckboxPrimitive } from '@base-ui/react/checkbox';
import { CheckIcon, MinusIcon } from 'lucide-react';

import { cn } from '@components/utils';

interface HeaderModeProps {
	mode: 'header';
	/** none = ninguna fila visible seleccionada · some = parcial · all = todas */
	selectionMode: 'none' | 'some' | 'all';
	onToggle: () => void;
	ariaLabel?: string;
}

interface RowModeProps {
	mode: 'row';
	checked: boolean;
	onToggle: () => void;
	ariaLabel?: string;
}

type Props = HeaderModeProps | RowModeProps;

const BASE_CLASS =
	'peer dark:border-input border-white-400 focus-visible:border-ring focus-visible:ring-ring/50 dark:bg-input/30 data-checked:border-primary data-checked:bg-black-600 data-checked:text-primary-foreground data-indeterminate:border-primary data-indeterminate:bg-black-600 data-indeterminate:text-primary-foreground relative flex size-4 shrink-0 cursor-pointer items-center justify-center rounded-[4px] border transition-colors outline-none focus-visible:ring-3 disabled:cursor-not-allowed disabled:opacity-50 dark:data-checked:bg-white dark:data-indeterminate:bg-white';

/**
 * Checkbox de selección de tabla con estado indeterminado.
 * - mode="header": refleja none/some/all (some = guion).
 * - mode="row": checked individual.
 * - stopPropagation para no disparar el onClick de la fila.
 */
export function SelectionCheckbox(props: Props) {
	const isHeader = props.mode === 'header';
	const checked = isHeader ? props.selectionMode === 'all' : props.checked;
	const indeterminate = isHeader && props.selectionMode === 'some';

	return (
		<CheckboxPrimitive.Root
			checked={checked}
			indeterminate={indeterminate}
			onCheckedChange={() => props.onToggle()}
			onClick={(e) => e.stopPropagation()}
			aria-label={
				props.ariaLabel ?? (isHeader ? 'Seleccionar todas las filas' : 'Seleccionar fila')
			}
			className={cn(BASE_CLASS)}
		>
			<CheckboxPrimitive.Indicator
				keepMounted
				className="grid place-content-center text-current [&>svg]:size-3.5"
			>
				{indeterminate ? <MinusIcon /> : checked ? <CheckIcon /> : null}
			</CheckboxPrimitive.Indicator>
		</CheckboxPrimitive.Root>
	);
}

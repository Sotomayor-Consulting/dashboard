import { RadioGroup as RadioGroupPrimitive } from '@base-ui/react/radio-group';
import { Radio as RadioPrimitive } from '@base-ui/react/radio';

import { cn } from '@components/utils';

function RadioGroup({ className, ...props }: RadioGroupPrimitive.Props) {
	return (
		<RadioGroupPrimitive
			data-slot="radio-group"
			className={cn('grid gap-2', className)}
			{...props}
		/>
	);
}

function RadioGroupItem({
	className,
	...props
}: RadioPrimitive.Root.Props) {
	return (
		<RadioPrimitive.Root
			data-slot="radio-group-item"
			className={cn(
				'peer border-white-400 dark:border-input focus-visible:border-ring focus-visible:ring-ring/50 data-checked:border-primary aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 relative inline-flex size-4 shrink-0 items-center justify-center rounded-full border outline-none transition-colors focus-visible:ring-3 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:ring-3',
				className,
			)}
			{...props}
		>
			<RadioPrimitive.Indicator
				data-slot="radio-group-indicator"
				className="bg-primary dark:bg-white absolute size-2 rounded-full opacity-0 transition-opacity data-checked:opacity-100"
			/>
		</RadioPrimitive.Root>
	);
}

export { RadioGroup, RadioGroupItem };

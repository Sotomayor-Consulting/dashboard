import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@components/utils';

const alertVariants = cva(
	'relative grid w-full grid-cols-[auto_1fr_auto] items-start gap-3 rounded-xl border px-4 py-3 text-sm shadow-lg',
	{
		variants: {
			variant: {
				default: 'bg-card text-card-foreground border-border',
				success:
					'border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-100',
				destructive:
					'border-red-200 bg-red-50 text-red-900 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-100',
			},
		},
		defaultVariants: {
			variant: 'default',
		},
	},
);

function Alert({
	className,
	variant,
	...props
}: React.ComponentProps<'div'> & VariantProps<typeof alertVariants>) {
	return (
		<div
			role="alert"
			data-slot="alert"
			data-variant={variant}
			className={cn(alertVariants({ variant }), className)}
			{...props}
		/>
	);
}

function AlertTitle({ className, ...props }: React.ComponentProps<'div'>) {
	return (
		<div
			data-slot="alert-title"
			className={cn('leading-none font-medium tracking-tight', className)}
			{...props}
		/>
	);
}

function AlertDescription({
	className,
	...props
}: React.ComponentProps<'div'>) {
	return (
		<div
			data-slot="alert-description"
			className={cn('text-sm leading-relaxed', className)}
			{...props}
		/>
	);
}

export { Alert, AlertDescription, AlertTitle };

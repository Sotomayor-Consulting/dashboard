import * as React from 'react';

import { cn } from '@components/utils';

type CardColor = 'default' | 'brand';

function Card({
	className,
	color = 'default',
	size = 'default',
	...props
}: React.ComponentProps<'div'> & { color?: CardColor; size?: 'default' | 'sm' }) {
	const colorClassName =
		color === 'brand'
			? 'text-card-foreground to-black-600 from-black-900 border-gray-200 bg-white dark:border-gray-700 dark:bg-linear-to-tr dark:shadow-none'
			: 'bg-card text-card-foreground border-border';

	return (
		<div
			data-slot="card"
			data-size={size}
			className={cn(
				'group/card flex flex-col gap-4 overflow-hidden rounded-xl border text-sm has-[>img:first-child]:pt-0 has-data-[slot=card-footer]:pb-0 data-[size=sm]:gap-3 *:[img:first-child]:rounded-t-xl *:[img:last-child]:rounded-b-xl',
				colorClassName,
				className,
			)}
			{...props}
		/>
	);
}

function CardHeader({ className, ...props }: React.ComponentProps<'div'>) {
	return (
		<div
			data-slot="card-header"
			className={cn(
				'group/card-header @container/card-header grid auto-rows-min items-start gap-1 rounded-t-xl px-4 group-data-[size=sm]/card:px-3 has-data-[slot=card-action]:grid-cols-[1fr_auto] has-data-[slot=card-description]:grid-rows-[auto_auto] [.border-b]:pb-4 group-data-[size=sm]/card:[.border-b]:pb-3',
				className,
			)}
			{...props}
		/>
	);
}

function CardTitle({ className, ...props }: React.ComponentProps<'div'>) {
	return (
		<div
			data-slot="card-title"
			className={cn(
				'font-heading text-base leading-snug font-medium group-data-[size=sm]/card:text-sm',
				className,
			)}
			{...props}
		/>
	);
}

function CardDescription({ className, ...props }: React.ComponentProps<'div'>) {
	return (
		<div
			data-slot="card-description"
			className={cn('text-muted-foreground text-sm', className)}
			{...props}
		/>
	);
}

function CardAction({ className, ...props }: React.ComponentProps<'div'>) {
	return (
		<div
			data-slot="card-action"
			className={cn(
				'col-start-2 row-span-2 row-start-1 self-start justify-self-end',
				className,
			)}
			{...props}
		/>
	);
}

function CardContent({ className, ...props }: React.ComponentProps<'div'>) {
	return (
		<div
			data-slot="card-content"
			className={cn('px-4 group-data-[size=sm]/card:px-3', className)}
			{...props}
		/>
	);
}

function CardFooter({ className, ...props }: React.ComponentProps<'div'>) {
	return (
		<div
			data-slot="card-footer"
			className={cn(
				'bg-muted/50 flex items-center rounded-b-xl border-t p-4 group-data-[size=sm]/card:p-3',
				className,
			)}
			{...props}
		/>
	);
}

export {
	Card,
	CardHeader,
	CardFooter,
	CardTitle,
	CardAction,
	CardDescription,
	CardContent,
};

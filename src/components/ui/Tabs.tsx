import { Tabs as TabsPrimitive } from '@base-ui/react/tabs';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@components/utils';

function Tabs({
	className,
	orientation = 'horizontal',
	...props
}: TabsPrimitive.Root.Props) {
	return (
		<TabsPrimitive.Root
			data-slot="tabs"
			data-orientation={orientation}
			className={cn(
				'group/tabs flex gap-2 data-horizontal:flex-col',
				className,
			)}
			{...props}
		/>
	);
}

const tabsListVariants = cva(
	'group/tabs-list mt-4 inline-flex w-fit items-center gap-1 rounded-lg border border-gray-200 bg-white p-1 text-xs font-medium shadow-sm shadow-gray-200/70 group-data-vertical/tabs:h-fit group-data-vertical/tabs:flex-col dark:border-gray-700 dark:bg-transparent dark:shadow-none',
	{
		variants: {
			variant: {
				default: '',
				line: '',
			},
		},
		defaultVariants: {
			variant: 'default',
		},
	},
);

function TabsList({
	className,
	variant = 'default',
	...props
}: TabsPrimitive.List.Props & VariantProps<typeof tabsListVariants>) {
	return (
		<TabsPrimitive.List
			data-slot="tabs-list"
			data-variant={variant}
			className={cn(tabsListVariants({ variant }), className)}
			{...props}
		/>
	);
}

function TabsTrigger({ className, ...props }: TabsPrimitive.Tab.Props) {
	return (
		<TabsPrimitive.Tab
			data-slot="tabs-trigger"
			className={cn(
				'link-moderate inline-flex items-center justify-center gap-2 rounded-md px-3 py-2 text-xs font-medium whitespace-nowrap text-gray-600 transition-colors group-data-vertical/tabs:w-fit group-data-vertical/tabs:justify-start hover:bg-gray-100 hover:text-gray-900 focus-visible:ring-2 focus-visible:ring-gray-300 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 data-active:bg-gray-100 data-active:text-gray-900 data-active:shadow-sm dark:text-gray-300 dark:hover:bg-neutral-950 dark:hover:text-white dark:focus-visible:ring-gray-700 dark:data-active:bg-neutral-900 dark:data-active:text-white',
				'[&_svg]:pointer-events-none [&_svg]:h-4 [&_svg]:w-4 [&_svg]:shrink-0',
				className,
			)}
			{...props}
		/>
	);
}

function TabsContent({ className, ...props }: TabsPrimitive.Panel.Props) {
	return (
		<TabsPrimitive.Panel
			data-slot="tabs-content"
			className={cn('flex-1 text-sm outline-none', className)}
			{...props}
		/>
	);
}

export { Tabs, TabsList, TabsTrigger, TabsContent, tabsListVariants };

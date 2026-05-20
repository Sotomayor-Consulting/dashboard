import * as React from 'react';
import { Button } from '@components/ui/Button';
import {
	Sheet,
	SheetContent,
	SheetFooter,
	SheetHeader,
	SheetTitle,
} from '@components/ui/Sheet';

interface Props {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	title: string;
	submitLabel: string;
	onSubmit: () => void;
	children: React.ReactNode;
}

export default function CrudFormSheet({
	open,
	onOpenChange,
	title,
	submitLabel,
	onSubmit,
	children,
}: Props) {
	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent
				side="right"
				className="max-h-dvh max-w-[500px] overflow-y-auto sm:max-w-2xl"
			>
				<SheetHeader className="pb-3">
					<SheetTitle>{title}</SheetTitle>
				</SheetHeader>
				<div className="flex flex-col gap-4 pb-4">{children}</div>
				<SheetFooter>
					<Button type="button" onClick={onSubmit}>
						{submitLabel}
					</Button>
					<Button
						type="button"
						variant="outline"
						onClick={() => onOpenChange(false)}
					>
						Cancelar
					</Button>
				</SheetFooter>
			</SheetContent>
		</Sheet>
	);
}

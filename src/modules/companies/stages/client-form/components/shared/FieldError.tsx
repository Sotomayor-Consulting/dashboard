import { cn } from '@components/utils';

interface Props {
	message?: string;
	className?: string;
}

export function FieldError({ message, className }: Props) {
	if (!message) return null;
	return (
		<p
			role="alert"
			className={cn('text-destructive mt-1 text-xs', className)}
		>
			{message}
		</p>
	);
}

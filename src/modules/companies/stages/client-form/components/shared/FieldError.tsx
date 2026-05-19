import { cn } from '@components/utils';

interface Props {
	// Con `exactOptionalPropertyTypes` activado, el `| undefined` explícito
	// permite pasar el resultado directo de `errors.foo?.message` sin asserts.
	message?: string | undefined;
	className?: string | undefined;
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

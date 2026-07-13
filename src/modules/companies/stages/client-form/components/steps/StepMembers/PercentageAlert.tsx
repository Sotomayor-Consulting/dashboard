import { Icon } from '@iconify/react';

interface Props {
	total: number;
}

export function PercentageAlert({ total }: Props) {
	if (total === 100) return null;
	const diff = 100 - total;
	return (
		<div className="bg-destructive/10 border-destructive/30 flex items-start gap-3 rounded-lg border p-4">
			<Icon
				icon="ri:alert-line"
				className="text-destructive mt-0.5 h-5 w-5 shrink-0"
			/>
			<div>
				<p className="text-destructive text-sm font-medium">
					La suma de los porcentajes debe ser exactamente 100%
				</p>
				<p className="text-destructive/80 mt-0.5 text-xs">
					Actualmente: {total}% —{' '}
					{diff > 0 ? `Faltan ${diff}%` : `Sobran ${-diff}%`}
				</p>
			</div>
		</div>
	);
}

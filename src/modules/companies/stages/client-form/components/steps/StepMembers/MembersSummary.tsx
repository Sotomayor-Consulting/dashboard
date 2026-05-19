import { Icon } from '@iconify/react';

import { cn } from '@components/utils';

import type { Member } from '../../../types';

interface Props {
	members: Member[];
	total: number;
}

export function MembersSummary({ members, total }: Props) {
	const valid = total === 100;
	return (
		<div className="bg-muted/50 rounded-lg p-4">
			<h4 className="text-foreground mb-3 font-medium">Resumen de socios</h4>
			<div className="space-y-2">
				{members.map((m, i) => (
					<div
						key={m.id}
						className="flex items-center justify-between text-sm"
					>
						<span className="text-foreground">
							{m.nombreCompleto || `Socio ${i + 1}`}
						</span>
						<span
							className={cn(
								'font-medium',
								m.porcentaje > 0
									? 'text-foreground'
									: 'text-muted-foreground',
							)}
						>
							{m.porcentaje || 0}%
						</span>
					</div>
				))}
				<div className="border-border mt-2 flex items-center justify-between border-t pt-2">
					<span className="text-foreground font-medium">Total</span>
					<span
						className={cn(
							'flex items-center gap-1.5 font-semibold',
							valid ? 'text-accent' : 'text-destructive',
						)}
					>
						{valid && <Icon icon="ri:check-line" className="h-4 w-4" />}
						{total}%
					</span>
				</div>
			</div>
		</div>
	);
}

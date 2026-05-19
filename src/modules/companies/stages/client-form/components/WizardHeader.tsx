import { Icon } from '@iconify/react';

export function WizardHeader() {
	return (
		<header className="bg-card/95 supports-[backdrop-filter]:bg-card/80 border-border sticky top-0 z-50 border-b backdrop-blur">
			<div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4">
				<div className="flex items-center gap-3">
					<div className="bg-primary flex h-10 w-10 items-center justify-center rounded-lg">
						<Icon
							icon="ri:building-2-line"
							className="text-primary-foreground h-5 w-5"
						/>
					</div>
					<div>
						<span className="text-foreground block text-lg leading-tight font-semibold">
							Sotomayor Consulting
						</span>
						<span className="text-muted-foreground text-xs">
							Incorporación LLC
						</span>
					</div>
				</div>
				<div className="text-muted-foreground flex items-center gap-4 text-sm">
					<div className="hidden items-center gap-1.5 sm:flex">
						<Icon icon="ri:shield-check-line" className="text-accent h-4 w-4" />
						<span>Datos seguros</span>
					</div>
					<div className="hidden items-center gap-1.5 sm:flex">
						<Icon icon="ri:time-line" className="text-accent h-4 w-4" />
						<span>~15 min</span>
					</div>
				</div>
			</div>
		</header>
	);
}

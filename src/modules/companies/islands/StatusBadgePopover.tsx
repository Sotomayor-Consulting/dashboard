import { Tooltip, TooltipTrigger, TooltipContent } from '@components/ui/Tooltip';

/** Badge de estado "draft" con popover explicativo en hover. */
interface StatusBadgePopoverProps {
	estadoLabel: string;
}

export default function StatusBadgePopover({
	estadoLabel,
}: StatusBadgePopoverProps) {
	return (
		<Tooltip>
			<TooltipTrigger
				render={<span className="badge-status bg-muted text-foreground" />}
			>
				<span className="mr-1 h-2 w-2 animate-pulse rounded-full bg-orange-500" />
				{estadoLabel}
			</TooltipTrigger>
			<TooltipContent
				side="bottom"
				align="end"
				className="w-72 rounded-lg border border-gray-200 bg-white p-0 text-sm text-gray-500 shadow-xs dark:border-gray-600 dark:bg-gray-800 dark:text-gray-400"
			>
				<div className="space-y-2 p-3 text-left">
					<h3 className="font-semibold text-gray-900 dark:text-white">
						¿Por qué mi empresa está en proceso?
					</h3>
					<p>Tu empresa está en proceso por estas razones:</p>
					<ul className="list-inside list-disc space-y-1">
						<li>
							Tu empresa aún no está configurada al 100% y está pendiente el
							pago para iniciar el proceso de constitución.
						</li>
						<li>
							Tu empresa está en proceso de incorporación legal (si ya iniciaste
							el proceso de pago). Te informaremos por notificaciones y correo.
						</li>
					</ul>
				</div>
			</TooltipContent>
		</Tooltip>
	);
}

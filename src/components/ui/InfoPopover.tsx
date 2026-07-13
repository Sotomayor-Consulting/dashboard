import { Tooltip, TooltipTrigger, TooltipContent } from './Tooltip';
import { cn } from '@components/utils';

/**
 * Popover informativo en hover (reemplazo del patrón data-popover de
 * Flowbite): ícono "i" como trigger + card con título y texto.
 * Base UI (Tooltip) hace posicionamiento, flip y accesibilidad.
 */
interface InfoPopoverProps {
	/** Título de la card */
	title?: string;
	/** Texto del cuerpo */
	text: string;
	/** Etiqueta accesible del trigger. Default: 'Mostrar información' */
	label?: string;
	/** Lado del popover. Default: 'bottom' */
	side?: 'top' | 'bottom' | 'left' | 'right';
	/** Alineación. Default: 'end' */
	align?: 'start' | 'center' | 'end';
	/** Clases extra para el ícono del trigger */
	iconClass?: string;
}

export default function InfoPopover({
	title,
	text,
	label = 'Mostrar información',
	side = 'bottom',
	align = 'end',
	iconClass,
}: InfoPopoverProps) {
	return (
		<Tooltip>
			<TooltipTrigger
				className="inline-flex items-center bg-transparent p-0"
				aria-label={label}
			>
				<svg
					className={cn(
						'ml-2 h-4 w-4 text-gray-400 hover:text-gray-500',
						iconClass,
					)}
					aria-hidden="true"
					fill="currentColor"
					viewBox="0 0 20 20"
					xmlns="http://www.w3.org/2000/svg"
				>
					<path
						fillRule="evenodd"
						d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z"
						clipRule="evenodd"
					/>
				</svg>
			</TooltipTrigger>
			<TooltipContent
				side={side}
				align={align}
				className="w-72 rounded-lg border border-gray-200 bg-white p-0 text-sm font-light text-gray-500 shadow-sm dark:border-gray-600 dark:bg-neutral-900 dark:text-gray-400"
			>
				<div className="space-y-2 p-3 text-left">
					{title ? (
						<h3 className="font-semibold text-gray-900 dark:text-white">
							{title}
						</h3>
					) : null}
					<p>{text}</p>
				</div>
			</TooltipContent>
		</Tooltip>
	);
}

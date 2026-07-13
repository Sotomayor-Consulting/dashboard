import { Icon } from '@iconify/react';

import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from '@components/ui/Tooltip';

interface Props {
	text: string;
}

export function FieldTooltip({ text }: Props) {
	return (
		<Tooltip>
			<TooltipTrigger
				render={
					<button
						type="button"
						className="text-muted-foreground hover:text-foreground ml-1.5 inline-flex"
					>
						<Icon icon="ri:question-line" className="h-3.5 w-3.5" />
						<span className="sr-only">Ayuda</span>
					</button>
				}
			/>
			<TooltipContent className="max-w-xs">{text}</TooltipContent>
		</Tooltip>
	);
}

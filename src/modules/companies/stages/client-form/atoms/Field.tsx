import type { ReactNode } from 'react';

import { Icon } from '@iconify/react';

import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from '@components/ui/Tooltip';

interface Props {
	label: ReactNode;
	hint?: string | undefined;
	required?: boolean | undefined;
	htmlFor?: string | undefined;
	error?: string | undefined;
	children: ReactNode;
}

/**
 * Field: label + opcional hint icon + children.
 *
 * - Label 13px medium, marginBottom 7px.
 * - Hint: ícono info que abre tooltip al hover.
 * - Required: asterisco en danger.
 * - Error: caption danger debajo con ícono.
 */
export function Field({
	label,
	hint,
	required,
	htmlFor,
	error,
	children,
}: Props) {
	return (
		<div className="min-w-0">
			<div className="mb-[7px] flex items-center gap-1.5">
				<label
					htmlFor={htmlFor}
					className="text-[13px] font-medium tracking-[-0.005em]"
					style={{ color: 'var(--cf-ink)' }}
				>
					{label}
					{required && (
						<span className="ml-0.5" style={{ color: 'var(--cf-danger)' }}>
							*
						</span>
					)}
				</label>
				{hint && (
					<Tooltip>
						<TooltipTrigger
							render={
								<span
									className="inline-flex cursor-help"
									style={{ color: 'var(--cf-ink-faint)' }}
								>
									<Icon
										icon="ri:information-line"
										className="h-[13px] w-[13px]"
									/>
								</span>
							}
						/>
						<TooltipContent>{hint}</TooltipContent>
					</Tooltip>
				)}
			</div>
			{children}
			{error && (
				<div
					className="mt-1.5 flex items-center gap-1 text-[12px]"
					style={{ color: 'var(--cf-danger)' }}
				>
					<Icon icon="ri:error-warning-line" className="h-3 w-3" />
					{error}
				</div>
			)}
		</div>
	);
}

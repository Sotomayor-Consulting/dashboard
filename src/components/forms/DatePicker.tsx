import * as React from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@components/lib/utils';
import { Button } from '@components/components/ui/button';
import { Calendar } from '@components/components/ui/calendar';
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from '@components/components/ui/popover';

/** Parsea "YYYY-MM-DD" a Date en hora local */
function parseISODate(value: string): Date | undefined {
	if (!value) return undefined;
	const [y, m, d] = value.split('-').map(Number);
	const date = new Date(y, m - 1, d);
	return isNaN(date.getTime()) ? undefined : date;
}

/** Date → "YYYY-MM-DD" para hidden input */
function toISODate(date: Date | undefined): string {
	if (!date) return '';
	const y = date.getFullYear();
	const m = String(date.getMonth() + 1).padStart(2, '0');
	const d = String(date.getDate()).padStart(2, '0');
	return `${y}-${m}-${d}`;
}

export interface DatePickerInputProps {
	/** name del campo para el form (se envía como YYYY-MM-DD) */
	name: string;
	/** id del botón trigger */
	id?: string;
	/** Valor inicial en formato YYYY-MM-DD */
	defaultValue?: string;
	/** Placeholder cuando no hay fecha */
	placeholder?: string;
	/** Callback cuando cambia la fecha */
	onChange?: (isoDate: string) => void;
	/** Deshabilitar el componente */
	disabled?: boolean;
	/** className extra para el botón trigger */
	className?: string;
}

export function DatePickerInput({
	name,
	id,
	defaultValue = '',
	placeholder = 'Seleccionar fecha...',
	onChange,
	disabled = false,
	className,
}: DatePickerInputProps) {
	const initialDate = parseISODate(defaultValue);
	const [date, setDate] = React.useState<Date | undefined>(initialDate);

	const handleSelect = (selected: Date | undefined) => {
		setDate(selected);
		onChange?.(toISODate(selected));
	};

	return (
		<>
			<input type="hidden" name={name} value={toISODate(date)} />
			<Popover>
				<PopoverTrigger
					render={
						<Button
							id={id ?? name}
							variant="outline"
							disabled={disabled}
							data-empty={!date}
							className={cn(
								'w-full justify-start text-left font-normal data-[empty=true]:text-muted-foreground',
								className,
							)}
						/>
					}
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="16"
						height="16"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						strokeWidth="2"
						strokeLinecap="round"
						strokeLinejoin="round"
						className="mr-2 size-4"
					>
						<path d="M8 2v4" />
						<path d="M16 2v4" />
						<rect width="18" height="18" x="3" y="4" rx="2" />
						<path d="M3 10h18" />
					</svg>
					{date ? (
						format(date, 'PPP', { locale: es })
					) : (
						<span>{placeholder}</span>
					)}
				</PopoverTrigger>
				<PopoverContent className="w-auto p-0" align="start">
					<Calendar
						mode="single"
						selected={date}
						onSelect={handleSelect}
						locale={es}
					/>
				</PopoverContent>
			</Popover>
		</>
	);
}

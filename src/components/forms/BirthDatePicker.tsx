import * as React from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@components/utils';
import { Button } from '@components/ui/button';
import { Calendar } from '@components/ui/calendar';
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from '@components/ui/popover';

function parseISODate(value: string): Date | undefined {
	if (!value) return undefined;
	const parts = value.split('-');
	if (parts.length !== 3) return undefined;
	const [y, m, d] = parts.map(Number) as [number, number, number];
	if ([y, m, d].some(Number.isNaN)) return undefined;
	const date = new Date(y, m - 1, d);
	return Number.isNaN(date.getTime()) ? undefined : date;
}

function toISODate(date: Date | undefined): string {
	if (!date) return '';
	const y = date.getFullYear();
	const m = String(date.getMonth() + 1).padStart(2, '0');
	const d = String(date.getDate()).padStart(2, '0');
	return `${y}-${m}-${d}`;
}

export interface BirthDatePickerProps {
	name: string;
	id?: string;
	defaultValue?: string;
	placeholder?: string;
	onChange?: (isoDate: string) => void;
	disabled?: boolean;
	className?: string;
}

export function BirthDatePicker({
	name,
	id,
	defaultValue = '',
	placeholder = 'Fecha de nacimiento...',
	onChange,
	disabled = false,
	className,
}: BirthDatePickerProps) {
	const initialDate = parseISODate(defaultValue);
	const [date, setDate] = React.useState<Date | undefined>(initialDate);

	const today = new Date();
	const startMonth = new Date(today.getFullYear() - 100, 0);
	const endMonth = new Date(today.getFullYear() - 10, 11);

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
								'data-[empty=true]:text-muted-foreground border-white-200 dark:border-black-600 w-full justify-start border text-left font-normal',
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
						format(date, "d 'de' MMMM, yyyy", { locale: es })
					) : (
						<span>{placeholder}</span>
					)}
				</PopoverTrigger>
				<PopoverContent className="w-auto p-0" align="start">
					<Calendar
						mode="single"
						captionLayout="dropdown"
						selected={date}
						defaultMonth={date ?? endMonth}
						onSelect={handleSelect}
						startMonth={startMonth}
						endMonth={endMonth}
						locale={es}
					/>
				</PopoverContent>
			</Popover>
		</>
	);
}

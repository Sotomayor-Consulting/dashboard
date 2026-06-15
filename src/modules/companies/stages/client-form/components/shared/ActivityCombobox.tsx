import { Icon } from '@iconify/react';
import { useMemo, useState } from 'react';

import { cn } from '@components/utils';
import { Button } from '@components/ui/Button';
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from '@components/ui/Command';
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from '@components/ui/Popover';

import type { Activity } from '../../data/activities';

interface Props {
	activities: Activity[];
	value: string;
	onChange: (activityId: string) => void;
	disabled?: boolean;
	placeholder?: string;
}

/**
 * Combobox con búsqueda para seleccionar la actividad económica.
 * Filtra simultáneamente por:
 *   - irs_code
 *   - name_es / name_en
 *   - nombre de la categoría / sector
 *
 * Agrupa los resultados por categoría para mejor escaneo visual.
 */
export function ActivityCombobox({
	activities,
	value,
	onChange,
	disabled,
	placeholder = 'Selecciona una actividad',
}: Props) {
	const [open, setOpen] = useState(false);

	const selected = useMemo(
		() => activities.find((a) => a.id === value),
		[activities, value],
	);

	// Agrupar por nombre de categoría (sector queda implícito en la categoría).
	const groups = useMemo(() => {
		const map = new Map<string, Activity[]>();
		for (const act of activities) {
			const key = act.category?.name ?? 'Otras';
			if (!map.has(key)) map.set(key, []);
			map.get(key)!.push(act);
		}
		return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
	}, [activities]);

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger
				render={
					<Button
						variant="outline"
						type="button"
						disabled={disabled}
						className="w-full justify-between font-normal"
						aria-expanded={open}
					>
						{selected ? (
							<span className="flex items-center gap-2 truncate">
								<span className="text-muted-foreground font-mono text-xs">
									{selected.irs_code}
								</span>
								<span className="truncate">{selected.name_es}</span>
							</span>
						) : (
							<span className="text-muted-foreground">{placeholder}</span>
						)}
						<Icon
							icon="ri:expand-up-down-line"
							className="ml-2 h-4 w-4 shrink-0 opacity-50"
						/>
					</Button>
				}
			/>
			<PopoverContent className="w-[var(--anchor-width)] p-0" align="start">
				<Command
					filter={(itemValue, search) => {
						// itemValue es: "<irs_code> <name_es> <name_en> <category>"
						const normalized = itemValue.toLowerCase();
						const q = search.toLowerCase().trim();
						if (!q) return 1;
						return normalized.includes(q) ? 1 : 0;
					}}
				>
					<CommandInput placeholder="Buscar por código IRS o nombre…" />
					<CommandList>
						<CommandEmpty>No hay actividades que coincidan.</CommandEmpty>
						{groups.map(([category, items]) => (
							<CommandGroup key={category} heading={category}>
								{items.map((act) => {
									const searchValue = [
										act.irs_code,
										act.name_es,
										act.name_en,
										act.category?.name ?? '',
										act.category?.sector?.name ?? '',
									]
										.filter(Boolean)
										.join(' ');
									return (
										<CommandItem
											key={act.id}
											value={searchValue}
											data-checked={act.id === value ? 'true' : undefined}
											onSelect={() => {
												onChange(act.id);
												setOpen(false);
											}}
											className="flex items-start gap-3"
										>
											<span
												className={cn(
													'text-muted-foreground mt-0.5 font-mono text-xs',
													act.id === value && 'text-foreground',
												)}
											>
												{act.irs_code}
											</span>
											<span className="flex-1 truncate">
												<span className="block truncate">{act.name_es}</span>
												<span className="text-muted-foreground block truncate text-xs">
													{act.name_en}
												</span>
											</span>
										</CommandItem>
									);
								})}
							</CommandGroup>
						))}
					</CommandList>
				</Command>
			</PopoverContent>
		</Popover>
	);
}

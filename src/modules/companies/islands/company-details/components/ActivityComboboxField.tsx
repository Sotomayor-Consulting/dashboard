import { Icon } from '@iconify/react';
import { useEffect, useMemo, useState } from 'react';

import { cn } from '@components/utils';
import { Button } from '@components/ui/Button';
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from '@components/ui/Popover';

import type { ActividadItem } from '../../../types';

interface Props {
	activities: ActividadItem[];
	value: number | null;
	onChange: (activityId: number | null) => void;
	disabled?: boolean;
	placeholder?: string;
	allowClear?: boolean;
}

type Level = 'sector' | 'category' | 'activity';

/**
 * Mismo picker jerárquico usado en el wizard de incorporación
 * (ActivityPicker), pero adaptado a `ActividadItem` (id numérico) en lugar
 * de `Activity` (id string).
 *
 * Navega tres niveles: Sector → Categoría → Actividad, con breadcrumb para
 * volver atrás. Búsqueda libre solo en el nivel de actividad (donde hay
 * más cardinalidad). Sólo `activity.id` se persiste en el form.
 */
export function ActivityComboboxField({
	activities,
	value,
	onChange,
	disabled,
	placeholder = 'Selecciona la actividad económica',
	allowClear = true,
}: Props) {
	const [open, setOpen] = useState(false);
	const [level, setLevel] = useState<Level>('sector');
	const [sectorId, setSectorId] = useState<string>('');
	const [categoryId, setCategoryId] = useState<string>('');
	const [search, setSearch] = useState('');

	// Estructuras agrupadas
	const sectors = useMemo(() => {
		const map = new Map<string, string>();
		for (const a of activities) {
			const s = a.category?.sector;
			if (s) map.set(String(s.id), s.name);
		}
		return Array.from(map, ([id, name]) => ({ id, name })).sort((a, b) =>
			a.name.localeCompare(b.name),
		);
	}, [activities]);

	const categories = useMemo(() => {
		if (!sectorId) return [];
		const map = new Map<string, string>();
		for (const a of activities) {
			if (String(a.category?.sector?.id) !== sectorId) continue;
			const c = a.category;
			if (c) map.set(String(c.id), c.name);
		}
		return Array.from(map, ([id, name]) => ({ id, name })).sort((a, b) =>
			a.name.localeCompare(b.name),
		);
	}, [activities, sectorId]);

	const filteredActivities = useMemo(() => {
		if (!categoryId) return [];
		const list = activities.filter(
			(a) => String(a.category?.id) === categoryId,
		);
		const q = search.trim().toLowerCase();
		const matched = q
			? list.filter(
					(a) =>
						a.name_es.toLowerCase().includes(q) ||
						a.name_en.toLowerCase().includes(q) ||
						a.irs_code.toLowerCase().includes(q),
				)
			: list;
		return matched.sort((a, b) => a.name_es.localeCompare(b.name_es));
	}, [activities, categoryId, search]);

	// `actividadesGeneral` coacciona `id` a string aunque el tipo declarado sea
	// number — comparamos siempre via String para evitar mismatches.
	const valueAsString = value === null ? null : String(value);
	const selected = useMemo(
		() => activities.find((a) => String(a.id) === valueAsString),
		[activities, valueAsString],
	);

	useEffect(() => {
		if (!selected) return;
		const sId = selected.category?.sector?.id;
		const cId = selected.category?.id;
		if (sId && !sectorId) setSectorId(String(sId));
		if (cId && !categoryId) setCategoryId(String(cId));
	}, [selected, sectorId, categoryId]);

	const sectorName = sectors.find((s) => s.id === sectorId)?.name;
	const categoryName = categories.find((c) => c.id === categoryId)?.name;

	const reset = () => {
		setLevel('sector');
		setSearch('');
	};

	const goBack = () => {
		if (level === 'activity') {
			setLevel('category');
			setSearch('');
		} else if (level === 'category') {
			setLevel('sector');
		}
	};

	return (
		<Popover
			open={open}
			onOpenChange={(o) => {
				setOpen(o);
				if (!o) reset();
				else if (selected) setLevel('activity');
			}}
		>
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
							<span className="flex min-w-0 items-center gap-2 truncate">
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
				{/* Breadcrumb */}
				<div className="border-border flex items-center gap-1 border-b px-3 py-2 text-xs">
					{level !== 'sector' && (
						<button
							type="button"
							onClick={goBack}
							className="text-muted-foreground hover:text-foreground -ml-1 inline-flex items-center gap-1 rounded p-1"
							aria-label="Volver"
						>
							<Icon icon="ri:arrow-left-s-line" className="h-4 w-4" />
						</button>
					)}
					<button
						type="button"
						onClick={() => setLevel('sector')}
						className={cn(
							'hover:text-foreground',
							level === 'sector'
								? 'text-foreground font-medium'
								: 'text-muted-foreground',
						)}
					>
						Sector
					</button>
					{sectorId && (
						<>
							<Icon
								icon="ri:arrow-right-s-line"
								className="text-muted-foreground h-3.5 w-3.5"
							/>
							<button
								type="button"
								onClick={() => setLevel('category')}
								className={cn(
									'truncate hover:text-foreground',
									level === 'category'
										? 'text-foreground font-medium'
										: 'text-muted-foreground',
								)}
							>
								{sectorName}
							</button>
						</>
					)}
					{categoryId && level === 'activity' && (
						<>
							<Icon
								icon="ri:arrow-right-s-line"
								className="text-muted-foreground h-3.5 w-3.5"
							/>
							<span className="text-foreground truncate font-medium">
								{categoryName}
							</span>
						</>
					)}
				</div>

				{/* Buscador (solo en nivel actividad) */}
				{level === 'activity' && (
					<div className="border-border flex items-center gap-2 border-b px-3 py-2">
						<Icon
							icon="ri:search-line"
							className="text-muted-foreground h-4 w-4"
						/>
						<input
							type="text"
							value={search}
							onChange={(e) => setSearch(e.target.value)}
							placeholder="Buscar por código IRS o nombre…"
							className="placeholder:text-muted-foreground flex-1 bg-transparent text-sm outline-none"
							autoFocus
						/>
					</div>
				)}

				{/* Listado por nivel */}
				<div className="max-h-72 overflow-y-auto p-1">
					{level === 'sector' &&
						sectors.map((s) => (
							<button
								key={s.id}
								type="button"
								onClick={() => {
									setSectorId(s.id);
									setCategoryId('');
									setLevel('category');
								}}
								className={cn(
									'hover:bg-accent/40 flex w-full items-center justify-between rounded px-3 py-2 text-left text-sm',
									sectorId === s.id && 'bg-accent/30',
								)}
							>
								<span className="truncate">{s.name}</span>
								<Icon
									icon="ri:arrow-right-s-line"
									className="text-muted-foreground h-4 w-4 shrink-0"
								/>
							</button>
						))}

					{level === 'category' &&
						(categories.length === 0 ? (
							<p className="text-muted-foreground px-3 py-4 text-center text-sm">
								No hay categorías para este sector.
							</p>
						) : (
							categories.map((c) => (
								<button
									key={c.id}
									type="button"
									onClick={() => {
										setCategoryId(c.id);
										setLevel('activity');
									}}
									className={cn(
										'hover:bg-accent/40 flex w-full items-center justify-between rounded px-3 py-2 text-left text-sm',
										categoryId === c.id && 'bg-accent/30',
									)}
								>
									<span className="truncate">{c.name}</span>
									<Icon
										icon="ri:arrow-right-s-line"
										className="text-muted-foreground h-4 w-4 shrink-0"
									/>
								</button>
							))
						))}

					{level === 'activity' &&
						(filteredActivities.length === 0 ? (
							<p className="text-muted-foreground px-3 py-4 text-center text-sm">
								No hay actividades que coincidan.
							</p>
						) : (
							filteredActivities.map((a) => {
								const isSelected = String(a.id) === valueAsString;
								return (
									<button
										key={a.id}
										type="button"
										onClick={() => {
											const numericId = Number(a.id);
											onChange(Number.isFinite(numericId) ? numericId : null);
											setOpen(false);
										}}
										className={cn(
											'hover:bg-accent/40 flex w-full items-start gap-3 rounded px-3 py-2 text-left text-sm',
											isSelected && 'bg-accent/30',
										)}
									>
										<span
											className={cn(
												'text-muted-foreground mt-0.5 font-mono text-xs',
												isSelected && 'text-foreground',
											)}
										>
											{a.irs_code}
										</span>
										<span className="flex-1 truncate">
											<span className="block truncate">{a.name_es}</span>
											<span className="text-muted-foreground block truncate text-xs">
												{a.name_en}
											</span>
										</span>
										{isSelected && (
											<Icon
												icon="ri:check-line"
												className="text-accent mt-0.5 h-4 w-4 shrink-0"
											/>
										)}
									</button>
								);
							})
						))}
				</div>

				{/* Footer: limpiar selección */}
				{allowClear && value !== null && (
					<div className="border-border border-t p-1">
						<button
							type="button"
							onClick={() => {
								onChange(null);
								setOpen(false);
							}}
							className="text-muted-foreground hover:bg-accent/40 hover:text-foreground inline-flex w-full items-center gap-2 rounded px-3 py-2 text-left text-xs"
						>
							<Icon icon="ri:close-line" className="h-3.5 w-3.5" />
							Limpiar selección
						</button>
					</div>
				)}
			</PopoverContent>
		</Popover>
	);
}

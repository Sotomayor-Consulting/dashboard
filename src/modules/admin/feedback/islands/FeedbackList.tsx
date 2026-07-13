import '@shared/iconify-ri';

import { Icon } from '@iconify/react';
import { useMemo, useState } from 'react';

import { Badge } from '@components/ui/Badge';
import { Input } from '@components/ui/Input';
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from '@components/ui/Sheet';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@components/ui/Select';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@components/ui/Table';
import { cn } from '@components/utils';
import type { BetaFeedbackRow } from '@domains/feedback/beta-feedback';

type Category = BetaFeedbackRow['category'];
type CategoryFilter = Category | 'all';

const CATEGORY_META: Record<
	Category,
	{ label: string; icon: string; tone: string }
> = {
	bug: {
		label: 'Bug',
		icon: 'ri:bug-line',
		tone:
			'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-900',
	},
	sugerencia: {
		label: 'Sugerencia',
		icon: 'ri:lightbulb-line',
		tone:
			'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900',
	},
	ux: {
		label: 'UX',
		icon: 'ri:sparkling-line',
		tone:
			'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/40 dark:text-violet-300 dark:border-violet-900',
	},
	general: {
		label: 'General',
		icon: 'ri:chat-1-line',
		tone:
			'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-900/40 dark:text-slate-300 dark:border-slate-800',
	},
};

const FILTER_OPTIONS: { value: CategoryFilter; label: string; icon: string }[] =
	[
		{ value: 'all', label: 'Todas', icon: 'ri:filter-line' },
		...(Object.keys(CATEGORY_META) as Category[]).map((c) => ({
			value: c,
			label: CATEGORY_META[c].label,
			icon: CATEGORY_META[c].icon,
		})),
	];

interface Props {
	items: BetaFeedbackRow[];
}

function formatDate(iso: string) {
	try {
		return new Date(iso).toLocaleString('es-ES', {
			dateStyle: 'medium',
			timeStyle: 'short',
		});
	} catch {
		return iso;
	}
}

function StarRating({ value }: { value: number | null }) {
	if (value === null) {
		return <span className="text-muted-foreground text-xs">—</span>;
	}
	return (
		<div className="flex items-center gap-0.5" aria-label={`${value} de 5`}>
			{[1, 2, 3, 4, 5].map((n) => (
				<Icon
					key={n}
					icon="ri:star-fill"
					className={cn(
						'h-3.5 w-3.5',
						n <= value
							? 'text-yellow-400'
							: 'text-gray-300 dark:text-gray-600',
					)}
				/>
			))}
		</div>
	);
}

export default function FeedbackList({ items }: Props) {
	const [search, setSearch] = useState('');
	const [category, setCategory] = useState<CategoryFilter>('all');
	const [selected, setSelected] = useState<BetaFeedbackRow | null>(null);

	const filtered = useMemo(() => {
		const q = search.trim().toLowerCase();
		return items.filter((it) => {
			if (category !== 'all' && it.category !== category) return false;
			if (!q) return true;
			return (
				it.message.toLowerCase().includes(q) ||
				(it.user_name?.toLowerCase().includes(q) ?? false) ||
				(it.user_email?.toLowerCase().includes(q) ?? false) ||
				(it.page_url?.toLowerCase().includes(q) ?? false)
			);
		});
	}, [items, search, category]);

	return (
		<div className="flex min-h-full flex-col">
			{/* Header */}
			<header className="flex items-end justify-between gap-4 border-b border-gray-200 px-7 pt-6 pb-4 dark:border-gray-800">
				<div>
					<p className="text-[11.5px] font-semibold tracking-wider text-gray-500 uppercase dark:text-gray-400">
						Ajustes
					</p>
					<h1 className="mt-1 text-[22px] font-semibold text-gray-900 dark:text-gray-100">
						Feedback Beta
					</h1>
					<p className="mt-1 text-[12.5px] text-gray-500 dark:text-gray-400">
						{items.length} comentarios recibidos · mostrando {filtered.length}
					</p>
				</div>
			</header>

			{/* Toolbar */}
			<div className="flex flex-col gap-2 border-b border-gray-200 px-7 py-3 sm:flex-row sm:items-center sm:justify-between dark:border-gray-800">
				<div className="relative max-w-sm flex-1">
					<Icon
						icon="ri:search-line"
						className="text-muted-foreground absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2"
					/>
					<Input
						placeholder="Buscar mensaje, usuario, URL..."
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						className="!h-9 pl-8"
					/>
				</div>
				<Select
					value={category}
					onValueChange={(v) => setCategory(v as CategoryFilter)}
				>
					<SelectTrigger className="!h-9 w-full text-sm sm:w-52">
						<SelectValue>
							{(label) => {
								const opt =
									FILTER_OPTIONS.find((o) => o.label === label) ??
									FILTER_OPTIONS.find((o) => o.value === category) ??
									FILTER_OPTIONS[0]!;
								return (
									<>
										<Icon icon={opt.icon} className="h-4 w-4" />
										{opt.label}
									</>
								);
							}}
						</SelectValue>
					</SelectTrigger>
					<SelectContent>
						{FILTER_OPTIONS.map((opt) => (
							<SelectItem key={opt.value} value={opt.value} label={opt.label}>
								<Icon icon={opt.icon} className="h-4 w-4" />
								{opt.label}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>

			{/* Table */}
			{filtered.length === 0 ? (
				<div className="text-muted-foreground flex flex-1 flex-col items-center justify-center gap-2 py-20 text-sm">
					<Icon icon="ri:inbox-line" className="h-10 w-10 opacity-50" />
					<span>
						{items.length === 0
							? 'Aún no hay feedback enviado.'
							: 'No hay feedback que coincida con los filtros.'}
					</span>
				</div>
			) : (
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead className="w-[140px] pl-7">Categoría</TableHead>
							<TableHead className="w-[120px]">Rating</TableHead>
							<TableHead>Usuario</TableHead>
							<TableHead>Mensaje</TableHead>
							<TableHead className="w-[170px]">Fecha</TableHead>
							<TableHead className="w-[60px] pr-7 text-right" />
						</TableRow>
					</TableHeader>
					<TableBody>
						{filtered.map((it) => {
							const meta = CATEGORY_META[it.category];
							return (
								<TableRow
									key={it.id}
									className="hover:bg-muted/40 cursor-pointer"
									onClick={() => setSelected(it)}
								>
									<TableCell className="pl-7">
										<Badge
											variant="outline"
											className={cn('gap-1 font-medium', meta.tone)}
										>
											<Icon icon={meta.icon} className="h-3.5 w-3.5" />
											{meta.label}
										</Badge>
									</TableCell>
									<TableCell>
										<StarRating value={it.rating} />
									</TableCell>
									<TableCell>
										<div className="flex flex-col">
											<span className="text-sm font-medium">
												{it.user_name ?? 'Anónimo'}
											</span>
											{it.user_email && (
												<span className="text-muted-foreground text-xs">
													{it.user_email}
												</span>
											)}
										</div>
									</TableCell>
									<TableCell>
										<p className="text-foreground line-clamp-2 max-w-md text-sm">
											{it.message}
										</p>
									</TableCell>
									<TableCell className="text-muted-foreground text-xs whitespace-nowrap">
										{formatDate(it.created_at)}
									</TableCell>
									<TableCell className="pr-7 text-right">
										<Icon
											icon="ri:arrow-right-s-line"
											className="text-muted-foreground inline h-4 w-4"
										/>
									</TableCell>
								</TableRow>
							);
						})}
					</TableBody>
				</Table>
			)}

			{/* Detail sheet (shadcn) */}
			<Sheet
				open={!!selected}
				onOpenChange={(o) => {
					if (!o) setSelected(null);
				}}
			>
				<SheetContent side="right" className="sm:max-w-md">
					{selected && (
						<>
							<SheetHeader className="border-b">
								<SheetTitle className="flex items-center gap-2">
									<Icon
										icon={CATEGORY_META[selected.category].icon}
										className="h-5 w-5"
									/>
									Detalle del feedback
								</SheetTitle>
								<SheetDescription>
									Enviado el {formatDate(selected.created_at)}
								</SheetDescription>
							</SheetHeader>

							<div className="flex-1 space-y-4 overflow-y-auto p-4 text-sm">
								<div className="grid grid-cols-2 gap-3">
									<div>
										<p className="text-muted-foreground text-xs">Categoría</p>
										<Badge
											variant="outline"
											className={cn(
												'mt-1 gap-1',
												CATEGORY_META[selected.category].tone,
											)}
										>
											<Icon
												icon={CATEGORY_META[selected.category].icon}
												className="h-3.5 w-3.5"
											/>
											{CATEGORY_META[selected.category].label}
										</Badge>
									</div>
									<div>
										<p className="text-muted-foreground text-xs">Rating</p>
										<div className="mt-1">
											<StarRating value={selected.rating} />
										</div>
									</div>
								</div>

								<div>
									<p className="text-muted-foreground text-xs">Usuario</p>
									<p className="mt-0.5 font-medium">
										{selected.user_name ?? 'Anónimo'}
									</p>
									{selected.user_email && (
										<p className="text-muted-foreground text-xs">
											{selected.user_email}
										</p>
									)}
								</div>

								<div>
									<p className="text-muted-foreground text-xs">Mensaje</p>
									<p className="bg-muted/40 mt-1 rounded-md p-3 whitespace-pre-wrap">
										{selected.message}
									</p>
								</div>

								{selected.page_url && (
									<div>
										<p className="text-muted-foreground text-xs">Página</p>
										<a
											href={selected.page_url}
											target="_blank"
											rel="noreferrer"
											className="text-primary mt-0.5 block break-all text-xs underline"
										>
											{selected.page_url}
										</a>
									</div>
								)}

								{selected.user_agent && (
									<div>
										<p className="text-muted-foreground text-xs">User agent</p>
										<p className="text-muted-foreground mt-0.5 text-xs break-all">
											{selected.user_agent}
										</p>
									</div>
								)}
							</div>
						</>
					)}
				</SheetContent>
			</Sheet>
		</div>
	);
}

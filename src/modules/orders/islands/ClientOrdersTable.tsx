import '@shared/iconify-ri';

import { Icon } from '@iconify/react';
import { useEffect, useMemo, useState } from 'react';

import { Button } from '@components/ui/Button';
import { Input } from '@components/ui/Input';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@components/ui/Select';
import { cn } from '@components/utils';
import OrderDetailsSheet from '@components/display/orders/OrderDetailsSheet';
import {
	ORDER_STATUS_LABEL,
	formatDate,
	formatUsd,
	orderStatusVariant,
} from '@components/display/orders/order-format';
import { Badge } from '@components/ui/Badge';
import type { OrderAdminRow } from '@domains/payments/orders';

type StatusFilter = 'todos' | 'confirmed' | 'pending_payment';
type SortKey = 'order_number' | 'incorporation_name' | 'plan_name' | 'total' | 'status' | 'created_at';
type SortDir = 'asc' | 'desc';

const FILTERS: { id: StatusFilter; label: string }[] = [
	{ id: 'todos', label: 'Todas' },
	{ id: 'confirmed', label: 'Pagadas' },
	{ id: 'pending_payment', label: 'Pendientes' },
];

interface Props {
	data: OrderAdminRow[];
}

function SortableTh({
	label,
	keyId,
	active,
	dir,
	onClick,
	className,
}: {
	label: string;
	keyId: SortKey;
	active: boolean;
	dir: SortDir;
	onClick: (k: SortKey) => void;
	className?: string;
}) {
	return (
		<th className={className}>
			<button
				type="button"
				onClick={() => onClick(keyId)}
				className="inline-flex items-center gap-1 uppercase tracking-wider hover:text-gray-900 dark:hover:text-gray-100"
			>
				{label}
				{active && (
					<Icon
						icon={dir === 'asc' ? 'ri:arrow-up-s-line' : 'ri:arrow-down-s-line'}
						className="h-3.5 w-3.5"
					/>
				)}
			</button>
		</th>
	);
}

export default function ClientOrdersTable({ data }: Props) {
	const [filter, setFilter] = useState<StatusFilter>('todos');
	const [search, setSearch] = useState('');
	const [sort, setSort] = useState<{ key: SortKey; dir: SortDir }>({
		key: 'created_at',
		dir: 'desc',
	});
	const [selected, setSelected] = useState<OrderAdminRow | null>(null);
	const [sheetOpen, setSheetOpen] = useState(false);

	const onSort = (key: SortKey) => {
		setSort((prev) =>
			prev.key === key
				? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
				: { key, dir: 'asc' },
		);
	};

	const openDetails = (order: OrderAdminRow) => {
		setSelected(order);
		setSheetOpen(true);
	};

	// Reanuda el checkout de una orden pendiente (reusa la sesión de Stripe
	// si sigue abierta, o crea una nueva sin duplicar la orden).
	const [resumingId, setResumingId] = useState<string | null>(null);
	const resumePayment = async (order: OrderAdminRow) => {
		if (resumingId) return;
		setResumingId(order.id);
		try {
			const res = await fetch('/api/payment/resume-checkout', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ orderId: order.id }),
			});
			const data = (await res.json()) as { url?: string; error?: string };
			if (!res.ok || !data.url) {
				throw new Error(data.error ?? 'No se pudo reanudar el pago');
			}
			window.location.href = data.url;
		} catch (err) {
			console.error('Error reanudando el pago:', err);
			alert('No se pudo reanudar el pago. Intenta de nuevo.');
			setResumingId(null);
		}
	};

	const filtered = useMemo(() => {
		const lower = search.toLowerCase().trim();
		return data.filter((o) => {
			if (filter !== 'todos' && o.status !== filter) return false;
			if (lower) {
				const haystack =
					`${o.order_number} ${o.incorporation_name ?? ''} ${o.plan_name ?? ''}`.toLowerCase();
				if (!haystack.includes(lower)) return false;
			}
			return true;
		});
	}, [data, filter, search]);

	const sorted = useMemo(() => {
		const list = [...filtered];
		const cmp = (a: OrderAdminRow, b: OrderAdminRow): number => {
			let av: string | number = '';
			let bv: string | number = '';
			switch (sort.key) {
				case 'order_number':
					av = a.order_number.toLowerCase();
					bv = b.order_number.toLowerCase();
					break;
				case 'incorporation_name':
					av = (a.incorporation_name ?? '').toLowerCase();
					bv = (b.incorporation_name ?? '').toLowerCase();
					break;
				case 'plan_name':
					av = (a.plan_name ?? '').toLowerCase();
					bv = (b.plan_name ?? '').toLowerCase();
					break;
				case 'total':
					av = a.total ?? 0;
					bv = b.total ?? 0;
					break;
				case 'status':
					av = a.status === 'confirmed' ? 0 : 1;
					bv = b.status === 'confirmed' ? 0 : 1;
					break;
				case 'created_at':
					av = a.created_at ? Date.parse(a.created_at) : 0;
					bv = b.created_at ? Date.parse(b.created_at) : 0;
					break;
			}
			if (av < bv) return sort.dir === 'asc' ? -1 : 1;
			if (av > bv) return sort.dir === 'asc' ? 1 : -1;
			return 0;
		};
		return list.sort(cmp);
	}, [filtered, sort]);

	// Pagination
	const [pageSize, setPageSize] = useState(20);
	const [page, setPage] = useState(1);
	useEffect(() => { setPage(1); }, [filter, search, pageSize]);

	const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
	const paginated = useMemo(() => {
		const start = (page - 1) * pageSize;
		return sorted.slice(start, start + pageSize);
	}, [sorted, page, pageSize]);

	const counts = useMemo(() => ({
		total: data.length,
		confirmed: data.filter((o) => o.status === 'confirmed').length,
		pending: data.filter((o) => o.status === 'pending_payment').length,
	}), [data]);

	const filterCounts: Record<StatusFilter, number> = {
		todos: counts.total,
		confirmed: counts.confirmed,
		pending_payment: counts.pending,
	};

	return (
		<>
			<div className="-mx-6 flex min-h-[calc(100vh-3.5rem)] flex-col">
				{/* Header */}
				<header className="flex items-end justify-between gap-4 border-b border-border px-7 pt-6 pb-4">
					<div>
						<p className="text-[11.5px] font-semibold tracking-wider text-gray-500 uppercase dark:text-gray-400">
							Mis órdenes
						</p>
						<h1 className="mt-1 text-[22px] font-semibold text-gray-900 dark:text-gray-100">
							Historial de órdenes
						</h1>
						<p className="mt-1 text-[12.5px] text-gray-500 dark:text-gray-400">
							{counts.total} órdenes · {counts.confirmed} pagadas · {counts.pending} pendientes
						</p>
					</div>
				</header>

				{/* Toolbar */}
				<div className="border-b border-border px-7 py-3">
					<div className="flex flex-wrap items-center gap-2">
						<div className="relative w-64 shrink-0">
							<Icon
								icon="ri:search-line"
								className="pointer-events-none absolute top-1/2 left-2.5 z-10 h-4 w-4 -translate-y-1/2 text-gray-400"
							/>
							<Input
								value={search}
								onChange={(e) => setSearch(e.target.value)}
								placeholder="Buscar por orden, empresa, plan…"
								className="!h-9 !border-gray-200 !bg-transparent pl-8 text-sm dark:!border-gray-800 dark:!bg-transparent"
							/>
						</div>

						<div className="flex flex-wrap items-center gap-1.5">
							{FILTERS.map((f) => {
								const isActive = filter === f.id;
								return (
									<button
										key={f.id}
										type="button"
										onClick={() => setFilter(f.id)}
										className={cn(
											'inline-flex shrink-0 items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors',
											isActive
												? 'border-gray-900 bg-gray-900 text-white dark:border-white dark:bg-white dark:text-gray-900'
												: 'border-gray-200 bg-transparent text-gray-600 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-neutral-800',
										)}
									>
										<span>{f.label}</span>
										<span
											className={cn(
												'rounded px-1 text-[10.5px] tabular-nums',
												isActive
													? 'bg-white/15 text-current'
													: 'bg-gray-100 text-gray-500 dark:bg-neutral-800 dark:text-gray-400',
											)}
										>
											{filterCounts[f.id]}
										</span>
									</button>
								);
							})}
						</div>
					</div>
				</div>

				{/* Table */}
				{paginated.length === 0 ? (
					<div className="flex flex-1 flex-col items-center justify-center gap-2 py-16 text-center">
						<Icon icon="ri:receipt-line" className="h-8 w-8 text-gray-300 dark:text-gray-600" />
						<p className="text-sm font-medium text-gray-500 dark:text-gray-400">
							Sin resultados
						</p>
						<p className="text-xs text-gray-400 dark:text-gray-500">
							Ajusta los filtros o la búsqueda.
						</p>
					</div>
				) : (
					<div className="w-full overflow-x-auto">
						<table className="w-full text-sm">
							<thead className="border-b border-gray-200 text-[10.5px] font-medium tracking-wider text-gray-500 uppercase dark:border-gray-800 dark:text-gray-400">
								<tr>
									<SortableTh
										label="Orden"
										keyId="order_number"
										active={sort.key === 'order_number'}
										dir={sort.dir}
										onClick={onSort}
										className="px-7 py-3 text-left"
									/>
									<SortableTh
										label="Empresa"
										keyId="incorporation_name"
										active={sort.key === 'incorporation_name'}
										dir={sort.dir}
										onClick={onSort}
										className="py-3 pr-4 text-left"
									/>
									<SortableTh
										label="Plan"
										keyId="plan_name"
										active={sort.key === 'plan_name'}
										dir={sort.dir}
										onClick={onSort}
										className="py-3 pr-4 text-left"
									/>
									<SortableTh
										label="Total"
										keyId="total"
										active={sort.key === 'total'}
										dir={sort.dir}
										onClick={onSort}
										className="py-3 pr-4 text-left"
									/>
									<SortableTh
										label="Estado"
										keyId="status"
										active={sort.key === 'status'}
										dir={sort.dir}
										onClick={onSort}
										className="py-3 pr-4 text-left"
									/>
									<SortableTh
										label="Fecha"
										keyId="created_at"
										active={sort.key === 'created_at'}
										dir={sort.dir}
										onClick={onSort}
										className="py-3 pr-7 text-left"
									/>
								</tr>
							</thead>
							<tbody>
								{paginated.map((order) => (
									<tr
										key={order.id}
										onClick={() => openDetails(order)}
										className={cn(
											'h-[52px] cursor-pointer border-b border-gray-100 transition-colors dark:border-gray-800/60',
											selected?.id === order.id
												? 'bg-gray-100 dark:bg-neutral-900'
												: 'hover:bg-gray-50 dark:hover:bg-neutral-900/60',
										)}
									>
										<td className="px-7">
											<span className="font-mono text-xs font-medium text-gray-800 dark:text-gray-300">
												{order.order_number}
											</span>
										</td>
										<td className="pr-4">
											<span className="text-[12.5px] text-gray-700 dark:text-gray-300">
												{order.incorporation_name ?? '—'}
											</span>
										</td>
										<td className="pr-4">
											<span className="text-[12.5px] text-gray-700 dark:text-gray-300">
												{order.plan_name ?? '—'}
											</span>
										</td>
										<td className="pr-4">
											<span className="font-medium tabular-nums text-gray-900 dark:text-gray-100">
												{formatUsd(order.total)}
											</span>
										</td>
										<td className="pr-4">
											<Badge variant={orderStatusVariant(order.status)}>
												{ORDER_STATUS_LABEL[order.status] ?? order.status}
											</Badge>
										</td>
										<td className="pr-7">
											<span className="text-[12.5px] text-gray-500 dark:text-gray-400">
												{formatDate(order.created_at)}
											</span>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				)}

				{/* Pagination */}
				{sorted.length > 0 && (
					<div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-gray-200 px-7 py-3 text-[12px] text-gray-500 dark:border-gray-800 dark:text-gray-400">
						<div className="flex items-center gap-2">
							<span>Filas por página</span>
							<Select
								value={String(pageSize)}
								onValueChange={(v) => setPageSize(Number(v))}
							>
								<SelectTrigger className="!h-8 w-[72px] text-xs">
									<SelectValue placeholder="—" />
								</SelectTrigger>
								<SelectContent>
									{[10, 20, 50].map((opt) => (
										<SelectItem key={opt} value={String(opt)}>
											{opt}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>

						<span className="tabular-nums">
							{sorted.length === 0 ? 0 : (page - 1) * pageSize + 1}–{Math.min(page * pageSize, sorted.length)} de {sorted.length}
						</span>

						<div className="flex items-center gap-1">
							<Button
								variant="outline"
								size="sm"
								className="h-8 gap-1"
								disabled={page <= 1}
								onClick={() => setPage(page - 1)}
							>
								<Icon icon="ri:arrow-left-s-line" className="h-4 w-4" />
								Anterior
							</Button>
							<Button
								variant="outline"
								size="sm"
								className="h-8 gap-1"
								disabled={page >= totalPages}
								onClick={() => setPage(page + 1)}
							>
								Siguiente
								<Icon icon="ri:arrow-right-s-line" className="h-4 w-4" />
							</Button>
						</div>
					</div>
				)}
			</div>

			<OrderDetailsSheet
				order={selected}
				open={sheetOpen}
				onOpenChange={setSheetOpen}
				onResumePayment={(o) => void resumePayment(o)}
				resumingPayment={resumingId !== null}
			/>
		</>
	);
}

import * as React from 'react';
import { EyeIcon } from 'lucide-react';

import { Badge } from '@components/ui/Badge';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@components/ui/DropdownMenu';
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from '@components/ui/Sheet';
import type { OrderAdminRow } from '@domains/payments/orders';

type Props = {
	order: OrderAdminRow;
};

const STATUS_LABEL: Record<string, string> = {
	draft: 'Borrador',
	pending_payment: 'Pago pendiente',
	confirmed: 'Pagado',
	canceled: 'Cancelada',
};

function statusVariant(status: string): 'susess' | 'warning' | 'destructive' {
	if (status === 'confirmed') return 'susess';
	if (status === 'canceled') return 'destructive';
	return 'warning';
}

function fmtUsd(value: number | null | undefined) {
	if (typeof value !== 'number') return '—';
	return value.toLocaleString('en-US', {
		style: 'currency',
		currency: 'USD',
		minimumFractionDigits: 2,
	});
}

function fmtDate(value: string | null) {
	if (!value) return '—';
	const d = new Date(value);
	if (Number.isNaN(d.getTime())) return value;
	return d.toLocaleDateString('es-ES', {
		year: 'numeric',
		month: 'short',
		day: '2-digit',
	});
}

function MoreIcon() {
	return (
		<svg
			aria-hidden="true"
			viewBox="0 0 24 24"
			className="h-5 w-5"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
		>
			<circle cx="5" cy="12" r="1" fill="currentColor" stroke="none" />
			<circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
			<circle cx="19" cy="12" r="1" fill="currentColor" stroke="none" />
		</svg>
	);
}

function DetailRow({
	label,
	value,
}: {
	label: string;
	value: React.ReactNode;
}) {
	return (
		<div>
			<p className="text-muted-foreground text-xs">{label}</p>
			<p className="font-medium">{value || '—'}</p>
		</div>
	);
}

export default function OrderActionsDropdown({ order }: Props) {
	const [open, setOpen] = React.useState(false);

	return (
		<>
			<DropdownMenu>
				<DropdownMenuTrigger
					render={
						<button
							type="button"
							className="dark:hover:bg-black-600 hover:text-primary rounded-xl p-2 transition-all"
							aria-label="Abrir menu"
						/>
					}
				>
					<MoreIcon />
					<span className="sr-only">Abrir menu</span>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end" className="w-44">
					<DropdownMenuItem onClick={() => setOpen(true)}>
						<EyeIcon />
						Ver orden
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>

			<Sheet open={open} onOpenChange={setOpen}>
				<SheetContent side="right" className="w-full sm:max-w-md">
					<SheetHeader>
						<SheetTitle>Orden {order.order_number}</SheetTitle>
						<SheetDescription>
							Detalle de la orden y desglose de servicios.
						</SheetDescription>
					</SheetHeader>

					<div className="flex flex-col gap-4 overflow-y-auto px-4 pb-4">
						<div className="grid grid-cols-2 gap-3 text-sm">
							<DetailRow label="Cliente" value={order.client_name} />
							<DetailRow label="Empresa" value={order.incorporation_name} />
							<DetailRow label="Plan" value={order.plan_name} />
							<DetailRow
								label="Estado"
								value={
									<Badge variant={statusVariant(order.status)}>
										{STATUS_LABEL[order.status] ?? order.status}
									</Badge>
								}
							/>
							<DetailRow
								label="Pago"
								value={order.payment_status ?? 'sin pago'}
							/>
							<DetailRow label="Realizado" value={fmtDate(order.created_at)} />
						</div>

						<div>
							<p className="text-muted-foreground mb-2 text-xs">
								Desglose de servicios
							</p>
							<ul className="divide-border divide-y rounded-md border">
								{order.lines.length ? (
									order.lines.map((line, idx) => (
										<li
											key={idx}
											className="flex items-center justify-between gap-2 px-3 py-2 text-sm"
										>
											<div className="flex flex-col">
												<span className="font-medium">
													{line.service_name ?? '—'}
												</span>
												{line.service_plan_name ? (
													<span className="text-muted-foreground text-xs">
														{line.service_plan_name}
													</span>
												) : null}
											</div>
											<div className="flex items-center gap-3">
												<span className="text-muted-foreground text-xs">
													x{line.quantity ?? 1}
												</span>
												{order.show_prices ? (
													<span className="font-medium tabular-nums">
														{fmtUsd(line.unit_price)}
													</span>
												) : null}
											</div>
										</li>
									))
								) : (
									<li className="text-muted-foreground px-3 py-2 text-sm">
										Sin líneas
									</li>
								)}
							</ul>
						</div>

						<div className="flex items-center justify-between border-t pt-3">
							<span className="text-muted-foreground text-sm">
								Total del plan
							</span>
							<span className="text-lg font-semibold tabular-nums">
								{fmtUsd(order.total)}
							</span>
						</div>
					</div>
				</SheetContent>
			</Sheet>
		</>
	);
}

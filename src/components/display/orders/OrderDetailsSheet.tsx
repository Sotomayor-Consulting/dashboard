import * as React from 'react';

import { Badge } from '@components/ui/Badge';
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from '@components/ui/Sheet';
import type { OrderAdminRow } from '@domains/payments/orders';
import {
	ORDER_STATUS_LABEL,
	formatDate,
	formatUsd,
	orderStatusVariant,
} from './order-format';

interface OrderDetailsSheetProps {
	order: OrderAdminRow | null;
	open: boolean;
	onOpenChange: (open: boolean) => void;
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

export default function OrderDetailsSheet({
	order,
	open,
	onOpenChange,
}: OrderDetailsSheetProps) {
	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent side="right" className="w-full sm:max-w-md">
				<SheetHeader>
					<SheetTitle>Orden {order?.order_number ?? ''}</SheetTitle>
					<SheetDescription>
						Detalle de la orden y desglose de servicios.
					</SheetDescription>
				</SheetHeader>

				{order ? (
					<div className="flex flex-col gap-4 overflow-y-auto px-4 pb-4">
						<div className="grid grid-cols-2 gap-3 text-sm">
							<DetailRow label="Cliente" value={order.client_name} />
							<DetailRow label="Empresa" value={order.incorporation_name} />
							<DetailRow label="Plan" value={order.plan_name} />
							<DetailRow
								label="Estado"
								value={
									<Badge variant={orderStatusVariant(order.status)}>
										{ORDER_STATUS_LABEL[order.status] ?? order.status}
									</Badge>
								}
							/>
							<DetailRow
								label="Pago"
								value={order.payment_status ?? 'sin pago'}
							/>
							<DetailRow
								label="Realizada"
								value={formatDate(order.created_at)}
							/>
						</div>

						<DetailRow
							label="Stripe Payment Intent"
							value={
								<span className="font-mono text-xs break-all">
									{order.provider_transaction_id ?? '—'}
								</span>
							}
						/>

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
														{formatUsd(line.unit_price)}
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
								{formatUsd(order.total)}
							</span>
						</div>
						{!order.show_prices ? (
							<p className="text-muted-foreground text-xs">
								El desglose por servicio no muestra precios.
							</p>
						) : null}
					</div>
				) : null}
			</SheetContent>
		</Sheet>
	);
}

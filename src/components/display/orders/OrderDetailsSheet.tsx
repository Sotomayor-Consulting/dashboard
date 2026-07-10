import '@shared/iconify-ri';

import { Icon } from '@iconify/react';
import { useEffect, useState } from 'react';

import { Badge } from '@components/ui/Badge';
import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
} from '@components/ui/Sheet';
import type { OrderAdminRow } from '@domains/payments/orders';
import {
	ORDER_STATUS_LABEL,
	formatDate,
	formatDateTime,
	formatUsd,
	orderStatusVariant,
} from './order-format';

interface OrderDetailsSheetProps {
	order: OrderAdminRow | null;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onResumePayment?: (order: OrderAdminRow) => void;
	resumingPayment?: boolean;
}

export default function OrderDetailsSheet({
	order,
	open,
	onOpenChange,
	onResumePayment,
	resumingPayment = false,
}: OrderDetailsSheetProps) {
	const isPaid = order?.status === 'confirmed';
	const isPending = order?.status === 'pending_payment';

	// URLs de recibo/factura (se cargan al abrir una orden pagada).
	const [docs, setDocs] = useState<{
		receiptUrl: string | null;
		invoiceUrl: string | null;
		invoicePdf: string | null;
	} | null>(null);
	const [loadingDocs, setLoadingDocs] = useState(false);

	useEffect(() => {
		if (!open || !order || order.status !== 'confirmed') {
			setDocs(null);
			return;
		}
		let active = true;
		setLoadingDocs(true);
		fetch('/api/payment/receipt-url', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ orderId: order.id }),
		})
			.then((res) => (res.ok ? res.json() : null))
			.then((data) => {
				if (!active) return;
				setDocs(
					data
						? {
								receiptUrl: data.receiptUrl ?? null,
								invoiceUrl: data.invoiceUrl ?? null,
								invoicePdf: data.invoicePdf ?? null,
							}
						: null,
				);
			})
			.catch(() => {
				if (active) setDocs(null);
			})
			.finally(() => {
				if (active) setLoadingDocs(false);
			});
		return () => {
			active = false;
		};
	}, [open, order?.id, order?.status]);

	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent side="right" className="flex w-full flex-col sm:max-w-md">
				<SheetHeader className="sr-only">
					<SheetTitle>Orden {order?.order_number ?? ''}</SheetTitle>
				</SheetHeader>

				{order ? (
					<div className="flex flex-1 flex-col overflow-y-auto">
						{/* ── Top section ── */}
						<div className="px-5 pt-10 pb-4">
							<p className="text-[11px] font-medium tracking-wider text-gray-400 uppercase dark:text-gray-500">
								{formatDate(order.created_at)}
							</p>
							<h2 className="mt-1 text-lg font-semibold text-gray-900 dark:text-gray-100">
								{order.order_number}
							</h2>
							<Badge
								variant={orderStatusVariant(order.status)}
								className="mt-2"
							>
								{ORDER_STATUS_LABEL[order.status] ?? order.status}
							</Badge>

							{/* Info grid */}
							<div className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3">
								<div>
									<p className="text-[10.5px] font-medium tracking-wider text-gray-400 uppercase dark:text-gray-500">
										Empresa
									</p>
									<p className="mt-0.5 text-[13px] font-medium text-gray-800 dark:text-gray-200">
										{order.incorporation_name ?? '—'}
									</p>
								</div>
								<div>
									<p className="text-[10.5px] font-medium tracking-wider text-gray-400 uppercase dark:text-gray-500">
										Plan
									</p>
									<p className="mt-0.5 text-[13px] font-medium text-gray-800 dark:text-gray-200">
										{order.plan_name ?? '—'}
									</p>
								</div>
								{order.client_name ? (
									<div className="col-span-2">
										<p className="text-[10.5px] font-medium tracking-wider text-gray-400 uppercase dark:text-gray-500">
											Cliente
										</p>
										<p className="mt-0.5 text-[13px] font-medium text-gray-800 dark:text-gray-200">
											{order.client_name}
										</p>
									</div>
								) : null}
								{isPaid && order.paid_at ? (
									<div className="col-span-2">
										<p className="text-[10.5px] font-medium tracking-wider text-gray-400 uppercase dark:text-gray-500">
											Fecha de pago
										</p>
										<p className="mt-0.5 text-[13px] font-medium text-gray-800 dark:text-gray-200">
											{formatDateTime(order.paid_at)}
										</p>
									</div>
								) : null}
							</div>
						</div>

						{/* ── Services breakdown ── */}
						<div className="border-t border-gray-100 px-5 py-4 dark:border-gray-800">
							<p className="mb-3 text-[10.5px] font-medium tracking-wider text-gray-400 uppercase dark:text-gray-500">
								Servicios incluidos
							</p>
							{order.lines.length ? (
								<ul className="space-y-0">
									{order.lines.map((line, idx) => (
										<li
											key={idx}
											className="flex items-center justify-between gap-2 py-2"
										>
											<div className="flex items-center gap-2.5 min-w-0">
												<div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-gray-100 dark:bg-gray-800">
													<Icon
														icon="ri:checkbox-circle-line"
														className="h-3.5 w-3.5 text-gray-400 dark:text-gray-500"
													/>
												</div>
												<div className="min-w-0">
													<p className="truncate text-[13px] font-medium text-gray-800 dark:text-gray-200">
														{line.service_name ?? '—'}
													</p>
													{line.service_plan_name ? (
														<p className="truncate text-[11px] text-gray-400 dark:text-gray-500">
															{line.service_plan_name}
														</p>
													) : null}
												</div>
											</div>
											{order.show_prices && line.unit_price != null ? (
												<span className="shrink-0 text-[13px] font-medium tabular-nums text-gray-700 dark:text-gray-300">
													{formatUsd(line.unit_price)}
												</span>
											) : (
												<span className="shrink-0 text-[11px] text-gray-400 dark:text-gray-500">
													x{line.quantity ?? 1}
												</span>
											)}
										</li>
									))}
								</ul>
							) : (
								<p className="text-[13px] text-gray-400 dark:text-gray-500">
									Sin servicios registrados
								</p>
							)}
						</div>

						{/* ── Total ── */}
						<div className="border-t border-gray-100 px-5 py-4 dark:border-gray-800">
							<div className="flex items-center justify-between">
								<span className="text-sm text-gray-500 dark:text-gray-400">
									Total
								</span>
								<span className="text-xl font-semibold tabular-nums text-gray-900 dark:text-gray-100">
									{formatUsd(order.total)}
								</span>
							</div>
						</div>

						{/* ── Actions ── */}
						<div className="mt-auto border-t border-gray-100 px-5 py-4 dark:border-gray-800">
							<div className="flex flex-col gap-2.5">
								{/* Continuar pago — solo pendientes, solo vista cliente */}
								{onResumePayment && isPending ? (
									<button
										type="button"
										disabled={resumingPayment}
										onClick={() => onResumePayment(order)}
										className="bg-primary-gold text-primary-black inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg text-sm font-semibold transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
									>
										{resumingPayment ? (
											'Redirigiendo…'
										) : (
											<>
												<Icon
													icon="ri:bank-card-line"
													className="h-4 w-4"
												/>
												Continuar con el pago
											</>
										)}
									</button>
								) : null}

								{/* Factura y recibo — solo pagadas */}
								{isPaid ? (
									loadingDocs ? (
										<div className="flex h-10 items-center justify-center text-[12.5px] text-gray-400 dark:text-gray-500">
											Buscando comprobantes…
										</div>
									) : docs?.invoicePdf || docs?.receiptUrl ? (
										<>
											{docs.invoicePdf ? (
												<a
													href={docs.invoicePdf}
													target="_blank"
													rel="noopener noreferrer"
													className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
												>
													<Icon icon="ri:download-2-line" className="h-4 w-4" />
													Descargar factura (PDF)
												</a>
											) : null}
											{docs.receiptUrl ? (
												<a
													href={docs.receiptUrl}
													target="_blank"
													rel="noopener noreferrer"
													className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
												>
													<Icon icon="ri:receipt-line" className="h-4 w-4" />
													Ver recibo de pago
												</a>
											) : null}
										</>
									) : (
										<p className="text-center text-[12.5px] text-gray-400 dark:text-gray-500">
											Comprobantes no disponibles aún.
										</p>
									)
								) : null}
							</div>
						</div>
					</div>
				) : null}
			</SheetContent>
		</Sheet>
	);
}

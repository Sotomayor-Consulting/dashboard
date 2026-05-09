import * as React from 'react';
import { EyeIcon } from 'lucide-react';

import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@components/ui/Dialog';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@components/ui/DropdownMenu';

export type OrderActionsDropdownOrder = {
	id: string;
	producto: string;
	precio: string;
	metodoPago: string;
	cliente: string;
	empresa: string;
	realizado: string;
	stripePaymentIntentId: string;
	estado: string;
};

type Props = {
	order: OrderActionsDropdownOrder;
};

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

export default function OrderActionsDropdown({ order }: Props) {
	const [detailsOpen, setDetailsOpen] = React.useState(false);

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
					<DropdownMenuItem onClick={() => setDetailsOpen(true)}>
						<EyeIcon />
						Ver orden
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>

			<Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
				<DialogContent className="sm:max-w-lg">
					<DialogHeader>
						<DialogTitle>Detalle de la orden</DialogTitle>
						<DialogDescription>
							Vista inicial para luego agregar informacion mas especifica.
						</DialogDescription>
					</DialogHeader>

					<div className="grid gap-3 px-5 text-sm">
						<div className="grid grid-cols-2 gap-3">
							<div>
								<p className="text-muted-foreground text-xs">Producto</p>
								<p className="font-medium">{order.producto}</p>
							</div>
							<div>
								<p className="text-muted-foreground text-xs">Precio</p>
								<p className="font-medium">{order.precio}</p>
							</div>
							<div>
								<p className="text-muted-foreground text-xs">Metodo de pago</p>
								<p className="font-medium">{order.metodoPago}</p>
							</div>
							<div>
								<p className="text-muted-foreground text-xs">Realizado</p>
								<p className="font-medium">{order.realizado}</p>
							</div>
						</div>

						<div>
							<p className="text-muted-foreground text-xs">Cliente</p>
							<p className="font-medium">{order.cliente}</p>
						</div>

						<div>
							<p className="text-muted-foreground text-xs">Empresa</p>
							<p className="font-medium">{order.empresa}</p>
						</div>

						<div>
							<p className="text-muted-foreground text-xs">
								Stripe Payment Intent
							</p>
							<p className="font-mono text-xs">{order.stripePaymentIntentId}</p>
						</div>

						<div>
							<p className="text-muted-foreground text-xs">Estado</p>
							<p className="font-medium">{order.estado}</p>
						</div>
					</div>

					<DialogFooter showCloseButton />
				</DialogContent>
			</Dialog>
		</>
	);
}

import * as React from 'react';
import { EyeIcon, MoreHorizontalIcon } from 'lucide-react';

import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@components/ui/DropdownMenu';
import OrderDetailsSheet from '@components/display/orders/OrderDetailsSheet';
import type { OrderAdminRow } from '@domains/payments/orders';

type Props = {
	order: OrderAdminRow;
};

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
							aria-label="Abrir menú"
						/>
					}
				>
					<MoreHorizontalIcon className="h-5 w-5" />
					<span className="sr-only">Abrir menú</span>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end" className="w-44">
					<DropdownMenuItem onClick={() => setOpen(true)}>
						<EyeIcon />
						Ver orden
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>

			<OrderDetailsSheet order={order} open={open} onOpenChange={setOpen} />
		</>
	);
}

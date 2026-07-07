import { LayoutList, CircleDollarSign } from 'lucide-react';
import PagosRealizadosTable, {
	type RawPaymentItem,
} from '@modules/billing/islands/PagosRealizadosTable';

import CardsHeadOrders from '@modules/billing/islands/CardsHeadOrders';
import OrdersTable from '@modules/billing/islands/OrdersTable';
import type { OrderAdminRow } from '@domains/payments/orders';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@components/ui/Tabs';

interface TabsIconsProps {
	data: RawPaymentItem[];
	orders: OrderAdminRow[];
}

export default function TabsIcons({ data, orders }: TabsIconsProps) {
	return (
		<Tabs defaultValue="pagos-realizados" className="w-full p-4 shadow-xs">
			<TabsList
				className="mb-4 flex w-fit items-center justify-start gap-1 rounded-lg border border-gray-200 bg-white p-1 text-xs font-medium shadow-sm shadow-gray-200/70 xl:inline-flex xl:text-sm dark:border-gray-700 dark:bg-transparent dark:shadow-none"
				variant="line"
			>
				<TabsTrigger value="pagos-realizados" className="flex-none">
					<CircleDollarSign />
					Pagos realizados
				</TabsTrigger>
				<TabsTrigger value="test" className="flex-none">
					<LayoutList />
					Ordenes
				</TabsTrigger>
			</TabsList>
			<TabsContent value="pagos-realizados" className="">
				<PagosRealizadosTable data={data} />
			</TabsContent>
			<TabsContent value="test" className="pt-6">
				<div className="flex w-full flex-col">
					<CardsHeadOrders data={orders} />
					<OrdersTable data={orders} />
				</div>
			</TabsContent>
		</Tabs>
	);
}

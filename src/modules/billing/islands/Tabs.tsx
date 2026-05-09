import { AppWindowIcon } from 'lucide-react';
import PagosRealizadosTable, {
	type RawPaymentItem,
} from '@modules/billing/islands/PagosRealizadosTable';

import CardsHeadOrders from '@modules/billing/islands/CardsHeadOrders';
import OrdersTable from '@modules/billing/islands/OrdersTable';

import {
	Tabs,
	TabsContent,
	TabsList,
	TabsTrigger,
} from '@components/ui/tabs';

interface TabsIconsProps {
	data: RawPaymentItem[];
}

export default function TabsIcons({ data }: TabsIconsProps) {
	return (
		<Tabs defaultValue="pagos-realizados" className="w-full">
			<TabsList className="w-full justify-start" variant="line">
				<TabsTrigger value="pagos-realizados" className="flex-none">
					<AppWindowIcon />
					Pagos realizados
				</TabsTrigger>
				<TabsTrigger value="test" className="flex-none">
					<AppWindowIcon />
					Ordenes
				</TabsTrigger>
			</TabsList>
			<TabsContent value="pagos-realizados" className="pt-6">
				<PagosRealizadosTable data={data} />
			</TabsContent>
			<TabsContent value="test" className="pt-6">
				<div className="flex w-full flex-col">
					<CardsHeadOrders />
					<OrdersTable />
				</div>
			</TabsContent>
		</Tabs>
	);
}

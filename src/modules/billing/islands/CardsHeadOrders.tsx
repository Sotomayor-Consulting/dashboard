import {
	Card,
	CardDescription,
	CardHeader,
	CardTitle,
	CardAction,
} from '@components/ui/Card';
import { FileArchive, BadgeCheck, Star } from 'lucide-react';
import type { OrderAdminRow } from '@domains/payments/orders';

interface CardsHeadOrdersProps {
	data: OrderAdminRow[];
}

function topPlan(data: OrderAdminRow[]): string {
	const counts = new Map<string, number>();
	for (const o of data) {
		if (o.status !== 'confirmed' || !o.plan_name) continue;
		counts.set(o.plan_name, (counts.get(o.plan_name) ?? 0) + 1);
	}
	let best = '—';
	let bestN = 0;
	for (const [plan, n] of counts) {
		if (n > bestN) {
			best = plan;
			bestN = n;
		}
	}
	return best;
}

export default function CardsHeadOrders({ data }: CardsHeadOrdersProps) {
	const pendientes = data.filter(
		(o) => o.status === 'pending_payment' || o.status === 'draft',
	).length;
	const finalizadas = data.filter((o) => o.status === 'confirmed').length;
	const masVendido = topPlan(data);

	return (
		<div className="grid h-full w-full grid-cols-1 gap-4 py-2 md:grid-cols-3">
			<Card className="@container/card">
				<CardHeader>
					<CardDescription>Ordenes Pendientes</CardDescription>
					<CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
						{pendientes}
					</CardTitle>
					<CardAction>
						<FileArchive className="text-primary-gold" />
					</CardAction>
				</CardHeader>
			</Card>
			<Card className="@container/card">
				<CardHeader>
					<CardDescription>Ordenes Finalizadas</CardDescription>
					<CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
						{finalizadas}
					</CardTitle>
					<CardAction>
						<BadgeCheck className="text-primary-gold" />
					</CardAction>
				</CardHeader>
			</Card>
			<Card className="@container/card">
				<CardHeader>
					<CardDescription>Servicio Mas vendido</CardDescription>
					<CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
						{masVendido}
					</CardTitle>
					<CardAction>
						<Star className="text-primary-gold" />
					</CardAction>
				</CardHeader>
			</Card>
		</div>
	);
}

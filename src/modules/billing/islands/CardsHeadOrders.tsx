import {
	Card,
	CardDescription,
	CardHeader,
	CardTitle,
	CardAction,
} from '@components/ui/Card';
import { FileArchive, BadgeCheck, Star } from 'lucide-react';

export default function CardsHeadOrders() {
	return (
		<div className="grid h-full w-full grid-cols-1 gap-4 py-2 md:grid-cols-3">
			<Card className="@container/card">
				<CardHeader>
					<CardDescription>Ordenes Pendientes</CardDescription>
					<CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
						45
					</CardTitle>
					<CardAction>
						<FileArchive className="text-black-300" />
					</CardAction>
				</CardHeader>
			</Card>
			<Card className="@container/card">
				<CardHeader>
					<CardDescription>Ordenes Finalizadas</CardDescription>
					<CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
						100
					</CardTitle>
					<CardAction>
						<BadgeCheck className="text-black-300" />
					</CardAction>
				</CardHeader>
			</Card>
			<Card className="@container/card">
				<CardHeader>
					<CardDescription>Servicio Mas vendido</CardDescription>
					<CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
						Plan Business
					</CardTitle>
					<CardAction>
						<Star className="text-black-300" />
					</CardAction>
				</CardHeader>
			</Card>
		</div>
	);
}

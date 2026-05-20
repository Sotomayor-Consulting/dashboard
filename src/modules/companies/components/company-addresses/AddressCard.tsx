import { Button } from '@components/ui/Button';
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from '@components/ui/Card';
import type { AddressItem } from '../../hooks/use-company-addresses';
import { BriefcaseBusinessIcon } from 'lucide-react';

interface Props {
	address: AddressItem;
	addressCardHeightClass: string;
	onOpenDetail: (addressId: string) => void;
}

export default function AddressCard({ address, onOpenDetail }: Props) {
	return (
		<Card className="round-xl bg-transparentrounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-transparent">
			<CardHeader>
				<CardTitle className="">
					<BriefcaseBusinessIcon />
					{address.type || 'Sin tipo'}
				</CardTitle>
				<CardDescription className="truncate">
					{address.country || 'Sin pais'}
				</CardDescription>
			</CardHeader>
			<CardContent>
				<div className="flex flex-col gap-1">
					<span className="text-muted-foreground text-xs">Linea 1</span>
					<p className="line-clamp-2 text-sm">
						{address.line1 || 'Sin linea 1'}
					</p>
				</div>
				<div className="flex flex-col gap-1">
					<span className="text-muted-foreground text-xs">Ciudad y ZIP</span>
					<p className="text-sm">
						{address.city || 'Sin ciudad'}
						{address.zip ? `, ${address.zip}` : ''}
					</p>
				</div>
			</CardContent>
			<CardFooter>
				<Button
					type="button"
					variant="outline"
					size="sm"
					className="mt-auto"
					onClick={() => onOpenDetail(address.id)}
				>
					Editar
				</Button>
			</CardFooter>
		</Card>
	);
}

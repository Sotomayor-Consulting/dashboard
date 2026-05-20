import { Button } from '@components/ui/Button';
import { PlusIcon } from 'lucide-react';

interface Props {
	canEditDetails: boolean;
	addressCardHeightClass: string;
	onClick: () => void;
}

export default function AddressCreateCard({ canEditDetails, onClick }: Props) {
	return (
		<Button
			type="button"
			variant="outline"
			size="sm"
			onClick={onClick}
			disabled={!canEditDetails}
			className="h-full w-full rounded-xl border-dashed border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-transparent"
		>
			<PlusIcon data-icon="inline-start" />
			Agregar direccion
		</Button>
	);
}

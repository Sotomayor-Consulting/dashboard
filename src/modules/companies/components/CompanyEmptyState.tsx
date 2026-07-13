import { Building2Icon } from 'lucide-react';
import { Button } from '@components/ui/Button';

interface Props {
	title: string;
	description: string;
	canEditDetails: boolean;
	onCreateCompany: () => void;
}

export default function CompanyEmptyState({
	title,
	description,
	canEditDetails,
	onCreateCompany,
}: Props) {
	return (
		<div className="rounded-xl border border-dashed border-gray-300 p-6 dark:border-gray-700">
			<div className="flex flex-col items-center gap-3 text-center">
				<div className="rounded-full border border-gray-200 p-2 dark:border-gray-700">
					<Building2Icon className="h-5 w-5 text-gray-500 dark:text-gray-300" />
				</div>
				<div>
					<h4 className="text-base font-semibold">{title}</h4>
					<p className="text-muted-foreground mt-1 text-sm">{description}</p>
				</div>
				<Button
					type="button"
					variant="outline"
					onClick={onCreateCompany}
					disabled={!canEditDetails}
				>
					Crear empresa
				</Button>
			</div>
		</div>
	);
}

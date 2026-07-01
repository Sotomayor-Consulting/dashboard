import { useMemo, useState } from 'react';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@components/ui/Select';

interface CompanyOption {
	id: string;
	principal_name: string;
}

interface CompanySelectProps {
	companies: CompanyOption[];
	inputId?: string;
	inputName?: string;
}

export default function CompanySelect({
	companies,
	inputId = 'empresa-select',
	inputName = 'empresa',
}: CompanySelectProps) {
	const initialValue = companies[0]?.id ?? '';
	const [value, setValue] = useState(initialValue);

	const selectedLabel = useMemo(
		() => companies.find((company) => company.id === value)?.principal_name ?? '',
		[companies, value],
	);

	return (
		<div className="space-y-2">
			<input type="hidden" id={inputId} name={inputName} value={value} />
			<Select value={value} onValueChange={(nextValue) => setValue(nextValue ?? '')}>
				<SelectTrigger className="h-11 w-full rounded-xl px-4 text-sm">
					<SelectValue placeholder="Selecciona una empresa">
						{selectedLabel || 'Selecciona una empresa'}
					</SelectValue>
				</SelectTrigger>
				<SelectContent>
					{companies.map((company) => (
						<SelectItem
							key={company.id}
							value={company.id}
							label={company.principal_name}
						>
							{company.principal_name}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
		</div>
	);
}

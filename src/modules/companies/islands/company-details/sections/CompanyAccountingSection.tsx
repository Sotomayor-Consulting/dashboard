import {
	Field,
	FieldContent,
	FieldDescription,
	FieldGroup,
	FieldLabel,
	FieldTitle,
} from '@components/ui/Field';
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@components/ui/Select';
import { Switch } from '@components/ui/Switch';
import type { EmpresaDetail } from '../../../types';
import { TAX_OPTIONS } from '../constants';

interface Props {
	empresa: EmpresaDetail;
	canEditDetails: boolean;
	hasUsIncome: boolean;
}

export default function CompanyAccountingSection({
	empresa,
	canEditDetails,
	hasUsIncome,
}: Props) {
	return (
		<section className="flex flex-col gap-4 border-gray-200 pt-5 dark:border-gray-700">
			<h3 className="text-sm font-semibold">Contable</h3>
			<FieldGroup className="grid gap-4 md:grid-cols-2">
				<Field data-disabled={!canEditDetails}>
					<FieldLabel htmlFor="forma_tributacion">
						Forma de tributacion
					</FieldLabel>
					<Select
						name="forma_tributacion"
						defaultValue={empresa.forma_tributacion ?? ''}
						disabled={!canEditDetails}
					>
						<SelectTrigger id="forma_tributacion" className="w-full">
							<SelectValue placeholder="Seleccione" />
						</SelectTrigger>
						<SelectContent>
							<SelectGroup>
								{TAX_OPTIONS.map((item) => (
									<SelectItem key={item.value} value={item.value}>
										{item.label}
									</SelectItem>
								))}
							</SelectGroup>
						</SelectContent>
					</Select>
				</Field>

				<FieldLabel htmlFor="income_us" data-disabled={!canEditDetails}>
					<Field orientation="horizontal">
						<FieldContent>
							<FieldTitle>Ingresos de fuente americana</FieldTitle>
							<FieldDescription>
								La empresa obtendra ingresos en Estados Unidos.
							</FieldDescription>
						</FieldContent>
						<Switch
							id="income_us"
							name="income_us"
							defaultChecked={hasUsIncome}
							disabled={!canEditDetails}
						/>
					</Field>
				</FieldLabel>
			</FieldGroup>
		</section>
	);
}

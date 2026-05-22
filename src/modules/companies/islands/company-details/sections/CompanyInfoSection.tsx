import { Field, FieldDescription, FieldGroup, FieldLabel } from '@components/ui/Field';
import { Input } from '@components/ui/Input';
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@components/ui/Select';
import type { CompanyItem } from '../../../types';

interface Props {
	company: CompanyItem | null;
	canEditDetails: boolean;
}

export default function CompanyInfoSection({
	company,
	canEditDetails,
}: Props) {
	return (
		<section className="flex flex-col gap-4">
			<header className="flex flex-col gap-1">
				<h3 className="text-lg font-semibold">Informacion</h3>
				<FieldDescription>
					Datos base de la empresa relacionada con esta incorporación.
				</FieldDescription>
			</header>

			<FieldGroup className="grid gap-4 md:grid-cols-2">
				<Field data-disabled={!canEditDetails}>
					<FieldLabel htmlFor="company_legal_name">Nombre legal</FieldLabel>
					<Input
						id="company_legal_name"
						name="company_legal_name"
						defaultValue={company?.legal_name ?? ''}
						disabled={!canEditDetails}
					/>
				</Field>

				<Field data-disabled={!canEditDetails}>
					<FieldLabel htmlFor="company_identification_number">
						Número de identificación
					</FieldLabel>
					<Input
						id="company_identification_number"
						name="company_identification_number"
						defaultValue={company?.identification_number ?? ''}
						disabled={!canEditDetails}
					/>
				</Field>

				<Field data-disabled={!canEditDetails}>
					<FieldLabel htmlFor="company_entity_type">Tipo de entidad</FieldLabel>
					<Input
						id="company_entity_type"
						name="company_entity_type"
						defaultValue={company?.entity_type ?? ''}
						disabled={!canEditDetails}
					/>
				</Field>

				<Field data-disabled={!canEditDetails}>
					<FieldLabel htmlFor="company_tax_clasification">
						Clasificación tributaria
					</FieldLabel>
					<Input
						id="company_tax_clasification"
						name="company_tax_clasification"
						defaultValue={company?.tax_clasification ?? ''}
						disabled={!canEditDetails}
					/>
				</Field>

				<Field data-disabled={!canEditDetails}>
					<FieldLabel htmlFor="company_management_type">
						Tipo de gestión
					</FieldLabel>
					<Select
						name="company_management_type"
						defaultValue={company?.management_type ?? ''}
						disabled={!canEditDetails}
					>
						<SelectTrigger id="company_management_type" className="w-full">
							<SelectValue placeholder="Seleccione" />
						</SelectTrigger>
						<SelectContent>
							<SelectGroup>
								<SelectItem value="member-managed">member-managed</SelectItem>
								<SelectItem value="manager-managed">manager-managed</SelectItem>
							</SelectGroup>
						</SelectContent>
					</Select>
				</Field>
			</FieldGroup>
		</section>
	);
}

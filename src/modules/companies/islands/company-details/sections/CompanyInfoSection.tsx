import {
	Field,
	FieldContent,
	FieldDescription,
	FieldGroup,
	FieldLabel,
	FieldTitle,
} from '@components/ui/Field';
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
import { SelectLabel } from '@components/ui/Select';
import { Textarea } from '@components/ui/Textarea';
import { Switch } from '@components/ui/Switch';

interface Props {
	company: CompanyItem | null;
	canEditDetails: boolean;
}

export default function CompanyInfoSection({ company, canEditDetails }: Props) {
	const MANAGEMENT_OPTIONS: { value: string; label: string }[] = [
		{ value: 'Manager-Managed', label: 'manager-managed' },
		{ value: 'Member-Managed', label: 'member-managed' },
	];

	return (
		<section className="flex flex-col gap-4">
			<header className="flex flex-col gap-1">
				<h3 className="text-lg font-semibold">Información</h3>
				<FieldDescription>
					Datos oficiales de la empresa relacionada con esta incorporación.
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
					<FieldDescription>
						Ingrese el nombre oficial de la empresa
					</FieldDescription>
				</Field>
				<Field data-disabled={!canEditDetails}>
					<FieldLabel htmlFor="filing_number">Número de expediente</FieldLabel>
					<Input
						id="filing_number"
						name="filing_number"
						defaultValue={company?.filing_number ?? ''}
						disabled={!canEditDetails}
					/>
					<FieldDescription>
						Ingrese el número de expediente para la busqueda estatal
					</FieldDescription>
				</Field>
				<Field>
					<FieldLabel>Jurisdicción (US)</FieldLabel>

					<Select id="state_id" disabled={!canEditDetails}>
						<SelectTrigger>
							<SelectValue placeholder="Seleccione la jurisdicción"></SelectValue>
						</SelectTrigger>
						<SelectContent>
							<SelectGroup>
								<SelectLabel>Estados Unidos</SelectLabel>
								<SelectItem key="Florida" value="Florida">
									Florida
								</SelectItem>
							</SelectGroup>
						</SelectContent>
					</Select>
					<FieldDescription>
						Selecciona la jurisdicción donde se va a incorporar la empresa.
					</FieldDescription>
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
			</FieldGroup>
			<FieldGroup className="flex gap-4 md:flex-row">
				<Field data-disabled={!canEditDetails} className="w-1/2">
					<FieldLabel htmlFor="company_entity_type">Tipo de entidad</FieldLabel>
					<Select>
						<SelectTrigger>
							<SelectValue placeholder="Tipo de entidad" />
						</SelectTrigger>
						<SelectContent>
							<SelectGroup>
								<SelectLabel>Tipos</SelectLabel>
								<SelectItem key="LLC" value="LLC">
									LLC
								</SelectItem>
							</SelectGroup>
						</SelectContent>
					</Select>
				</Field>
				<Field data-disabled={!canEditDetails}>
					<FieldLabel>Forma de tributación</FieldLabel>
					<Select>
						<SelectTrigger>
							<SelectValue placeholder="Clasificación tributaria" />
						</SelectTrigger>
						<SelectContent>
							<SelectGroup>
								<SelectLabel>Tipos</SelectLabel>
								<SelectItem>Entidad de paso</SelectItem>
								<SelectItem>LLC Corporacion</SelectItem>
							</SelectGroup>
						</SelectContent>
					</Select>
					<FieldDescription>
						Seleccione la forma de tributar de la entidad.
					</FieldDescription>
				</Field>
			</FieldGroup>
			<FieldGroup>
				<Field>
					<FieldLabel htmlFor="company_management_type">
						Forma de administrar
					</FieldLabel>
					<FieldDescription>
						Define quién toma las decisiones operativas: todos los socios o
						gerentes designados.
					</FieldDescription>
					<Select
						name="company_management_type"
						defaultValue={company?.management_type ?? undefined}
						disabled={!canEditDetails}
					>
						<SelectTrigger id="company_management_type" className="w-full">
							<SelectValue placeholder="Seleccione" />
						</SelectTrigger>
						<SelectContent>
							<SelectGroup>
								{MANAGEMENT_OPTIONS.map(({ value, label }) => (
									<SelectItem key={value} value={value}>
										{label}
									</SelectItem>
								))}
							</SelectGroup>
						</SelectContent>
					</Select>
				</Field>
			</FieldGroup>
			<FieldGroup className="grid gap-4 md:grid-cols-2">
				<Field>
					<FieldLabel>Actividad</FieldLabel>
					<Select>
						<SelectTrigger>
							<SelectValue placeholder="Seleccione la actividad" />
						</SelectTrigger>
						<SelectContent>
							<SelectGroup>
								<SelectLabel>Actividad</SelectLabel>
								<SelectItem value="Comercio">Comercio</SelectItem>
								<SelectItem value="Trading">Trading</SelectItem>
							</SelectGroup>
						</SelectContent>
					</Select>
				</Field>
				<FieldLabel htmlFor="income_us">
					<Field orientation="horizontal">
						<FieldContent>
							<FieldTitle>Obtendrá ingresos en EE.UU.</FieldTitle>
							<FieldDescription>
								La entidad generará ingresos de fuente américana
							</FieldDescription>
						</FieldContent>
						<Switch id="income_us" />
					</Field>
				</FieldLabel>
			</FieldGroup>
			<FieldGroup>
				<Field>
					<FieldLabel>Descripción de actividad económica</FieldLabel>
					<Textarea placeholder="Ej: Venta de artículos por internet" />
				</Field>
			</FieldGroup>
		</section>
	);
}

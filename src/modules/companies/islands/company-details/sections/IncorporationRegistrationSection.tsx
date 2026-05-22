import { Field, FieldDescription, FieldGroup, FieldLabel } from '@components/ui/Field';
import { Input } from '@components/ui/Input';
import type { EmpresaDetail } from '../../../types';

interface Props {
	empresa: EmpresaDetail;
	canEditDetails: boolean;
}

export default function IncorporationRegistrationSection({
	empresa,
	canEditDetails,
}: Props) {
	return (
		<section className="flex flex-col gap-4">
			<header className="flex flex-col gap-1">
				<h3 className="text-lg font-semibold">Información</h3>
				<FieldDescription>
					Revise o edite detalles del registro de incorporación.
				</FieldDescription>
			</header>

			<FieldGroup className="grid gap-4 md:grid-cols-3">
				<Field data-disabled={!canEditDetails}>
					<FieldLabel htmlFor="name_option_1">Opción de nombre 1</FieldLabel>
					<Input
						id="name_option_1"
						name="name_option_1"
						defaultValue={empresa.nombre_1 ?? ''}
						disabled={!canEditDetails}
					/>
				</Field>

				<Field data-disabled={!canEditDetails}>
					<FieldLabel htmlFor="name_option_2">Opción de nombre 2</FieldLabel>
					<Input
						id="name_option_2"
						name="name_option_2"
						defaultValue={empresa.nombre_2 ?? ''}
						disabled={!canEditDetails}
					/>
				</Field>

				<Field data-disabled={!canEditDetails}>
					<FieldLabel htmlFor="name_option_3">Opción de nombre 3</FieldLabel>
					<Input
						id="name_option_3"
						name="name_option_3"
						defaultValue={empresa.nombre_3 ?? ''}
						disabled={!canEditDetails}
					/>
				</Field>
			</FieldGroup>

			<FieldGroup className="grid gap-4 md:grid-cols-2">
				<Field data-disabled={!canEditDetails}>
					<FieldLabel htmlFor="business_type">Tipo de negocio</FieldLabel>
					<Input
						id="business_type"
						name="business_type"
						defaultValue={empresa.tipo_de_negocio ?? ''}
						disabled={!canEditDetails}
					/>
				</Field>

				<Field data-disabled={!canEditDetails}>
					<FieldLabel htmlFor="incorporation_status">Estado</FieldLabel>
					<Input
						id="incorporation_status"
						name="incorporation_status"
						defaultValue={empresa.estado ?? ''}
						disabled={!canEditDetails}
					/>
				</Field>
			</FieldGroup>
		</section>
	);
}

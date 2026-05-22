import {
	Field,
	FieldDescription,
	FieldGroup,
	FieldLabel,
} from '@components/ui/Field';
import { Input } from '@components/ui/Input';
import type { EmpresaDetail, State } from '../../../types';
import { useState, useMemo } from 'react';

import {
	Select,
	SelectTrigger,
	SelectGroup,
	SelectItem,
	SelectLabel,
	SelectValue,
	SelectContent,
} from '@components/ui/Select';

const business_types = ['LLC'];

interface Props {
	empresa: EmpresaDetail;
	canEditDetails: boolean;
	states_us: State[];
}

export default function IncorporationRegistrationSection({
	empresa,
	canEditDetails,
	states_us,
}: Props) {
	const [jurisdictionId, setJurisdictionId] = useState<
		string | undefined | null
	>(empresa.state_id != null ? String(empresa.state_id) : undefined);

	const selectedState = useMemo(
		() => states_us.find((s) => String(s.id) === jurisdictionId),
		[jurisdictionId, states_us],
	);
	return (
		<section className="flex flex-col gap-4">
			<header className="flex flex-col gap-1">
				<h3 className="text-lg font-semibold">Información</h3>
				<FieldDescription>
					Revise o edite detalles del registro de incorporación.
				</FieldDescription>
			</header>

			<div className="flex flex-col gap-2">
				<FieldLabel>Opciones de nombre</FieldLabel>
				<FieldDescription>
					Registre las opciones de nombre propuestas por el cliente. Estas
					deberán ser validadas según la disponibilidad y requisitos estatales
					donde se incorpora la empresa.
				</FieldDescription>
				<FieldGroup className="grid gap-4 md:grid-cols-3">
					<Field data-disabled={!canEditDetails}>
						<Input
							id="name_option_1"
							name="name_option_1"
							defaultValue={empresa.nombre_1 ?? ''}
							disabled={!canEditDetails}
						/>
						<FieldDescription>Nombre 1</FieldDescription>
					</Field>

					<Field data-disabled={!canEditDetails}>
						<Input
							id="name_option_2"
							name="name_option_2"
							defaultValue={empresa.nombre_2 ?? ''}
							disabled={!canEditDetails}
						/>
						<FieldDescription>Nombre 2</FieldDescription>
					</Field>

					<Field data-disabled={!canEditDetails}>
						<Input
							id="name_option_3"
							name="name_option_3"
							defaultValue={empresa.nombre_3 ?? ''}
							disabled={!canEditDetails}
						/>
						<FieldDescription>Nombre 3</FieldDescription>
					</Field>
				</FieldGroup>
			</div>
			<FieldGroup className="grid gap-4 md:grid-cols-2">
				<Field>
					<FieldLabel htmlFor="business_type">Tipo de negocio</FieldLabel>
					<Select
						id="business_type"
						defaultValue={empresa.tipo_de_negocio ?? undefined}
						disabled={!canEditDetails}
					>
						<SelectTrigger className="w-full">
							<SelectValue placeholder="Selecciona un tipo" />
						</SelectTrigger>
						<SelectContent>
							<SelectGroup>
								<SelectLabel>Tipos</SelectLabel>
								{business_types.map((b) => (
									<SelectItem key={b} value={b}>
										{b}
									</SelectItem>
								))}
							</SelectGroup>
						</SelectContent>
					</Select>
					<FieldDescription>Escoge el tipo de empresa.</FieldDescription>
				</Field>
				<Field>
					<FieldLabel>Jurisdicción (US)</FieldLabel>
					<Select value={jurisdictionId} onValueChange={setJurisdictionId}>
						<SelectTrigger>
							{/* 2. Forzamos a que muestre el nombre, y si no hay, muestra el placeholder */}
							<SelectValue placeholder="Seleccione la jurisdicción">
								{selectedState
									? selectedState.name
									: 'Seleccione la jurisdicción'}
							</SelectValue>
						</SelectTrigger>
						<SelectContent>
							<SelectGroup>
								<SelectLabel>Estados Unidos</SelectLabel>
								{states_us.map((state: any) => (
									<SelectItem key={state.id} value={String(state.id)}>
										{state.name}
									</SelectItem>
								))}
							</SelectGroup>
						</SelectContent>
					</Select>
					<FieldDescription>
						Selecciona la jurisdicción donde se va a incorporar la empresa.
					</FieldDescription>
				</Field>
			</FieldGroup>
		</section>
	);
}

import {
	Field,
	FieldDescription,
	FieldGroup,
	FieldLabel,
} from '@components/ui/Field';
import { Input } from '@components/ui/Input';
import type { State } from '../../../types';
import { Controller } from 'react-hook-form';

import {
	Select,
	SelectTrigger,
	SelectGroup,
	SelectItem,
	SelectLabel,
	SelectValue,
	SelectContent,
} from '@components/ui/Select';
import type {
	IncorporationRegistrationFormValues,
	IncorporationRegistrationInput,
} from '../schemas/incorporation-registration.schema';
import type { UseFormReturn } from 'react-hook-form';

const business_types = ['LLC'];

interface Props {
	canEditDetails: boolean;
	states_us: State[];
	form: UseFormReturn<
		IncorporationRegistrationFormValues,
		unknown,
		IncorporationRegistrationInput
	>;
}

export default function IncorporationRegistrationSection({
	canEditDetails,
	states_us,
	form,
}: Props) {
	const { register, control } = form;

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
							{...register('nameOption1')}
							disabled={!canEditDetails}
						/>
						<FieldDescription>Nombre 1</FieldDescription>
					</Field>

					<Field data-disabled={!canEditDetails}>
						<Input
							id="name_option_2"
							{...register('nameOption2')}
							disabled={!canEditDetails}
						/>
						<FieldDescription>Nombre 2</FieldDescription>
					</Field>

					<Field data-disabled={!canEditDetails}>
						<Input
							id="name_option_3"
							{...register('nameOption3')}
							disabled={!canEditDetails}
						/>
						<FieldDescription>Nombre 3</FieldDescription>
					</Field>
				</FieldGroup>
			</div>
			<FieldGroup className="grid gap-4 md:grid-cols-2">
				<Field>
					<FieldLabel htmlFor="business_type">Tipo de negocio</FieldLabel>
					<Controller
						name="businessType"
						control={control}
						render={({ field }) => (
							<Select
								id="business_type"
								value={field.value ?? ''}
								onValueChange={(value) => field.onChange(value || null)}
								disabled={!canEditDetails}
							>
								<SelectTrigger className="w-full">
									<SelectValue placeholder="Selecciona un tipo">
										{typeof field.value === 'string' ? field.value : undefined}
									</SelectValue>
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
						)}
					/>
					<FieldDescription>Escoge el tipo de empresa.</FieldDescription>
				</Field>
				<Field>
					<FieldLabel>Jurisdicción (US)</FieldLabel>
					<Controller
						name="stateId"
						control={control}
						render={({ field }) => (
							<Select
								id="state_id"
								value={field.value != null ? String(field.value) : ''}
								onValueChange={(value) => {
									if (!value) {
										field.onChange(null);
										return;
									}
									const numericValue = Number(value);
									field.onChange(
										Number.isInteger(numericValue) ? numericValue : null,
									);
								}}
								disabled={!canEditDetails}
							>
								<SelectTrigger>
									<SelectValue placeholder="Seleccione la jurisdicción">
										{field.value != null
											? states_us.find((s) => s.id === field.value)?.name
											: undefined}
									</SelectValue>
								</SelectTrigger>
								<SelectContent>
									<SelectGroup>
										<SelectLabel>Estados Unidos</SelectLabel>
										{states_us.map((state) => (
											<SelectItem key={state.id} value={String(state.id)}>
												{state.name}
											</SelectItem>
										))}
									</SelectGroup>
								</SelectContent>
							</Select>
						)}
					/>
					<FieldDescription>
						Selecciona la jurisdicción donde se va a incorporar la empresa.
					</FieldDescription>
				</Field>
			</FieldGroup>
		</section>
	);
}

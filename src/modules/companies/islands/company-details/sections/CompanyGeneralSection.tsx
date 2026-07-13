import * as React from 'react';
import {
	Popover,
	PopoverTrigger,
	PopoverContent,
} from '@components/ui/Popover';
import { ChevronDownIcon } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@components/ui/Button';
import {
	Field,
	FieldGroup,
	FieldLabel,
	FieldDescription,
	FieldLegend,
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
import { Textarea } from '@components/ui/Textarea';
import { Calendar } from '@components/ui/Calendar';
import type { ActividadItem, EmpresaDetail, State } from '../../../types';

interface Props {
	empresa: EmpresaDetail;
	canEditDetails: boolean;
	states: State[];
	actividades: ActividadItem[];
	stateId: string;
	setStateId: (value: string) => void;
	open: boolean;
	setOpen: (value: boolean) => void;
	date: Date | undefined;
	handleSelectDate: (selectedDate: Date | undefined) => void;
}

export default function CompanyGeneralSection({
	empresa,
	canEditDetails,
	states,
	actividades,
	stateId,
	setStateId,
	open,
	setOpen,
	date,
	handleSelectDate,
}: Props) {
	return (
		<section className="flex flex-col gap-5">
			<header className="flex flex-col gap-1">
				<h3 className="text-lg font-semibold">General</h3>
				<p className="text-muted-foreground text-sm">
					Revisa o edita la información general de la empresa
				</p>
			</header>
			<Field>
				<FieldLegend>Opciones de nombre</FieldLegend>
				<FieldDescription>
					Ingresa hasta tres opciones para validar disponibilidad.
				</FieldDescription>
				<div className="grid grid-cols-1 gap-4 md:grid-cols-3">
					<Input
						id="nombre_1"
						name="nombre_1"
						placeholder="Primera opcion"
						defaultValue={empresa.principal_name ?? ''}
					/>
					<Input
						id="nombre_2"
						name="nombre_2"
						placeholder="Segunda opcion"
						defaultValue={empresa.possible_names?.[1] ?? ''}
					/>
					<Input
						id="nombre_3"
						name="nombre_3"
						placeholder="Tercera opcion"
						defaultValue={empresa.possible_names?.[2] ?? ''}
					/>
				</div>
			</Field>

			<FieldGroup className="gap-4">
				<div className="space-y-1">
					<FieldLegend>Información legal</FieldLegend>
					<FieldDescription>
						Cargue la información oficial de la incorporación.
					</FieldDescription>
				</div>

				<div className="grid gap-4 xl:grid-cols-2">
					<Field data-disabled={!canEditDetails}>
						<FieldLabel htmlFor="state_id">Jurisdicción</FieldLabel>
						<Select
							name="state_id"
							value={stateId}
							onValueChange={(value) => setStateId(value ?? '')}
							disabled={!canEditDetails}
						>
							<SelectTrigger id="state_id" className="w-full">
								<SelectValue placeholder="Seleccione" />
							</SelectTrigger>

							<SelectContent>
								<SelectGroup>
									{states.map((state) => (
										<SelectItem key={String(state.id)} value={String(state.id)}>
											{state.name ?? ''}
										</SelectItem>
									))}
								</SelectGroup>
							</SelectContent>
						</Select>
					</Field>

					<Field data-disabled={!canEditDetails}>
						<FieldLabel htmlFor="state_registration_date">
							Fecha de registro estatal
						</FieldLabel>

						<Popover open={open} onOpenChange={setOpen}>
							<PopoverTrigger>
								<Button
									type="button"
									variant="outline"
									id="state_registration_date"
									disabled={!canEditDetails}
									data-empty={!date}
									className="data-[empty=true]:text-muted-foreground w-full justify-between font-normal"
								>
									{date ? format(date, 'dd/MM/yyyy') : 'Seleccione'}
									<ChevronDownIcon className="size-4 opacity-50" />
								</Button>
							</PopoverTrigger>

							<PopoverContent
								align="start"
								className="w-auto overflow-hidden p-0"
							>
								<Calendar
									mode="single"
									selected={date}
									onSelect={handleSelectDate}
								/>
							</PopoverContent>
						</Popover>
					</Field>
				</div>
			</FieldGroup>

			<FieldGroup>
				<Field data-disabled={!canEditDetails}>
					<FieldLabel htmlFor="activity_id">Actividad</FieldLabel>
					<Select
						name="activity_id"
						defaultValue={
							empresa.activity_id ? String(empresa.activity_id) : ''
						}
						disabled={!canEditDetails}
					>
						<SelectTrigger id="activity_id" className="w-full">
							<SelectValue placeholder="Seleccione" />
						</SelectTrigger>
						<SelectContent>
							<SelectGroup>
								{actividades.map((a) => (
									<SelectItem key={a.id} value={String(a.id)}>
										{a.irs_code} - {a.name_es}
									</SelectItem>
								))}
							</SelectGroup>
						</SelectContent>
					</Select>
				</Field>
				<Field data-disabled={!canEditDetails}>
					<FieldLabel htmlFor="activity_description">
						Descripcion de empresa
					</FieldLabel>
					<Textarea
						id="activity_description"
						name="activity_description"
						defaultValue={
							empresa.activity_description ?? empresa.descripcion_empresa ?? ''
						}
						disabled={!canEditDetails}
						rows={3}
					/>
				</Field>
			</FieldGroup>
		</section>
	);
}

import * as React from 'react';
import {
	Popover,
	PopoverTrigger,
	PopoverContent,
} from '@components/ui/Popover';
import {
	Building2Icon,
	MapPinHouseIcon,
	UsersIcon,
	ChevronDownIcon,
} from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@components/ui/Button';
import { CardContent, CardFooter } from '@components/ui/Card';
import { Field, FieldGroup, FieldLabel } from '@components/ui/Field';
import { Input } from '@components/ui/Input';
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@components/ui/Select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@components/ui/Tabs';
import { Textarea } from '@components/ui/Textarea';
import CompanyAddressesSection from '../components/CompanyAddressesSection';
import CompanyMembersCrudSection from '../components/CompanyMembersCrudSection';
import { useCompanyAddresses } from '../hooks/use-company-addresses';
import type {
	ActividadItem,
	EmpresaDetail,
	ManagerItem,
	SocioItem,
	State,
} from '../types';
import { Calendar } from '@components/ui/Calendar';

interface Props {
	empresa: EmpresaDetail;
	socios: SocioItem[];
	managers: ManagerItem[];
	actividades: ActividadItem[];
	canEditDetails: boolean;
	backPath: string;
	states: State[];
}

export default function CompanyDetailsForm({
	empresa,
	socios,
	actividades,
	canEditDetails,
	backPath,
	states,
}: Props) {
	const [stateId, setStateId] = React.useState(
		empresa.state_id !== null && empresa.state_id !== undefined
			? String(empresa.state_id)
			: '',
	);

	const hasUsIncome = Boolean(empresa.Obtendra_ingresos_desde_eeuu);
	const addressesState = useCompanyAddresses(empresa);
	const initialStateRegistrationDate = React.useMemo(() => {
		const value =
			(
				empresa as EmpresaDetail & {
					state_registration_date?: string | null;
					incorporation_date?: string | null;
				}
			).state_registration_date ??
			(
				empresa as EmpresaDetail & {
					state_registration_date?: string | null;
					incorporation_date?: string | null;
				}
			).incorporation_date ??
			null;

		if (!value) return undefined;
		const parsed = new Date(value);
		return Number.isNaN(parsed.getTime()) ? undefined : parsed;
	}, [empresa]);

	const [open, setOpen] = React.useState(false);
	const [date, setDate] = React.useState<Date | undefined>(
		initialStateRegistrationDate,
	);

	const handleSelectDate = (selectedDate: Date | undefined) => {
		if (!selectedDate) return;
		setDate(selectedDate);
		setOpen(false);
	};

	return (
		<section>
			<CardContent className="p-0">
				{!canEditDetails && (
					<div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 text-sm text-blue-900 dark:border-blue-700 dark:bg-blue-900/20 dark:text-blue-100">
						Solo admin/gerencia puede editar en esta fase.
					</div>
				)}

				<form
					action={`/api/incorporations/update-details?empresa=${encodeURIComponent(empresa.empresa_incorporacion_id)}&back=${encodeURIComponent(backPath)}`}
					method="post"
					className="space-y-4"
				>
					<input
						type="hidden"
						name="state_registration_date"
						value={date ? format(date, 'yyyy-MM-dd') : ''}
					/>
					<input
						type="hidden"
						name="empresa_incorporacion_id"
						value={empresa.empresa_incorporacion_id}
					/>

					<Tabs
						defaultValue="informacion"
						orientation="vertical"
						className="grid w-full grid-cols-1 gap-4 lg:grid-cols-[260px_minmax(0,1fr)]"
					>
						<TabsList className="m-0 w-full">
							<TabsTrigger
								value="informacion"
								className="group-data-vertical/tabs:w-full"
							>
								<Building2Icon data-icon="inline-start" />
								Informacion
							</TabsTrigger>
							<TabsTrigger
								value="direcciones"
								className="group-data-vertical/tabs:w-full"
							>
								<MapPinHouseIcon data-icon="inline-start" />
								Direcciones
							</TabsTrigger>
							<TabsTrigger
								value="socios"
								className="group-data-vertical/tabs:w-full"
							>
								<UsersIcon data-icon="inline-start" />
								Socios
							</TabsTrigger>
						</TabsList>

						<div className="min-w-0">
							<TabsContent
								value="informacion"
								className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-transparent"
							>
								<section className="space-y-5">
									<h3 className="mb-3 text-sm font-semibold">General</h3>
									<div className="space-y-2">
										<FieldLabel
											htmlFor="nombre_1"
											className="text-sm font-medium"
										>
											Opciones de nombre
										</FieldLabel>
										<div className="grid grid-cols-1 gap-4 md:grid-cols-3">
											<Input
												id="nombre_1"
												name="nombre_1"
												placeholder="Primera opcion"
												defaultValue={empresa.nombre_1 ?? ''}
											/>

											<Input
												id="nombre_2"
												name="nombre_2"
												placeholder="Segunda opcion"
												defaultValue={empresa.nombre_2 ?? ''}
											/>

											<Input
												id="nombre_3"
												name="nombre_3"
												placeholder="Tercera opcion"
												defaultValue={empresa.nombre_3 ?? ''}
											/>
										</div>
									</div>

									{/* Datos de registro estatal */}
									<FieldGroup className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
										<Field data-disabled={!canEditDetails}>
											<FieldLabel htmlFor="legal_name">
												Nombre principal
											</FieldLabel>
											<Input
												id="legal_name"
												name="legal_name"
												defaultValue={
													(empresa as unknown as { legal_name?: string | null })
														.legal_name ?? ''
												}
												disabled={!canEditDetails}
											/>
										</Field>
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
															<SelectItem
																key={String(state.id)}
																value={String(state.id)}
															>
																{state.name ?? ''}
															</SelectItem>
														))}
													</SelectGroup>
												</SelectContent>
											</Select>
										</Field>
										<Field
											data-disabled={!canEditDetails}
											className="md:col-span-2 xl:col-span-1"
										>
											<FieldLabel htmlFor="state_registration_date">
												Fecha de registro estatal
											</FieldLabel>
											<Popover open={open} onOpenChange={setOpen}>
												<PopoverTrigger
													render={
														<Button
															type="button"
															variant="outline"
															id="state_registration_date"
															disabled={!canEditDetails}
															data-empty={!date}
															className="data-[empty=true]:text-muted-foreground w-full justify-between"
														/>
													}
												>
													{date ? format(date, 'dd/MM/yyyy') : 'Seleccione'}
													<ChevronDownIcon data-icon="inline-end" />
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
									</FieldGroup>
									{/* Actividad de empresa */}
									<div className="space-y-4">
										<div className="space-y-2">
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
																{a.irs_code} — {a.name_es}
															</SelectItem>
														))}
													</SelectGroup>
												</SelectContent>
											</Select>
										</div>
										<div className="space-y-2">
											<FieldLabel htmlFor="activity_description">
												Descripcion de empresa
											</FieldLabel>
											<Textarea
												id="activity_description"
												name="activity_description"
												defaultValue={
													empresa.activity_description ??
													empresa.descripcion_empresa ??
													''
												}
												disabled={!canEditDetails}
												rows={2}
												className="my-0"
											/>
										</div>
									</div>
								</section>
								<section className="mt-5 border-t border-gray-200 pt-5 dark:border-gray-700">
									<h3 className="mb-3 text-sm font-semibold">Contable</h3>
									<FieldGroup className="grid gap-4 md:grid-cols-2">
										<Field>
											<FieldLabel htmlFor="forma_tributacion">
												Forma de tributacion
											</FieldLabel>
											<Select
												name="forma_tributacion"
												defaultValue={empresa.forma_tributacion ?? ''}
												disabled={!canEditDetails}
											>
												<SelectTrigger
													id="forma_tributacion"
													className="w-full"
												>
													<SelectValue placeholder="Seleccione" />
												</SelectTrigger>
												<SelectContent>
													<SelectGroup>
														<SelectItem value="Entidad de paso">
															Entidad de paso
														</SelectItem>
														<SelectItem value="Corporación">
															Corporacion
														</SelectItem>
													</SelectGroup>
												</SelectContent>
											</Select>
										</Field>
										<Field>
											<FieldLabel htmlFor="obtendra_ingresos_desde_eeuu">
												Ingresos en Estados Unidos
											</FieldLabel>
											<label className="mt-2 inline-flex items-center gap-2 text-sm">
												<input
													id="obtendra_ingresos_desde_eeuu"
													name="obtendra_ingresos_desde_eeuu"
													type="checkbox"
													defaultChecked={hasUsIncome}
													disabled={!canEditDetails}
													className="size-4 rounded border-gray-300"
												/>
												<span>
													La empresa obtiene ingresos de fuente americana
												</span>
											</label>
										</Field>
									</FieldGroup>
								</section>

								<section className="mt-5 border-t border-gray-200 pt-5 dark:border-gray-700">
									<h3 className="mb-3 text-sm font-semibold">Estructura</h3>
									<FieldGroup className="grid gap-4 md:grid-cols-2">
										<Field>
											<FieldLabel htmlFor="forma_administracion">
												Forma de administrar
											</FieldLabel>
											<Select
												name="forma_administracion"
												defaultValue={empresa.forma_administracion ?? ''}
												disabled={!canEditDetails}
											>
												<SelectTrigger
													id="forma_administracion"
													className="w-full"
												>
													<SelectValue placeholder="Seleccione" />
												</SelectTrigger>
												<SelectContent>
													<SelectGroup>
														<SelectItem value="Member-Managed">
															Member-Managed
														</SelectItem>
														<SelectItem value="Manager-Managed">
															Manager-Managed
														</SelectItem>
													</SelectGroup>
												</SelectContent>
											</Select>
										</Field>
										<Field>
											<FieldLabel htmlFor="informacion_miembros">
												Informacion de miembros
											</FieldLabel>
											<Select
												name="informacion_miembros"
												defaultValue={empresa.informacion_miembros ?? ''}
												disabled={!canEditDetails}
											>
												<SelectTrigger
													id="informacion_miembros"
													className="w-full"
												>
													<SelectValue placeholder="Seleccione" />
												</SelectTrigger>
												<SelectContent>
													<SelectGroup>
														<SelectItem value="Pública">Pública</SelectItem>
														<SelectItem value="Privada">Privada</SelectItem>
													</SelectGroup>
												</SelectContent>
											</Select>
										</Field>
									</FieldGroup>
								</section>
							</TabsContent>

							<TabsContent
								value="direcciones"
								className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-transparent"
							>
								<CompanyAddressesSection
									canEditDetails={canEditDetails}
									addresses={addressesState.addresses}
									selectedAddress={addressesState.selectedAddress}
									isDetailModalOpen={addressesState.isDetailModalOpen}
									setIsDetailModalOpen={addressesState.setIsDetailModalOpen}
									isAddModalOpen={addressesState.isAddModalOpen}
									setIsAddModalOpen={addressesState.setIsAddModalOpen}
									newAddress={addressesState.newAddress}
									handleNewAddressChange={addressesState.handleNewAddressChange}
									handleAddAddress={addressesState.handleAddAddress}
									openAddressDetail={addressesState.openAddressDetail}
									addressCardHeightClass={addressesState.addressCardHeightClass}
								/>
							</TabsContent>

							<TabsContent value="socios" className="rounded-lg border p-4">
								<CompanyMembersCrudSection
									initialMembers={socios}
									canEditDetails={canEditDetails}
								/>
							</TabsContent>
						</div>
					</Tabs>

					<CardFooter className="mt-4 flex items-center justify-between rounded-lg border p-3">
						<div className="text-muted-foreground text-xs">
							Estado legacy: <strong>{empresa.estado ?? 'Sin estado'}</strong>
						</div>
						<Button type="submit" disabled={!canEditDetails}>
							Guardar cambios
						</Button>
					</CardFooter>
				</form>
			</CardContent>
		</section>
	);
}

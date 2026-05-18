import * as React from 'react';
import { Building2Icon, MapPinHouseIcon, UsersIcon } from 'lucide-react';
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

	const selectedState = states.find(
		(state) => String(state.id) === String(stateId),
	);
	const hasUsIncome = Boolean(empresa.Obtendra_ingresos_desde_eeuu);
	const addressesState = useCompanyAddresses(empresa);

	return (
		<section>
			<CardContent>
				{!canEditDetails && (
					<div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900 dark:border-blue-700 dark:bg-blue-900/20 dark:text-blue-100">
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
						name="empresa_incorporacion_id"
						value={empresa.empresa_incorporacion_id}
					/>

					<Tabs
						defaultValue="informacion"
						orientation="vertical"
						className="grid grid-cols-1 gap-4 lg:grid-cols-[260px_minmax(0,1fr)]"
					>
						<TabsList variant="line" className="w-full justify-start">
							<TabsTrigger value="informacion">
								<Building2Icon data-icon="inline-start" />
								Informacion
							</TabsTrigger>
							<TabsTrigger value="direcciones">
								<MapPinHouseIcon data-icon="inline-start" />
								Direcciones
							</TabsTrigger>
							<TabsTrigger value="socios">
								<UsersIcon data-icon="inline-start" />
								Socios
							</TabsTrigger>
						</TabsList>

						<div className="min-w-0">
							<TabsContent value="informacion" className="space-y-5 rounded-lg border p-4">
								<section>
									<h3 className="mb-3 text-sm font-semibold">General</h3>
									<FieldGroup>
										<Field>
											<FieldLabel>Opciones de nombre</FieldLabel>
											<div className="grid grid-cols-1 gap-3 md:grid-cols-3">
												<Input id="nombre_1" name="nombre_1" placeholder="Primera opcion" defaultValue={empresa.nombre_1 ?? ''} />
												<Input id="nombre_2" name="nombre_2" placeholder="Segunda opcion" defaultValue={empresa.nombre_2 ?? ''} />
												<Input id="nombre_3" name="nombre_3" placeholder="Tercera opcion" defaultValue={empresa.nombre_3 ?? ''} />
											</div>
										</Field>
									</FieldGroup>
									<FieldGroup className="mt-3 grid gap-4 md:grid-cols-2">
										<Field>
											<FieldLabel htmlFor="legal_name">Nombre principal</FieldLabel>
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
										<Field>
											<FieldLabel htmlFor="state_id">Jurisdiccion</FieldLabel>
											<Select
												name="state_id"
												value={stateId}
												onValueChange={(value) => setStateId(value ?? '')}
												disabled={!canEditDetails}
											>
												<SelectTrigger id="state_id" className="w-full">
													<span className={selectedState ? '' : 'text-muted-foreground'}>
														{selectedState?.name ?? 'Seleccione'}
													</span>
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
										<Field>
											<FieldLabel htmlFor="activity_id">Actividad</FieldLabel>
											<Select
												name="activity_id"
												defaultValue={empresa.activity_id ? String(empresa.activity_id) : ''}
												disabled={!canEditDetails}
											>
												<SelectTrigger id="activity_id" className="w-full">
													<SelectValue placeholder="Seleccione" />
												</SelectTrigger>
												<SelectContent>
													<SelectGroup>
														{actividades.map((a) => (
															<SelectItem key={a.id} value={String(a.id)}>
																{a.Actividad}
															</SelectItem>
														))}
													</SelectGroup>
												</SelectContent>
											</Select>
										</Field>
										<Field className="md:col-span-2">
											<FieldLabel htmlFor="activity_description">Descripcion de empresa</FieldLabel>
											<Textarea
												id="activity_description"
												name="activity_description"
												defaultValue={
													empresa.activity_description ?? empresa.descripcion_empresa ?? ''
												}
												disabled={!canEditDetails}
												rows={4}
											/>
										</Field>
									</FieldGroup>
								</section>

								<section>
									<h3 className="mb-3 text-sm font-semibold">Contable</h3>
									<FieldGroup className="grid gap-4 md:grid-cols-2">
										<Field>
											<FieldLabel htmlFor="forma_tributacion">Forma de tributacion</FieldLabel>
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
														<SelectItem value="Entidad de paso">Entidad de paso</SelectItem>
														<SelectItem value="Corporación">Corporacion</SelectItem>
													</SelectGroup>
												</SelectContent>
											</Select>
										</Field>
										<Field>
											<FieldLabel htmlFor="obtendra_ingresos_desde_eeuu">Ingresos en Estados Unidos</FieldLabel>
											<label className="mt-2 inline-flex items-center gap-2 text-sm">
												<input
													id="obtendra_ingresos_desde_eeuu"
													name="obtendra_ingresos_desde_eeuu"
													type="checkbox"
													defaultChecked={hasUsIncome}
													disabled={!canEditDetails}
													className="size-4 rounded border-gray-300"
												/>
												<span>La empresa obtiene ingresos de fuente americana</span>
											</label>
										</Field>
									</FieldGroup>
								</section>

								<section>
									<h3 className="mb-3 text-sm font-semibold">Estructura</h3>
									<FieldGroup className="grid gap-4 md:grid-cols-2">
										<Field>
											<FieldLabel htmlFor="forma_administracion">Forma de administrar</FieldLabel>
											<Select
												name="forma_administracion"
												defaultValue={empresa.forma_administracion ?? ''}
												disabled={!canEditDetails}
											>
												<SelectTrigger id="forma_administracion" className="w-full">
													<SelectValue placeholder="Seleccione" />
												</SelectTrigger>
												<SelectContent>
													<SelectGroup>
														<SelectItem value="Member-Managed">Member-Managed</SelectItem>
														<SelectItem value="Manager-Managed">Manager-Managed</SelectItem>
													</SelectGroup>
												</SelectContent>
											</Select>
										</Field>
										<Field>
											<FieldLabel htmlFor="informacion_miembros">Informacion de miembros</FieldLabel>
											<Select
												name="informacion_miembros"
												defaultValue={empresa.informacion_miembros ?? ''}
												disabled={!canEditDetails}
											>
												<SelectTrigger id="informacion_miembros" className="w-full">
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

							<TabsContent value="direcciones" className="rounded-lg border p-4">
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

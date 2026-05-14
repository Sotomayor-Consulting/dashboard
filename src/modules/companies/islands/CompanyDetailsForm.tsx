import * as React from 'react';
import { Badge } from '@components/ui/Badge';
import { Button } from '@components/ui/Button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@components/ui/Card';
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
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@components/ui/Table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@components/ui/Tabs';
import { Textarea } from '@components/ui/Textarea';
import type { ActividadItem, EmpresaDetail, EstadoItem, ManagerItem, SocioItem } from '../types';

interface Props {
	empresa: EmpresaDetail;
	socios: SocioItem[];
	managers: ManagerItem[];
	actividades: ActividadItem[];
	estados: EstadoItem[];
	canEditDetails: boolean;
	backPath: string;
}

export default function CompanyDetailsForm({
	empresa,
	socios,
	managers,
	actividades,
	estados,
	canEditDetails,
	backPath,
}: Props) {
	const showManagerTab =
		empresa?.forma_administracion === 'Manager-Managed' || managers.length > 0;

	return (
		<div id="contacts" role="tabpanel" aria-labelledby="contacts-tab" className="my-4">
			<Card className="py-5">
				<CardHeader className="pb-3">
					<CardTitle className="flex items-center gap-2">
						Detalles de empresa
					</CardTitle>
					<div className="flex flex-wrap gap-2 pt-2">
						<Badge variant="outline">Legacy: estado</Badge>
						<Badge variant="outline">Legacy: actividad</Badge>
						<Badge variant="secondary">Nuevo: state_id</Badge>
						<Badge variant="secondary">Nuevo: activity_id</Badge>
						<Badge variant="secondary">Nuevo: activity_description</Badge>
					</div>
				</CardHeader>
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

						<Tabs defaultValue="informacion">
							<TabsList variant="line" className="w-full justify-start">
								<TabsTrigger value="informacion">Informacion</TabsTrigger>
								<TabsTrigger value="direcciones">Direcciones</TabsTrigger>
								<TabsTrigger value="socios">Socios</TabsTrigger>
								{showManagerTab && (
									<TabsTrigger value="manager">Manager</TabsTrigger>
								)}
							</TabsList>

							<TabsContent value="informacion" className="pt-4">
								<FieldGroup className="grid gap-4 md:grid-cols-2">
									<Field>
										<FieldLabel htmlFor="nombre_1">Nombre principal</FieldLabel>
										<Input id="nombre_1" name="nombre_1" defaultValue={empresa.nombre_1 ?? ''} disabled={!canEditDetails} />
									</Field>
									<Field>
										<FieldLabel htmlFor="tipo_de_negocio">Tipo de negocio</FieldLabel>
										<Input id="tipo_de_negocio" name="tipo_de_negocio" defaultValue={empresa.tipo_de_negocio ?? ''} disabled={!canEditDetails} />
									</Field>
									<Field>
										<FieldLabel htmlFor="activity_id">Actividad</FieldLabel>
										<Select name="activity_id" defaultValue={empresa.activity_id ? String(empresa.activity_id) : ''} disabled={!canEditDetails}>
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
									<Field>
										<FieldLabel htmlFor="forma_administracion">Forma de administracion</FieldLabel>
										<Select name="forma_administracion" defaultValue={empresa.forma_administracion ?? ''} disabled={!canEditDetails}>
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
										<FieldLabel htmlFor="forma_tributacion">Forma de tributacion</FieldLabel>
										<Select name="forma_tributacion" defaultValue={empresa.forma_tributacion ?? ''} disabled={!canEditDetails}>
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
									<Field className="md:col-span-2">
										<FieldLabel htmlFor="activity_description">Descripcion de empresa</FieldLabel>
										<Textarea id="activity_description" name="activity_description" defaultValue={empresa.activity_description ?? empresa.descripcion_empresa ?? ''} disabled={!canEditDetails} rows={4} />
									</Field>
								</FieldGroup>
							</TabsContent>

							<TabsContent value="direcciones" className="pt-4">
								<FieldGroup className="grid gap-4 md:grid-cols-2">
									<Field>
										<FieldLabel htmlFor="direccion_eeuu">Direccion EEUU</FieldLabel>
										<Input id="direccion_eeuu" name="direccion_eeuu" defaultValue={empresa.direccion_eeuu ?? ''} disabled={!canEditDetails} />
									</Field>
									<Field>
										<FieldLabel htmlFor="ciudad_eeuu">Ciudad</FieldLabel>
										<Input id="ciudad_eeuu" name="ciudad_eeuu" defaultValue={empresa.ciudad_eeuu ?? ''} disabled={!canEditDetails} />
									</Field>
									<Field>
										<FieldLabel htmlFor="state_id">State</FieldLabel>
										<Select name="state_id" defaultValue={empresa.state_id ? String(empresa.state_id) : empresa.estado_id ? String(empresa.estado_id) : ''} disabled={!canEditDetails}>
											<SelectTrigger id="state_id" className="w-full">
												<SelectValue placeholder="Seleccione" />
											</SelectTrigger>
											<SelectContent>
												<SelectGroup>
													{estados.map((e) => (
														<SelectItem key={e.id} value={String(e.id)}>
															{e.Estado}
														</SelectItem>
													))}
												</SelectGroup>
											</SelectContent>
										</Select>
									</Field>
									<Field>
										<FieldLabel htmlFor="codigo_postal_eeuu">ZIP</FieldLabel>
										<Input id="codigo_postal_eeuu" name="codigo_postal_eeuu" defaultValue={empresa.codigo_postal_eeuu ?? ''} disabled={!canEditDetails} />
									</Field>
								</FieldGroup>
							</TabsContent>

							<TabsContent value="socios" className="pt-4">
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead>Nombre</TableHead>
											<TableHead>Correo</TableHead>
											<TableHead>Porcentaje</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{socios.map((s) => (
											<TableRow key={s.id}>
												<TableCell>{s.nombre_de_socio ?? 'Sin nombre'}</TableCell>
												<TableCell>{s.correo ?? '-'}</TableCell>
												<TableCell>{s.porcentaje ?? '-'}</TableCell>
											</TableRow>
										))}
									</TableBody>
								</Table>
							</TabsContent>

							{showManagerTab && (
								<TabsContent value="manager" className="pt-4">
									<Table>
										<TableHeader>
											<TableRow>
												<TableHead>Nombre</TableHead>
												<TableHead>Correo</TableHead>
												<TableHead>Residente fiscal</TableHead>
											</TableRow>
										</TableHeader>
										<TableBody>
											{managers.map((m) => (
												<TableRow key={m.id}>
													<TableCell>{m.Nombres_manager ?? 'Sin nombre'}</TableCell>
													<TableCell>{m.Correo_electronico_manager ?? '-'}</TableCell>
													<TableCell>{m.residente_fiscal_en_EE_UU_manager ? 'Si' : 'No'}</TableCell>
												</TableRow>
											))}
										</TableBody>
									</Table>
								</TabsContent>
							)}
						</Tabs>

						<CardFooter className="mt-4 flex items-center justify-between rounded-lg border p-3">
							<div className="text-xs text-muted-foreground">
								Estado legacy: <strong>{empresa.estado ?? 'Sin estado'}</strong>
							</div>
							<Button type="submit" disabled={!canEditDetails}>
								Guardar cambios
							</Button>
						</CardFooter>
					</form>
				</CardContent>
			</Card>
		</div>
	);
}

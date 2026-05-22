import * as React from 'react';
import { Icon } from '@iconify/react';

import '@shared/iconify-ri'; // Registra el set `ri` de Remix Icons (side-effect).
import { Button } from '@components/ui/Button';
import { CardContent } from '@components/ui/Card';
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@components/ui/Dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@components/ui/Tabs';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import CompanyEmptyState from '../components/CompanyEmptyState';
import CompanyAddressesSection from '../components/CompanyAddressesSection';
import CompanyMembersCrudSection from '../components/CompanyMembersCrudSection';
import CompanyManagersCrudSection from '../components/CompanyManagersCrudSection';
import { useCompanyAddresses } from '../hooks/use-company-addresses';
import type {
	CompanyAddressItem,
	CompanyItem,
	CompanyMemberItem,
	EmpresaDetail,
	ManagerItem,
	State,
} from '../types';

import CompanyInfoSection from './company-details/sections/CompanyInfoSection';
import IncorporationRegistrationSection from './company-details/sections/IncorporationRegistrationSection';
import { mapIncorporationFormToUpdateRequest } from './company-details/mappers/incorporation-registration.mapper';
import {
	type IncorporationRegistrationFormValues,
	type IncorporationRegistrationInput,
	incorporationRegistrationSchema,
} from './company-details/schemas/incorporation-registration.schema';

// Estilo inline-vertical para tabs: sin contenedor, sólo el borde
// izquierdo en la pestaña activa marcando la posición.
const verticalTabTriggerClass =
	'!w-full !justify-start !rounded-l-none !rounded-r-md border-l-2 border-transparent !bg-transparent !px-3 !py-2 !shadow-none hover:!bg-gray-50 hover:!text-gray-900 data-active:border-gray-900 data-active:!bg-gray-100 data-active:!text-gray-900 data-active:!shadow-none dark:hover:!bg-white/5 dark:hover:!text-white dark:data-active:border-white dark:data-active:!bg-white/10 dark:data-active:!text-white';

interface Props {
	empresa: EmpresaDetail;
	company: CompanyItem | null;
	addresses: CompanyAddressItem[];
	companyMembers: CompanyMemberItem[];
	managers: ManagerItem[];
	canEditDetails: boolean;
	states: State[];
}

export default function CompanyDetailsForm({
	empresa,
	company,
	addresses,
	companyMembers,
	managers,
	canEditDetails,
	states,
}: Props) {
	const [companyId, setCompanyId] = React.useState(empresa.company_id ?? null);
	const [isCreateCompanyOpen, setIsCreateCompanyOpen] = React.useState(false);
	const [isCreatingCompany, setIsCreatingCompany] = React.useState(false);
	const [isSavingIncorporation, setIsSavingIncorporation] =
		React.useState(false);

	const hasCompany = Boolean(companyId);
	const addressesState = useCompanyAddresses(
		addresses,
		empresa.empresa_incorporacion_id,
	);

	const memberRows = companyMembers;
	const managerMemberRows = companyMembers.filter(
		(member) => member.is_manager,
	);
	const managersToRender = managers;
	const showManagersTab = company?.management_type === 'manager-managed';

	const incorporationForm = useForm<
		IncorporationRegistrationFormValues,
		unknown,
		IncorporationRegistrationInput
	>({
		resolver: zodResolver(incorporationRegistrationSchema),
		defaultValues: {
			nameOption1: empresa.nombre_1,
			nameOption2: empresa.nombre_2,
			nameOption3: empresa.nombre_3,
			businessType: empresa.tipo_de_negocio,
			stateId: empresa.state_id ?? null,
		},
		mode: 'onSubmit',
	});

	const createCompany = async () => {
		if (!canEditDetails || isCreatingCompany) return;

		setIsCreatingCompany(true);
		const loadingToastId = toast.loading('Creando empresa...');
		try {
			const response = await fetch(
				`/api/incorporations/${empresa.empresa_incorporacion_id}/company`,
				{ method: 'POST' },
			);
			const payload = await response.json().catch(() => null);
			if (!response.ok || !payload?.ok) {
				throw new Error(payload?.error ?? 'No se pudo crear la empresa');
			}

			setCompanyId(payload.data.company_id);
			setIsCreateCompanyOpen(false);
			toast.success('Empresa creada', { id: loadingToastId });
			window.setTimeout(() => {
				window.location.reload();
			}, 300);
		} catch (error) {
			const message =
				error instanceof Error ? error.message : 'Error inesperado';
			const friendlyMessage =
				message === 'MISSING_INCORPORATION_ID'
					? 'No se encontró la incorporación.'
					: message === 'INCORPORATION_NOT_FOUND'
						? 'No se encontró la incorporación.'
						: message === 'No autorizado'
							? 'No tienes permisos para crear la empresa.'
							: message === 'FORBIDDEN'
								? 'No tienes permisos para crear la empresa.'
								: 'No se pudo crear la empresa. Intenta nuevamente.';

			toast.error(friendlyMessage, { id: loadingToastId });
		} finally {
			setIsCreatingCompany(false);
		}
	};

	const openCreateCompanyDialog = () => {
		if (!canEditDetails) return;
		setIsCreateCompanyOpen(true);
	};

	const handleSaveIncorporation = async (
		values: IncorporationRegistrationInput,
	) => {
		if (!canEditDetails || isSavingIncorporation) return;

		setIsSavingIncorporation(true);
		const loadingToastId = toast.loading('Guardando datos...');

		const requestPayload = mapIncorporationFormToUpdateRequest(
			empresa.empresa_incorporacion_id,
			values,
		);

		try {
			const response = await fetch('/api/incorporations/update-details', {
				method: 'POST',
				headers: {
					Accept: 'application/json',
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(requestPayload),
				credentials: 'include',
			});

			const payload = (await response.json().catch(() => null)) as {
				ok?: boolean;
				message?: string;
				error?: string;
			} | null;

			if (!response.ok || !payload?.ok) {
				throw new Error(payload?.error ?? 'Error al guardar');
			}

			toast.success('Datos guardados', { id: loadingToastId });
		} catch {
			toast.error('Error al guardar', { id: loadingToastId });
		} finally {
			setIsSavingIncorporation(false);
		}
	};

	return (
		<section>
			<CardContent className="p-0">
				{!canEditDetails && (
					<div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900 dark:border-blue-700 dark:bg-blue-900/20 dark:text-blue-100">
						Solo admin, gerencia u operaciones puede editar en esta fase.
					</div>
				)}

				<Tabs
					defaultValue="incorporacion-informacion"
					orientation="vertical"
					className="grid w-full grid-cols-1 gap-6 lg:grid-cols-[160px_minmax(0,1fr)]"
				>
					<TabsList className="!h-auto !w-full !flex-col !items-stretch !gap-0 !border-0 !bg-transparent !p-0 !shadow-none">
						<div className="px-3 py-2 text-xs font-semibold tracking-wide text-gray-500 uppercase dark:text-gray-400">
							Registro de incorporación
						</div>
						<TabsTrigger
							value="incorporacion-informacion"
							className={verticalTabTriggerClass}
						>
							<Icon icon="ri:building-2-line" data-icon="inline-start" />
							Formulario
						</TabsTrigger>

						<div className="mt-3 px-3 py-2 text-xs font-semibold tracking-wide text-gray-500 uppercase dark:text-gray-400">
							Empresa
						</div>
						<TabsTrigger
							value="empresa-informacion"
							className={verticalTabTriggerClass}
						>
							<Icon icon="ri:file-edit-line" data-icon="inline-start" />
							Información
						</TabsTrigger>
						<TabsTrigger
							value="empresa-direcciones"
							className={verticalTabTriggerClass}
						>
							<Icon icon="ri:map-pin-line" data-icon="inline-start" />
							Direcciones
						</TabsTrigger>
						<TabsTrigger
							value="empresa-miembros"
							className={verticalTabTriggerClass}
						>
							<Icon icon="ri:group-line" data-icon="inline-start" />
							Miembros
						</TabsTrigger>
						{showManagersTab && (
							<TabsTrigger
								value="empresa-managers"
								className={verticalTabTriggerClass}
							>
								<Icon icon="ri:user-settings-line" data-icon="inline-start" />
								Managers
							</TabsTrigger>
						)}
					</TabsList>

					<div className="min-w-0">
						<TabsContent
							value="incorporacion-informacion"
							className="gap-4 rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-transparent"
						>
							<form
								onSubmit={incorporationForm.handleSubmit(
									handleSaveIncorporation,
								)}
								className="flex flex-col gap-4"
							>
								<IncorporationRegistrationSection
									canEditDetails={canEditDetails}
									states_us={states}
									form={incorporationForm}
								/>
								<section className="flex justify-end border-gray-200 pt-5 dark:border-gray-700">
									<Button
										type="submit"
										disabled={!canEditDetails || isSavingIncorporation}
									>
										Guardar cambios
									</Button>
								</section>
							</form>

							{!hasCompany && canEditDetails && (
								<section className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-100">
									<div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
										<p>
											Esta incorporación todavía no tiene empresa. Crea la
											empresa para habilitar direcciones y socios.
										</p>
										<Button
											type="button"
											variant="outline"
											onClick={openCreateCompanyDialog}
										>
											Crear empresa
										</Button>
									</div>
								</section>
							)}
						</TabsContent>

						<TabsContent
							value="empresa-informacion"
							className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-transparent"
						>
							{hasCompany ? (
								<CompanyInfoSection
									company={company}
									canEditDetails={canEditDetails}
								/>
							) : (
								<CompanyEmptyState
									title="No hay empresa creada"
									description="Para editar los datos de empresa debes crear la empresa de esta incorporación."
									canEditDetails={canEditDetails}
									onCreateCompany={openCreateCompanyDialog}
								/>
							)}
						</TabsContent>

						<TabsContent
							value="empresa-direcciones"
							className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-transparent"
						>
							{hasCompany ? (
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
									handleSaveAddress={addressesState.handleSaveAddress}
									handleDeleteAddress={addressesState.handleDeleteAddress}
									openAddressDetail={addressesState.openAddressDetail}
									openCreateAddress={addressesState.openCreateAddress}
									isSaving={addressesState.isSaving}
									addressCardHeightClass={addressesState.addressCardHeightClass}
								/>
							) : (
								<CompanyEmptyState
									title="No hay empresa creada"
									description="Para gestionar direcciones debes crear la empresa de esta incorporación."
									canEditDetails={canEditDetails}
									onCreateCompany={openCreateCompanyDialog}
								/>
							)}
						</TabsContent>

						<TabsContent
							value="empresa-miembros"
							className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-transparent"
						>
							{hasCompany ? (
								<CompanyMembersCrudSection
									initialMembers={memberRows}
									incorporationId={empresa.empresa_incorporacion_id}
									canEditDetails={canEditDetails}
								/>
							) : (
								<CompanyEmptyState
									title="No hay empresa creada"
									description="Para gestionar socios debes crear la empresa de esta incorporación."
									canEditDetails={canEditDetails}
									onCreateCompany={openCreateCompanyDialog}
								/>
							)}
						</TabsContent>

						{showManagersTab && (
							<TabsContent
								value="empresa-managers"
								className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-transparent"
							>
								{hasCompany ? (
									<CompanyManagersCrudSection
										initialManagers={managersToRender}
										members={managerMemberRows}
										companyId={
											empresa.company_id ?? empresa.empresa_incorporacion_id
										}
										canEditDetails={canEditDetails}
									/>
								) : (
									<CompanyEmptyState
										title="No hay empresa creada"
										description="Para gestionar managers debes crear la empresa de esta incorporación."
										canEditDetails={canEditDetails}
										onCreateCompany={openCreateCompanyDialog}
									/>
								)}
							</TabsContent>
						)}
					</div>
				</Tabs>

				<Dialog
					open={isCreateCompanyOpen}
					onOpenChange={setIsCreateCompanyOpen}
				>
					<DialogContent>
						<DialogHeader>
							<DialogTitle>Crear empresa</DialogTitle>
						</DialogHeader>
						<p className="text-muted-foreground text-sm">
							Se creará una empresa en estado borrador usando los datos actuales
							de esta incorporación. La acción no duplica empresas si ya existe
							una relación.
						</p>
						<DialogFooter>
							<Button
								type="button"
								onClick={createCompany}
								disabled={isCreatingCompany}
							>
								{isCreatingCompany ? 'Creando...' : 'Crear empresa'}
							</Button>
							<Button
								type="button"
								variant="outline"
								onClick={() => setIsCreateCompanyOpen(false)}
								disabled={isCreatingCompany}
							>
								Cancelar
							</Button>
						</DialogFooter>
					</DialogContent>
				</Dialog>
			</CardContent>
		</section>
	);
}

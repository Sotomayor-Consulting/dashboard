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
import CanonicalCompanyEmptyState from '../components/CanonicalCompanyEmptyState';
import CompanyAddressesSection from '../components/CompanyAddressesSection';
import CompanyMembersCrudSection from '../components/CompanyMembersCrudSection';
import CompanyManagersCrudSection from '../components/CompanyManagersCrudSection';
import { useCompanyAddresses } from '../hooks/use-company-addresses';
import type {
	CanonicalCompanyItem,
	CompanyAddressItem,
	CompanyMemberItem,
	EmpresaDetail,
	ManagerItem,
} from '../types';
import CompanyCanonicalInfoSection from './company-details/sections/CompanyCanonicalInfoSection';
import IncorporationRegistrationSection from './company-details/sections/IncorporationRegistrationSection';

// Estilo inline-vertical para tabs: sin contenedor, sólo el borde
// izquierdo en la pestaña activa marcando la posición.
const verticalTabTriggerClass =
	'!w-full !justify-start !rounded-l-none !rounded-r-md border-l-2 border-transparent !bg-transparent !px-3 !py-2 !shadow-none hover:!bg-gray-50 hover:!text-gray-900 data-active:border-gray-900 data-active:!bg-gray-100 data-active:!text-gray-900 data-active:!shadow-none dark:hover:!bg-white/5 dark:hover:!text-white dark:data-active:border-white dark:data-active:!bg-white/10 dark:data-active:!text-white';

interface Props {
	empresa: EmpresaDetail;
	canonicalCompany: CanonicalCompanyItem | null;
	addresses: CompanyAddressItem[];
	companyMembers: CompanyMemberItem[];
	managers: ManagerItem[];
	canEditDetails: boolean;
	backPath: string;
}

export default function CompanyDetailsForm({
	empresa,
	canonicalCompany,
	addresses,
	companyMembers,
	managers,
	canEditDetails,
	backPath,
}: Props) {
	const [companyId, setCompanyId] = React.useState(empresa.company_id ?? null);
	const [isCreateCompanyOpen, setIsCreateCompanyOpen] = React.useState(false);
	const [isCreatingCompany, setIsCreatingCompany] = React.useState(false);

	const hasCanonicalCompany = Boolean(companyId);
	const addressesState = useCompanyAddresses(
		addresses,
		empresa.empresa_incorporacion_id,
	);
	const membersToRender = companyMembers;
	const memberRows = membersToRender.filter((member) =>
		Boolean(member.is_member),
	);
	const managerMemberRows = membersToRender.filter((member) =>
		Boolean(member.is_manager),
	);
	const managersToRender = managers;
	const showManagersTab =
		canonicalCompany?.management_type === 'manager-managed';

	const createCanonicalCompany = async () => {
		setIsCreatingCompany(true);
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
			window.location.reload();
		} catch (error) {
			window.alert(error instanceof Error ? error.message : 'Error inesperado');
		} finally {
			setIsCreatingCompany(false);
		}
	};

	const openCreateCompanyDialog = () => {
		if (!canEditDetails) return;
		setIsCreateCompanyOpen(true);
	};

	return (
		<section>
			<CardContent className="p-0">
				{!canEditDetails && (
					<div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900 dark:border-blue-700 dark:bg-blue-900/20 dark:text-blue-100">
						Solo admin/gerencia puede editar en esta fase.
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
							Información
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
								action={`/api/incorporations/update-details?empresa=${encodeURIComponent(empresa.empresa_incorporacion_id)}&back=${encodeURIComponent(backPath)}`}
								method="post"
								className="flex flex-col gap-4"
							>
								<input
									type="hidden"
									name="empresa_incorporacion_id"
									value={empresa.empresa_incorporacion_id}
								/>
							<IncorporationRegistrationSection
								empresa={empresa}
								canEditDetails={canEditDetails}
							/>
								<section className="flex justify-end border-gray-200 pt-5 dark:border-gray-700">
									<Button type="submit" disabled={!canEditDetails}>
										Guardar cambios
									</Button>
								</section>
							</form>

							{!hasCanonicalCompany && canEditDetails && (
								<section className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-100">
									<div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
										<p>
											Esta incorporación todavía no tiene empresa canónica. Crea
											la empresa para habilitar direcciones y socios.
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

							<section className="flex justify-end border-gray-200 pt-5 dark:border-gray-700">
								<Button type="submit" disabled={!canEditDetails}>
									Guardar cambios
								</Button>
							</section>
						</TabsContent>

						<TabsContent
							value="empresa-informacion"
							className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-transparent"
						>
							{hasCanonicalCompany ? (
								<CompanyCanonicalInfoSection
									company={canonicalCompany}
									canEditDetails={canEditDetails}
								/>
							) : (
								<CanonicalCompanyEmptyState
									title="No hay empresa creada"
									description="Para editar los datos de empresa debes crear la empresa canónica de esta incorporación."
									canEditDetails={canEditDetails}
									onCreateCompany={openCreateCompanyDialog}
								/>
							)}
						</TabsContent>

						<TabsContent
							value="empresa-direcciones"
							className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-transparent"
						>
							{hasCanonicalCompany ? (
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
								<CanonicalCompanyEmptyState
									title="No hay empresa creada"
									description="Para gestionar direcciones debes crear la empresa canónica de esta incorporación."
									canEditDetails={canEditDetails}
									onCreateCompany={openCreateCompanyDialog}
								/>
							)}
						</TabsContent>

						<TabsContent
							value="empresa-miembros"
							className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-transparent"
						>
							{hasCanonicalCompany ? (
								<CompanyMembersCrudSection
									initialMembers={memberRows}
									incorporationId={empresa.empresa_incorporacion_id}
									canEditDetails={canEditDetails}
								/>
							) : (
								<CanonicalCompanyEmptyState
									title="No hay empresa creada"
									description="Para gestionar socios debes crear la empresa canónica de esta incorporación."
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
								{hasCanonicalCompany ? (
									<CompanyManagersCrudSection
										initialManagers={managersToRender}
										members={managerMemberRows}
										companyId={
											empresa.company_id ?? empresa.empresa_incorporacion_id
										}
										canEditDetails={canEditDetails}
									/>
								) : (
									<CanonicalCompanyEmptyState
										title="No hay empresa creada"
										description="Para gestionar managers debes crear la empresa canónica de esta incorporación."
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
							<DialogTitle>Crear empresa canónica</DialogTitle>
						</DialogHeader>
						<p className="text-muted-foreground text-sm">
							Se creará una empresa en estado borrador usando los datos actuales
							de esta incorporación. La acción no duplica empresas si ya existe
							una relación.
						</p>
						<DialogFooter>
							<Button
								type="button"
								onClick={createCanonicalCompany}
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

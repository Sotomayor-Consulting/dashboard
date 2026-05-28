import * as React from 'react';
import { Icon } from '@iconify/react';

import '@shared/iconify-ri';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@components/ui/Tabs';

import CompanyAddressesSection from '../components/CompanyAddressesSection';
import CompanyMembersCrudSection from '../components/CompanyMembersCrudSection';
import { useCompanyAddresses } from '../hooks/use-company-addresses';
import type {
	ActividadItem,
	CompanyAddressItem,
	CompanyItem,
	CompanyManagementTypeHealth,
	CompanyMemberItem,
} from '../types';

import CompanyInfoSection from './company-details/sections/CompanyInfoSection';

const tabTriggerClass =
	'!flex-1 !justify-center !rounded-md !px-4 !py-2 !text-sm !font-medium data-active:!bg-gray-100 data-active:!text-gray-900 dark:data-active:!bg-white/10 dark:data-active:!text-white';

interface Props {
	companyId: string;
	company: CompanyItem;
	addresses: CompanyAddressItem[];
	companyMembers: CompanyMemberItem[];
	managementTypeHealth: CompanyManagementTypeHealth | null;
	actividades: ActividadItem[];
	canEditDetails: boolean;
}

/**
 * Contenido principal de `/companies/[companyId]`. Tres tabs horizontales:
 * Información (CompanyInfoSection), Direcciones (CompanyAddressesSection) y
 * Miembros (CompanyMembersCrudSection). Reusa los componentes que antes vivían
 * dentro de `/incorporations/[id]` → tab Editar datos.
 */
export default function CompanyPageContent({
	companyId,
	company,
	addresses,
	companyMembers,
	managementTypeHealth,
	actividades,
	canEditDetails,
}: Props) {
	const addressesState = useCompanyAddresses(addresses, companyId);

	return (
		<section>
			{!canEditDetails && (
				<div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900 dark:border-blue-700 dark:bg-blue-900/20 dark:text-blue-100">
					Solo admin, gerencia u operaciones puede editar los datos de la
					empresa.
				</div>
			)}

			<Tabs defaultValue="informacion" className="flex w-full flex-col gap-5">
				<TabsList className="!w-full !justify-start !gap-1 !border-b !border-gray-200 !bg-transparent !p-0 dark:!border-gray-800">
					<TabsTrigger value="informacion" className={tabTriggerClass}>
						<Icon icon="ri:file-edit-line" data-icon="inline-start" />
						Información
					</TabsTrigger>
					<TabsTrigger value="direcciones" className={tabTriggerClass}>
						<Icon icon="ri:map-pin-line" data-icon="inline-start" />
						Direcciones
					</TabsTrigger>
					<TabsTrigger value="miembros" className={tabTriggerClass}>
						<Icon icon="ri:group-line" data-icon="inline-start" />
						Miembros
					</TabsTrigger>
				</TabsList>

				<TabsContent
					value="informacion"
					className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-transparent"
				>
					<CompanyInfoSection
						company={company}
						managementTypeHealth={managementTypeHealth}
						actividades={actividades}
						canEditDetails={canEditDetails}
					/>
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
						handleAddressTypeChange={addressesState.handleAddressTypeChange}
						handleAddressCountryChange={addressesState.handleAddressCountryChange}
						handleAddressStateChange={addressesState.handleAddressStateChange}
						handleAddAddress={addressesState.handleAddAddress}
						handleSaveAddress={addressesState.handleSaveAddress}
						handleDeleteAddress={addressesState.handleDeleteAddress}
						openAddressDetail={addressesState.openAddressDetail}
						openCreateAddress={addressesState.openCreateAddress}
						isSaving={addressesState.isSaving}
						addressCardHeightClass={addressesState.addressCardHeightClass}
					/>
				</TabsContent>

				<TabsContent
					value="miembros"
					className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-transparent"
				>
					<CompanyMembersCrudSection
						initialMembers={companyMembers}
						scope={{ kind: 'company', id: companyId }}
						canEditDetails={canEditDetails}
					/>
				</TabsContent>
			</Tabs>
		</section>
	);
}

import { useCompanyAddresses } from '../hooks/use-company-addresses';
import AddressCard from '../components/company-addresses/AddressCard';
import AddressCreateCard from '../components/company-addresses/AddressCreateCard';
import AddressFormSheet from '../components/company-addresses/AddressFormSheet';
import PanelHeader from '../components/shared/PanelHeader';
import type { CompanyAddressItem } from '../types';

interface Props {
	addresses: CompanyAddressItem[];
	companyId: string;
	canEditDetails: boolean;
}

export default function CompanyAddressesPanel({
	addresses: initialAddresses,
	companyId,
	canEditDetails,
}: Props) {
	const {
		addresses,
		selectedAddress,
		isSaving,
		isDetailModalOpen,
		setIsDetailModalOpen,
		isAddModalOpen,
		setIsAddModalOpen,
		newAddress,
		handleNewAddressChange,
		handleAddressTypeChange,
		handleAddressCountryChange,
		handleAddressStateChange,
		handleAddAddress,
		handleSaveAddress,
		handleDeleteAddress,
		openAddressDetail,
		openCreateAddress,
	} = useCompanyAddresses(initialAddresses, companyId);

	const addressMeta = `${addresses.length} registrada${addresses.length === 1 ? '' : 's'}`;

	return (
		<section className="-mx-6 -mt-5 flex flex-col">
			<PanelHeader kicker="Empresa" title="Direcciones" meta={addressMeta} />

			<div className="px-7 py-5">
				<div className="grid auto-rows-fr grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
					{addresses.map((address) => (
						<AddressCard
							key={address.id}
							address={address}
							onOpenDetail={openAddressDetail}
						/>
					))}
					<AddressCreateCard
						canEditDetails={canEditDetails}
						onClick={openCreateAddress}
					/>
				</div>
			</div>

			<AddressFormSheet
				open={isDetailModalOpen}
				onOpenChange={setIsDetailModalOpen}
				mode="edit"
				draft={newAddress}
				handleDraftChange={handleNewAddressChange}
				handleTypeChange={handleAddressTypeChange}
				handleCountryChange={handleAddressCountryChange}
				handleStateChange={handleAddressStateChange}
				selectedAddress={selectedAddress}
				onSubmit={handleSaveAddress}
				onDelete={handleDeleteAddress}
				isSaving={isSaving}
			/>

			<AddressFormSheet
				open={isAddModalOpen}
				onOpenChange={setIsAddModalOpen}
				mode="create"
				draft={newAddress}
				handleDraftChange={handleNewAddressChange}
				handleTypeChange={handleAddressTypeChange}
				handleCountryChange={handleAddressCountryChange}
				handleStateChange={handleAddressStateChange}
				onSubmit={handleAddAddress}
				isSaving={isSaving}
			/>
		</section>
	);
}

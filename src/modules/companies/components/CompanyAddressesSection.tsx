import type {
	AddressDraft,
	AddressItem,
} from '../hooks/use-company-addresses';
import AddressCard from './company-addresses/AddressCard';
import AddressCreateCard from './company-addresses/AddressCreateCard';
import AddressFormSheet from './company-addresses/AddressFormSheet';
import PanelHeader from './shared/PanelHeader';

interface Props {
	canEditDetails: boolean;
	addresses: AddressItem[];
	selectedAddress: AddressItem | undefined;
	isDetailModalOpen: boolean;
	setIsDetailModalOpen: (open: boolean) => void;
	isAddModalOpen: boolean;
	setIsAddModalOpen: (open: boolean) => void;
	newAddress: AddressDraft;
	handleNewAddressChange: (
		field: keyof AddressDraft,
	) => (event: React.ChangeEvent<HTMLInputElement>) => void;
	handleAddressTypeChange: (value: string) => void;
	handleAddressCountryChange: (countryId: number | null) => void;
	handleAddressStateChange: (stateId: number | null) => void;
	handleAddAddress: () => void;
	handleSaveAddress: () => void;
	handleDeleteAddress: () => void;
	openAddressDetail: (addressId: number) => void;
	openCreateAddress: () => void;
	isSaving: boolean;
	addressCardHeightClass: string;
}

export default function CompanyAddressesSection({
	canEditDetails,
	addresses,
	selectedAddress,
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
	isSaving,
}: Props) {
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

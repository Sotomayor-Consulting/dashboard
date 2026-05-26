import type {
	AddressDraft,
	AddressItem,
} from '../hooks/use-company-addresses';
import AddressCard from './company-addresses/AddressCard';
import AddressCreateCard from './company-addresses/AddressCreateCard';
import AddressFormSheet from './company-addresses/AddressFormSheet';

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
	handleAddAddress,
	handleSaveAddress,
	handleDeleteAddress,
	openAddressDetail,
	openCreateAddress,
	isSaving,
}: Props) {
	return (
		<section className="flex flex-col gap-5">
			<header className="flex items-end justify-between gap-3">
				<div className="flex flex-col gap-1">
					<h3 className="text-lg font-semibold">Direcciones</h3>
					<p className="text-muted-foreground text-sm">
						Gestiona las direcciones operativas, legales y fiscales de la
						empresa.
					</p>
				</div>
				<p className="text-muted-foreground text-[11.5px]">
					{addresses.length} registrada{addresses.length === 1 ? '' : 's'}
				</p>
			</header>

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

			{/* Sheet de edición */}
			<AddressFormSheet
				open={isDetailModalOpen}
				onOpenChange={setIsDetailModalOpen}
				mode="edit"
				draft={newAddress}
				handleDraftChange={handleNewAddressChange}
				handleTypeChange={handleAddressTypeChange}
				selectedAddress={selectedAddress}
				onSubmit={handleSaveAddress}
				onDelete={handleDeleteAddress}
				isSaving={isSaving}
			/>

			{/* Sheet de creación */}
			<AddressFormSheet
				open={isAddModalOpen}
				onOpenChange={setIsAddModalOpen}
				mode="create"
				draft={newAddress}
				handleDraftChange={handleNewAddressChange}
				handleTypeChange={handleAddressTypeChange}
				onSubmit={handleAddAddress}
				isSaving={isSaving}
			/>
		</section>
	);
}

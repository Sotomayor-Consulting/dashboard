import type { AddressItem } from '../hooks/use-company-addresses';
import AddressCard from './company-addresses/AddressCard';
import AddressCreateCard from './company-addresses/AddressCreateCard';
import AddressCreateDialog from './company-addresses/AddressCreateDialog';
import AddressDetailDialog from './company-addresses/AddressDetailDialog';

interface Props {
	canEditDetails: boolean;
	addresses: AddressItem[];
	selectedAddress: AddressItem | undefined;
	isDetailModalOpen: boolean;
	setIsDetailModalOpen: (open: boolean) => void;
	isAddModalOpen: boolean;
	setIsAddModalOpen: (open: boolean) => void;
	newAddress: Omit<AddressItem, 'id'>;
	handleNewAddressChange: (
		field: keyof Omit<AddressItem, 'id'>,
	) => (event: React.ChangeEvent<HTMLInputElement>) => void;
	handleAddAddress: () => void;
	openAddressDetail: (addressId: string) => void;
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
	handleAddAddress,
	openAddressDetail,
	addressCardHeightClass,
}: Props) {
	return (
		<section className="flex flex-col gap-5">
			<header className="flex flex-col gap-1">
				<h3 className="text-lg font-semibold">Direcciones</h3>
				<p className="text-muted-foreground text-sm">
					Gestiona las direcciones operativas y de correspondencia de la
					empresa.
				</p>
			</header>

			<div className="grid auto-rows-fr grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
				{addresses.map((address) => (
					<AddressCard
						key={address.id}
						address={address}
						addressCardHeightClass={addressCardHeightClass}
						onOpenDetail={openAddressDetail}
					/>
				))}
				<AddressCreateCard
					canEditDetails={canEditDetails}
					addressCardHeightClass={addressCardHeightClass}
					onClick={() => setIsAddModalOpen(true)}
				/>
			</div>

			<AddressDetailDialog
				open={isDetailModalOpen}
				onOpenChange={setIsDetailModalOpen}
				selectedAddress={selectedAddress}
			/>

			<AddressCreateDialog
				open={isAddModalOpen}
				onOpenChange={setIsAddModalOpen}
				newAddress={newAddress}
				handleNewAddressChange={handleNewAddressChange}
				handleAddAddress={handleAddAddress}
			/>
		</section>
	);
}

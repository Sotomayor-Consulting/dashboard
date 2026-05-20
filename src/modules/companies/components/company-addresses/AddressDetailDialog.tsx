import { Button } from '@components/ui/Button';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@components/ui/Dialog';
import { Field, FieldGroup, FieldLabel } from '@components/ui/Field';
import { Input } from '@components/ui/Input';
import type { AddressDraft, AddressItem } from '../../hooks/use-company-addresses';

interface Props {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	selectedAddress: AddressItem | undefined;
	draft: AddressDraft;
	handleDraftChange: (
		field: keyof AddressDraft,
	) => (event: React.ChangeEvent<HTMLInputElement>) => void;
	handleSaveAddress: () => void;
	handleDeleteAddress: () => void;
	isSaving: boolean;
}

export default function AddressDetailDialog({
	open,
	onOpenChange,
	selectedAddress,
	draft,
	handleDraftChange,
	handleSaveAddress,
	handleDeleteAddress,
	isSaving,
}: Props) {
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Detalle de direccion</DialogTitle>
					<DialogDescription>
						Consulta los datos registrados para esta direccion.
					</DialogDescription>
				</DialogHeader>
				<FieldGroup>
					<Field>
						<FieldLabel>Tipo</FieldLabel>
						<Input value={draft.type ?? ''} onChange={handleDraftChange('type')} />
					</Field>
					<Field>
						<FieldLabel>Pais</FieldLabel>
						<Input
							value={draft.country ?? ''}
							onChange={handleDraftChange('country')}
						/>
					</Field>
					<Field>
						<FieldLabel>Ciudad</FieldLabel>
						<Input value={draft.city ?? ''} onChange={handleDraftChange('city')} />
					</Field>
					<Field>
						<FieldLabel>ZIP</FieldLabel>
						<Input value={draft.zip ?? ''} onChange={handleDraftChange('zip')} />
					</Field>
					<Field className="md:col-span-2">
						<FieldLabel>Linea 1</FieldLabel>
						<Input
							value={draft.line1 ?? ''}
							onChange={handleDraftChange('line1')}
						/>
					</Field>
				</FieldGroup>
				<DialogFooter>
					<Button
						type="button"
						variant="destructive"
						onClick={handleDeleteAddress}
						disabled={isSaving || !selectedAddress}
					>
						Eliminar
					</Button>
					<Button
						type="button"
						onClick={handleSaveAddress}
						disabled={isSaving || !selectedAddress}
					>
						Guardar
					</Button>
					<Button
						type="button"
						variant="outline"
						onClick={() => onOpenChange(false)}
					>
						Cerrar
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

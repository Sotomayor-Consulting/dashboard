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
import type { AddressItem } from '../../hooks/use-company-addresses';

interface Props {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	selectedAddress: AddressItem | undefined;
}

export default function AddressDetailDialog({
	open,
	onOpenChange,
	selectedAddress,
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
						<Input value={selectedAddress?.type ?? ''} disabled />
					</Field>
					<Field>
						<FieldLabel>Pais</FieldLabel>
						<Input value={selectedAddress?.country ?? ''} disabled />
					</Field>
					<Field>
						<FieldLabel>Ciudad</FieldLabel>
						<Input value={selectedAddress?.city ?? ''} disabled />
					</Field>
					<Field>
						<FieldLabel>ZIP</FieldLabel>
						<Input value={selectedAddress?.zip ?? ''} disabled />
					</Field>
					<Field className="md:col-span-2">
						<FieldLabel>Linea 1</FieldLabel>
						<Input value={selectedAddress?.line1 ?? ''} disabled />
					</Field>
				</FieldGroup>
				<DialogFooter>
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

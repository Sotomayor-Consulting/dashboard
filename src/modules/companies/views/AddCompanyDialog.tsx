import * as React from 'react';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@components/components/ui/dialog';
import { Button } from '@components/components/ui/button';
import { Input } from '@components/components/ui/input';
import {
	Field,
	FieldGroup,
	FieldLabel,
} from '@components/components/ui/field';
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@components/components/ui/select';
import { Spinner } from '@components/components/ui/spinner';
import { BUSINESS_TYPES, PROCESS_STATES } from '../utils/company-options';

interface AddCompanyDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	estados: string[];
}

const BACK_PATH = '/companies/';

export default function AddCompanyDialog({
	open,
	onOpenChange,
	estados,
}: AddCompanyDialogProps) {
	const [isSubmitting, setIsSubmitting] = React.useState(false);

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-2xl">
				<DialogHeader>
					<DialogTitle>Anadir empresa</DialogTitle>
					<DialogDescription>
						Completa los datos para registrar una nueva empresa de
						incorporacion.
					</DialogDescription>
				</DialogHeader>
				<form
					action={`/api/incorp/save?back=${encodeURIComponent(BACK_PATH)}`}
					method="post"
					className="space-y-5"
					onSubmit={() => setIsSubmitting(true)}
				>
					<FieldGroup className="grid gap-4 md:grid-cols-2">
						<Field>
							<FieldLabel htmlFor="tipo_de_empresa">
								Tipo de negocio
							</FieldLabel>
							<Select name="tipo_de_empresa" required>
								<SelectTrigger id="tipo_de_empresa" className="w-full">
									<SelectValue placeholder="Selecciona un tipo" />
								</SelectTrigger>
								<SelectContent>
									<SelectGroup>
										{BUSINESS_TYPES.map((option) => (
											<SelectItem key={option.value} value={option.value}>
												{option.label}
											</SelectItem>
										))}
									</SelectGroup>
								</SelectContent>
							</Select>
						</Field>

						<Field>
							<FieldLabel htmlFor="estado_de_empresa">
								Estado de incorporacion
							</FieldLabel>
							<Select name="estado_de_empresa" defaultValue="Wyoming" required>
								<SelectTrigger id="estado_de_empresa" className="w-full">
									<SelectValue placeholder="Selecciona un estado" />
								</SelectTrigger>
								<SelectContent>
									<SelectGroup>
										{estados.map((estado) => (
											<SelectItem key={estado} value={estado}>
												{estado}
											</SelectItem>
										))}
									</SelectGroup>
								</SelectContent>
							</Select>
						</Field>

						<Field>
							<FieldLabel htmlFor="estado_de">Proceso</FieldLabel>
							<Select name="estado_de" defaultValue="En proceso">
								<SelectTrigger id="estado_de" className="w-full">
									<SelectValue placeholder="Selecciona un proceso" />
								</SelectTrigger>
								<SelectContent>
									<SelectGroup>
										{PROCESS_STATES.map((option) => (
											<SelectItem key={option.value} value={option.value}>
												{option.label}
											</SelectItem>
										))}
									</SelectGroup>
								</SelectContent>
							</Select>
						</Field>
					</FieldGroup>

					<FieldGroup className="grid gap-4 md:grid-cols-3">
						<Field>
							<FieldLabel htmlFor="nombre_1">Nombre 1</FieldLabel>
							<Input
								id="nombre_1"
								name="nombre_1"
								type="text"
								placeholder="Nombre principal"
								required
							/>
						</Field>
						<Field>
							<FieldLabel htmlFor="nombre_2">Nombre 2</FieldLabel>
							<Input
								id="nombre_2"
								name="nombre_2"
								type="text"
								placeholder="Alternativa (opcional)"
							/>
						</Field>
						<Field>
							<FieldLabel htmlFor="nombre_3">Nombre 3</FieldLabel>
							<Input
								id="nombre_3"
								name="nombre_3"
								type="text"
								placeholder="Alternativa (opcional)"
							/>
						</Field>
					</FieldGroup>

					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={() => onOpenChange(false)}
						>
							Cancelar
						</Button>
						<Button type="submit" disabled={isSubmitting}>
							{isSubmitting && <Spinner data-icon="inline-start" />}
							{isSubmitting ? 'Registrando...' : 'Registrar empresa'}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}

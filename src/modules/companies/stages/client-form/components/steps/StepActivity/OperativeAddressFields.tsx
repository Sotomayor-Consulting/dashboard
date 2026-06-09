import { AnimatePresence, motion } from 'framer-motion';
import { Controller, useFormContext, useWatch } from 'react-hook-form';

import { Input } from '@components/ui/Input';
import { Label } from '@components/ui/Label';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@components/ui/Select';

import { COUNTRIES } from '../../../data/countries';
import { US_STATES } from '../../../data/us-states';
import type { ClientFormData } from '../../../types';
import { FieldError } from '../../shared/FieldError';
import { FieldTooltip } from '../../shared/FieldTooltip';
import { FileUploadField } from '../../shared/FileUploadField';

export function OperativeAddressFields() {
	const {
		register,
		control,
		formState: { errors },
	} = useFormContext<ClientFormData>();

	const option = useWatch<ClientFormData>({
		control,
		name: 'direccionOperativaEEUU',
	});

	return (
		<AnimatePresence mode="wait">
			{option === 'si' && (
				<motion.div
					key="us-address"
					initial={{ opacity: 0, height: 0 }}
					animate={{ opacity: 1, height: 'auto' }}
					exit={{ opacity: 0, height: 0 }}
					className="overflow-hidden"
				>
					<div className="bg-muted/50 space-y-4 rounded-lg p-4">
						<h3 className="text-foreground font-medium">
							Dirección en Estados Unidos
						</h3>
						<div>
							<Label htmlFor="direccion">Dirección (Address Line 1)</Label>
							<Input
								id="direccion"
								{...register('direccion')}
								className="mt-1.5"
								placeholder="123 Main Street, Suite 100"
							/>
							<FieldError message={errors.direccion?.message as string} />
						</div>
						<div className="grid gap-4 sm:grid-cols-2">
							<div>
								<Label htmlFor="condado">Condado (County)</Label>
								<Input
									id="condado"
									{...register('condado')}
									className="mt-1.5"
									placeholder="Miami-Dade"
								/>
							</div>
							<div>
								<Label htmlFor="ciudad">Ciudad (City)</Label>
								<Input
									id="ciudad"
									{...register('ciudad')}
									className="mt-1.5"
									placeholder="Miami"
								/>
							</div>
						</div>
						<div className="grid gap-4 sm:grid-cols-2">
							<div>
								<Label htmlFor="estado">Estado (State)</Label>
								<Controller
									control={control}
									name="estado"
									render={({ field }) => (
										<Select value={field.value} onValueChange={field.onChange}>
											<SelectTrigger className="mt-1.5 w-full">
												<SelectValue placeholder="Selecciona" />
											</SelectTrigger>
											<SelectContent>
												{US_STATES.map((s) => (
													<SelectItem key={s} value={s}>
														{s}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
									)}
								/>
							</div>
							<div>
								<Label htmlFor="codigoPostal">Zip Code</Label>
								<Input
									id="codigoPostal"
									{...register('codigoPostal')}
									className="mt-1.5"
									placeholder="33101"
									maxLength={10}
								/>
							</div>
						</div>
						<Controller
							control={control}
							name="facturaServicioBasicoEEUU"
							render={({ field }) => (
								<FileUploadField
									id="facturaServicioBasicoEEUU"
									label="Factura de servicio básico"
									description="Factura de luz, agua o gas que verifique la dirección en EE. UU."
									file={field.value}
									onFileChange={field.onChange}
									maxSizeLabel="1 MB"
								/>
							)}
						/>
					</div>
				</motion.div>
			)}

			{option === 'no' && (
				<motion.div
					key="non-us-address"
					initial={{ opacity: 0, height: 0 }}
					animate={{ opacity: 1, height: 'auto' }}
					exit={{ opacity: 0, height: 0 }}
					className="overflow-hidden"
				>
					<div className="bg-muted/50 space-y-4 rounded-lg p-4">
						<h3 className="text-foreground font-medium">
							Dirección fuera de Estados Unidos
						</h3>
						<div>
							<Label htmlFor="pais">País</Label>
							<Controller
								control={control}
								name="pais"
								render={({ field }) => (
									<Select value={field.value} onValueChange={field.onChange}>
										<SelectTrigger className="mt-1.5 w-full">
											<SelectValue placeholder="Selecciona un país" />
										</SelectTrigger>
										<SelectContent>
											{COUNTRIES.map((c) => (
												<SelectItem key={c} value={c}>
													{c}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								)}
							/>
						</div>
						<div>
							<Label htmlFor="ciudad">Ciudad</Label>
							<Controller
								control={control}
								name="ciudad"
								render={({ field }) => (
									<Input id="ciudad" {...field} className="mt-1.5" />
								)}
							/>
						</div>
						<div>
							<Label htmlFor="direccionEmpresa">
								Dirección Empresa
								<FieldTooltip text="Dirección de la planilla de servicio donde se realizarán las operaciones." />
							</Label>
							<Input
								id="direccionEmpresa"
								{...register('direccionEmpresa')}
								className="mt-1.5"
								placeholder="Calle Principal #123, Ciudad"
							/>
							<FieldError
								message={errors.direccionEmpresa?.message as string}
							/>
						</div>
						<Controller
							control={control}
							name="facturaServicioBasico"
							render={({ field }) => (
								<FileUploadField
									id="facturaServicioBasico"
									label="Factura de servicio básico"
									description="Factura que verifique la dirección de operaciones del negocio."
									file={field.value}
									onFileChange={field.onChange}
									maxSizeLabel="1 MB"
								/>
							)}
						/>
					</div>
				</motion.div>
			)}

			{option === 'sci' && (
				<motion.div
					key="sci-address"
					initial={{ opacity: 0, height: 0 }}
					animate={{ opacity: 1, height: 'auto' }}
					exit={{ opacity: 0, height: 0 }}
					className="overflow-hidden"
				>
					<div className="bg-accent/10 border-accent/20 rounded-lg border p-4">
						<p className="text-foreground text-sm">
							<strong>Nota:</strong> Se asignará una dirección en EE.UU. a
							través de Sotomayor Consulting International. Este servicio puede
							incluir costos adicionales.
						</p>
					</div>
				</motion.div>
			)}
		</AnimatePresence>
	);
}

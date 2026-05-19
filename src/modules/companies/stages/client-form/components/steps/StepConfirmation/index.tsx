import { Icon } from '@iconify/react';
import { Controller, useFormContext, useWatch } from 'react-hook-form';

import { Checkbox } from '@components/ui/Checkbox';

import type { Activity } from '../../../data/activities';
import type { ClientFormData } from '../../../types';
import { FieldError } from '../../shared/FieldError';
import { SignaturePadField } from './SignaturePadField';
import { SummaryPanel } from './SummaryPanel';

interface Props {
	activities: Activity[];
}

export function StepConfirmation({ activities }: Props) {
	const {
		control,
		formState: { errors },
	} = useFormContext<ClientFormData>();

	const aceptaTerminos = useWatch<ClientFormData>({
		control,
		name: 'aceptaTerminos',
	}) as boolean;

	return (
		<div className="space-y-6">
			<div>
				<h2 className="text-foreground text-2xl font-semibold">
					Confirmación y firma
				</h2>
				<p className="text-muted-foreground mt-1">
					Revise la información y firme para enviar su solicitud.
				</p>
			</div>

			<SummaryPanel activities={activities} />

			<SignaturePadField />

			<div className="bg-muted/30 rounded-lg p-4">
				<div className="flex items-start gap-3">
					<Controller
						control={control}
						name="aceptaTerminos"
						render={({ field }) => (
							<Checkbox
								id="aceptaTerminos"
								checked={field.value}
								onCheckedChange={(c) => field.onChange(c === true)}
								className="mt-0.5"
							/>
						)}
					/>
					<label htmlFor="aceptaTerminos" className="cursor-pointer text-sm">
						He leído y acepto los{' '}
						<a
							href="https://sotomayorconsulting.com/terminos-y-referencias-en-la-incorporacion-de-una-llc/"
							target="_blank"
							rel="noopener noreferrer"
							className="text-accent hover:text-accent/80 underline underline-offset-2"
						>
							Términos y Condiciones
						</a>{' '}
						del servicio de incorporación LLC.
					</label>
				</div>
				<FieldError message={errors.aceptaTerminos?.message as string} />
			</div>

			{!aceptaTerminos && (
				<div className="bg-muted/50 border-border flex items-center gap-3 rounded-lg border p-4">
					<Icon
						icon="ri:alert-line"
						className="text-muted-foreground h-5 w-5 shrink-0"
					/>
					<p className="text-muted-foreground text-sm">
						Debe aceptar los términos y condiciones para enviar la solicitud.
					</p>
				</div>
			)}
		</div>
	);
}

import { Icon } from '@iconify/react';
import { useCallback, useState } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';

import { cn } from '@components/utils';
import { Label } from '@components/ui/Label';

import type { ClientFormData } from '../../../types';
import { FieldError } from '../../shared/FieldError';
import { FieldTooltip } from '../../shared/FieldTooltip';
import { DrawSignature } from './DrawSignature';
import { TypedSignature } from './TypedSignature';
import { UploadSignature } from './UploadSignature';

type Mode = 'draw' | 'type' | 'upload';

const TABS: ReadonlyArray<{ id: Mode; label: string; icon: string }> = [
	{ id: 'draw', label: 'Dibujar', icon: 'ri:edit-2-line' },
	{ id: 'type', label: 'Escribir', icon: 'ri:keyboard-line' },
	{ id: 'upload', label: 'Subir', icon: 'ri:upload-line' },
] as const;

/** Mensaje de validación contextual según la pestaña activa. */
const ERROR_MESSAGES: Record<Mode, string> = {
	draw: 'Dibuja tu firma para continuar',
	type: 'Escribe tu nombre para continuar',
	upload: 'Sube una imagen de tu firma para continuar',
};

export function SignaturePadField() {
	const {
		control,
		setValue,
		getValues,
		formState: { errors },
	} = useFormContext<ClientFormData>();

	const [mode, setMode] = useState<Mode>('draw');

	const initialDataUrl = useWatch<ClientFormData>({
		control,
		name: 'firma',
	}) as string | null;

	const handleChange = useCallback(
		(dataUrl: string | null) => {
			setValue('firma', dataUrl, {
				shouldDirty: true,
				shouldValidate: true,
			});
		},
		[setValue],
	);

	const switchMode = useCallback(
		(next: Mode) => {
			if (next === mode) return;
			setValue('firma', null, { shouldDirty: true, shouldValidate: true });
			setMode(next);
		},
		[mode, setValue],
	);

	const suggestedName = (() => {
		const miembros = getValues('miembros') ?? [];
		return miembros.find((m) => m?.nombreCompleto)?.nombreCompleto ?? '';
	})();

	const hasError = !!errors.firma;
	const errorMessage = hasError ? ERROR_MESSAGES[mode] : undefined;

	return (
		<div>
			<Label className="mb-2 block text-sm font-medium">
				Firma digital
				<FieldTooltip text="Dibuje su firma, escriba su nombre o suba una imagen. Con la firma acepta los Términos y Condiciones del servicio." />
			</Label>

			{/* Tabs */}
			<div className="border-border bg-muted/30 mb-3 inline-flex gap-1 rounded-lg border p-1">
				{TABS.map((tab) => (
					<button
						key={tab.id}
						type="button"
						onClick={() => switchMode(tab.id)}
						className={cn(
							'inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
							mode === tab.id
								? 'bg-card text-foreground shadow-sm'
								: 'text-muted-foreground hover:text-foreground',
						)}
					>
						<Icon icon={tab.icon} className="h-4 w-4" />
						{tab.label}
					</button>
				))}
			</div>

			{mode === 'draw' && (
				<DrawSignature
					initialDataUrl={initialDataUrl}
					onChange={handleChange}
				/>
			)}
			{mode === 'type' && (
				<TypedSignature initialName={suggestedName} onChange={handleChange} />
			)}
			{mode === 'upload' && <UploadSignature onChange={handleChange} />}

			<FieldError message={errorMessage} />
		</div>
	);
}

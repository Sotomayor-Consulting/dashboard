import { useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import type { PartnerRequiredField } from '@domains/users/users';

const FIELD_LABELS: Record<PartnerRequiredField, string> = {
	line1: 'Direccion linea 1',
	line2: 'Direccion linea 2',
	email: 'Correo electronico',
	tax_id: 'Numero de identificacion',
	phone: 'Telefono',
};

interface BannerToastManagerProps {
	showBannerPartner: boolean;
	missingFields: PartnerRequiredField[];
}

interface ToastDefinition {
	id: string;
	enabled: boolean;
	title: string;
	ctaLabel: string;
	url: string;
	description?: string | undefined;
	accentClassName?: string | undefined;
	ctaClassName?: string | undefined;
}

function BannerToastCard({
	title,
	description,
	ctaLabel,
	url,
	accentClassName,
	ctaClassName,
	onClose,
}: {
	title: string;
	description?: string | undefined;
	ctaLabel: string;
	url: string;
	accentClassName?: string | undefined;
	ctaClassName?: string | undefined;
	onClose: () => void;
}) {
	return (
		<div
			className={[
				'flex w-full max-w-md items-start justify-between gap-4 rounded-lg bg-white p-4 shadow-lg dark:bg-neutral-900',
				accentClassName,
			]
				.filter(Boolean)
				.join(' ')}
		>
			<div className="min-w-0 flex-1">
				<p className="text-center text-sm font-medium text-black dark:text-white">
					{title}
				</p>
				{description ? (
					<p className="mt-1 text-center text-xs text-gray-600 dark:text-gray-300">
						{description}
					</p>
				) : null}
				<div className="mt-3 flex items-center justify-center gap-2">
					<a
						href={url}
						className={[
							'inline-flex h-9 items-center rounded-lg bg-black px-4 text-sm font-medium text-white transition-colors hover:bg-gray-800 dark:bg-white dark:text-black dark:hover:bg-gray-200',
							ctaClassName,
						]
							.filter(Boolean)
							.join(' ')}
					>
						{ctaLabel}
					</a>
					<button
						type="button"
						onClick={onClose}
						className="inline-flex h-9 items-center rounded-lg border border-gray-200 px-3 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:border-[#38415f] dark:text-gray-300 dark:hover:bg-neutral-950 dark:hover:text-white"
					>
						Cerrar
					</button>
				</div>
			</div>
		</div>
	);
}

export default function BannerToastManager({
	showBannerPartner,
	missingFields,
}: BannerToastManagerProps) {
	const toasts = useMemo<ToastDefinition[]>(() => {
		const missingFieldsText = missingFields
			.map((field) => FIELD_LABELS[field] ?? field)
			.join(', ');

		// Los toasts de pago pendiente ('banner-en-proceso') y upgrade se
		// eliminaron: el estado de pago ahora se comunica dentro del dashboard
		// de la propia incorporación, no con notificaciones globales.
		return [
			{
				id: 'banner-partner-profile',
				enabled: showBannerPartner,
				title: 'Completa tu información de perfil para continuar como partner.',
				description: missingFieldsText
					? `Campos incompletos: ${missingFieldsText}`
					: undefined,
				ctaLabel: 'Actualizar Perfil',
				url: '/profile/',
				accentClassName:
					'border border-yellow-200 bg-orange-900 dark:border-yellow-800 dark:bg-orange-900/20',
				ctaClassName:
					'bg-yellow-600 hover:bg-yellow-700 dark:bg-yellow-700 dark:text-white dark:hover:bg-yellow-800',
			},
		];
	}, [missingFields, showBannerPartner]);

	useEffect(() => {
		for (const definition of toasts) {
			if (!definition.enabled) {
				toast.dismiss(definition.id);
				continue;
			}

			toast.custom(
				() => (
					<BannerToastCard
						title={definition.title}
						description={definition.description}
						ctaLabel={definition.ctaLabel}
						url={definition.url}
						accentClassName={definition.accentClassName}
						ctaClassName={definition.ctaClassName}
						onClose={() => {
							toast.dismiss(definition.id);
						}}
					/>
				),
				{
					id: definition.id,
					duration: Infinity,
				},
			);
		}

		return () => {
			for (const definition of toasts) {
				toast.dismiss(definition.id);
			}
		};
	}, [toasts]);

	return null;
}

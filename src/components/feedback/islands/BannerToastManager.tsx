import { useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import type { PartnerRequiredField } from '@domains/users/users';

const INCORPORATION_FORM_ID = '3bc86384-2cc6-440d-aa79-f2f63738fd3b';

const FIELD_LABELS: Record<PartnerRequiredField, string> = {
	direccion_linea1: 'Direccion linea 1',
	direccion_linea2: 'Direccion linea 2',
	tipo_identificacion: 'Tipo de identificacion',
	numero_de_identificacion: 'Numero de identificacion',
	tipo_persona: 'Tipo de persona',
};

interface BannerToastManagerProps {
	showBannerEnProceso: boolean;
	showBannerUpgrade: boolean;
	showBannerPartner: boolean;
	missingFields: PartnerRequiredField[];
	showBannerIncorporacion: boolean;
	empresaId: string | null;
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
				'dark:bg-black-700 flex w-full max-w-md items-start justify-between gap-4 rounded-2xl bg-white p-4 shadow-lg',
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
						className="inline-flex h-9 items-center rounded-lg border border-gray-200 px-3 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:border-[#38415f] dark:text-gray-300 dark:hover:bg-[#1a2235] dark:hover:text-white"
					>
						Cerrar
					</button>
				</div>
			</div>
		</div>
	);
}

export default function BannerToastManager({
	showBannerEnProceso,
	showBannerUpgrade,
	showBannerPartner,
	missingFields,
	showBannerIncorporacion,
	empresaId,
}: BannerToastManagerProps) {
	const toasts = useMemo<ToastDefinition[]>(() => {
		const missingFieldsText = missingFields
			.map((field) => FIELD_LABELS[field] ?? field)
			.join(', ');

		return [
			{
				id: 'banner-en-proceso',
				enabled: showBannerEnProceso,
				title:
					'Tu compania esta pendiente a incorporar. Desbloquea sus beneficios.',
				ctaLabel: 'Continuar al pago',
				url: '/incorporation-and-payment',
			},
			{
				id: 'banner-upgrade',
				enabled: showBannerUpgrade,
				title:
					'Tu empresa esta en el plan Upgrade, da click aqui para actualizar el plan',
				ctaLabel: 'Actualizar plan',
				url: '/upgrade',
			},
			{
				id: 'banner-partner-profile',
				enabled: showBannerPartner,
				title: 'Completa tu información de perfil para continuar como partner.',
				description: missingFieldsText
					? `Campos incompletos: ${missingFieldsText}`
					: undefined,
				ctaLabel: 'Actualizar Perfil',
				url: '/settings/',
				accentClassName:
					'border border-yellow-200 bg-linear-to-r from-yellow-50 to-orange-50 dark:border-yellow-800 dark:from-yellow-900/20 dark:to-orange-900/20',
				ctaClassName:
					'bg-yellow-600 hover:bg-yellow-700 dark:bg-yellow-700 dark:text-white dark:hover:bg-yellow-800',
			},
			{
				id: 'banner-incorporation-form',
				enabled: showBannerIncorporacion && Boolean(empresaId),
				title:
					'Proceda con la formalización de la incorporación de su empresa a través del siguiente formulario.',
				ctaLabel: 'Comenzar ahora',
				url: `/forms/incorporation/${INCORPORATION_FORM_ID}?empresa=${empresaId ?? ''}`,
			},
		];
	}, [
		empresaId,
		missingFields,
		showBannerEnProceso,
		showBannerIncorporacion,
		showBannerPartner,
		showBannerUpgrade,
	]);

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

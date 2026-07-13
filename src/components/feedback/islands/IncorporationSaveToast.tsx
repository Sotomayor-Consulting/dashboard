import { useEffect, useRef } from 'react';
import { CheckCircle2, CircleAlert } from 'lucide-react';
import { toast } from 'sonner';

import { Alert, AlertDescription, AlertTitle } from '@components/ui/Alert';
import { Button } from '@components/ui/Button';

const STORAGE_KEY = 'incorpData';
const REDIRECT_URL = '/my-companies/';
const START_URL = '/start/';
const TOAST_ID = 'incorp-save';

interface IncorpData {
	tipo_de_empresa?: string;
	estado_de_empresa?: string | number;
	nombre_1?: string;
	nombre_2?: string;
	nombre_3?: string;
	estado_de?: string;
}

function ToastCard({
	title,
	message,
	isSuccess,
	onClose,
	onAction,
	actionLabel,
}: {
	title: string;
	message: string;
	isSuccess: boolean;
	onClose: () => void;
	onAction?: () => void;
	actionLabel?: string;
}) {
	return (
		<Alert variant={isSuccess ? 'success' : 'destructive'} className="max-w-md">
			<div
				className={[
					'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ring-1',
					isSuccess
						? 'bg-emerald-500/10 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:ring-emerald-900/70'
						: 'bg-red-500/10 text-red-700 ring-red-200 dark:bg-red-500/15 dark:text-red-300 dark:ring-red-900/70',
				].join(' ')}
			>
				{isSuccess ? (
					<CheckCircle2 className="h-4 w-4" />
				) : (
					<CircleAlert className="h-4 w-4" />
				)}
			</div>

			<div className="min-w-0 space-y-1">
				<AlertTitle>{title}</AlertTitle>
				<AlertDescription>{message}</AlertDescription>
				<div className="mt-3 flex gap-2">
					{onAction && actionLabel ? (
						<Button size="sm" onClick={onAction}>
							{actionLabel}
						</Button>
					) : null}
					<Button size="sm" variant="outline" onClick={onClose}>
						Cerrar
					</Button>
				</div>
			</div>
		</Alert>
	);
}

export default function IncorporationSaveToast() {
	const hasRunRef = useRef(false);

	useEffect(() => {
		if (hasRunRef.current) return;
		hasRunRef.current = true;

		let redirectTimer: number | undefined;

		const dismiss = () => toast.dismiss(TOAST_ID);

		const showToast = (
			message: string,
			{
				isSuccess = false,
				duration = 6000,
				redirectTo,
				redirectDelayMs = 3000,
			}: {
				isSuccess?: boolean;
				duration?: number;
				redirectTo?: string;
				redirectDelayMs?: number;
			} = {},
		) => {
			if (redirectTimer) window.clearTimeout(redirectTimer);

			const handleRedirect = () => {
				dismiss();
				window.location.href = redirectTo ?? REDIRECT_URL;
			};

			toast.custom(
				() => (
					<ToastCard
						title={isSuccess ? 'Empresa registrada' : 'No se pudo registrar'}
						message={message}
						isSuccess={isSuccess}
						onClose={() => {
							if (redirectTimer) window.clearTimeout(redirectTimer);
							dismiss();
						}}
						{...(redirectTo
							? {
								onAction: handleRedirect,
								actionLabel: 'Ir ahora',
							}
							: {})}
					/>
				),
				{
					id: TOAST_ID,
					duration,
				},
			);

			if (redirectTo) {
				redirectTimer = window.setTimeout(handleRedirect, redirectDelayMs);
			}
		};

		const saveIncorporation = async () => {
			const raw = window.localStorage.getItem(STORAGE_KEY);
			if (!raw) return;

			try {
				const data = JSON.parse(raw) as IncorpData;
				const nombresEmpresa = [data.nombre_1, data.nombre_2, data.nombre_3];
				const nombresValidos = nombresEmpresa.some(
					(nombre) =>
						nombre !== null &&
						nombre !== undefined &&
						String(nombre).trim() !== '',
				);

				if (!nombresValidos) {
					window.location.href = START_URL;
					return;
				}

				const formData = new FormData();
				formData.append('tipo_de_empresa', data.tipo_de_empresa || '');
				formData.append('estado_de_empresa', String(data.estado_de_empresa || ''));
				formData.append('nombre_1', data.nombre_1 || '');
				formData.append('nombre_2', data.nombre_2 || '');
				formData.append('nombre_3', data.nombre_3 || '');
				formData.append('estado_de', data.estado_de || '');

				const response = await fetch('/api/incorporations/save', {
					method: 'POST',
					headers: { Accept: 'application/json' },
					body: formData,
				});

				const contentType = response.headers.get('content-type') || '';
				const payload = contentType.includes('application/json')
					? await response.json().catch(() => null)
					: null;

				if (response.ok) {
					window.localStorage.removeItem(STORAGE_KEY);
					showToast(
						payload?.message ||
							'Empresa registrada correctamente. Redirigiendo a tus empresas...',
						{
							isSuccess: true,
							duration: 3000,
							redirectTo: REDIRECT_URL,
							redirectDelayMs: 3000,
						},
					);
					return;
				}

				showToast(
					payload?.message ||
						'No se pudo registrar la empresa. Intentalo nuevamente.',
				);
			} catch (error) {
				console.error('[incorp-save] Error:', error);
				showToast(
					error instanceof Error
						? error.message
						: 'Error de conexion. Intentalo nuevamente.',
				);
			}
		};

		void saveIncorporation();

		return () => {
			if (redirectTimer) window.clearTimeout(redirectTimer);
			dismiss();
		};
	}, []);

	return null;
}

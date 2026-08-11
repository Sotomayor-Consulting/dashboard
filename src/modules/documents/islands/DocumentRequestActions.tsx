import * as React from 'react';
import { Button } from '@components/ui/Button';
import { Icon } from '@iconify/react';
import { toast } from 'sonner';

type Props = {
	requestId: string;
	status: string;
	/** Nº de documentos recibidos; sin ninguno no hay nada que revisar. */
	documentCount: number;
};

const TERMINAL = new Set(['approved', 'rejected', 'cancelled']);

/**
 * Acciones de revisión de UNA solicitud de documentos, para el panel de staff.
 *
 * La decisión de aprobar o rechazar es de la solicitud, no de cada archivo:
 * una solicitud puede tener N documentos y la respuesta ("¿me sirve lo que
 * entregó el cliente?") es una sola.
 */
export default function DocumentRequestActions({
	requestId,
	status,
	documentCount,
}: Props) {
	const [currentStatus, setCurrentStatus] = React.useState(status);
	const [busy, setBusy] = React.useState<string | null>(null);

	if (TERMINAL.has(currentStatus)) return null;

	const review = async (nextStatus: 'approved' | 'rejected') => {
		const comments =
			nextStatus === 'rejected'
				? (globalThis.prompt('Motivo del rechazo (opcional)') ?? '')
				: '';

		setBusy(nextStatus);
		const toastId = toast.loading(
			nextStatus === 'approved' ? 'Aprobando…' : 'Rechazando…',
		);
		try {
			const res = await fetch('/api/documents/review', {
				method: 'POST',
				credentials: 'include',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					documentRequestId: requestId,
					status: nextStatus,
					comments: comments || undefined,
				}),
			});
			const data = await res.json();
			if (!res.ok) throw new Error(data?.error || 'Error');

			setCurrentStatus(nextStatus);
			toast.success(
				nextStatus === 'approved'
					? 'Solicitud aprobada'
					: 'Solicitud rechazada',
				{ id: toastId },
			);
			window.location.reload();
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : 'No se pudo revisar',
				{ id: toastId },
			);
		} finally {
			setBusy(null);
		}
	};

	const cancel = async () => {
		setBusy('cancel');
		const toastId = toast.loading('Cancelando solicitud…');
		try {
			const res = await fetch('/api/documents/cancel-request', {
				method: 'POST',
				credentials: 'include',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ documentRequestId: requestId }),
			});
			const data = await res.json();
			if (!res.ok) throw new Error(data?.error || 'Error');

			setCurrentStatus('cancelled');
			toast.success('Solicitud cancelada', { id: toastId });
			window.location.reload();
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : 'No se pudo cancelar',
				{ id: toastId },
			);
		} finally {
			setBusy(null);
		}
	};

	return (
		<div className="mt-3 flex flex-wrap items-center gap-2">
			{documentCount > 0 ? (
				<>
					<Button
						type="button"
						size="sm"
						variant="outline"
						disabled={busy !== null}
						onClick={() => review('approved')}
					>
						<Icon icon="ri:check-line" className="h-4 w-4" />
						{busy === 'approved' ? 'Aprobando…' : 'Aprobar'}
					</Button>
					<Button
						type="button"
						size="sm"
						variant="destructive"
						disabled={busy !== null}
						onClick={() => review('rejected')}
					>
						<Icon icon="ri:close-line" className="h-4 w-4" />
						{busy === 'rejected' ? 'Rechazando…' : 'Rechazar'}
					</Button>
				</>
			) : (
				<span className="text-muted-foreground text-xs">
					A la espera de que el cliente suba el documento.
				</span>
			)}

			<Button
				type="button"
				size="sm"
				variant="outline"
				disabled={busy !== null}
				onClick={cancel}
			>
				<Icon icon="ri:close-circle-line" className="h-4 w-4" />
				{busy === 'cancel' ? 'Cancelando…' : 'Cancelar solicitud'}
			</Button>
		</div>
	);
}

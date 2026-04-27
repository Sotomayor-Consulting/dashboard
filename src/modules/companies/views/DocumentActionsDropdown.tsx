import * as React from 'react';
import { MoreHorizontal } from 'lucide-react';
import { Button } from '@components/components/ui/button';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@components/components/ui/dropdown-menu';

type Props = {
	documentId: string;
	showRevoke: boolean;
	canRevoke: boolean;
	sharedWithUserId?: string;
};

export default function DocumentActionsDropdown({
	documentId,
	showRevoke,
	canRevoke,
	sharedWithUserId,
}: Props) {
	const onDownload = React.useCallback(async () => {
		try {
			const res = await fetch('/api/documents/signed-url', {
				method: 'POST',
				credentials: 'include',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ documentId }),
			});

			const data = await res.json();
			if (!res.ok) throw new Error(data?.error || 'Error');
			window.open(data.signedUrl, '_blank');
		} catch (error) {
			console.error('Error al descargar documento:', error);
			window.alert('No se pudo descargar el documento');
		}
	}, [documentId]);

	const onHistory = React.useCallback(async () => {
		try {
			const res = await fetch(
				`/api/documents/events?documentId=${encodeURIComponent(documentId)}`,
				{ method: 'GET', credentials: 'include' },
			);
			const data = await res.json();
			if (!res.ok) throw new Error(data?.error || 'Error');
			const text =
				(data.events || [])
					.map(
						(eventItem: {
							created_at: string;
							event_type: string;
							actor_role: string;
						}) =>
							`${eventItem.created_at} · ${eventItem.event_type} · ${eventItem.actor_role}`,
					)
					.join('\n') || 'Sin eventos';
			window.alert(text);
		} catch (error) {
			console.error('Error al cargar historial:', error);
			window.alert('No se pudo cargar el historial');
		}
	}, [documentId]);

	const onRevoke = React.useCallback(async () => {
		if (!canRevoke || !sharedWithUserId) return;
		try {
			const res = await fetch('/api/documents/revoke-share', {
				method: 'POST',
				credentials: 'include',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ documentId, sharedWithUserId }),
			});
			const data = await res.json();
			if (!res.ok) throw new Error(data?.error || 'Error');
			window.location.reload();
		} catch (error) {
			console.error('Error al revocar acceso:', error);
			window.alert('No se pudo revocar el acceso');
		}
	}, [canRevoke, documentId, sharedWithUserId]);

	return (
		<DropdownMenu>
			<DropdownMenuTrigger
				render={
					<Button
						variant="outline"
						size="sm"
						className="inline-flex items-center gap-2"
					>
						<MoreHorizontal className="h-4 w-4" />
						Acciones
					</Button>
				}
			>
				Acciones
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="w-44">
				<DropdownMenuItem onClick={onHistory}>Ver historial</DropdownMenuItem>
				<DropdownMenuItem onClick={onDownload}>Descargar</DropdownMenuItem>
				{showRevoke ? (
					<DropdownMenuItem onClick={onRevoke} disabled={!canRevoke}>
						Revocar acceso
					</DropdownMenuItem>
				) : null}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

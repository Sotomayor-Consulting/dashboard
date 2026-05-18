import { Badge } from '@components/ui/Badge';
import { Button } from '@components/ui/Button';
import DocumentDropzoneField from '@components/forms/DocumentDropzoneField';
import { Field, FieldGroup, FieldLabel } from '@components/ui/Field';
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@components/ui/Select';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@components/ui/Table';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@components/ui/DropdownMenu';
import {
	CheckCircle2,
	Download,
	FileText,
	History,
	MoreHorizontal,
	XCircle,
} from 'lucide-react';
import type {
	DocumentDashboardRow,
	DocumentTypeLite,
} from '@domains/documents/document_dashboard';
import { DocumentTypeComboboxField } from './DocumentTypeComboboxField';

type Props = {
	incorporationCaseId: string;
	backPath: string;
	documentTypes: DocumentTypeLite[];
	documents: DocumentDashboardRow[];
	isStaff?: boolean;
	sharedWithUserId?: string | undefined;
};

function badgeForDocumentStatus(status: string) {
	if (status === 'approved') return 'susess';
	if (status === 'under_review') return 'standar';
	if (status === 'uploaded') return 'standar';
	if (status === 'rejected') return 'danger';
	if (status === 'expired') return 'danger';
	if (status === 'archived') return 'standar';
	return 'warning';
}

function formatDate(value?: string | null) {
	if (!value) return '—';
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return value;
	return date.toLocaleDateString('es-ES');
}

export default function CompanyDocumentsUploadManager({
	incorporationCaseId,
	backPath,
	documentTypes,
	documents,
	isStaff = false,
	sharedWithUserId,
}: Props) {
	const uploadAction = `/api/documents/upload?incorporationCaseId=${encodeURIComponent(
		incorporationCaseId,
	)}&back=${encodeURIComponent(backPath)}`;

	const onDownload = async (documentId: string) => {
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
	};

	const onHistory = async (documentId: string) => {
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
	};

	const onRevoke = async (documentId: string) => {
		if (!isStaff) return;
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
	};

	const onReview = async (
		documentId: string,
		status: 'approved' | 'rejected',
	) => {
		if (!isStaff) return;
		try {
			const res = await fetch('/api/documents/review', {
				method: 'POST',
				credentials: 'include',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ documentId, status }),
			});
			const data = await res.json();
			if (!res.ok) throw new Error(data?.error || 'Error');
			window.location.reload();
		} catch (error) {
			console.error('Error al actualizar estado del documento:', error);
			window.alert('No se pudo actualizar el estado del documento');
		}
	};

	const onOpenDetail = (documentId: string) => {
		const basePath = isStaff
			? `/incorporations/${incorporationCaseId}/documents`
			: `/my-companies/${incorporationCaseId}/documents`;
		window.location.href = `${basePath}/${documentId}`;
	};

	return (
		<div className="space-y-4 dark:bg-transparent">
			<div className="rounded-lg border p-4">
				<h4 className="mb-1 text-base font-semibold">Subir documentos</h4>
				<p className="text-muted-foreground mb-4 text-sm">
					Sube documentos internos o visibles para cliente usando el flujo
					unificado.
				</p>

				<form action={uploadAction} method="post" encType="multipart/form-data">
					<FieldGroup className="grid gap-4 md:grid-cols-2">
						<Field>
							<FieldLabel>Archivo</FieldLabel>
							<DocumentDropzoneField
								name="file"
								id="file"
								required
								maxSizeMb={15}
							/>
						</Field>

						<Field>
							<FieldLabel>Tipo de documento</FieldLabel>
							<DocumentTypeComboboxField documentTypes={documentTypes} />
						</Field>

						<Field>
							<FieldLabel htmlFor="visibility">Visibilidad</FieldLabel>
							<Select name="visibility" defaultValue="internal_only">
								<SelectTrigger id="visibility" className="w-full">
									<SelectValue placeholder="Selecciona visibilidad" />
								</SelectTrigger>
								<SelectContent>
									<SelectGroup>
										<SelectItem value="internal_only">Interno</SelectItem>
										<SelectItem value="client_visible">
											Visible cliente
										</SelectItem>
									</SelectGroup>
								</SelectContent>
							</Select>
						</Field>

						<Field>
							<FieldLabel htmlFor="shareWithClient">Compartir</FieldLabel>
							<Select name="shareWithClient" defaultValue="false">
								<SelectTrigger id="shareWithClient" className="w-full">
									<SelectValue placeholder="Selecciona opción" />
								</SelectTrigger>
								<SelectContent>
									<SelectGroup>
										<SelectItem value="false">No compartir</SelectItem>
										<SelectItem value="true">Compartir</SelectItem>
									</SelectGroup>
								</SelectContent>
							</Select>
						</Field>
					</FieldGroup>

					<div className="mt-4 flex items-center justify-end">
						<Button type="submit">Subir documento</Button>
					</div>
				</form>
			</div>

			<div className="overflow-hidden rounded-lg border">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Documento</TableHead>
							<TableHead>Tipo</TableHead>
							<TableHead>Estado</TableHead>
							<TableHead>Visibilidad</TableHead>
							<TableHead>Fecha</TableHead>
							<TableHead>Acciones</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{documents.length ? (
							documents.map((doc) => (
								<TableRow key={doc.id}>
									<TableCell className="max-w-72 truncate">
										{doc.file_title ?? doc.file_name}
									</TableCell>
									<TableCell>
										{doc.document_type
											? `${doc.document_type.code} - ${doc.document_type.name}`
											: 'Documento'}
									</TableCell>
									<TableCell>
										<Badge variant={badgeForDocumentStatus(doc.status)}>
											{doc.status}
										</Badge>
									</TableCell>
									<TableCell>
										{doc.visibility === 'client_visible'
											? 'Visible cliente'
											: 'Interno'}
									</TableCell>
									<TableCell>{formatDate(doc.uploaded_at)}</TableCell>
									<TableCell>
										<DropdownMenu>
											<DropdownMenuTrigger
												render={
													<Button type="button" variant="outline" size="sm">
														<MoreHorizontal className="h-4 w-4" />
														Acciones
													</Button>
												}
											>
												Acciones
											</DropdownMenuTrigger>
											<DropdownMenuContent align="end" className="w-44">
												<DropdownMenuItem
													onClick={() => onOpenDetail(doc.id)}
													className="gap-2"
												>
													<FileText className="h-4 w-4" />
													Ver detalle
												</DropdownMenuItem>
												<DropdownMenuItem
													onClick={() => onHistory(doc.id)}
													className="gap-2"
												>
													<History className="h-4 w-4" />
													Ver historial
												</DropdownMenuItem>
												<DropdownMenuItem
													onClick={() => onDownload(doc.id)}
													className="gap-2"
												>
													<Download className="h-4 w-4" />
													Descargar
												</DropdownMenuItem>
												{isStaff && doc.document_request_id ? (
													<DropdownMenuItem
														onClick={() => onReview(doc.id, 'approved')}
														disabled={doc.status === 'approved'}
														className="gap-2"
													>
														<CheckCircle2 className="h-4 w-4" />
														Aprobar
													</DropdownMenuItem>
												) : null}
												{isStaff && doc.document_request_id ? (
													<DropdownMenuItem
														onClick={() => onReview(doc.id, 'rejected')}
														disabled={doc.status === 'rejected'}
														className="gap-2"
													>
														<XCircle className="h-4 w-4" />
														Rechazar
													</DropdownMenuItem>
												) : null}
												{isStaff ? (
													<DropdownMenuItem
														onClick={() => onRevoke(doc.id)}
														className="gap-2"
													>
														<XCircle className="h-4 w-4" />
														Revocar acceso
													</DropdownMenuItem>
												) : null}
											</DropdownMenuContent>
										</DropdownMenu>
									</TableCell>
								</TableRow>
							))
						) : (
							<TableRow>
								<TableCell colSpan={6} className="h-16 text-center">
									No hay documentos cargados aún.
								</TableCell>
							</TableRow>
						)}
					</TableBody>
				</Table>
			</div>
		</div>
	);
}

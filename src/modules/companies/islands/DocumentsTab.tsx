import * as React from 'react';
import { Badge } from '@components/ui/Badge';
import { Button } from '@components/ui/Button';
import { DropzoneField } from '@components/ui/DropzoneField';
import { Field, FieldGroup, FieldLabel } from '@components/ui/Field';
import { Input } from '@components/ui/Input';
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectLabel,
	SelectTrigger,
	SelectValue,
} from '@components/ui/Select';
import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
	SheetDescription,
	SheetFooter,
} from '@components/ui/Sheet';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@components/ui/Table';
import { Textarea } from '@components/ui/Textarea';
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
import { Icon } from '@iconify/react';
import { DocumentTypeComboboxField } from '@modules/documents/islands/DocumentTypeComboboxField';
import type {
	DocumentDashboardRow,
	DocumentRequestDashboardRow,
	DocumentTypeLite,
} from '@domains/documents/document_dashboard';

type SheetMode = 'request' | 'upload' | null;

interface Props {
	incorporationCaseId: string;
	backPath: string;
	documentTypes: DocumentTypeLite[];
	documents: DocumentDashboardRow[];
	requests: DocumentRequestDashboardRow[];
	isStaff: boolean;
	sharedWithUserId?: string;
}

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

export default function DocumentsTab({
	incorporationCaseId,
	backPath,
	documentTypes,
	documents,
	requests,
	isStaff = false,
	sharedWithUserId,
}: Props) {
	const [sheetMode, setSheetMode] = React.useState<SheetMode>(null);
	const lastMode = React.useRef<SheetMode>(null);
	const isOpen = sheetMode !== null;
	const closeSheet = () => setSheetMode(null);
	const displayMode = sheetMode ?? lastMode.current;

	React.useEffect(() => {
		if (sheetMode !== null) lastMode.current = sheetMode;
	}, [sheetMode]);

	const uploadAction = `/api/documents/upload?incorporationCaseId=${encodeURIComponent(incorporationCaseId)}&back=${encodeURIComponent(backPath)}`;

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

	const pendingRequestsCount = requests.filter(
		(r) => r.status === 'pending' || r.status === 'under_review',
	).length;

	return (
		<div className="flex flex-col gap-4">
			<div className="flex flex-wrap items-center gap-2">
				<Button
					type="button"
					variant="outline"
					onClick={() => setSheetMode('request')}
				>
					<Icon icon="ri:file-list-3-line" className="h-4 w-4" />
					Solicitar documento
				</Button>
				<Button
					type="button"
					variant="outline"
					onClick={() => setSheetMode('upload')}
				>
					<Icon icon="ri:upload-2-line" className="h-4 w-4" />
					Subir documento
				</Button>
				{pendingRequestsCount > 0 && (
					<span className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-medium text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
						{pendingRequestsCount} solicitudes pendientes
					</span>
				)}
			</div>

			<div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-transparent">
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
								<TableCell colSpan={6} className="h-32 text-center">
									<div className="flex flex-col items-center gap-2 text-gray-500 dark:text-gray-400">
										<Icon icon="ri:file-text-line" className="h-8 w-8" />
										<p className="text-sm">No hay documentos cargados aún.</p>
									</div>
								</TableCell>
							</TableRow>
						)}
					</TableBody>
				</Table>
			</div>

			<Sheet
				open={isOpen}
				onOpenChange={(o) => {
					if (!o) closeSheet();
				}}
			>
				<SheetContent side="right" className="sm:!max-w-lg">
					<SheetHeader>
						<SheetTitle>
							{displayMode === 'request'
								? 'Solicitar documento'
								: 'Subir documento'}
						</SheetTitle>
						<SheetDescription>
							{displayMode === 'request'
								? 'Crea una solicitud para que el cliente suba el documento requerido.'
								: 'Sube un documento interno o visible para el cliente usando el flujo unificado.'}
						</SheetDescription>
					</SheetHeader>

					{displayMode === 'request' ? (
						<form
							action={`/api/documents/request?back=${encodeURIComponent(backPath)}`}
							method="post"
							className="flex flex-1 flex-col gap-4"
						>
							<input
								type="hidden"
								name="incorporationCaseId"
								value={incorporationCaseId}
							/>
							<input
								type="hidden"
								name="relatedToType"
								value="incorporation_case"
							/>
							<input
								type="hidden"
								name="relatedToId"
								value={incorporationCaseId}
							/>

							<div className="flex-1 space-y-4 px-4">
								<FieldGroup className="grid gap-4 md:grid-cols-2">
									<Field>
										<FieldLabel htmlFor="documentTypeId">
											Tipo de documento
										</FieldLabel>
										<Select name="documentTypeId" required>
											<SelectTrigger id="documentTypeId" className="w-full">
												<SelectValue placeholder="Selecciona un tipo" />
											</SelectTrigger>
											<SelectContent>
												<SelectGroup>
													<SelectLabel>Tipos</SelectLabel>
													{documentTypes.map((docType) => (
														<SelectItem
															key={docType.id}
															value={String(docType.id)}
														>
															{docType.code} - {docType.name}
														</SelectItem>
													))}
												</SelectGroup>
											</SelectContent>
										</Select>
									</Field>
									<Field>
										<FieldLabel htmlFor="dueDate">Fecha límite</FieldLabel>
										<Input id="dueDate" name="dueDate" type="date" />
									</Field>
								</FieldGroup>

								<Field>
									<FieldLabel htmlFor="message">
										Mensaje para el cliente
									</FieldLabel>
									<Textarea
										id="message"
										name="message"
										rows={4}
										placeholder="Describe qué debe subir el cliente."
									/>
								</Field>
							</div>

							<SheetFooter>
								<Button variant="outline" type="button" onClick={closeSheet}>
									Cancelar
								</Button>
								<Button type="submit">Crear solicitud</Button>
							</SheetFooter>
						</form>
					) : (
						<form
							action={uploadAction}
							method="post"
							encType="multipart/form-data"
							className="flex flex-1 flex-col gap-4"
						>
							<div className="flex-1 space-y-4 px-4">
								<Field>
									<FieldLabel>Archivo</FieldLabel>
									<DropzoneField
										name="file"
										id="file"
										required
										maxFileSizeMb={15}
										maxFiles={1}
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
							</div>

							<SheetFooter>
								<Button variant="outline" type="button" onClick={closeSheet}>
									Cancelar
								</Button>
								<Button type="submit">Subir documento</Button>
							</SheetFooter>
						</form>
					)}
				</SheetContent>
			</Sheet>
		</div>
	);
}

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
import { Icon } from '@iconify/react';
import { cn } from '@components/utils';
import { toast } from 'sonner';
import { DocumentTypeComboboxField } from '@modules/documents/islands/DocumentTypeComboboxField';
import type {
	DocumentDashboardRow,
	DocumentRequestDashboardRow,
	DocumentTypeLite,
} from '@domains/documents/document_dashboard';
import DocumentDetailDrawer from './DocumentDetailDrawer';
import {
	badgeForDocumentStatus,
	badgeForSigned,
	formatDate,
	getMimeBg,
	getMimeColor,
	getMimeIcon,
	signedLabel,
	statusLabel,
} from '@modules/documents/document-ui';

type SheetMode = 'request' | 'upload' | null;
type SortField = 'name' | 'type' | 'status' | 'date';

interface Props {
	incorporationCaseId: string;
	backPath: string;
	documentTypes: DocumentTypeLite[];
	documents: DocumentDashboardRow[];
	requests: DocumentRequestDashboardRow[];
	isStaff: boolean;
	sharedWithUserId?: string;
}

function SortHead({
	field,
	activeField,
	dir,
	onSort,
	children,
}: {
	field: SortField;
	activeField: SortField;
	dir: 'asc' | 'desc';
	onSort: (f: SortField) => void;
	children: React.ReactNode;
}) {
	const active = activeField === field;
	const icon = active
		? dir === 'asc'
			? 'ri:arrow-up-s-line'
			: 'ri:arrow-down-s-line'
		: 'ri:arrow-up-down-line';
	return (
		<TableHead
			onClick={() => onSort(field)}
			className="cursor-pointer select-none"
		>
			<span className="flex items-center gap-1">
				{children}
				<Icon icon={icon} className="h-3.5 w-3.5 text-gray-400" />
			</span>
		</TableHead>
	);
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

	const [docs, setDocs] = React.useState<DocumentDashboardRow[]>(
		() => documents,
	);
	const [selectedDocument, setSelectedDocument] =
		React.useState<DocumentDashboardRow | null>(null);
	const [sortField, setSortField] = React.useState<SortField>('date');
	const [sortDir, setSortDir] = React.useState<'asc' | 'desc'>('desc');

	React.useEffect(() => {
		if (sheetMode !== null) lastMode.current = sheetMode;
	}, [sheetMode]);

	const handleSort = (field: SortField) => {
		if (sortField === field) {
			setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
		} else {
			setSortField(field);
			setSortDir('asc');
		}
	};

	const sortedDocs = React.useMemo(() => {
		return [...docs].sort((a, b) => {
			let va = '';
			let vb = '';
			if (sortField === 'name') {
				va = a.file_title ?? a.file_name;
				vb = b.file_title ?? b.file_name;
			} else if (sortField === 'type') {
				va = a.document_type?.name ?? '';
				vb = b.document_type?.name ?? '';
			} else if (sortField === 'status') {
				va = a.status;
				vb = b.status;
			} else {
				va = a.uploaded_at ?? '';
				vb = b.uploaded_at ?? '';
			}
			return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
		});
	}, [docs, sortField, sortDir]);

	const uploadAction = `/api/documents/upload?incorporationCaseId=${encodeURIComponent(incorporationCaseId)}&back=${encodeURIComponent(backPath)}`;

	const [uploading, setUploading] = React.useState(false);

	const handleUpload = async (e: React.SyntheticEvent<HTMLFormElement>) => {
		e.preventDefault();
		setUploading(true);
		const toastId = toast.loading('Subiendo documento…');
		try {
			const res = await fetch(uploadAction, {
				method: 'POST',
				body: new FormData(e.currentTarget),
				credentials: 'include',
				redirect: 'follow',
			});
			const finalUrl = new URL(res.url, window.location.origin);
			const status = finalUrl.searchParams.get('status');
			const msg = finalUrl.searchParams.get('msg');
			if (status === 'error') {
				toast.error(msg ?? 'Error al subir el documento', { id: toastId });
			} else {
				toast.success(msg ?? 'Documento subido correctamente', { id: toastId });
				closeSheet();
				window.location.reload();
			}
		} catch {
			toast.error('Error al subir el documento', { id: toastId });
		} finally {
			setUploading(false);
		}
	};

	const onDownload = async (documentId: string, e: React.MouseEvent) => {
		e.stopPropagation();
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
		} catch {
			toast.error('No se pudo descargar el documento');
		}
	};

	const onRevoke = async (documentId: string, e: React.MouseEvent) => {
		e.stopPropagation();
		if (!isStaff) return;
		const toastId = toast.loading('Revocando acceso…');
		try {
			const res = await fetch('/api/documents/revoke-share', {
				method: 'POST',
				credentials: 'include',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ documentId, sharedWithUserId }),
			});
			const data = await res.json();
			if (!res.ok) throw new Error(data?.error || 'Error');
			setDocs((prev) =>
				prev.map((d) => {
					if (d.id !== documentId) return d;
					const newShares = d.shares.map((s) => {
						if (sharedWithUserId && s.shared_with_user_id !== sharedWithUserId)
							return s;
						return { ...s, share_status: 'revoked' };
					});
					return { ...d, shares: newShares };
				}),
			);
			toast.success('Acceso revocado', { id: toastId });
		} catch {
			toast.error('No se pudo revocar el acceso', { id: toastId });
		}
	};

	const onShare = async (documentId: string, e: React.MouseEvent) => {
		e.stopPropagation();
		if (!isStaff || !sharedWithUserId) return;
		const toastId = toast.loading('Compartiendo documento…');
		try {
			const res = await fetch('/api/documents/share', {
				method: 'POST',
				credentials: 'include',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ documentId, sharedWithUserId }),
			});
			const data = await res.json();
			if (!res.ok) throw new Error(data?.error || 'Error');
			setDocs((prev) =>
				prev.map((d) => {
					if (d.id !== documentId) return d;
					const existing = d.shares.find(
						(s) => s.shared_with_user_id === sharedWithUserId,
					);
					const newShares = existing
						? d.shares.map((s) =>
								s.shared_with_user_id === sharedWithUserId
									? {
											...s,
											share_status: 'active',
											shared_at: new Date().toISOString(),
										}
									: s,
							)
						: [
								...d.shares,
								{
									id: data.shareId ?? crypto.randomUUID(),
									shared_with_user_id: sharedWithUserId,
									share_status: 'active',
									shared_at: new Date().toISOString(),
								},
							];
					return { ...d, shares: newShares };
				}),
			);
			toast.success('Documento compartido con el cliente', { id: toastId });
		} catch {
			toast.error('No se pudo compartir el documento', { id: toastId });
		}
	};

	const pendingRequestsCount = requests.filter(
		(r) => r.status === 'pending' || r.status === 'under_review',
	).length;

	return (
		<div className="flex flex-col gap-4">
			<div className="flex flex-wrap items-center gap-2">
				{isStaff && (
					<>
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
					</>
				)}
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
							<TableHead className="w-10 pr-0" />
							<SortHead
								field="name"
								activeField={sortField}
								dir={sortDir}
								onSort={handleSort}
							>
								Documento
							</SortHead>
							<SortHead
								field="type"
								activeField={sortField}
								dir={sortDir}
								onSort={handleSort}
							>
								Tipo
							</SortHead>
							<SortHead
								field="status"
								activeField={sortField}
								dir={sortDir}
								onSort={handleSort}
							>
								Estado
							</SortHead>
							<TableHead>Visibilidad</TableHead>
							<SortHead
								field="date"
								activeField={sortField}
								dir={sortDir}
								onSort={handleSort}
							>
								Fecha
							</SortHead>
							<TableHead>Acciones</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{sortedDocs.length ? (
							sortedDocs.map((doc) => (
								<TableRow
									key={doc.id}
									onClick={() => setSelectedDocument(doc)}
									className="cursor-pointer"
								>
									<TableCell className="w-10 pr-0">
										<div
											className={cn(
												'flex h-8 w-8 items-center justify-center rounded-lg',
												getMimeBg(doc.mime_type),
											)}
										>
											<Icon
												icon={getMimeIcon(doc.mime_type)}
												className={cn('h-4 w-4', getMimeColor(doc.mime_type))}
											/>
										</div>
									</TableCell>
									<TableCell className="max-w-60 truncate">
										{doc.file_title ?? doc.file_name}
									</TableCell>
									<TableCell className="max-w-36 truncate">
										{doc.document_type?.name ?? 'Documento'}
									</TableCell>
									<TableCell>
										<div className="flex flex-wrap items-center gap-1">
											<Badge variant={badgeForDocumentStatus(doc.status)}>
												{statusLabel(doc.status)}
											</Badge>
											<Badge variant={badgeForSigned(doc.is_signed)}>
												{signedLabel(doc.is_signed)}
											</Badge>
										</div>
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
												onClick={(e) => e.stopPropagation()}
												render={
													<Button
														type="button"
														variant="ghost"
														size="icon"
														className="h-8 w-8"
													>
														<Icon icon="ri:more-2-line" className="h-4 w-4" />
													</Button>
												}
											/>
											<DropdownMenuContent align="end" className="w-44">
												<DropdownMenuItem
													onClick={(e) => onDownload(doc.id, e)}
													className="gap-2"
												>
													<Icon icon="ri:download-2-line" className="h-4 w-4" />
													Descargar
												</DropdownMenuItem>
												{isStaff &&
													(() => {
														const hasActiveShare = sharedWithUserId
															? doc.shares.some(
																	(s) =>
																		s.shared_with_user_id ===
																			sharedWithUserId &&
																		s.share_status === 'active',
																)
															: false;
														return hasActiveShare ? (
															<DropdownMenuItem
																onClick={(e) => onRevoke(doc.id, e)}
																className="gap-2 text-red-600 dark:text-red-400"
															>
																<Icon
																	icon="ri:forbid-line"
																	className="h-4 w-4"
																/>
																Revocar acceso
															</DropdownMenuItem>
														) : sharedWithUserId ? (
															<DropdownMenuItem
																onClick={(e) => onShare(doc.id, e)}
																className="gap-2 text-emerald-700 dark:text-emerald-400"
															>
																<Icon
																	icon="ri:share-forward-line"
																	className="h-4 w-4"
																/>
																Compartir
															</DropdownMenuItem>
														) : null;
													})()}
											</DropdownMenuContent>
										</DropdownMenu>
									</TableCell>
								</TableRow>
							))
						) : (
							<TableRow>
								<TableCell colSpan={7} className="h-32 text-center">
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

			{/* Sheet: solicitar / subir documento */}
			{isStaff && (
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
											<FieldLabel>Tipo de documento</FieldLabel>
											<DocumentTypeComboboxField
												documentTypes={documentTypes}
											/>
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
								onSubmit={handleUpload}
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
													<SelectItem value="internal_only" label="Interno">
														Interno
													</SelectItem>
													<SelectItem
														value="client_visible"
														label="Visible para el cliente"
													>
														Visible para el cliente
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
													<SelectItem value="false" label="No compartir">
														No compartir
													</SelectItem>
													<SelectItem
														value="true"
														label="Compartir con cliente"
													>
														Compartir con cliente
													</SelectItem>
												</SelectGroup>
											</SelectContent>
										</Select>
									</Field>
								</div>

								<SheetFooter>
									<Button
										variant="outline"
										type="button"
										onClick={closeSheet}
										disabled={uploading}
									>
										Cancelar
									</Button>
									<Button type="submit" disabled={uploading}>
										{uploading ? 'Subiendo…' : 'Subir documento'}
									</Button>
								</SheetFooter>
							</form>
						)}
					</SheetContent>
				</Sheet>
			)}

			{/* Drawer de detalle de documento */}
			<DocumentDetailDrawer
				document={selectedDocument}
				open={selectedDocument !== null}
				onClose={() => setSelectedDocument(null)}
				isStaff={isStaff}
				incorporationCaseId={incorporationCaseId}
				sharedWithUserId={sharedWithUserId}
				onDocumentUpdated={(updated) => {
					setDocs((prev) =>
						prev.map((d) => (d.id === updated.id ? updated : d)),
					);
					setSelectedDocument((prev) =>
						prev?.id === updated.id ? updated : prev,
					);
				}}
			/>
		</div>
	);
}

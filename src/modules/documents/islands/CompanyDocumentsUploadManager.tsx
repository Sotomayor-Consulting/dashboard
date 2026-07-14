import * as React from 'react';
import { Badge } from '@components/ui/Badge';
import { Button } from '@components/ui/Button';
import { DropzoneField } from '@components/ui/DropzoneField';
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
import { Icon } from '@iconify/react';
import { toast } from 'sonner';
import type {
	DocumentDashboardRow,
	DocumentTypeLite,
} from '@domains/documents/document_dashboard';
import { DocumentTypeComboboxField } from './DocumentTypeComboboxField';
import DocumentDetailDrawer from '@modules/companies/islands/DocumentDetailDrawer';
import {
	badgeForDocumentStatus,
	formatDate,
	getMimeIcon,
	statusLabel,
} from '../document-ui';

type SortField = 'name' | 'type' | 'status' | 'date';

type Props = {
	incorporationCaseId: string;
	backPath: string;
	documentTypes: DocumentTypeLite[];
	documents: DocumentDashboardRow[];
	isStaff?: boolean;
	sharedWithUserId?: string | undefined;
};

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

export default function CompanyDocumentsUploadManager({
	incorporationCaseId,
	backPath,
	documentTypes,
	documents,
	isStaff = false,
	sharedWithUserId,
}: Props) {
	const [selectedDocument, setSelectedDocument] =
		React.useState<DocumentDashboardRow | null>(null);
	const [sortField, setSortField] = React.useState<SortField>('date');
	const [sortDir, setSortDir] = React.useState<'asc' | 'desc'>('desc');

	const handleSort = (field: SortField) => {
		if (sortField === field) {
			setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
		} else {
			setSortField(field);
			setSortDir('asc');
		}
	};

	const sortedDocs = React.useMemo(() => {
		return [...documents].sort((a, b) => {
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
	}, [documents, sortField, sortDir]);

	const uploadAction = `/api/documents/upload?incorporationCaseId=${encodeURIComponent(
		incorporationCaseId,
	)}&back=${encodeURIComponent(backPath)}`;

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
			toast.success('Acceso revocado', { id: toastId });
			window.setTimeout(() => window.location.reload(), 600);
		} catch {
			toast.error('No se pudo revocar el acceso', { id: toastId });
		}
	};

	return (
		<div className="space-y-4">
			<div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-transparent">
				<h4 className="mb-1 text-base font-semibold">Subir documentos</h4>
				<p className="text-muted-foreground mb-4 text-sm">
					Sube documentos internos o visibles para cliente usando el flujo
					unificado.
				</p>

				<form action={uploadAction} method="post" encType="multipart/form-data">
					<FieldGroup className="grid gap-4 md:grid-cols-2">
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
										<SelectItem value="true" label="Compartir">
											Compartir
										</SelectItem>
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
										<Icon
											icon={getMimeIcon(doc.mime_type)}
											className="h-5 w-5 text-gray-400 dark:text-gray-500"
										/>
									</TableCell>
									<TableCell className="max-w-60 truncate">
										{doc.file_title ?? doc.file_name}
									</TableCell>
									<TableCell className="max-w-36 truncate">
										{doc.document_type
											? `${doc.document_type.code} - ${doc.document_type.name}`
											: 'Documento'}
									</TableCell>
									<TableCell>
										<Badge variant={badgeForDocumentStatus(doc.status)}>
											{statusLabel(doc.status)}
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
												{isStaff && (
													<DropdownMenuItem
														onClick={(e) => onRevoke(doc.id, e)}
														className="gap-2 text-red-600 dark:text-red-400"
													>
														<Icon icon="ri:forbid-line" className="h-4 w-4" />
														Revocar acceso
													</DropdownMenuItem>
												)}
											</DropdownMenuContent>
										</DropdownMenu>
									</TableCell>
								</TableRow>
							))
						) : (
							<TableRow>
								<TableCell colSpan={7} className="h-16 text-center">
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

			<DocumentDetailDrawer
				document={selectedDocument}
				open={selectedDocument !== null}
				onClose={() => setSelectedDocument(null)}
				isStaff={isStaff}
				incorporationCaseId={incorporationCaseId}
				sharedWithUserId={sharedWithUserId}
			/>
		</div>
	);
}

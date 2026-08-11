import * as React from 'react';
import { Icon } from '@iconify/react';
import { UploadIcon } from 'lucide-react';

import { Button } from '@components/ui/Button';
import { DropzoneField } from '@components/ui/DropzoneField';
import {
	Field,
	FieldDescription,
	FieldGroup,
	FieldLabel,
} from '@components/ui/Field';
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
	SheetFooter,
	SheetHeader,
	SheetTitle,
} from '@components/ui/Sheet';

import type {
	DocumentDashboardRow,
	DocumentTypeLite,
} from '@domains/documents/document_dashboard';
import { DocumentTypeComboboxField } from '@modules/documents/islands/DocumentTypeComboboxField';
import CompanyDocumentsList from '@modules/documents/islands/CompanyDocumentsList';
import PanelHeader from '../components/shared/PanelHeader';

interface Props {
	documents: DocumentDashboardRow[];
	documentTypes: DocumentTypeLite[];
	companyId: string;
	incorporationId: string | null;
	companyOwnerUserId: string | null;
	canEditDetails: boolean;
	isStaff: boolean;
	/** Solo admin puede borrar de forma permanente (ver deleteDocument). */
	canDelete?: boolean;
}

export default function CompanyDocumentsPanel({
	documents,
	documentTypes,
	companyId,
	incorporationId,
	companyOwnerUserId,
	canEditDetails,
	isStaff,
	canDelete = false,
}: Props) {
	const [isUploadOpen, setIsUploadOpen] = React.useState(false);

	// `documents` incluye los archivados cuando el usuario es staff, así que el
	// contador de la cabecera cuenta solo los activos.
	const activeCount = React.useMemo(
		() => documents.filter((d) => d.status !== 'archived').length,
		[documents],
	);

	const canUpload = canEditDetails;

	const backPath = `/admin/companies/${companyId}/documents`;
	const uploadAction = incorporationId
		? `/api/documents/upload?relatedToType=incorporation_case&relatedToId=${encodeURIComponent(
				incorporationId,
			)}&back=${encodeURIComponent(backPath)}`
		: `/api/documents/upload?relatedToType=company&relatedToId=${encodeURIComponent(
				companyId,
			)}&back=${encodeURIComponent(backPath)}`;

	return (
		<section className="-mx-6 -my-5 flex flex-col">
			<PanelHeader
				kicker="Documentos"
				title="Documentos de la empresa"
				meta={`${activeCount} documento${activeCount === 1 ? '' : 's'} · Incorporación y archivos compartidos`}
				action={
					<Button
						type="button"
						size="sm"
						className="gap-1.5"
						onClick={() => setIsUploadOpen(true)}
						disabled={!canUpload}
					>
						<UploadIcon className="size-4" />
						Subir documento
					</Button>
				}
			/>

			<div className="p-6">
				{documents.length === 0 ? (
					<div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-gray-200 p-10 text-center dark:border-gray-700">
						<Icon
							icon="ri:file-text-line"
							className="h-8 w-8 text-gray-400 dark:text-gray-500"
						/>
						<p className="text-sm font-medium text-gray-900 dark:text-gray-100">
							Aún no hay documentos
						</p>
						<p className="text-sm text-gray-500 dark:text-gray-400">
							Sube el primer documento de esta empresa para empezar.
						</p>
					</div>
				) : (
					<CompanyDocumentsList
						documents={documents}
						canUseStaffActions={isStaff}
						canDelete={canDelete}
						incorporationCaseId={incorporationId ?? ''}
						companyUserId={companyOwnerUserId ?? ''}
						isStaffDashboard={isStaff}
					/>
				)}
			</div>

			{/* Sheet de subida */}
			<Sheet open={isUploadOpen} onOpenChange={setIsUploadOpen}>
				<SheetContent
					side="right"
					className="max-h-dvh w-full max-w-[560px] overflow-y-auto"
				>
					<SheetHeader className="pb-3">
						<SheetTitle>Subir documento</SheetTitle>
						<p className="text-muted-foreground text-sm">
							El documento quedará vinculado a esta empresa y podrás compartirlo
							con el cliente.
						</p>
					</SheetHeader>

					<form
						action={uploadAction}
						method="post"
						encType="multipart/form-data"
						className="flex flex-1 flex-col"
					>
						<div className="flex flex-col gap-5 px-4 pb-4">
							<FieldGroup className="grid gap-4">
								<Field>
									<FieldLabel>Archivo</FieldLabel>
									<DropzoneField
										name="file"
										id="company_doc_file"
										required
										maxFileSizeMb={15}
										maxFiles={1}
									/>
									<FieldDescription>
										PDF, Word, Excel o imágenes. Máximo 15MB.
									</FieldDescription>
								</Field>

								<Field>
									<FieldLabel>Tipo de documento</FieldLabel>
									<DocumentTypeComboboxField documentTypes={documentTypes} />
								</Field>

								{isStaff && (
									<>
										<Field>
											<FieldLabel htmlFor="company_doc_share">
												Compartir con el cliente
											</FieldLabel>
											<Select name="shareWithClient" defaultValue="false">
												<SelectTrigger
													id="company_doc_share"
													className="w-full"
												>
													<SelectValue placeholder="Selecciona opción" />
												</SelectTrigger>
												<SelectContent>
													<SelectGroup>
														<SelectItem value="false" label="No compartir">
															No compartir
														</SelectItem>
														<SelectItem value="true" label="Compartir al subir">
															Compartir al subir
														</SelectItem>
													</SelectGroup>
												</SelectContent>
											</Select>
											<FieldDescription>
												Solo aplica si la visibilidad es "Visible para el
												cliente".
											</FieldDescription>
										</Field>
									</>
								)}
							</FieldGroup>
						</div>

						<SheetFooter>
							<Button type="submit">
								<UploadIcon className="size-4" />
								Subir documento
							</Button>
							<Button
								type="button"
								variant="outline"
								onClick={() => setIsUploadOpen(false)}
							>
								Cancelar
							</Button>
						</SheetFooter>
					</form>
				</SheetContent>
			</Sheet>
		</section>
	);
}

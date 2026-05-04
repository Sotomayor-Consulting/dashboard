import * as React from 'react';
import { Badge } from '@components/components/ui/badge';
import { Button } from '@components/components/ui/button';
import { Field, FieldGroup, FieldLabel } from '@components/components/ui/field';
import { Input } from '@components/components/ui/input';
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@components/components/ui/select';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@components/components/ui/table';
import { Textarea } from '@components/components/ui/textarea';

type DocumentTypeLite = {
	id: number;
	code: number;
	name: string;
};

type DocumentRequestItem = {
	id: string;
	status: string;
	due_date: string | null;
	message: string | null;
	is_required: boolean;
	requested_at: string | null;
	document_type: DocumentTypeLite | null;
};

type Props = {
	incorporationCaseId: string;
	backPath: string;
	documentTypes: DocumentTypeLite[];
	requests: DocumentRequestItem[];
};

function badgeForRequestStatus(status: string) {
	if (status === 'approved') return 'susess';
	if (status === 'under_review') return 'standar';
	if (status === 'uploaded') return 'standar';
	if (status === 'rejected') return 'danger';
	if (status === 'cancelled') return 'danger';
	if (status === 'closed') return 'danger';
	return 'warning';
}

export default function DocumentRequestManager({
	incorporationCaseId,
	backPath,
	documentTypes,
	requests,
}: Props) {
	return (
		<div className="to-black-600 from-black-900 space-y-4 dark:bg-linear-to-tr">
			<div className="rounded-lg border p-4">
				<h4 className="mb-1 text-base font-semibold">Solicitar documentos</h4>
				<p className="text-muted-foreground mb-4 text-sm">
					Crea solicitudes para que el cliente suba los documentos requeridos.
				</p>

				<form
					action={`/api/documents/request?back=${encodeURIComponent(backPath)}`}
					method="post"
					className="space-y-4"
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
					<input type="hidden" name="relatedToId" value={incorporationCaseId} />

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
										{documentTypes.map((docType) => (
											<SelectItem key={docType.id} value={String(docType.id)}>
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
						<FieldLabel htmlFor="message">Mensaje para el cliente</FieldLabel>
						<Textarea
							id="message"
							name="message"
							rows={4}
							placeholder="Describe qué debe subir el cliente."
						/>
					</Field>

					<div className="flex items-center justify-end gap-2">
						<Button type="submit">Crear solicitud</Button>
					</div>
				</form>
			</div>

			<div className="overflow-hidden rounded-lg border">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Documento</TableHead>
							<TableHead>Estado</TableHead>
							<TableHead>Vence</TableHead>
							<TableHead>Requerido</TableHead>
							<TableHead>Mensaje</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{requests.length ? (
							requests.map((request) => (
								<TableRow key={request.id}>
									<TableCell>
										{request.document_type
											? `${request.document_type.code} - ${request.document_type.name}`
											: 'Documento requerido'}
									</TableCell>
									<TableCell>
										<Badge variant={badgeForRequestStatus(request.status)}>
											{request.status}
										</Badge>
									</TableCell>
									<TableCell>{request.due_date || '—'}</TableCell>
									<TableCell>{request.is_required ? 'Sí' : 'No'}</TableCell>
									<TableCell className="max-w-72 truncate">
										{request.message || '—'}
									</TableCell>
								</TableRow>
							))
						) : (
							<TableRow>
								<TableCell colSpan={5} className="h-16 text-center">
									No hay solicitudes creadas para esta empresa.
								</TableCell>
							</TableRow>
						)}
					</TableBody>
				</Table>
			</div>
		</div>
	);
}

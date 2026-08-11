import * as React from 'react';
import { Badge } from '@components/ui/Badge';
import { Icon } from '@iconify/react';
import DocumentRequestActions from './DocumentRequestActions';
import { badgeForRequestStatus, requestStatusLabel } from '../document-ui';

export type DocumentRequestListFile = {
	id: string;
	file_name: string;
	file_title: string | null;
};

export type DocumentRequestListItem = {
	id: string;
	status: string;
	due_date: string | null;
	message: string | null;
	is_required: boolean;
	document_type: { name: string } | null;
	documents: DocumentRequestListFile[];
};

type Props = {
	requests: DocumentRequestListItem[];
	/** Muestra las acciones de revisión (admin u operaciones). */
	canReview: boolean;
};

/**
 * Lista de solicitudes de documentos para el staff, con los archivos recibidos
 * y las acciones de revisión.
 *
 * Es el único sitio donde se renderiza esta lista para staff. Antes convivían
 * dos versiones —una en `CompanyDocumentsDashboard.astro` y otra en un
 * componente que no montaba nadie— y la pestaña de documentos del detalle de
 * incorporación no mostraba ninguna, solo un contador, así que no había forma
 * de aprobar nada desde ahí.
 */
export default function DocumentRequestList({ requests, canReview }: Props) {
	const todayIso = React.useMemo(
		() => new Date().toISOString().slice(0, 10),
		[],
	);

	if (requests.length === 0) {
		return (
			<div className="border-border text-muted-foreground rounded-lg border border-dashed p-6 text-center text-sm">
				No hay solicitudes de documentos para esta empresa.
			</div>
		);
	}

	return (
		<div className="border-border overflow-hidden rounded-lg border">
			<ul className="divide-border divide-y">
				{requests.map((request) => {
					const overdue =
						!!request.due_date &&
						!['approved', 'rejected', 'cancelled'].includes(request.status) &&
						request.due_date < todayIso;

					return (
						<li key={request.id} className="p-4">
							<div className="flex flex-wrap items-start justify-between gap-2">
								<div className="min-w-0">
									<p className="text-foreground text-sm font-semibold">
										{request.document_type?.name ?? 'Documento requerido'}
									</p>
									<p className="text-muted-foreground mt-1 text-xs">
										{request.is_required ? 'Obligatorio' : 'Opcional'}
										{request.due_date ? ' · Vence: ' : ''}
										{request.due_date ? (
											<span
												className={
													overdue
														? 'font-medium text-red-600 dark:text-red-400'
														: undefined
												}
											>
												{request.due_date}
												{overdue ? ' (vencida)' : ''}
											</span>
										) : null}
									</p>
								</div>
								<Badge variant={badgeForRequestStatus(request.status)}>
									{requestStatusLabel(request.status)}
								</Badge>
							</div>

							{request.message && (
								<p className="text-muted-foreground mt-2 text-xs italic">
									“{request.message}”
								</p>
							)}

							<div className="mt-3">
								<p className="text-muted-foreground text-[11px] font-medium tracking-wide uppercase">
									Documentos recibidos
								</p>
								{request.documents.length === 0 ? (
									<p className="text-muted-foreground mt-1 text-xs">
										Ninguno todavía.
									</p>
								) : (
									<ul className="mt-1 space-y-1">
										{request.documents.map((file) => (
											<li
												key={file.id}
												className="text-foreground flex items-center gap-1.5 text-xs"
											>
												<Icon
													icon="ri:file-text-line"
													className="text-muted-foreground h-3.5 w-3.5 shrink-0"
												/>
												<span className="truncate">
													{file.file_title ?? file.file_name}
												</span>
											</li>
										))}
									</ul>
								)}
							</div>

							{canReview && (
								<DocumentRequestActions
									requestId={request.id}
									status={request.status}
									documentCount={request.documents.length}
								/>
							)}
						</li>
					);
				})}
			</ul>
		</div>
	);
}

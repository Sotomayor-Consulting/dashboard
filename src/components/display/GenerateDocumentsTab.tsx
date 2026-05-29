import '@shared/iconify-ri'; // Registra el set `ri` (Remix Icons) para esta isla.

import * as React from 'react';
import { toast } from 'sonner';
import { Icon } from '@iconify/react';

import { Button } from '@components/ui/Button';
import { Badge } from '@components/ui/Badge';
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from '@components/ui/Card';
import { Skeleton } from '@components/ui/Skeleton';
import { Spinner } from '@components/ui/Spinner';
import type { EntityType } from '@domains/templates/entity-registry';
import { getEntityLabel } from '@domains/templates/entity-registry';

interface TemplateLite {
	id: string;
	name: string;
	description: string | null;
	template_type: 'word' | 'pdf';
	category: string | null;
	has_file: boolean;
}

interface Props {
	entityType: EntityType;
	entityId: string;
	/** Required when entityType='member' for bridge fields (percentage, start_date, end_date) */
	companyId?: string;
}

const typeBadgeClass: Record<string, string> = {
	word: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
	pdf: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
};

export default function GenerateDocumentsTab({ entityType, entityId, companyId }: Props) {
	const [templates, setTemplates] = React.useState<TemplateLite[]>([]);
	const [loading, setLoading] = React.useState(true);
	const [generatingId, setGeneratingId] = React.useState<string | null>(null);

	React.useEffect(() => {
		const fetchTemplates = async () => {
			try {
				const res = await fetch(`/api/templates?relatedToType=${entityType}`);
				if (!res.ok) throw new Error('Error al cargar plantillas');
				const json = await res.json();
				setTemplates(json.data ?? []);
			} catch {
				toast.error('No se pudieron cargar las plantillas disponibles');
			} finally {
				setLoading(false);
			}
		};
		fetchTemplates();
	}, [entityType]);

	const handleGenerate = async (templateId: string) => {
		setGeneratingId(templateId);
		try {
			const body: Record<string, unknown> = {
				relatedToType: entityType,
				relatedToId: entityId,
			};
			if (companyId) body.contextIds = { companyId };

			const res = await fetch(`/api/templates/${templateId}/fill`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(body),
			});

			if (!res.ok) {
				const err = await res.json().catch(() => null);
				throw new Error(err?.error ?? 'Error al generar el documento');
			}

			const blob = await res.blob();
			const disposition = res.headers.get('Content-Disposition');
			const match = disposition?.match(/filename="([^"]+)"/);
			const fileName = match?.[1] ?? `documento-${templateId}.pdf`;

			const rawWarnings = res.headers.get('X-Template-Warnings');
			if (rawWarnings) {
				try {
					const warnings = JSON.parse(decodeURIComponent(rawWarnings)) as string[];
					for (const w of warnings.slice(0, 3)) toast.warning(w);
				} catch {
					// ignore malformed warnings header
				}
			}

			const url = URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = fileName;
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			URL.revokeObjectURL(url);

			toast.success('Documento generado y descargado');
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Error al generar el documento');
		} finally {
			setGeneratingId(null);
		}
	};

	if (loading) {
		return (
			<div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
				{[...Array(3)].map((_, i) => (
					<Card key={i} size="sm">
						<CardHeader>
							<Skeleton className="h-4 w-3/4" />
							<Skeleton className="h-3 w-1/2" />
						</CardHeader>
						<CardContent>
							<Skeleton className="h-3 w-full" />
						</CardContent>
						<CardFooter>
							<Skeleton className="h-8 w-24" />
						</CardFooter>
					</Card>
				))}
			</div>
		);
	}

	if (templates.length === 0) {
		return (
			<Card className="border-dashed">
				<CardContent className="text-muted-foreground flex flex-col items-center justify-center gap-3 py-12 text-center text-sm">
					<Icon icon="ri:file-list-3-line" className="h-8 w-8" />
					<div>
						<p>
							No hay plantillas disponibles para{' '}
							<strong>{getEntityLabel(entityType).toLowerCase()}</strong>.
						</p>
						<p className="mt-2">
							<a
								href="/admin/settings/templates"
								className="text-primary inline-flex items-center gap-1 hover:underline"
							>
								<Icon icon="ri:settings-3-line" className="h-3.5 w-3.5" />
								Ir a Ajustes → Plantillas
							</a>{' '}
							para crear una.
						</p>
					</div>
				</CardContent>
			</Card>
		);
	}

	return (
		<div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
			{templates.map((tpl) => {
				const isGenerating = generatingId === tpl.id;
				return (
					<Card key={tpl.id} size="sm" className="flex flex-col">
						<CardHeader>
							<div className="flex items-start justify-between gap-2">
								<CardTitle className="truncate">{tpl.name}</CardTitle>
								<Badge className={typeBadgeClass[tpl.template_type]}>
									{tpl.template_type.toUpperCase()}
								</Badge>
							</div>
							{tpl.category && (
								<CardDescription className="capitalize">{tpl.category}</CardDescription>
							)}
						</CardHeader>
						<CardContent className="flex-1">
							{tpl.description ? (
								<p className="text-muted-foreground text-xs leading-relaxed">
									{tpl.description}
								</p>
							) : (
								<p className="text-muted-foreground/60 text-xs italic">
									Sin descripción
								</p>
							)}
						</CardContent>
						<CardFooter>
							<Button
								size="sm"
								disabled={isGenerating}
								onClick={() => handleGenerate(tpl.id)}
							>
								{isGenerating ? (
									<>
										<Spinner className="h-4 w-4" />
										Generando…
									</>
								) : (
									<>
										<Icon icon="ri:download-line" className="h-4 w-4" />
										Generar
									</>
								)}
							</Button>
						</CardFooter>
					</Card>
				);
			})}
		</div>
	);
}

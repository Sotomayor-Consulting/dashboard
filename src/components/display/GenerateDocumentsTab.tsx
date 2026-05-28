import * as React from 'react';
import { toast } from 'sonner';
import { Button } from '@components/ui/Button';
import { Badge } from '@components/ui/Badge';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@components/ui/Card';
import { Skeleton } from '@components/ui/Skeleton';
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
			<div className="rounded-lg border border-dashed border-gray-200 p-8 text-center text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
				No hay plantillas disponibles para {getEntityLabel(entityType).toLowerCase()}.
				{/* space */}
				<p className="mt-2">
					<a href="/admin/settings/templates" className="text-primary hover:underline">
						Ir a Ajustes → Plantillas
					</a>{' '}
					para crear una.
				</p>
			</div>
		);
	}

	return (
		<div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
			{templates.map((tpl) => (
				<Card key={tpl.id} size="sm">
					<CardHeader>
						<div className="flex items-start justify-between gap-2">
							<CardTitle className="truncate">{tpl.name}</CardTitle>
							<Badge variant={tpl.template_type === 'pdf' ? 'default' : 'secondary'}>
								{tpl.template_type.toUpperCase()}
							</Badge>
						</div>
						{tpl.category && (
							<CardDescription>{tpl.category}</CardDescription>
						)}
					</CardHeader>
					{tpl.description && (
						<CardContent>
							<p className="text-muted-foreground text-xs leading-relaxed">
								{tpl.description}
							</p>
						</CardContent>
					)}
					<CardFooter>
						<Button
							size="sm"
							disabled={generatingId === tpl.id}
							onClick={() => handleGenerate(tpl.id)}
						>
							{generatingId === tpl.id ? 'Generando…' : 'Generar'}
						</Button>
					</CardFooter>
				</Card>
			))}
		</div>
	);
}

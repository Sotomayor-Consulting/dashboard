import '@shared/iconify-ri'; // Registra el set `ri` (Remix Icons) para esta isla.

import * as React from 'react';
import { toast } from 'sonner';
import { Icon } from '@iconify/react';

import { Button } from '@components/ui/Button';
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

function TemplateTypeIcon({ type }: { type: string }) {
	if (type === 'word') {
		return (
			<svg viewBox="0 0 486 500" className="h-7 w-7 shrink-0">
				<defs>
					<radialGradient id="mw_a" cx="-689.34" cy="753.93" r="13.89" gradientTransform="matrix(47.56 0 0 -20.15 33260.63 15691.18)" gradientUnits="userSpaceOnUse"><stop offset=".18" stopColor="#1657f4"/><stop offset=".57" stopColor="#0036c4"/></radialGradient>
					<radialGradient id="mw_c" cx="-730.97" cy="806.4" r="13.89" gradientTransform="matrix(-20.225 21.283 52.406 49.823 -56559.12 -24498.36)" gradientUnits="userSpaceOnUse"><stop offset=".14" stopColor="#d471ff"/><stop offset=".83" stopColor="#509df5" stopOpacity="0"/></radialGradient>
					<radialGradient id="mw_d" cx="-682.21" cy="801.86" r="13.89" gradientTransform="matrix(0 18.62 101.62 0 -81063.08 13022.32)" gradientUnits="userSpaceOnUse"><stop offset=".28" stopColor="#4f006f" stopOpacity="0"/><stop offset="1" stopColor="#4f006f"/></radialGradient>
					<radialGradient id="mw_f" cx="-749.58" cy="798.74" r="13.89" gradientTransform="matrix(-28.717 6.709 16.066 68.789 -33867.69 -49911.37)" gradientUnits="userSpaceOnUse"><stop offset=".06" stopColor="#e4a7fe"/><stop offset=".54" stopColor="#e4a7fe" stopOpacity="0"/></radialGradient>
					<radialGradient id="mw_g" cx="-675.64" cy="797.48" r="13.89" gradientTransform="matrix(15.992 15.998 15.995 -15.995 -1949 23805.98)" gradientUnits="userSpaceOnUse"><stop offset=".08" stopColor="#367af2"/><stop offset=".87" stopColor="#001a8f"/></radialGradient>
					<radialGradient id="mw_h" cx="-657.62" cy="854.65" r="13.89" gradientTransform="matrix(0 11.2 12.76 0 -10796.09 7734.8)" gradientUnits="userSpaceOnUse"><stop offset=".59" stopColor="#2763e5" stopOpacity="0"/><stop offset=".97" stopColor="#58aafe"/></radialGradient>
					<linearGradient id="mw_b" x1="69.43" x2="388.45" y1="238.11" y2="238.11" gradientTransform="matrix(1 0 0 -1 0 502)" gradientUnits="userSpaceOnUse"><stop offset="0" stopColor="#66c0ff"/><stop offset=".26" stopColor="#0094f0"/></linearGradient>
					<linearGradient id="mw_e" x1="69.48" x2="485.94" y1="380.04" y2="373.16" gradientTransform="matrix(1 0 0 -1 0 502)" gradientUnits="userSpaceOnUse"><stop offset="0" stopColor="#9deaff"/><stop offset=".2" stopColor="#3bd5ff"/></linearGradient>
				</defs>
				<path d="m69.43 376.25 194.4-237.36L486 293.13v158.26c0 26.85-21.76 48.61-48.6 48.61H152.74c-46.01 0-83.31-37.31-83.31-83.33v-40.42Z" fill="url(#mw_a)"/>
				<path d="M69.43 208.87c0-34.52 27.98-62.5 62.49-62.5h283.11L486 111.11v173.61c0 26.85-21.76 48.61-48.6 48.61H152.74c-46.01 0-83.31 37.31-83.31 83.33v-207.8Z" fill="url(#mw_b)"/>
				<path d="M69.43 208.87c0-34.52 27.98-62.5 62.49-62.5h283.11L486 111.11v173.61c0 26.85-21.76 48.61-48.6 48.61H152.74c-46.01 0-83.31 37.31-83.31 83.33v-207.8Z" fill="url(#mw_c)" fillOpacity=".6"/>
				<path d="M69.43 208.87c0-34.52 27.98-62.5 62.49-62.5h283.11L486 111.11v173.61c0 26.85-21.76 48.61-48.6 48.61H152.74c-46.01 0-83.31 37.31-83.31 83.33v-207.8Z" fill="url(#mw_d)" fillOpacity=".1"/>
				<path d="M69.43 83.33C69.43 37.31 106.73 0 152.74 0H437.4C464.24 0 486 21.76 486 48.61v69.44c0 26.85-21.76 48.61-48.6 48.61H152.74c-46.01 0-83.31 37.31-83.31 83.33V83.33Z" fill="url(#mw_e)"/>
				<path d="M69.43 83.33C69.43 37.31 106.73 0 152.74 0H437.4C464.24 0 486 21.76 486 48.61v69.44c0 26.85-21.76 48.61-48.6 48.61H152.74c-46.01 0-83.31 37.31-83.31 83.33V83.33Z" fill="url(#mw_f)" fillOpacity=".8"/>
				<rect width="222" height="264" y="236.11" rx="45.13" ry="45.13" fill="url(#mw_g)"/>
				<rect width="222" height="264" y="236.11" rx="45.13" ry="45.13" fill="url(#mw_h)" fillOpacity=".65"/>
				<path d="M187.26 283.73 159.92 410.7l-32.69.02-16.14-76.19-16.9 76.19h-33L34.91 283.75h26.95l16.21 83.79 16.11-83.79h33.04l16.87 83.79 15.82-83.79 27.34-.02Z" fill="#fff"/>
			</svg>
		);
	}
	return (
		<svg viewBox="0 0 75.32 92.604" className="h-7 w-7 shrink-0">
			<path fill="#ff2116" d="M-29.633 123.947c-3.552 0-6.443 2.894-6.443 6.446v49.498c0 3.551 2.891 6.445 6.443 6.445h37.85c3.552 0 6.443-2.893 6.443-6.445v-40.702s.102-1.191-.416-2.351a6.516 6.516 0 0 0-1.275-1.844 1.058 1.058 0 0 0-.006-.008l-9.39-9.21a1.058 1.058 0 0 0-.016-.016s-.802-.764-1.99-1.274c-1.4-.6-2.842-.537-2.842-.537l.021-.002z" transform="translate(53.548 -183.975) scale(1.4843)"/>
			<path fill="#f5f5f5" d="M-29.633 126.064h28.38a1.058 1.058 0 0 0 .02 0s1.135.011 1.965.368a5.385 5.385 0 0 1 1.373.869l9.368 9.19s.564.595.838 1.208c.22.495.234 1.4.234 1.4a1.058 1.058 0 0 0-.002.046v40.746a4.294 4.294 0 0 1-4.326 4.328h-37.85a4.294 4.294 0 0 1-4.326-4.328v-49.498a4.294 4.294 0 0 1 4.326-4.328z" transform="translate(53.548 -183.975) scale(1.4843)"/>
			<path fill="#ff2116" d="M18.804 55.135c-2.162-2.162.177-5.133 6.526-8.288l3.994-1.985 1.557-3.405a134.054 134.054 0 0 0 2.838-6.79l1.283-3.386-.884-2.506c-1.087-3.08-1.474-7.71-.785-9.374.934-2.255 3.994-2.024 5.205.393.946 1.888.849 5.307-.272 9.618l-.92 3.534.81 1.375c.445.756 1.746 2.55 2.89 3.989l2.152 2.676 2.677-.35c8.503-1.11 11.416.777 11.416 3.48 0 3.413-6.677 3.695-12.284-.243-1.262-.886-2.128-1.767-2.128-1.767s-3.513.716-5.243 1.182c-1.785.48-2.675.782-5.29 1.665 0 0-.918 1.332-1.516 2.301-2.224 3.604-4.821 6.59-6.676 7.677-2.077 1.217-4.254 1.3-5.35.204zm3.393-1.212c1.216-.751 3.676-3.66 5.378-6.361l.69-1.093-3.14 1.578c-4.848 2.438-7.066 4.735-5.913 6.125.648.78 1.423.716 2.985-.25zm31.494-8.84c1.189-.833 1.016-2.51-.328-3.187-1.045-.527-1.888-.635-4.606-.595-1.67.114-4.354.45-4.81.553 0 0 1.476 1.02 2.13 1.394.872.498 2.99 1.422 4.537 1.895 1.526.467 2.409.418 3.077-.06zm-12.663-5.264c-.72-.756-1.943-2.334-2.719-3.507-1.014-1.33-1.523-2.27-1.523-2.27s-.741 2.386-1.35 3.82l-1.898 4.692-.55 1.065s2.925-.96 4.414-1.348c1.576-.412 4.776-1.041 4.776-1.041zm-4.081-16.365c.184-1.54.261-3.078-.233-3.853-1.373-1.5-3.03-.25-2.749 3.318.095 1.2.393 3.25.791 4.515l.725 2.299.51-1.732c.28-.952.71-2.998.956-4.547z"/>
			<path fill="#2c2c2c" d="M-20.93 167.839h2.365q1.133 0 1.84.217.706.21 1.19.944.482.728.482 1.756 0 .945-.392 1.624-.392.678-1.056.98-.658.3-2.03.3h-.818v3.73h-1.581zm1.58 1.224v3.33h.785q1.05 0 1.448-.391.406-.392.406-1.274 0-.657-.266-1.063-.266-.413-.588-.504-.315-.098-1-.098zm5.508-1.224h2.148q1.56 0 2.49.552.938.553 1.414 1.645.483 1.091.483 2.42 0 1.4-.434 2.499-.427 1.091-1.316 1.763-.881.672-2.518.672h-2.267zm1.58 1.266v7.018h.659q1.378 0 2-.952.623-.958.623-2.553 0-3.513-2.623-3.513zm6.473-1.266h5.304v1.266h-3.723v2.855h2.981v1.266h-2.98v4.164H-5.79z" transform="translate(53.548 -183.975) scale(1.4843)"/>
		</svg>
	);
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
								<TemplateTypeIcon type={tpl.template_type} />
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

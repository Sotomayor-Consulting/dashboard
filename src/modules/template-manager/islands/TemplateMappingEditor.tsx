import * as React from 'react';
import { toast } from 'sonner';
import { Icon } from '@iconify/react';

import { Button } from '@components/ui/Button';
import { Input } from '@components/ui/Input';
import { Badge } from '@components/ui/Badge';
import { Spinner } from '@components/ui/Spinner';
import { ScrollArea } from '@components/ui/ScrollArea';
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@components/ui/Field';
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@components/ui/Select';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@components/ui/Dialog';

import type {
	TemplateWithDocument,
	FieldMapping,
	TemplateFieldDefinition,
} from '@domains/templates/types';
import {
	getEntityFields,
	getEntityLabel,
	type EntityType,
} from '@domains/templates/entity-registry';

interface Props {
	template: TemplateWithDocument;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onSaved: (updated: TemplateWithDocument) => void;
}

type SourceOption = EntityType | 'static' | '';
type TransformOption = '' | 'uppercase' | 'lowercase' | 'date';

interface MappingRow {
	source: SourceOption;
	path: string;
	static_value: string;
	transform: TransformOption;
}

const EMPTY_ROW: MappingRow = { source: '', path: '', static_value: '', transform: '' };

function toRow(entry: FieldMapping[string] | undefined): MappingRow {
	if (!entry) return { ...EMPTY_ROW };
	return {
		source: entry.source as SourceOption,
		path: entry.path ?? '',
		static_value: entry.static_value ?? '',
		transform: (entry.transform === 'concat' ? '' : entry.transform ?? '') as TransformOption,
	};
}

function toMappingEntry(row: MappingRow): FieldMapping[string] | null {
	if (!row.source) return null;
	if (row.source === 'static') {
		return { source: 'static', path: '', static_value: row.static_value };
	}
	if (!row.path) return null;
	const entry: FieldMapping[string] = { source: row.source as EntityType, path: row.path };
	if (row.transform) entry.transform = row.transform;
	return entry;
}

export default function TemplateMappingEditor({ template, open, onOpenChange, onSaved }: Props) {
	const [detecting, setDetecting] = React.useState(false);
	const [pdfFields, setPdfFields] = React.useState<TemplateFieldDefinition[] | null>(null);
	const [detectError, setDetectError] = React.useState<string | null>(null);
	const [rows, setRows] = React.useState<Record<string, MappingRow>>({});
	const [selectedField, setSelectedField] = React.useState<string | null>(null);
	const [saving, setSaving] = React.useState(false);

	const entityType = (template.related_to_type ?? null) as EntityType | null;
	const entityFields = React.useMemo(
		() => (entityType ? getEntityFields(entityType) : []),
		[entityType],
	);

	React.useEffect(() => {
		if (!open) return;
		setDetectError(null);
		setPdfFields(null);
		setRows(
			Object.fromEntries(
				Object.entries(template.field_mapping ?? {}).map(([k, v]) => [k, toRow(v)]),
			),
		);
		setSelectedField(null);

		const fetchFields = async () => {
			setDetecting(true);
			try {
				const res = await fetch(`/api/templates/${template.id}/detect-fields`);
				const json = await res.json();
				if (!res.ok) throw new Error(json.error ?? 'Error detectando campos');
				const fields = json.data as TemplateFieldDefinition[];
				setPdfFields(fields);
				setRows((prev) => {
					const next = { ...prev };
					for (const f of fields) {
						if (!next[f.name]) next[f.name] = { ...EMPTY_ROW };
					}
					return next;
				});
			} catch (err) {
				setDetectError(err instanceof Error ? err.message : 'Error');
			} finally {
				setDetecting(false);
			}
		};
		fetchFields();
	}, [open, template.id, template.field_mapping]);

	const updateRow = (fieldName: string, patch: Partial<MappingRow>) => {
		setRows((prev) => ({
			...prev,
			[fieldName]: { ...(prev[fieldName] ?? EMPTY_ROW), ...patch },
		}));
	};

	const mappedCount = Object.values(rows).filter((row) => toMappingEntry(row) != null).length;

	const handleSave = async () => {
		const fieldMapping: FieldMapping = {};
		for (const [name, row] of Object.entries(rows)) {
			const entry = toMappingEntry(row);
			if (entry) fieldMapping[name] = entry;
		}

		setSaving(true);
		const toastId = toast.loading('Guardando mapeo...');
		try {
			const res = await fetch(`/api/templates/${template.id}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ field_mapping: fieldMapping }),
			});
			const json = await res.json();
			if (!res.ok) throw new Error(json.error ?? 'Error al guardar');
			toast.success('Mapeo guardado', { id: toastId });

			const refetch = await fetch(`/api/templates/${template.id}`);
			const rj = await refetch.json();
			if (rj.data) onSaved(rj.data);
			onOpenChange(false);
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Error', { id: toastId });
		} finally {
			setSaving(false);
		}
	};

	const selectedRow = selectedField ? rows[selectedField] ?? EMPTY_ROW : null;
	const selectedDescriptor = selectedRow?.path
		? entityFields.find((f) => f.name === selectedRow.path)
		: undefined;

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-h-[90vh] overflow-hidden sm:max-w-4xl">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<Icon icon="ri:links-line" className="text-primary h-5 w-5" />
						Mapear campos — {template.name}
					</DialogTitle>
					<DialogDescription>
						{entityType ? (
							<>
								Entidad asociada: <strong>{getEntityLabel(entityType)}</strong>. Selecciona cada
								campo del PDF y conéctalo a un dato.
							</>
						) : (
							<span className="text-destructive">
								Esta plantilla no tiene entidad asociada. Edita la plantilla y selecciona una.
							</span>
						)}
					</DialogDescription>
				</DialogHeader>

				{detecting && (
					<div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
						<Spinner className="h-4 w-4" />
						Detectando campos del PDF...
					</div>
				)}

				{!detecting && detectError && (
					<div className="border-destructive/30 bg-destructive/5 text-destructive flex items-start gap-2 rounded-lg border p-4 text-sm">
						<Icon icon="ri:error-warning-line" className="mt-0.5 h-4 w-4 shrink-0" />
						<span>{detectError}</span>
					</div>
				)}

				{!detecting && !detectError && pdfFields && pdfFields.length === 0 && (
					<div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
						<Icon icon="ri:file-warning-line" className="mx-auto mb-2 h-6 w-6" />
						Este PDF no tiene campos AcroForm. Conviértelo en Adobe Acrobat o usa una plantilla
						Word + Carbone (fase 2).
					</div>
				)}

				{!detecting && !detectError && pdfFields && pdfFields.length > 0 && (
					<div className="grid grid-cols-1 gap-4 py-2 md:grid-cols-2">
						<div className="space-y-2">
							<div className="flex items-center justify-between">
								<h3 className="text-sm font-semibold">Campos del PDF ({pdfFields.length})</h3>
								<Badge variant="secondary">{mappedCount} mapeados</Badge>
							</div>
							<ScrollArea className="h-96 rounded-lg border">
								<ul className="divide-y">
									{pdfFields.map((field) => {
										const row = rows[field.name] ?? EMPTY_ROW;
										const isMapped = toMappingEntry(row) != null;
										const isSelected = selectedField === field.name;
										return (
											<li key={field.name}>
												<button
													type="button"
													onClick={() => setSelectedField(field.name)}
													className={`flex w-full items-center justify-between px-3 py-2 text-left text-xs transition-colors hover:bg-accent/50 ${
														isSelected ? 'bg-accent' : ''
													}`}
												>
													<div className="flex min-w-0 flex-col">
														<span className="font-mono truncate">{field.name}</span>
														<span className="text-muted-foreground text-[10px]">
															{field.widget} · {field.type}
														</span>
													</div>
													{isMapped && (
														<Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
															<Icon icon="ri:check-line" className="h-3 w-3" />
														</Badge>
													)}
												</button>
											</li>
										);
									})}
								</ul>
							</ScrollArea>
						</div>

						<div className="space-y-2">
							<h3 className="text-sm font-semibold">Configuración del mapeo</h3>
							{!selectedField && (
								<div className="text-muted-foreground rounded-lg border border-dashed p-6 text-center text-xs">
									<Icon icon="ri:arrow-left-line" className="mx-auto mb-2 h-5 w-5" />
									Selecciona un campo del PDF a la izquierda.
								</div>
							)}
							{selectedField && selectedRow && (
								<div className="rounded-lg border p-4">
									<div className="mb-3 font-mono text-xs text-muted-foreground">{selectedField}</div>
									<FieldGroup className="gap-3">
										<Field>
											<FieldLabel htmlFor="map-source">Origen</FieldLabel>
											<Select
												value={selectedRow.source || undefined}
												onValueChange={(v) =>
													updateRow(selectedField, {
														source: (v ?? '') as SourceOption,
														path: '',
														static_value: '',
													})
												}
											>
												<SelectTrigger id="map-source" className="w-full">
													<SelectValue placeholder="— (sin mapear)" />
												</SelectTrigger>
												<SelectContent>
													<SelectGroup>
														<SelectItem value="static">Valor fijo (static)</SelectItem>
														{entityType && (
															<SelectItem value={entityType}>
																{getEntityLabel(entityType)}
															</SelectItem>
														)}
													</SelectGroup>
												</SelectContent>
											</Select>
										</Field>

										{selectedRow.source === 'static' && (
											<Field>
												<FieldLabel htmlFor="map-static">Valor</FieldLabel>
												<Input
													id="map-static"
													value={selectedRow.static_value}
													onChange={(e) =>
														updateRow(selectedField, { static_value: e.target.value })
													}
													placeholder="Texto fijo"
												/>
											</Field>
										)}

										{selectedRow.source && selectedRow.source !== 'static' && (
											<>
												<Field>
													<FieldLabel htmlFor="map-path">Campo de la entidad</FieldLabel>
													<Select
														value={selectedRow.path || undefined}
														onValueChange={(v) =>
															updateRow(selectedField, { path: v ?? '' })
														}
													>
														<SelectTrigger id="map-path" className="w-full">
															<SelectValue placeholder="— selecciona —" />
														</SelectTrigger>
														<SelectContent>
															<SelectGroup>
																{entityFields.map((f) => (
																	<SelectItem key={f.name} value={f.name}>
																		<span className="flex items-center gap-2">
																			{f.label}
																			{f.bridgeTable && (
																				<Badge variant="outline" className="h-4 px-1 text-[9px]">
																					bridge
																				</Badge>
																			)}
																		</span>
																	</SelectItem>
																))}
															</SelectGroup>
														</SelectContent>
													</Select>
													{selectedDescriptor?.description && (
														<FieldDescription>{selectedDescriptor.description}</FieldDescription>
													)}
												</Field>

												<Field>
													<FieldLabel htmlFor="map-transform">Transformación</FieldLabel>
													<Select
														value={selectedRow.transform || undefined}
														onValueChange={(v) =>
															updateRow(selectedField, {
																transform: (v ?? '') as TransformOption,
															})
														}
													>
														<SelectTrigger id="map-transform" className="w-full">
															<SelectValue placeholder="Ninguna" />
														</SelectTrigger>
														<SelectContent>
															<SelectGroup>
																<SelectItem value="uppercase">UPPERCASE</SelectItem>
																<SelectItem value="lowercase">lowercase</SelectItem>
																<SelectItem value="date">Date (MM/DD/YYYY)</SelectItem>
															</SelectGroup>
														</SelectContent>
													</Select>
												</Field>
											</>
										)}

										<Button
											size="sm"
											variant="ghost"
											onClick={() => updateRow(selectedField, { ...EMPTY_ROW })}
										>
											<Icon icon="ri:eraser-line" className="h-4 w-4" />
											Limpiar mapeo
										</Button>
									</FieldGroup>
								</div>
							)}
						</div>
					</div>
				)}

				<DialogFooter showCloseButton>
					<Button onClick={handleSave} disabled={saving || detecting}>
						{saving ? (
							<>
								<Spinner className="h-4 w-4" />
								Guardando…
							</>
						) : (
							<>
								<Icon icon="ri:save-line" className="h-4 w-4" />
								Guardar mapeo
							</>
						)}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

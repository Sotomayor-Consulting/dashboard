import * as React from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Icon } from '@iconify/react';

import { Button } from '@components/ui/Button';
import {
	Field,
	FieldContent,
	FieldDescription,
	FieldGroup,
	FieldLabel,
	FieldTitle,
} from '@components/ui/Field';
import { Input } from '@components/ui/Input';
import { Switch } from '@components/ui/Switch';
import { Textarea } from '@components/ui/Textarea';
import { cn } from '@components/utils';

import type {
	ActividadItem,
	CompanyItem,
	CompanyManagementTypeHealth,
	State,
} from '../../../types';
import {
	companyInfoSchema,
	type CompanyInfoFormOutput,
	type CompanyInfoFormValues,
} from '../schemas/company-info.schema';
import { ActivityComboboxField } from '../components/ActivityComboboxField';
import { ComboboxField } from '../components/ComboboxField';

interface Props {
	company: CompanyItem | null;
	managementTypeHealth: CompanyManagementTypeHealth | null;
	states: State[];
	actividades: ActividadItem[];
	canEditDetails: boolean;
}

const MANAGEMENT_OPTIONS = [
	{ value: 'member-managed', label: 'Member-Managed' },
	{ value: 'manager-managed', label: 'Manager-Managed' },
];

const ENTITY_TYPE_OPTIONS = [{ value: 'llc', label: 'LLC' }];

const TAX_OPTIONS = [
	{ value: 'disregarded_entity', label: 'Entidad de paso' },
	{ value: 'corporation', label: 'LLC como Corporación' },
];

type CompanyInfoDefaultsSource = Pick<
	CompanyItem,
	| 'legal_name'
	| 'filing_number'
	| 'identification_number'
	| 'entity_type'
	| 'formation_state_id'
	| 'management_type'
	| 'tax_clasification'
	| 'activity_code_id'
	| 'us_source_income'
	| 'activity_description'
>;

function buildDefaults(
	company: CompanyInfoDefaultsSource | null,
): CompanyInfoFormValues {
	return {
		legal_name: company?.legal_name ?? null,
		filing_number: company?.filing_number ?? null,
		identification_number: company?.identification_number ?? null,
		// Solo soportamos LLC en este formulario (el enum DB tiene lp y c-corp
		// pero el schema lo restringe a llc deliberadamente).
		entity_type: 'llc' as const,
		formation_state_id: company?.formation_state_id ?? null,
		management_type: (company?.management_type ?? 'manager-managed') as
			| 'member-managed'
			| 'manager-managed',
		tax_clasification:
			(company?.tax_clasification as 'disregarded_entity' | 'corporation') ??
			null,
		activity_code_id: company?.activity_code_id ?? null,
		us_source_income: company?.us_source_income ?? null,
		activity_description: company?.activity_description ?? null,
	};
}

type CompanyInfoApiResponse = CompanyInfoFormOutput & { id: string };

// ────────────────────────────────────────────────────────────────
// Sub-section header
// ────────────────────────────────────────────────────────────────
function SectionHeader({
	icon,
	title,
	description,
}: {
	icon: string;
	title: string;
	description: string;
}) {
	return (
		<header className="flex flex-col gap-1 border-b border-gray-200 pb-3 dark:border-gray-700">
			<div className="flex items-center gap-2">
				<Icon icon={icon} className="text-muted-foreground size-4 shrink-0" />
				<h4 className="text-sm font-semibold tracking-tight">{title}</h4>
			</div>
			<p className="text-muted-foreground text-[12px]">{description}</p>
		</header>
	);
}

// ────────────────────────────────────────────────────────────────

export default function CompanyInfoSection({
	company,
	managementTypeHealth,
	states,
	actividades,
	canEditDetails,
}: Props) {
	const defaults = React.useMemo(() => buildDefaults(company), [company]);
	const [savedDefaults, setSavedDefaults] = React.useState(defaults);
	const [isSaving, setIsSaving] = React.useState(false);

	const form = useForm<CompanyInfoFormValues, unknown, CompanyInfoFormOutput>({
		resolver: zodResolver(companyInfoSchema),
		defaultValues: savedDefaults,
		mode: 'onChange',
	});

	React.useEffect(() => {
		setSavedDefaults(defaults);
		form.reset(defaults);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [defaults]);

	const isDirty = form.formState.isDirty;

	const onSubmit = async (values: CompanyInfoFormOutput) => {
		if (!company?.id || !canEditDetails) return;
		setIsSaving(true);
		const toastId = toast.loading('Guardando información...');
		try {
			const response = await fetch(`/api/companies/${company.id}/info`, {
				method: 'PATCH',
				credentials: 'include',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(values),
			});
			const payload = (await response.json().catch(() => null)) as {
				ok?: boolean;
				error?: string;
				data?: CompanyInfoApiResponse;
			} | null;
			if (!response.ok || !payload?.ok) {
				throw new Error(payload?.error ?? 'No se pudo guardar');
			}
			const nextDefaults = buildDefaults(payload.data ?? company);
			setSavedDefaults(nextDefaults);
			form.reset(nextDefaults);
			toast.success('Información actualizada', { id: toastId });
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Error inesperado', {
				id: toastId,
			});
		} finally {
			setIsSaving(false);
		}
	};

	const discardChanges = () => form.reset(savedDefaults);

	if (!company) {
		return (
			<section>
				<p className="text-muted-foreground text-sm">
					No hay información de empresa disponible.
				</p>
			</section>
		);
	}

	// Opciones de jurisdicción para el ComboboxField
	const stateOptions = states.map((s) => ({
		value: String(s.id),
		label: String(s.name),
		searchText: String(s.code),
	}));

	return (
		<form
			onSubmit={form.handleSubmit(onSubmit)}
			className="flex flex-col gap-6"
		>
			{managementTypeHealth && !managementTypeHealth.ok && (
				<div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200">
					<p className="font-medium">
						Inconsistencia en la administración actual
					</p>
					<p className="mt-1">{managementTypeHealth.reason}</p>
				</div>
			)}

			<header className="flex flex-col gap-1">
				<h3 className="text-lg font-semibold">Información</h3>
				<p className="text-muted-foreground text-sm">
					Datos oficiales de la empresa relacionada con esta incorporación.
				</p>
			</header>

			{/* ─────────────── Sección 1: Identidad legal ─────────────── */}
			<section className="flex flex-col gap-4">
				<SectionHeader
					icon="ri:bank-line"
					title="Identidad legal"
					description="Cómo se identifica la entidad ante el estado y la IRS."
				/>
				<FieldGroup className="grid gap-4 md:grid-cols-2">
					<Field data-disabled={!canEditDetails}>
						<FieldLabel htmlFor="company_legal_name">Nombre legal</FieldLabel>
						<Input
							id="company_legal_name"
							{...form.register('legal_name')}
							disabled={!canEditDetails}
						/>
						<FieldDescription>
							Ingrese el nombre oficial de la empresa
						</FieldDescription>
					</Field>
					<Field data-disabled={!canEditDetails}>
						<FieldLabel htmlFor="filing_number">
							Número de expediente
						</FieldLabel>
						<Input
							id="filing_number"
							{...form.register('filing_number')}
							disabled={!canEditDetails}
						/>
						<FieldDescription>
							Identificador estatal del expediente
						</FieldDescription>
					</Field>
					<Field data-disabled={!canEditDetails} className="md:col-span-2">
						<FieldLabel htmlFor="company_identification_number">
							Número de identificación (EIN)
						</FieldLabel>
						<Input
							id="company_identification_number"
							{...form.register('identification_number')}
							disabled={!canEditDetails}
						/>
						<FieldDescription>EIN asignado por la IRS</FieldDescription>
					</Field>
				</FieldGroup>
			</section>

			{/* ─────────────── Sección 2: Jurisdicción y estructura ─────────────── */}
			<section className="flex flex-col gap-4">
				<SectionHeader
					icon="ri:government-line"
					title="Jurisdicción y estructura"
					description="Dónde se incorpora la empresa y cómo se administra y tributa."
				/>
				<FieldGroup className="grid gap-4 md:grid-cols-2">
					<Field>
						<FieldLabel htmlFor="company_formation_state">
							Jurisdicción (US)
						</FieldLabel>
						<Controller
							control={form.control}
							name="formation_state_id"
							render={({ field }) => (
								<ComboboxField
									id="company_formation_state"
									options={stateOptions}
									value={field.value === null ? null : String(field.value)}
									onChange={(value) =>
										field.onChange(value === null ? null : Number(value))
									}
									placeholder="Seleccione la jurisdicción"
									allowClear
									disabled={!canEditDetails}
								/>
							)}
						/>
						<FieldDescription>
							Estado donde se incorpora la empresa.
						</FieldDescription>
					</Field>

					<Field>
						<FieldLabel htmlFor="company_entity_type">
							Tipo de entidad
						</FieldLabel>
						<Controller
							control={form.control}
							name="entity_type"
							render={({ field }) => (
								<ComboboxField
									id="company_entity_type"
									options={ENTITY_TYPE_OPTIONS}
									value={field.value}
									onChange={(value) => field.onChange(value ?? 'llc')}
									placeholder="Seleccione tipo"
									disabled={!canEditDetails}
								/>
							)}
						/>
					</Field>

					<Field>
						<FieldLabel htmlFor="company_management_type">
							Forma de administrar
						</FieldLabel>
						<Controller
							control={form.control}
							name="management_type"
							render={({ field }) => (
								<ComboboxField
									id="company_management_type"
									options={MANAGEMENT_OPTIONS}
									value={field.value}
									onChange={(value) =>
										field.onChange(
											(value as 'member-managed' | 'manager-managed') ??
												'manager-managed',
										)
									}
									placeholder="Seleccione"
									disabled={!canEditDetails}
								/>
							)}
						/>
						<FieldDescription>
							Define quién toma las decisiones operativas.
						</FieldDescription>
					</Field>

					<Field>
						<FieldLabel htmlFor="company_tax_clasification">
							Forma de tributación
						</FieldLabel>
						<Controller
							control={form.control}
							name="tax_clasification"
							render={({ field }) => (
								<ComboboxField
									id="company_tax_clasification"
									options={TAX_OPTIONS}
									value={(field.value as string | null) ?? null}
									onChange={(value) =>
										field.onChange(
											value === null
												? null
												: (value as 'disregarded_entity' | 'corporation'),
										)
									}
									placeholder="Clasificación tributaria"
									allowClear
									disabled={!canEditDetails}
								/>
							)}
						/>
						<FieldDescription>
							Cómo declara impuestos la entidad ante la IRS.
						</FieldDescription>
					</Field>
				</FieldGroup>
			</section>

			{/* ─────────────── Sección 3: Actividad económica ─────────────── */}
			<section className="flex flex-col gap-4">
				<SectionHeader
					icon="ri:briefcase-line"
					title="Actividad económica"
					description="A qué se dedica la empresa y si genera ingresos en EE.UU."
				/>
				<FieldGroup className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto]">
					<Field>
						<FieldLabel htmlFor="company_activity_code">
							Actividad (código IRS)
						</FieldLabel>
						<Controller
							control={form.control}
							name="activity_code_id"
							render={({ field }) => (
								<ActivityComboboxField
									activities={actividades}
									value={(field.value as number | null) ?? null}
									onChange={(activityId) => field.onChange(activityId)}
									placeholder="Seleccione la actividad"
									allowClear
									disabled={!canEditDetails}
								/>
							)}
						/>
						<FieldDescription>
							Busca por código IRS, nombre o categoría.
						</FieldDescription>
					</Field>
					<FieldLabel htmlFor="income_us" className="self-start">
						<Field orientation="horizontal" className="min-w-[260px]">
							<FieldContent>
								<FieldTitle>Ingresos en EE.UU.</FieldTitle>
								<FieldDescription>
									¿Genera ingresos de fuente americana?
								</FieldDescription>
							</FieldContent>
							<Controller
								control={form.control}
								name="us_source_income"
								render={({ field }) => (
									<Switch
										id="income_us"
										checked={Boolean(field.value)}
										onCheckedChange={(value) => field.onChange(value === true)}
										disabled={!canEditDetails}
									/>
								)}
							/>
						</Field>
					</FieldLabel>
				</FieldGroup>

				<Field>
					<FieldLabel htmlFor="company_activity_description">
						Descripción de la actividad
					</FieldLabel>
					<Textarea
						id="company_activity_description"
						placeholder="Ej: Venta de artículos por internet"
						{...form.register('activity_description')}
						disabled={!canEditDetails}
						rows={3}
					/>
					<FieldDescription>
						Detalle del giro real del negocio (texto libre).
					</FieldDescription>
				</Field>
			</section>

			{/* ─────────────── Banner sticky de cambios sin guardar ─────────────── */}
			<div
				className={cn(
					'sticky bottom-0 -mx-5 mt-2 transition-all duration-200',
					isDirty
						? 'translate-y-0 opacity-100'
						: 'pointer-events-none translate-y-2 opacity-0',
				)}
			>
				<div className="border-t border-amber-200 bg-amber-50 px-5 py-3 dark:border-amber-900/60 dark:bg-amber-950/40">
					<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
						<div className="flex items-center gap-2 text-amber-900 dark:text-amber-200">
							<Icon icon="ri:alert-line" className="size-4 shrink-0" />
							<p className="text-[13px] font-medium">
								Tienes cambios sin guardar en la información de la empresa.
							</p>
						</div>
						<div className="flex items-center gap-2">
							<Button
								type="button"
								variant="outline"
								size="sm"
								onClick={discardChanges}
								disabled={isSaving}
							>
								Descartar
							</Button>
							<Button
								type="submit"
								size="sm"
								disabled={isSaving || !canEditDetails}
							>
								{isSaving ? 'Guardando...' : 'Guardar cambios'}
							</Button>
						</div>
					</div>
				</div>
			</div>
		</form>
	);
}

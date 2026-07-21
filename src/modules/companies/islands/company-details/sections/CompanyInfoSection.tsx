import * as React from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Icon } from '@iconify/react';

import { US_COUNTRY_ID } from '@domains/locations/constants';
import { useLocations } from '../../../hooks/use-locations';

import { Button } from '@components/ui/Button';
import { Field, FieldLabel } from '@components/ui/Field';
import { Input } from '@components/ui/Input';
import { Textarea } from '@components/ui/Textarea';
import { cn } from '@components/utils';

import type {
	ActividadItem,
	CompanyItem,
	CompanyManagementTypeHealth,
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

const US_INCOME_OPTIONS = [
	{ value: 'yes', label: 'Sí' },
	{ value: 'no', label: 'No' },
];

type CompanyInfoDefaultsSource = Pick<
	CompanyItem,
	| 'legal_name'
	| 'filing_number'
	| 'identification_number'
	| 'entity_type'
	| 'formation_state_id'
	| 'management_type'
	| 'tax_classification'
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
		entity_type: 'llc' as const,
		formation_state_id: company?.formation_state_id ?? null,
		management_type: (company?.management_type ?? 'manager-managed') as
			'member-managed' | 'manager-managed',
		tax_classification:
			(company?.tax_classification as 'disregarded_entity' | 'corporation') ??
			null,
		activity_code_id: company?.activity_code_id ?? null,
		us_source_income: company?.us_source_income ?? null,
		activity_description: company?.activity_description ?? null,
	};
}

type CompanyInfoApiResponse = CompanyInfoFormOutput & { id: string };

export default function CompanyInfoSection({
	company,
	managementTypeHealth,
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
			<section className="-mx-6 -mt-5 flex flex-col">
				<header className="border-border border-b px-7 pt-6 pb-5">
					<p className="text-[11.5px] font-semibold tracking-wider text-gray-500 uppercase dark:text-gray-400">
						Empresa
					</p>
				</header>
				<p className="text-muted-foreground px-7 py-5 text-sm">
					No hay información de empresa disponible.
				</p>
			</section>
		);
	}

	const { states: usStates, isLoadingStates } = useLocations(US_COUNTRY_ID);

	const stateOptions = usStates.map((s) => ({
		value: String(s.id),
		label: s.name ?? `Estado ${s.id}`,
		searchText: s.code ?? '',
	}));

	return (
		<section className="-mx-6 -mt-5 flex flex-col">
			<header className="border-border border-b px-7 pt-6 pb-5">
				<h1 className="text-foreground text-xl font-semibold">
					{company.legal_name ?? 'Sin nombre'}
				</h1>
				<p className="text-muted-foreground mt-1 text-sm">
					Información general de la empresa.
				</p>
			</header>

			<form
				onSubmit={form.handleSubmit(onSubmit)}
				className="px-7 py-5"
			>
				{managementTypeHealth && !managementTypeHealth.ok && (
					<div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200">
						<p className="font-medium">
							Inconsistencia en la administración actual
						</p>
						<p className="mt-1">{managementTypeHealth.reason}</p>
					</div>
				)}

				<div className="divide-border -mx-7 divide-y">
					{/* Identidad legal */}
					<div className="grid grid-cols-1 gap-x-8 gap-y-4 px-7 py-8 first:pt-0 sm:grid-cols-[220px_1fr]">
						<div>
							<div className="flex items-center gap-2">
								<Icon icon="ri:bank-line" className="text-muted-foreground size-4 shrink-0" />
								<h3 className="text-foreground text-sm font-medium">
									Identidad legal
								</h3>
							</div>
							<p className="text-muted-foreground mt-1 text-sm">
								Cómo se identifica la entidad ante el estado y la IRS.
							</p>
						</div>
						<div className="grid grid-cols-2 gap-4">
							<Field data-disabled={!canEditDetails}>
								<FieldLabel htmlFor="company_legal_name">
									Nombre legal
								</FieldLabel>
								<Input
									id="company_legal_name"
									{...form.register('legal_name')}
									disabled={!canEditDetails}
								/>
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
							</Field>
							<Field data-disabled={!canEditDetails} className="col-span-2">
								<FieldLabel htmlFor="company_identification_number">
									Número de identificación (EIN)
								</FieldLabel>
								<Input
									id="company_identification_number"
									{...form.register('identification_number')}
									disabled={!canEditDetails}
								/>
							</Field>
						</div>
					</div>

					{/* Jurisdicción y estructura */}
					<div className="grid grid-cols-1 gap-x-8 gap-y-4 px-7 py-8 sm:grid-cols-[220px_1fr]">
						<div>
							<div className="flex items-center gap-2">
								<Icon icon="ri:government-line" className="text-muted-foreground size-4 shrink-0" />
								<h3 className="text-foreground text-sm font-medium">
									Jurisdicción y estructura
								</h3>
							</div>
							<p className="text-muted-foreground mt-1 text-sm">
								Dónde se incorpora y cómo se administra y tributa.
							</p>
						</div>
						<div className="grid grid-cols-2 gap-4">
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
											value={
												field.value === null ? null : String(field.value)
											}
											onChange={(value) =>
												field.onChange(
													value === null ? null : Number(value),
												)
											}
											placeholder={
												isLoadingStates
													? 'Cargando estados…'
													: 'Seleccione la jurisdicción'
											}
											allowClear
											disabled={!canEditDetails || isLoadingStates}
										/>
									)}
								/>
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
													(value as
														| 'member-managed'
														| 'manager-managed') ??
														'manager-managed',
												)
											}
											placeholder="Seleccione"
											disabled={!canEditDetails}
										/>
									)}
								/>
							</Field>

							<Field>
								<FieldLabel htmlFor="company_tax_classification">
									Forma de tributación
								</FieldLabel>
								<Controller
									control={form.control}
									name="tax_classification"
									render={({ field }) => (
										<ComboboxField
											id="company_tax_classification"
											options={TAX_OPTIONS}
											value={(field.value as string | null) ?? null}
											onChange={(value) =>
												field.onChange(
													value === null
														? null
														: (value as
																| 'disregarded_entity'
																| 'corporation'),
												)
											}
											placeholder="Clasificación tributaria"
											allowClear
											disabled={!canEditDetails}
										/>
									)}
								/>
							</Field>
						</div>
					</div>

					{/* Actividad económica */}
					<div className="grid grid-cols-1 gap-x-8 gap-y-4 px-7 py-8 sm:grid-cols-[220px_1fr]">
						<div>
							<div className="flex items-center gap-2">
								<Icon icon="ri:briefcase-line" className="text-muted-foreground size-4 shrink-0" />
								<h3 className="text-foreground text-sm font-medium">
									Actividad económica
								</h3>
							</div>
							<p className="text-muted-foreground mt-1 text-sm">
								A qué se dedica y si genera ingresos en EE.UU.
							</p>
						</div>
						<div className="flex flex-col gap-4">
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
											onChange={(activityId) =>
												field.onChange(activityId)
											}
											placeholder="Seleccione la actividad"
											allowClear
											disabled={!canEditDetails}
										/>
									)}
								/>
							</Field>

							<Field>
								<FieldLabel htmlFor="income_us">
									Ingresos en EE.UU.
								</FieldLabel>
								<Controller
									control={form.control}
									name="us_source_income"
									render={({ field }) => (
										<ComboboxField
											id="income_us"
											options={US_INCOME_OPTIONS}
											value={
												field.value === null
													? null
													: field.value
														? 'yes'
														: 'no'
											}
											onChange={(value) =>
												field.onChange(
													value === null
														? null
														: value === 'yes',
												)
											}
											placeholder="Seleccione"
											disabled={!canEditDetails}
										/>
									)}
								/>
							</Field>

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
							</Field>
						</div>
					</div>
				</div>

				{/* Banner sticky de cambios sin guardar */}
				<div
					className={cn(
						'sticky bottom-0 -mx-7 mt-2 transition-all duration-200',
						isDirty
							? 'translate-y-0 opacity-100'
							: 'pointer-events-none translate-y-2 opacity-0',
					)}
				>
					<div className="border-t border-amber-200 bg-amber-50 px-7 py-3 dark:border-amber-900/60 dark:bg-amber-950/40">
						<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
							<div className="flex items-center gap-2 text-amber-900 dark:text-amber-200">
								<Icon icon="ri:alert-line" className="size-4 shrink-0" />
								<p className="text-[13px] font-medium">
									Tienes cambios sin guardar en la información de la
									empresa.
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
		</section>
	);
}

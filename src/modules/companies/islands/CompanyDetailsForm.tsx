import * as React from 'react';

import '@shared/iconify-ri'; // Registra el set `ri` de Remix Icons (side-effect).
import { Button } from '@components/ui/Button';
import { CardContent } from '@components/ui/Card';
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@components/ui/Dialog';

import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
	SheetDescription,
	SheetFooter,
} from '@components/ui/Sheet';
import { Icon } from '@iconify/react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import type { CompanyItem, EmpresaDetail, State } from '../types';

import IncorporationRegistrationSection from './company-details/sections/IncorporationRegistrationSection';
import { mapIncorporationFormToUpdateRequest } from './company-details/mappers/incorporation-registration.mapper';
import {
	type IncorporationRegistrationFormValues,
	type IncorporationRegistrationInput,
	incorporationRegistrationSchema,
} from './company-details/schemas/incorporation-registration.schema';

interface Props {
	empresa: EmpresaDetail;
	company: CompanyItem | null;
	canEditDetails: boolean;
	states: State[];
}

/**
 * Tab "Editar datos" dentro de /admin/incorporations/[id]. Solo contiene el form de
 * "Registro de incorporación" y un bloque de referencia read-only a la empresa
 * (los datos editables de la empresa real viven en /companies/[companyId]).
 */
export default function CompanyDetailsForm({
	empresa,
	company,
	canEditDetails,
	states,
}: Props) {
	const [companyId, setCompanyId] = React.useState(empresa.company_id ?? null);
	React.useEffect(() => {
		setCompanyId(empresa.company_id ?? null);
	}, [empresa.company_id]);
	const [isSheetOpen, setIsSheetOpen] = React.useState(false);
	const [isCreateCompanyOpen, setIsCreateCompanyOpen] = React.useState(false);
	const [isCreatingCompany, setIsCreatingCompany] = React.useState(false);
	const [isSavingIncorporation, setIsSavingIncorporation] =
		React.useState(false);

	const hasCompany = Boolean(companyId);

	const incorporationForm = useForm<
		IncorporationRegistrationFormValues,
		unknown,
		IncorporationRegistrationInput
	>({
		resolver: zodResolver(incorporationRegistrationSchema),
		defaultValues: {
			nameOption1: empresa.principal_name,
			nameOption2: empresa.possible_names?.[1] ?? null,
			nameOption3: empresa.possible_names?.[2] ?? null,
			businessType: empresa.tipo_de_negocio,
			stateId: empresa.state_id ?? null,
		},
		mode: 'onSubmit',
	});

	const createCompany = async () => {
		if (!canEditDetails || isCreatingCompany) return;

		setIsCreatingCompany(true);
		const loadingToastId = toast.loading('Creando empresa...');
		try {
			const response = await fetch(
				`/api/incorporations/${empresa.id}/company`,
				{ method: 'POST' },
			);
			const payload = await response.json().catch(() => null);
			if (!response.ok || !payload?.ok) {
				throw new Error(payload?.error ?? 'No se pudo crear la empresa');
			}

			setCompanyId(payload.data.company_id);
			setIsCreateCompanyOpen(false);
			toast.success('Empresa creada', { id: loadingToastId });
			window.setTimeout(() => {
				window.location.reload();
			}, 300);
		} catch (error) {
			const message =
				error instanceof Error ? error.message : 'Error inesperado';
			const friendlyMessage =
				message === 'MISSING_INCORPORATION_ID'
					? 'No se encontró la incorporación.'
					: message === 'INCORPORATION_NOT_FOUND'
						? 'No se encontró la incorporación.'
						: message === 'No autorizado'
							? 'No tienes permisos para crear la empresa.'
							: message === 'FORBIDDEN'
								? 'No tienes permisos para crear la empresa.'
								: 'No se pudo crear la empresa. Intenta nuevamente.';

			toast.error(friendlyMessage, { id: loadingToastId });
		} finally {
			setIsCreatingCompany(false);
		}
	};

	const openCreateCompanyDialog = () => {
		if (!canEditDetails) return;
		setIsCreateCompanyOpen(true);
	};

	const handleSaveIncorporation = async (
		values: IncorporationRegistrationInput,
	) => {
		if (!canEditDetails || isSavingIncorporation) return;

		setIsSavingIncorporation(true);
		const loadingToastId = toast.loading('Guardando datos...');

		const requestPayload = mapIncorporationFormToUpdateRequest(
			empresa.id,
			values,
		);

		try {
			const response = await fetch('/api/incorporations/update-details', {
				method: 'POST',
				headers: {
					Accept: 'application/json',
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(requestPayload),
				credentials: 'include',
			});

			const payload = (await response.json().catch(() => null)) as {
				ok?: boolean;
				message?: string;
				error?: string;
			} | null;

			if (!response.ok || !payload?.ok) {
				throw new Error(payload?.error ?? 'Error al guardar');
			}

			toast.success('Datos guardados', { id: loadingToastId });
		} catch {
			toast.error('Error al guardar', { id: loadingToastId });
		} finally {
			setIsSavingIncorporation(false);
		}
	};

	const companyHref = companyId
		? `/admin/companies/${companyId}?from=incorporation/${empresa.id}`
		: null;

	return (
		<section>
			<CardContent className="p-0">
				{!canEditDetails && (
					<div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900 dark:border-blue-700 dark:bg-blue-900/20 dark:text-blue-100">
						Solo admin, gerencia u operaciones puede editar en esta fase.
					</div>
				)}

				<div className="flex flex-col gap-4">
					<section className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-transparent">
						<header className="flex items-start justify-between gap-4">
							<div>
								<h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
									Registro de incorporación
								</h3>
								<p className="text-muted-foreground text-sm">
									Datos capturados del proceso de incorporación.
								</p>
							</div>
							<Button
								type="button"
								variant="outline"
								onClick={() => setIsSheetOpen(true)}
								disabled={!canEditDetails}
							>
								<Icon icon="ri:edit-line" className="h-4 w-4" />
								Editar
							</Button>
						</header>
					</section>

					<Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
						<SheetContent side="right" className="sm:!max-w-lg">
							<SheetHeader>
								<SheetTitle>Registro de incorporación</SheetTitle>
								<SheetDescription>
									Revise o edite detalles del registro de incorporación.
								</SheetDescription>
							</SheetHeader>
							<form
								onSubmit={incorporationForm.handleSubmit(
									handleSaveIncorporation,
								)}
								className="flex flex-1 flex-col gap-4"
							>
								<div className="flex-1">
									<IncorporationRegistrationSection
										canEditDetails={canEditDetails}
										states_us={states}
										form={incorporationForm}
									/>
								</div>
								<SheetFooter>
									<Button
										variant="outline"
										type="button"
										onClick={() => setIsSheetOpen(false)}
									>
										Cancelar
									</Button>
									<Button
										type="submit"
										disabled={!canEditDetails || isSavingIncorporation}
									>
										Guardar cambios
									</Button>
								</SheetFooter>
							</form>
						</SheetContent>
					</Sheet>

					{hasCompany && companyHref ? (
						<aside className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-transparent">
							<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
								<div className="min-w-0">
									<p className="text-[11.5px] font-semibold tracking-wider text-gray-500 uppercase dark:text-gray-400">
										Empresa
									</p>
									<h4 className="mt-1 truncate text-base font-semibold text-gray-900 dark:text-gray-100">
										{company?.legal_name ??
											empresa.principal_name ??
											'Sin nombre'}
									</h4>
									<p className="mt-1 text-[12.5px] text-gray-500 dark:text-gray-400">
										{company?.entity_type
											? company.entity_type.toUpperCase()
											: 'LLC'}
										{company?.legal_status ? ` · ${company.legal_status}` : ''}
										{company?.identification_number
											? ` · EIN ${company.identification_number}`
											: ''}
									</p>
								</div>
								<a
									href={companyHref}
									className="inline-flex shrink-0 items-center gap-2 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-transparent dark:text-gray-200 dark:hover:bg-white/5"
								>
									<Icon icon="ri:external-link-line" className="h-4 w-4" />
									Ver/editar en Empresas
								</a>
							</div>
						</aside>
					) : (
						canEditDetails && (
							<aside className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-100">
								<div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
									<p>
										Esta incorporación todavía no tiene empresa. Crea la empresa
										para habilitar la edición de direcciones y socios desde
										Empresas.
									</p>
									<Button
										type="button"
										variant="outline"
										onClick={openCreateCompanyDialog}
									>
										Crear empresa
									</Button>
								</div>
							</aside>
						)
					)}
				</div>

				<Dialog
					open={isCreateCompanyOpen}
					onOpenChange={setIsCreateCompanyOpen}
				>
					<DialogContent>
						<DialogHeader>
							<DialogTitle>Crear empresa</DialogTitle>
						</DialogHeader>
						<p className="text-muted-foreground text-sm">
							Se creará una empresa en estado borrador usando los datos actuales
							de esta incorporación. La acción no duplica empresas si ya existe
							una relación.
						</p>
						<DialogFooter>
							<Button
								type="button"
								onClick={createCompany}
								disabled={isCreatingCompany}
							>
								{isCreatingCompany ? 'Creando...' : 'Crear empresa'}
							</Button>
							<Button
								type="button"
								variant="outline"
								onClick={() => setIsCreateCompanyOpen(false)}
								disabled={isCreatingCompany}
							>
								Cancelar
							</Button>
						</DialogFooter>
					</DialogContent>
				</Dialog>
			</CardContent>
		</section>
	);
}

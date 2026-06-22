import '@shared/iconify-ri';

import * as React from 'react';
import { Icon } from '@iconify/react';
import { toast } from 'sonner';

import { Badge } from '@components/ui/Badge';
import { Button } from '@components/ui/Button';
import { Card, CardContent } from '@components/ui/Card';
import { Checkbox } from '@components/ui/Checkbox';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from '@components/ui/Dialog';
import { Field, FieldLabel } from '@components/ui/Field';
import {
	InputGroup,
	InputGroupAddon,
	InputGroupButton,
	InputGroupInput,
} from '@components/ui/InputGroup';
import { Label } from '@components/ui/Label';
import {
	Combobox,
	ComboboxContent,
	ComboboxEmpty,
	ComboboxInput,
	ComboboxItem,
	ComboboxList,
} from '@components/ui/Combobox';

import { cn } from '@components/utils';

import type { States } from '../types';

interface Props {
	states: States[];
}

const STEPS = [
	{
		icon: 'ri:building-4-line',
		title: 'Tipo de empresa',
		description:
			'Elige tu entidad comercial ¿No estás seguro? te ayudamos a elegir.',
	},
	{
		icon: 'ri:lightbulb-line',
		title: 'Estado de registro',
		description: 'Elija su estado de registro',
	},
	{
		icon: 'ri:file-list-3-line',
		title: 'Elije el nombre de tu empresa',
		description: 'Elije tres opciones de nombre para tu empresa',
	},
	{
		icon: 'ri:check-line',
		title: 'Verifica tus datos y regístrate',
		description:
			'Verifica los datos que seleccionaste y regístrate para entrar a nuestra plataforma.',
	},
];

const POPULAR_STATES = [
	{ id: 12, name: 'Florida' },
	{ id: 59, name: 'Wyoming' },
];

const STEP = {
	ENTITY_TYPE: 0,
	STATE: 1,
	COMPANY_NAME: 2,
	REVIEW: 3,
} as const;

function StepBadge({ step }: { step: number }) {
	return (
		<Badge
			variant="outline"
			className="border-primary-gold/30 bg-primary-gold/10 text-primary-gold mb-3 px-3 py-1 text-xs font-bold tracking-widest uppercase"
		>
			Paso {String(step + 1).padStart(2, '0')}
		</Badge>
	);
}

function StepHeader({
	step,
	title,
	subtitle,
}: {
	step: number;
	title: string;
	subtitle: string;
}) {
	return (
		<div className="text-center">
			<StepBadge step={step} />
			<h3 className="text-2xl font-semibold text-gray-900 lg:text-3xl dark:text-white">
				{title}
			</h3>
			<p className="mt-1.5 text-sm text-gray-500 sm:text-base dark:text-gray-400">
				{subtitle}
			</p>
		</div>
	);
}

function ReviewCard({
	label,
	value,
	onEdit,
}: {
	label: string;
	value: string;
	onEdit: () => void;
}) {
	return (
		<Card className="border-primary-gold/30 gap-0 py-0 dark:border-neutral-700">
			<CardContent className="flex items-center justify-between gap-3 p-4">
				<div className="min-w-0 flex-1">
					<p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
					<p className="mt-0.5 truncate text-lg font-semibold text-gray-900 dark:text-white">
						{value || 'No seleccionado'}
					</p>
				</div>
				<Button
					variant="ghost"
					size="icon"
					onClick={onEdit}
					className="bg-primary-gold hover:bg-primary-gold/80 ml-3 shrink-0 rounded-lg text-white dark:bg-neutral-900 dark:hover:bg-neutral-950"
				>
					<Icon icon="ri:edit-line" className="size-4" />
				</Button>
			</CardContent>
		</Card>
	);
}

function FormField({
	id,
	label,
	children,
}: {
	id: string;
	label: string;
	children: React.ReactNode;
}) {
	return (
		<Field>
			<FieldLabel htmlFor={id} className="text-gray-900 dark:text-gray-400">
				{label}
			</FieldLabel>
			{children}
		</Field>
	);
}

function IconField({
	id,
	label,
	icon,
	trailing,
	inputProps,
}: {
	id: string;
	label: string;
	icon: string;
	trailing?: React.ReactNode;
	inputProps: React.ComponentProps<'input'>;
}) {
	return (
		<FormField id={id} label={label}>
			<InputGroup>
				<InputGroupAddon>
					<Icon icon={icon} className="text-primary-gold" />
				</InputGroupAddon>
				<InputGroupInput id={id} {...inputProps} />
				{trailing}
			</InputGroup>
		</FormField>
	);
}

function OrDivider({ label }: { label: string }) {
	return (
		<div className="relative flex items-center gap-3">
			<span className="h-px flex-1 bg-gray-200 dark:bg-neutral-800" />
			<span className="text-xs text-gray-400">{label}</span>
			<span className="h-px flex-1 bg-gray-200 dark:bg-neutral-800" />
		</div>
	);
}

export default function StepsWizard({ states }: Props) {
	const [currentStep, setCurrentStep] = React.useState<number>(
		STEP.ENTITY_TYPE,
	);
	const [tipoDeEmpresa, setTipoDeEmpresa] = React.useState('LLC');
	const [estadoDeEmpresa, setEstadoDeEmpresa] = React.useState(12);
	const [nombre1, setNombre1] = React.useState('');
	const [nombre2, setNombre2] = React.useState('');
	const [nombre3, setNombre3] = React.useState('');
	const [showRegisterForm, setShowRegisterForm] = React.useState(false);
	const [helpDialogOpen, setHelpDialogOpen] = React.useState(false);
	const [isVerifying, setIsVerifying] = React.useState(false);

	const [regName, setRegName] = React.useState('');
	const [regLastName, setRegLastName] = React.useState('');
	const [regEmail, setRegEmail] = React.useState('');
	const [regPassword, setRegPassword] = React.useState('');
	const [regConfirmPassword, setRegConfirmPassword] = React.useState('');
	const [regAcceptTerms, setRegAcceptTerms] = React.useState(false);
	const [isRegistering, setIsRegistering] = React.useState(false);
	const [showPassword, setShowPassword] = React.useState(false);
	const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);

	React.useEffect(() => {
		try {
			const saved = localStorage.getItem('incorpData');
			if (saved) {
				const data = JSON.parse(saved);
				setTipoDeEmpresa(data.tipo_de_empresa || 'LLC');
				setEstadoDeEmpresa(data.estado_de_empresa || 'Florida');
				setNombre1(data.nombre_1 || '');
				setNombre2(data.nombre_2 || '');
				setNombre3(data.nombre_3 || '');
			}
		} catch {
			/* ignore */
		}

		const params = new URLSearchParams(window.location.search);
		const status = params.get('status');
		const msg = params.get('msg');
		if (msg) {
			if (status === 'success') toast.success(msg);
			else toast.error(msg);
			params.delete('status');
			params.delete('msg');
			const newUrl = `${location.pathname}${params.toString() ? '?' + params.toString() : ''}${location.hash}`;
			window.history.replaceState({}, '', newUrl);
		}
		if (status === 'auth_required') {
			setShowRegisterForm(true);
			setCurrentStep(STEP.REVIEW);
		}
	}, []);

	const saveData = React.useCallback(() => {
		const data = {
			tipo_de_empresa: tipoDeEmpresa,
			estado_de_empresa: estadoDeEmpresa,
			nombre_1: nombre1,
			nombre_2: nombre2,
			nombre_3: nombre3,
			estado_de: 'En proceso',
		};
		localStorage.setItem('incorpData', JSON.stringify(data));
	}, [tipoDeEmpresa, estadoDeEmpresa, nombre1, nombre2, nombre3]);

	const validateNames = React.useCallback((): string | null => {
		if (!nombre1.trim()) return 'El primer nombre de empresa es obligatorio';
		if (!nombre2.trim()) return 'El segundo nombre de empresa es obligatorio';
		if (!nombre3.trim()) return 'El tercer nombre de empresa es obligatorio';
		return null;
	}, [nombre1, nombre2, nombre3]);

	const goToStep = (paso: number) => {
		setCurrentStep(paso);
		if (showRegisterForm) setShowRegisterForm(false);
	};

	const handleNext = () => {
		if (currentStep === STEP.COMPANY_NAME) {
			const error = validateNames();
			if (error) {
				toast.error(error);
				return;
			}
		}
		setCurrentStep((prev) => Math.min(prev + 1, STEP.REVIEW));
	};

	const handleBack = () => {
		setCurrentStep((prev) => Math.max(prev - 1, 0));
	};

	const checkSession = async () => {
		const error = validateNames();
		if (error) {
			toast.error(error);
			return;
		}
		saveData();
		setIsVerifying(true);
		try {
			const res = await fetch('/api/auth/session-check', {
				credentials: 'include',
			});
			const json = await res.json();
			const sessionData = json?.data ?? { isAuthenticated: false };
			if (sessionData.isAuthenticated) {
				window.location.href = '/';
			} else {
				setShowRegisterForm(true);
			}
		} catch {
			toast.error('Error al verificar la sesión.');
		} finally {
			setIsVerifying(false);
		}
	};

	const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		if (regPassword !== regConfirmPassword) {
			toast.error('Las contraseñas no coinciden');
			return;
		}
		setIsRegistering(true);
		try {
			const formData = new FormData();
			formData.set('name', regName);
			formData.set('last-name', regLastName);
			formData.set('email', regEmail);
			formData.set('password', regPassword);
			formData.set('confirm-password', regConfirmPassword);
			formData.set('remember', regAcceptTerms ? 'on' : '');

			const res = await fetch('/api/auth/register-start', {
				method: 'POST',
				headers: { Accept: 'application/json' },
				body: formData,
			});
			const result = await res.json();
			if (res.ok) {
				if (result?.data?.requiresEmailConfirmation === false) {
					const sr = await fetch('/api/auth/session-check', {
						credentials: 'include',
					});
					const sj = await sr.json();
					if (sj?.data?.isAuthenticated) {
						window.location.href = '/';
						return;
					}
					toast.error(
						'Cuenta creada, pero no se pudo validar la sesión automáticamente.',
					);
				} else {
					toast.success(
						result?.data?.message ||
							'Registro exitoso. Revisa tu email para confirmar.',
					);
				}
			} else {
				toast.error(result?.error || 'Error en el registro.');
			}
		} catch {
			toast.error('Error de conexión.');
		} finally {
			setIsRegistering(false);
		}
	};

	const nameFields = [
		{
			label: 'Nombre de tu empresa — opción #1',
			id: 'nombre-empresa-1',
			name: 'nombre_1',
			value: nombre1,
			setter: setNombre1,
		},
		{
			label: 'Nombre de tu empresa — opción #2',
			id: 'nombre-empresa-2',
			name: 'nombre_2',
			value: nombre2,
			setter: setNombre2,
		},
		{
			label: 'Nombre de tu empresa — opción #3',
			id: 'nombre-empresa-3',
			name: 'nombre_3',
			value: nombre3,
			setter: setNombre3,
		},
	];

	const reviewItems = [
		{
			label: 'Tipo de empresa',
			value: tipoDeEmpresa,
			step: STEP.ENTITY_TYPE,
		},
		{
			label: 'Estado de registro',
			value: states.find((s) => s.id === estadoDeEmpresa)?.name ?? String(estadoDeEmpresa),
			step: STEP.STATE,
		},
		{
			label: 'Nombre seleccionado',
			value: nombre1,
			step: STEP.COMPANY_NAME,
		},
	];

	const stepper = (
		<aside className="hidden md:flex md:flex-col">
			<div>
				<h3 className="text-2xl font-semibold text-gray-900 dark:text-white">
					Inicie su empresa en EE. UU. en minutos.
				</h3>
				<p className="mt-2 max-w-sm text-gray-500 dark:text-gray-400">
					Responda algunas preguntas para ayudarnos a formar su nueva empresa.
				</p>
			</div>
			<ol className="mt-10 w-full space-y-8 overflow-hidden">
				{STEPS.map((step, index) => {
					const isActive = index === currentStep;
					const isCompleted = index < currentStep;
					return (
						<li
							key={step.title}
							className={cn(
								'relative flex-1',
								"after:absolute after:-bottom-11 after:left-[37px] after:inline-block after:h-full after:w-0.5 after:content-['']",
								isActive
									? 'after:bg-primary-gold'
									: isCompleted
										? 'after:bg-primary-gold/40'
										: 'after:bg-neutral-200 dark:after:bg-neutral-800',
							)}
						>
							<button
								type="button"
								onClick={() => goToStep(index)}
								className="group flex w-full items-center"
							>
								<div
									className={cn(
										'relative flex w-full items-center gap-3.5 rounded-xl border p-3.5 text-left transition-all',
										isActive &&
											'border-primary-gold bg-white shadow-sm dark:bg-neutral-900',
										isCompleted &&
											!isActive &&
											'border-primary-gold/30 bg-primary-gold/5 hover:border-primary-gold dark:bg-primary-gold/5',
										!isActive &&
											!isCompleted &&
											'border-transparent bg-gray-50 hover:border-gray-300 dark:bg-neutral-950 dark:hover:border-neutral-700',
									)}
								>
									<div
										className={cn(
											'flex items-center justify-center rounded-lg transition-all',
											isActive && 'bg-primary-gold',
											isCompleted && !isActive && 'bg-primary-gold/70',
											!isActive &&
												!isCompleted &&
												'bg-white group-hover:bg-gray-100 dark:bg-neutral-900 dark:group-hover:bg-neutral-800',
										)}
									>
										<span
											className={cn(
												'p-3 transition-all',
												isActive || isCompleted
													? 'text-white'
													: 'text-gray-500 group-hover:text-gray-700 dark:text-gray-400',
											)}
										>
											{isCompleted && !isActive ? (
												<Icon icon="ri:check-line" className="size-5" />
											) : (
												<Icon icon={step.icon} className="size-5" />
											)}
										</span>
									</div>
									<div className="flex flex-col items-start">
										<h6
											className={cn(
												'mb-0.5 text-base font-semibold transition-all',
												isActive && 'text-gray-900 dark:text-white',
												isCompleted &&
													!isActive &&
													'text-primary-gold dark:text-primary-gold/80',
												!isActive &&
													!isCompleted &&
													'text-gray-500 group-hover:text-gray-700 dark:group-hover:text-gray-300',
											)}
										>
											{step.title}
										</h6>
										<p
											className={cn(
												'text-xs font-normal transition-all',
												isActive && 'text-neutral-600 dark:text-gray-400',
												!isActive && 'text-gray-400 dark:text-gray-500',
											)}
										>
											{step.description}
										</p>
									</div>
								</div>
							</button>
						</li>
					);
				})}
			</ol>
		</aside>
	);

	const mobileStepper = (
		<div className="mb-6 flex items-center justify-center gap-2 md:hidden">
			{STEPS.map((_, index) => (
				<button
					key={index}
					type="button"
					onClick={() => goToStep(index)}
					className={cn(
						'h-2 rounded-full transition-all',
						index === currentStep
							? 'bg-primary-gold w-8'
							: index < currentStep
								? 'bg-primary-gold/40 w-2'
								: 'w-2 bg-gray-300 dark:bg-neutral-700',
					)}
					aria-label={`Ir al paso ${index + 1}`}
				/>
			))}
		</div>
	);

	const paso1 = (
		<div className="flex h-full flex-col justify-center gap-10 px-6 py-8 sm:px-10 sm:py-12">
			<StepHeader
				step={STEP.ENTITY_TYPE}
				title="Estructura de la empresa"
				subtitle="Elija el tipo de entidad adecuada para su negocio."
			/>
			<div className="mx-auto grid w-full max-w-md gap-4">
				<label
					htmlFor="LLC_radio_btn"
					className={cn(
						'group grid cursor-pointer grid-cols-[auto_1fr_auto] items-center gap-4 rounded-xl border p-5 transition-all',
						tipoDeEmpresa === 'LLC'
							? 'border-primary-gold bg-primary-gold/5 dark:bg-primary-gold/10 shadow-sm'
							: 'border-gray-200 bg-white hover:border-gray-300 dark:border-neutral-700 dark:bg-transparent dark:hover:border-neutral-600',
					)}
				>
					<input
						type="radio"
						id="LLC_radio_btn"
						name="tipo_de_empresa"
						value="LLC"
						className="peer hidden"
						checked={tipoDeEmpresa === 'LLC'}
						onChange={() => setTipoDeEmpresa('LLC')}
					/>
					<div className="bg-primary-gold/15 rounded-xl p-3">
						<Icon
							icon="ri:building-4-line"
							className="text-primary-gold text-2xl"
						/>
					</div>
					<div>
						<p className="text-lg font-semibold text-gray-900 dark:text-white">
							LLC
						</p>
						<p className="text-sm text-gray-500 dark:text-gray-400">
							Tarifas mínimas + privacidad y flexibilidad inigualables.
						</p>
					</div>
					<Icon
						icon="ri:arrow-right-s-fill"
						className={cn(
							'text-xl transition-all',
							tipoDeEmpresa === 'LLC'
								? 'text-primary-gold translate-x-0.5'
								: 'text-gray-300 group-hover:text-gray-500 dark:text-neutral-600',
						)}
					/>
				</label>

				<button
					type="button"
					onClick={() => setHelpDialogOpen(true)}
					className="group hover:border-primary-gold/50 hover:bg-primary-gold/5 dark:hover:border-primary-gold/30 grid cursor-pointer grid-cols-[auto_1fr_auto] items-center gap-4 rounded-xl border border-dashed border-gray-300 bg-white p-5 text-left transition-all dark:border-neutral-700 dark:bg-transparent"
				>
					<div className="bg-primary-gold/15 rounded-xl p-3">
						<Icon
							icon="ri:question-line"
							className="text-primary-gold text-2xl"
						/>
					</div>
					<div>
						<p className="text-lg font-semibold text-gray-900 dark:text-white">
							Ayúdame a elegir
						</p>
						<p className="text-sm text-gray-500 dark:text-gray-400">
							Evaluación estratégica para entender tu etapa y el paso exacto que
							necesitas.
						</p>
					</div>
					<Icon
						icon="ri:arrow-right-s-fill"
						className="group-hover:text-primary-gold text-xl text-gray-300 transition-all group-hover:translate-x-0.5 dark:text-neutral-600"
					/>
				</button>
			</div>
		</div>
	);

	const paso2 = (
		<div className="flex flex-col justify-center gap-8 px-6 py-8 sm:px-10 sm:py-12">
			<StepHeader
				step={STEP.STATE}
				title="Elija el estado de registro"
				subtitle="Seleccione donde desea registrar su empresa"
			/>

			<div className="mx-auto w-full max-w-md space-y-6">
				<div>
					<p className="mb-3 text-center text-xs font-medium tracking-wide text-gray-500 uppercase dark:text-gray-400">
						Estados populares
					</p>
					<div className="flex justify-center gap-2">
						{POPULAR_STATES.map((estado) => (
							<button
								key={estado.id}
								type="button"
								onClick={() => setEstadoDeEmpresa(estado.id)}
								className={cn(
									'flex items-center gap-2 rounded-full border px-5 py-2 text-sm font-semibold transition-all',
									estadoDeEmpresa === estado.id
										? 'bg-primary-gold border-primary-gold text-white'
										: 'border-primary-gold/30 text-primary-gold hover:bg-primary-gold/10',
								)}
							>
								<span
									className={cn(
										'h-2 w-2 rounded-full',
										estadoDeEmpresa === estado.id
											? 'bg-white'
											: 'bg-primary-gold/50',
									)}
								/>
								{estado.name}
							</button>
						))}
					</div>
				</div>

				<OrDivider label="o selecciona otro" />
				<Combobox<States, false>
					items={states}
					value={states.find((s) => s.id === estadoDeEmpresa) ?? null}
					onValueChange={(v) => setEstadoDeEmpresa(v?.id ?? 0)}
					itemToStringLabel={(item) => item.name}
					autoHighlight
				>
					<ComboboxInput placeholder="Seleccione un estado" />
					<ComboboxContent>
						<ComboboxEmpty>No se encontraron estados</ComboboxEmpty>
						<ComboboxList>
							{(item) => (
								<ComboboxItem key={item.id} value={item}>
									{item.name}
								</ComboboxItem>
							)}
						</ComboboxList>
					</ComboboxContent>
				</Combobox>
			</div>
		</div>
	);

	const paso3 = (
		<div className="flex flex-col justify-center gap-8 px-6 py-8">
			<StepHeader
				step={STEP.COMPANY_NAME}
				title="Escoge el nombre de tu empresa"
				subtitle="Proporciona tres opciones de nombre para tu empresa"
			/>
			<div className="mx-auto w-full max-w-md space-y-4">
				{nameFields.map((field) => (
					<IconField
						key={field.id}
						id={field.id}
						label={field.label}
						icon="ri:building-2-line"
						inputProps={{
							name: field.name,
							value: field.value,
							onChange: (e) => field.setter(e.target.value),
							placeholder: 'Sotomayor Consulting',
							required: true,
						}}
					/>
				))}
			</div>
		</div>
	);

	const paso4 = (
		<div className="flex flex-col justify-center gap-8 px-6 py-8 sm:px-10 sm:py-12">
			<StepHeader
				step={STEP.REVIEW}
				title="Revisa tu información"
				subtitle="Ya casi terminas — verifica tus datos y procede a registrarte."
			/>
			<div className="m-0 mx-auto w-full max-w-md space-y-3 p-0">
				{reviewItems.map((item) => (
					<ReviewCard
						key={item.label}
						label={item.label}
						value={item.value}
						onEdit={() => goToStep(item.step)}
					/>
				))}
			</div>
		</div>
	);

	const formularioRegistro = (
		<div className="space-y-6 px-6 py-8 sm:px-8 sm:py-10">
			<div className="flex flex-col items-center gap-3 text-center">
				<div className="bg-primary-gold/15 rounded-xl p-3">
					<Icon
						icon="ri:building-2-line"
						className="text-primary-gold text-4xl"
					/>
				</div>
				<h2 className="text-2xl font-bold text-gray-900 dark:text-white">
					Crea tu cuenta gratuita
				</h2>
			</div>

			<form className="space-y-5" onSubmit={handleRegister}>
				<div className="grid grid-cols-2 gap-4">
					<IconField
						id="reg-name"
						label="Nombre"
						icon="ri:user-line"
						inputProps={{
							name: 'name',
							value: regName,
							onChange: (e) => setRegName(e.target.value),
							placeholder: 'Nombre',
							required: true,
							autoComplete: 'given-name',
						}}
					/>
					<IconField
						id="reg-last-name"
						label="Apellido"
						icon="ri:user-line"
						inputProps={{
							name: 'last-name',
							value: regLastName,
							onChange: (e) => setRegLastName(e.target.value),
							placeholder: 'Apellido',
							required: true,
							autoComplete: 'family-name',
						}}
					/>
				</div>

				<IconField
					id="reg-email"
					label="Tu correo"
					icon="ri:mail-line"
					inputProps={{
						type: 'email',
						name: 'email',
						value: regEmail,
						onChange: (e) => setRegEmail(e.target.value),
						placeholder: 'correo@ejemplo.com',
						required: true,
						autoComplete: 'email',
					}}
				/>

				<IconField
					id="reg-password"
					label="Contraseña"
					icon="ri:lock-2-line"
					inputProps={{
						type: showPassword ? 'text' : 'password',
						name: 'password',
						value: regPassword,
						onChange: (e) => setRegPassword(e.target.value),
						placeholder: '••••••••',
						minLength: 8,
						required: true,
						autoComplete: 'new-password',
					}}
					trailing={
						<InputGroupAddon align="inline-end">
							<InputGroupButton
								size="icon-xs"
								aria-label={
									showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'
								}
								onClick={() => setShowPassword((v) => !v)}
							>
								<Icon icon={showPassword ? 'ri:eye-off-line' : 'ri:eye-line'} />
							</InputGroupButton>
						</InputGroupAddon>
					}
				/>

				<IconField
					id="reg-confirm-password"
					label="Confirmar contraseña"
					icon="ri:lock-2-line"
					inputProps={{
						type: showConfirmPassword ? 'text' : 'password',
						name: 'confirm-password',
						value: regConfirmPassword,
						onChange: (e) => setRegConfirmPassword(e.target.value),
						placeholder: '••••••••',
						required: true,
						autoComplete: 'new-password',
					}}
					trailing={
						<InputGroupAddon align="inline-end">
							<InputGroupButton
								size="icon-xs"
								aria-label={
									showConfirmPassword
										? 'Ocultar contraseña'
										: 'Mostrar contraseña'
								}
								onClick={() => setShowConfirmPassword((v) => !v)}
							>
								<Icon
									icon={showConfirmPassword ? 'ri:eye-off-line' : 'ri:eye-line'}
								/>
							</InputGroupButton>
						</InputGroupAddon>
					}
				/>

				<div className="flex items-start gap-3">
					<Checkbox
						id="reg-accept-terms"
						name="remember"
						checked={regAcceptTerms}
						onCheckedChange={(checked) => setRegAcceptTerms(checked === true)}
						required
						className="mt-0.5"
					/>
					<Label
						htmlFor="reg-accept-terms"
						className="text-sm leading-snug font-normal text-gray-600 dark:text-gray-300"
					>
						Al registrarte, aceptas los{' '}
						<a
							href="https://sotomayorconsulting.com/inicio/politicas/"
							className="text-primary-gold font-medium hover:underline"
						>
							Términos de uso y Política de privacidad
						</a>{' '}
						de Sotomayor Consulting International LLC.
					</Label>
				</div>

				<Button
					type="submit"
					disabled={isRegistering}
					className="bg-primary-gold hover:bg-primary-gold/90 h-11 w-full text-base font-semibold text-white"
				>
					{isRegistering ? 'Creando cuenta...' : 'Crear una cuenta'}
				</Button>
			</form>

			<OrDivider label="o" />

			<form action="/api/auth/oauth/google" method="post">
				<Button
					type="submit"
					variant="outline"
					className="h-11 w-full gap-2 text-sm font-medium"
				>
					<Icon icon="ri:google-fill" className="size-5" />
					Regístrate con Google
				</Button>
			</form>
		</div>
	);

	const wizardNavigation = !showRegisterForm && (
		<div
			className={cn(
				'mt-4 w-full',
				currentStep === STEP.ENTITY_TYPE
					? 'flex justify-center'
					: 'grid grid-cols-2 gap-3',
			)}
		>
			{currentStep > STEP.ENTITY_TYPE && (
				<Button
					variant="outline"
					size="lg"
					onClick={handleBack}
					className="h-11 w-full text-sm font-medium"
				>
					<Icon icon="ri:arrow-left-line" className="mr-1 size-4" />
					Retroceder
				</Button>
			)}
			<Button
				size="lg"
				onClick={currentStep === STEP.REVIEW ? checkSession : handleNext}
				disabled={currentStep === STEP.REVIEW && isVerifying}
				className={cn(
					'bg-primary-gold hover:bg-primary-gold/90 h-11 w-full text-sm font-medium text-white',
					currentStep === STEP.ENTITY_TYPE && 'max-w-md',
				)}
			>
				{currentStep === STEP.REVIEW && isVerifying
					? 'Verificando...'
					: currentStep === STEP.REVIEW
						? 'Finalizar'
						: 'Continuar'}
				{!isVerifying && currentStep !== STEP.REVIEW && (
					<Icon icon="ri:arrow-right-line" className="ml-1 size-4" />
				)}
			</Button>
		</div>
	);

	return (
		<>
			<div className="mx-auto my-8 max-w-6xl">
				{mobileStepper}
				<div className="grid gap-6">
					<div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
						{stepper}

						<div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-black">
							{currentStep === STEP.ENTITY_TYPE && paso1}
							{currentStep === STEP.STATE && paso2}
							{currentStep === STEP.COMPANY_NAME && paso3}
							{currentStep === STEP.REVIEW && !showRegisterForm && paso4}
							{showRegisterForm && formularioRegistro}
						</div>
					</div>
					{wizardNavigation}
				</div>
			</div>

			<Dialog open={helpDialogOpen} onOpenChange={setHelpDialogOpen}>
				<DialogContent className="sm:max-w-2xl">
					<DialogHeader>
						<div className="mb-6 flex justify-center">
							<div className="bg-primary-gold/10 border-primary-gold/20 flex h-20 w-20 items-center justify-center rounded-2xl border">
								<Icon
									icon="ri:calendar-todo-line"
									className="text-primary-gold text-5xl"
								/>
							</div>
						</div>
						<DialogTitle className="text-center text-2xl leading-tight font-bold tracking-tight md:text-3xl">
							Encuentre el tipo de entidad{' '}
							<span className="text-primary-gold">
								adecuado para su negocio
							</span>
						</DialogTitle>
						<DialogDescription className="mx-auto mt-2 max-w-lg text-center text-base leading-relaxed">
							La elección de tu entidad legal es el primer gran paso. Evita
							riesgos fiscales y legales. Nuestros consultores te brindan una
							asesoría gratuita para identificar la mejor opción.
						</DialogDescription>
					</DialogHeader>
					<div className="mt-4 flex flex-col items-center justify-center gap-3 sm:flex-row">
						<Button
							className="bg-primary-gold hover:bg-primary-gold/90 h-12 w-full px-8 font-bold text-black sm:w-auto"
							render={
								<a href="https://sotomayorconsulting.com/diagnostico-llc/" />
							}
						>
							Realiza un Diagnostico breve
						</Button>
						<Button
							variant="outline"
							className="border-primary-gold/40 h-12 w-full px-8 font-semibold sm:w-auto"
							render={<a href="https://zcal.co/t/agendar-asesoria-llc/60min" />}
						>
							Agendar una cita
						</Button>
					</div>
					<div className="mt-8 border-t pt-6 text-center">
						<p className="text-muted-foreground text-sm italic">
							Asegurando un crecimiento sólido y protegido en EE. UU.
						</p>
					</div>
				</DialogContent>
			</Dialog>
		</>
	);
}

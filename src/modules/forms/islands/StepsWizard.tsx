import '@shared/iconify-ri';

import * as React from 'react';
import { Icon } from '@iconify/react';
import { toast } from 'sonner';

import { Button } from '@components/ui/Button';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from '@components/ui/Dialog';
import { Card, CardContent, CardTitle } from '@components/ui/Card';
import { Input } from '@components/ui/Input';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@components/ui/Select';
import { cn } from '@components/utils';
import Toaster from '@components/ui/Sonner';

import type { EstadosOption } from '../types';

interface Props {
	estados: EstadosOption[];
}

interface WizardActionButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
	children: React.ReactNode;
}

function WizardActionButton({
	children,
	className,
	type = 'button',
	...props
}: WizardActionButtonProps) {
	return (
		<button
			type={type}
			className={cn(
				'w-full cursor-pointer justify-self-center rounded-lg border border-neutral-700 bg-white px-5 py-2.5 text-center text-xs font-medium focus:ring-4 focus:ring-neutral-600 focus:outline-none md:text-lg dark:border-neutral-600 dark:bg-black dark:text-white dark:focus:ring-neutral-500',
				className,
			)}
			{...props}
		>
			{children}
		</button>
	);
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

const POPULAR_STATES = ['Florida', 'Wyoming'];

export default function StepsWizard({ estados }: Props) {
	const [currentStep, setCurrentStep] = React.useState(0);
	const [tipoDeEmpresa, setTipoDeEmpresa] = React.useState('LLC');
	const [estadoDeEmpresa, setEstadoDeEmpresa] = React.useState('Florida');
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
			setCurrentStep(3);
		}
	}, []);

	const salvaguardar = React.useCallback(() => {
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

	const validarNombres = React.useCallback((): string | null => {
		if (!nombre1.trim()) return 'El primer nombre de empresa es obligatorio';
		if (!nombre2.trim()) return 'El segundo nombre de empresa es obligatorio';
		if (!nombre3.trim()) return 'El tercer nombre de empresa es obligatorio';
		return null;
	}, [nombre1, nombre2, nombre3]);

	const irAlPaso = (paso: number) => {
		setCurrentStep(paso);
		if (showRegisterForm) setShowRegisterForm(false);
	};

	const continuar = () => {
		if (currentStep === 2) {
			const error = validarNombres();
			if (error) {
				toast.error(error);
				return;
			}
		}
		setCurrentStep((prev) => Math.min(prev + 1, 3));
	};

	const retroceder = () => {
		setCurrentStep((prev) => Math.max(prev - 1, 0));
	};

	const renderNextButton = (className?: string) => (
		<WizardActionButton
			onClick={currentStep === 3 ? verificar : continuar}
			disabled={currentStep === 3 && isVerifying}
			className={cn(
				'hover:bg-white-50 dark:hover:bg-neutral-950',
				currentStep === 3 && 'disabled:opacity-50',
				className,
			)}
		>
			{currentStep === 3 && isVerifying ? 'Verificando...' : 'Avanzar'}
		</WizardActionButton>
	);

	const verificar = async () => {
		const error = validarNombres();
		if (error) {
			toast.error(error);
			return;
		}
		salvaguardar();
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

	const registrar: React.FormEventHandler<HTMLFormElement> = async (e) => {
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

	const stepper = (
		<aside className="hidden w-full lg:flex lg:min-h-175 lg:flex-col">
			<div className="mt-16">
				<h3 className="text-black-900 text-2xl dark:text-white">
					Inicie su empresa en EE. UU. en minutos.
				</h3>
				<p className="w-3/4 text-gray-500">
					Responda algunas preguntas para ayudarnos a formar su nueva empresa.
				</p>
			</div>
			<ol className="mt-8 w-full space-y-8 overflow-hidden">
				{STEPS.map((step, index) => {
					const activo = index === currentStep;
					return (
						<li
							key={step.title}
							className={cn(
								'relative flex-1',
								"after:absolute after:-bottom-11 after:left-1/4 after:inline-block after:h-full after:w-0.5 after:content-['']",
								activo
									? 'after:bg-primary-gold'
									: 'after:bg-neutral-700 dark:after:bg-neutral-900',
							)}
						>
							<button
								type="button"
								onClick={() => irAlPaso(index)}
								className="flex w-full max-w-sm cursor-pointer items-center justify-center gap-8"
							>
								<div
									className={cn(
										'relative z-10 flex w-full items-center gap-3.5 rounded-xl p-3.5 text-left transition-all',
										activo &&
											'border-primary-gold border bg-white dark:bg-neutral-900',
										!activo &&
											'bg-white-100 hover:border-primary-gold dark:hover:border-primary-gold border border-transparent dark:bg-black',
									)}
								>
									<div
										className={cn(
											'flex items-center justify-center rounded-lg transition-all',
											activo && 'bg-primary-gold',
											!activo &&
												'group-hover:bg-primary-gold bg-white dark:bg-neutral-950',
										)}
									>
										<span
											className={cn(
												'p-3 transition-all',
												activo && 'text-white',
												!activo && 'text-gray-600 group-hover:text-white',
											)}
										>
											<Icon icon={step.icon} className="size-5" />
										</span>
									</div>
									<div className="flex flex-col items-start">
										<h6
											className={cn(
												'mb-0.5 text-base font-semibold transition-all',
												activo && 'dark:text-white',
												!activo && 'group-hover:text-white-600 text-gray-500',
											)}
										>
											{step.title}
										</h6>
										<p
											className={cn(
												'text-xs font-normal transition-all',
												activo && 'text-neutral-600 dark:text-gray-400',
												!activo && 'group-hover:text-white-600 text-gray-500',
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

	const paso1 = (
		<div id="paso1" className="flex h-full flex-col justify-center gap-10">
			<div className="text-center">
				<span className="bg-primary-gold/20 text-brand-gold mb-4 inline-block rounded-full px-3 py-1 text-xs font-bold tracking-widest uppercase">
					Paso 01
				</span>
				<h3 className="text-black-900 text-2xl lg:text-3xl dark:text-white">
					Estructura de la empresa
				</h3>
				<p className="text-neutral-700 dark:text-gray-400">
					Elija el tipo de entidad adecuada para su negocio.
				</p>
			</div>
			<ul className="grid w-full place-items-center gap-6">
				<li className="w-4/5">
					<input
						type="radio"
						id="LLC_radio_btn"
						name="tipo_de_empresa"
						value="LLC"
						className="peer hidden"
						checked={tipoDeEmpresa === 'LLC'}
						onChange={() => setTipoDeEmpresa('LLC')}
						required
					/>
					<label
						htmlFor="LLC_radio_btn"
						className="bg-white-100 hover:bg-white-50 dark:peer-checked:border-primary-gold group peer-checked:border-primary-gold grid w-full cursor-pointer grid-cols-[auto_1fr_auto] items-center justify-between gap-5 rounded-lg border border-neutral-700 p-5 text-neutral-500 peer-checked:bg-white peer-checked:text-black hover:text-neutral-900 dark:bg-transparent dark:text-gray-400 dark:peer-checked:bg-neutral-900 dark:peer-checked:text-white dark:hover:bg-neutral-950 dark:hover:text-white"
					>
						<div className="bg-primary-gold/20 text-brand-gold rounded-xl p-3">
							<Icon
								icon="ri:building-4-line"
								className="text-primary-gold text-3xl"
							/>
						</div>
						<div className="block max-w-[90%]">
							<div className="w-full text-lg font-semibold">LLC</div>
							<div className="w-full text-sm">
								Tarifas mínimas + privacidad y flexibilidad inigualables.
							</div>
						</div>
						<Icon
							icon="ri:arrow-right-s-fill"
							className="text-primary-gold ms-3 text-2xl transition-all delay-105 group-hover:translate-x-2 rtl:rotate-180 dark:text-white"
						/>
					</label>
				</li>
				<li className="w-4/5">
					<button
						type="button"
						onClick={() => setHelpDialogOpen(true)}
						className="bg-white-50 hover:bg-white-50 group border-primary-gold group grid w-full cursor-pointer grid-cols-[auto_1fr_auto] grid-rows-1 items-center justify-between gap-5 rounded-lg border p-5 text-neutral-500 dark:bg-transparent dark:text-gray-400 dark:hover:bg-neutral-950 dark:hover:text-white"
					>
						<div className="bg-primary-gold/20 rounded-xl p-3">
							<Icon
								icon="ri:question-line"
								className="text-primary-gold text-3xl"
							/>
						</div>
						<div className="block max-w-[90%] text-left">
							<div className="w-full text-lg font-semibold">
								Ayúdame a elegir
							</div>
							<div className="w-full text-sm text-pretty">
								Una evaluación estratégica para entender tu etapa actual, tus
								riesgos y el paso exacto que necesitas dar.
							</div>
						</div>
						<Icon
							icon="ri:arrow-right-s-fill"
							className="text-primary-gold ms-3 text-2xl transition-all delay-105 group-hover:translate-x-2 dark:text-white"
						/>
					</button>
				</li>
			</ul>
		</div>
	);

	const paso2 = (
		<div id="paso2" className="flex flex-col justify-center gap-5 p-10">
			<div className="px-10 py-10 text-center">
				<span className="bg-primary-gold/20 text-brand-gold mb-4 inline-block rounded-full px-3 py-1 text-xs font-bold tracking-widest uppercase">
					Paso 02
				</span>
				<h3 className="text-2xl text-neutral-800 lg:text-3xl dark:text-white">
					Elija el estado de registro
				</h3>
				<p className="text-neutral-700 dark:text-gray-400">Estados populares</p>
				<ol className="mt-3 flex justify-center gap-2">
					{POPULAR_STATES.map((estado) => (
						<li key={estado}>
							<button
								type="button"
								onClick={() => setEstadoDeEmpresa(estado)}
								className={cn(
									'group flex items-center space-x-2 rounded-full border px-6 py-2 font-bold transition-all',
									estadoDeEmpresa === estado
										? 'bg-primary-gold border-primary-gold text-white'
										: 'bg-primary-gold/20 border-gold/50 text-gold hover:bg-primary-gold hover:text-white',
								)}
							>
								<span
									className={cn(
										'h-2 w-2 rounded-full',
										estadoDeEmpresa === estado
											? 'bg-white'
											: 'bg-primary-gold group-hover:bg-white',
									)}
								/>
								<span>{estado}</span>
							</button>
						</li>
					))}
				</ol>
			</div>
			<ul className="grid w-full place-items-center">
				<li className="w-4/5">
					<div id="seleccionar">
						<Select
							value={estadoDeEmpresa}
							onValueChange={(v) => setEstadoDeEmpresa(v ?? '')}
						>
							<SelectTrigger className="w-full border-neutral-700 bg-transparent p-5 text-neutral-500 dark:border-neutral-900 dark:bg-neutral-950 dark:text-gray-400">
								<SelectValue placeholder="Selecciona un estado" />
							</SelectTrigger>
							<SelectContent>
								{estados.map((es) => (
									<SelectItem key={es.Estado} value={es.Estado}>
										{es.Estado}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
				</li>
			</ul>
		</div>
	);

	const paso3 = (
		<div id="paso3" className="flex flex-col justify-center gap-5 p-10">
			<div className="text-center">
				<span className="bg-primary-gold/20 text-brand-gold mb-4 inline-block rounded-full px-3 py-1 text-xs font-bold tracking-widest uppercase">
					Paso 03
				</span>
				<h3 className="text-2xl text-neutral-800 lg:text-3xl dark:text-white">
					Escoge el nombre de tu empresa
				</h3>
				<p className="text-neutral-700 dark:text-gray-400">
					Elije los nombres que mas se adapten a tu empresa
				</p>
			</div>
			<ul className="flex w-full flex-col place-items-center gap-2">
				{[
					{
						label: 'Nombre de tu empresa - (opción #1)',
						id: 'nombre-empresa-1',
						name: 'nombre_1',
						value: nombre1,
						setter: setNombre1,
					},
					{
						label: 'Nombre de tu empresa - (opción #2)',
						id: 'nombre-empresa-2',
						name: 'nombre_2',
						value: nombre2,
						setter: setNombre2,
					},
					{
						label: 'Nombre de tu empresa - (opción #3)',
						id: 'nombre-empresa-3',
						name: 'nombre_3',
						value: nombre3,
						setter: setNombre3,
					},
				].map((field) => (
					<li key={field.id} className="m-2 h-full w-4/5">
						<label
							htmlFor={field.id}
							className="mb-2 block text-sm font-medium text-gray-900 dark:text-gray-400"
						>
							{field.label}
						</label>
						<div className="flex">
							<span className="rounded-e-0 inline-flex items-center rounded-s-md bg-gray-100 px-3 text-sm text-gray-900 dark:bg-neutral-950 dark:text-gray-400">
								<Icon
									icon="ri:building-2-line"
									className="text-primary-gold text-base"
								/>
							</span>
							<Input
								type="text"
								id={field.id}
								name={field.name}
								value={field.value}
								onChange={(e) => field.setter(e.target.value)}
								placeholder="Sotomayor Consulting"
								required
								className="focus:bg-white-100 rounded-s-none rounded-e-lg border-0 bg-gray-100 dark:bg-neutral-950 dark:text-white dark:focus:bg-neutral-900"
							/>
						</div>
					</li>
				))}
			</ul>
		</div>
	);

	const irAEditar = (paso: number) => {
		setCurrentStep(paso);
	};

	const paso4 = (
		<div id="paso4" className="flex flex-col justify-center gap-5 p-10">
			<div className="text-center">
				<span className="bg-primary-gold/20 text-brand-gold mb-4 inline-block rounded-full px-3 py-1 text-xs font-bold tracking-widest uppercase">
					Paso 04
				</span>
				<h3 className="text-2xl text-neutral-800 lg:text-3xl dark:text-white">
					Revisar o iniciar sesión
				</h3>
				<p className="text-black-800 dark:text-gray-400">
					Ya casi terminas. 🎉
				</p>
				<p className="text-black-800 dark:text-gray-400">
					Por favor revisa tu información y procede a registrarte.
				</p>
			</div>
			<ul className="grid w-full place-items-center gap-3">
				<li className="w-4/5">
					<div className="mt-5">
						<Card className="border-primary-gold dark:border-neutral-700">
							<CardContent className="flex items-center justify-between">
								<div>
									<p className="text-black-700 mt-1 text-sm dark:text-gray-400">
										Tipo de empresa
									</p>
									<CardTitle className="text-black-900 text-xs lg:text-xl dark:text-white">
										{tipoDeEmpresa || 'No seleccionado'}
									</CardTitle>
								</div>
								<Button
									variant="ghost"
									size="icon"
									onClick={() => irAEditar(0)}
									className="bg-primary-gold hover:bg-primary-gold/80 rounded-lg p-1 text-white dark:bg-neutral-900 dark:hover:bg-neutral-950"
								>
									<Icon icon="ri:edit-line" className="size-4" />
								</Button>
							</CardContent>
						</Card>
					</div>
					<div className="mt-5">
						<Card className="border-primary-gold dark:border-neutral-700">
							<CardContent className="flex items-center justify-between">
								<div>
									<p className="text-black-700 mt-1 text-sm dark:text-gray-400">
										Estado en el cual se va a registrar
									</p>
									<CardTitle className="text-black-900 text-xs lg:text-xl dark:text-white">
										{estadoDeEmpresa || 'No seleccionado'}
									</CardTitle>
								</div>
								<Button
									variant="ghost"
									size="icon"
									onClick={() => irAEditar(1)}
									className="bg-primary-gold hover:bg-primary-gold/80 rounded-lg p-1 text-white dark:bg-neutral-900 dark:hover:bg-neutral-950"
								>
									<Icon icon="ri:edit-line" className="size-4" />
								</Button>
							</CardContent>
						</Card>
					</div>
					<div className="mt-5">
						<Card className="border-primary-gold dark:border-neutral-700">
							<CardContent className="flex items-center justify-between">
								<div>
									<p className="text-black-700 mt-1 text-sm dark:text-gray-400">
										El nombre que seleccionaste
									</p>
									<CardTitle className="text-black-900 text-xs lg:text-xl dark:text-white">
										{nombre1 || 'No ingresado'}
									</CardTitle>
								</div>
								<Button
									variant="ghost"
									size="icon"
									onClick={() => irAEditar(2)}
									className="bg-primary-gold hover:bg-primary-gold/80 rounded-lg p-1 text-white dark:bg-neutral-900 dark:hover:bg-neutral-950"
								>
									<Icon icon="ri:edit-line" className="size-4" />
								</Button>
							</CardContent>
						</Card>
					</div>
				</li>
			</ul>
		</div>
	);

	const formularioRegistro = (
		<div className="pt:mt-0 mx-auto flex w-full flex-col items-center justify-center px-6 py-8">
			<div className="dark:bg-black-800 w-full max-w-xl space-y-8 rounded-lg bg-gray-200 p-6 shadow sm:p-8">
				<div className="flex justify-center">
					<Icon
						icon="ri:building-2-line"
						className="text-primary-gold text-5xl"
					/>
				</div>
				<h2 className="text-2xl font-bold text-gray-900 dark:text-white">
					Crea tu cuenta gratuita
				</h2>
				<form className="mt-8 space-y-6" onSubmit={registrar}>
					<div className="grid grid-cols-2 gap-x-6 gap-y-8">
						<div>
							<label
								htmlFor="reg-name"
								className="mb-2 block text-sm font-medium text-gray-900 dark:text-white"
							>
								Nombre
							</label>
							<Input
								type="text"
								id="reg-name"
								name="name"
								value={regName}
								onChange={(e) => setRegName(e.target.value)}
								placeholder="Nombre"
								required
								className="w-full"
							/>
						</div>
						<div>
							<label
								htmlFor="reg-last-name"
								className="mb-2 block text-sm font-medium text-gray-900 dark:text-white"
							>
								Apellido
							</label>
							<Input
								type="text"
								id="reg-last-name"
								name="last-name"
								value={regLastName}
								onChange={(e) => setRegLastName(e.target.value)}
								placeholder="Apellido"
								required
								className="w-full"
							/>
						</div>
					</div>
					<div>
						<label
							htmlFor="reg-email"
							className="mb-2 block text-sm font-medium text-gray-900 dark:text-white"
						>
							Tu correo
						</label>
						<Input
							type="email"
							id="reg-email"
							name="email"
							value={regEmail}
							onChange={(e) => setRegEmail(e.target.value)}
							placeholder="correo@ejemplo.com"
							required
							className="w-full"
						/>
					</div>
					<div>
						<label
							htmlFor="reg-password"
							className="mb-2 block text-sm font-medium text-gray-900 dark:text-white"
						>
							Contraseña
						</label>
						<Input
							type="password"
							id="reg-password"
							name="password"
							value={regPassword}
							onChange={(e) => setRegPassword(e.target.value)}
							placeholder="••••••••"
							minLength={8}
							required
							className="w-full"
						/>
					</div>
					<div>
						<label
							htmlFor="reg-confirm-password"
							className="mb-2 block text-sm font-medium text-gray-900 dark:text-white"
						>
							Confirmar contraseña
						</label>
						<Input
							type="password"
							id="reg-confirm-password"
							name="confirm-password"
							value={regConfirmPassword}
							onChange={(e) => setRegConfirmPassword(e.target.value)}
							placeholder="••••••••"
							required
							className="w-full"
						/>
					</div>
					<div className="flex items-start">
						<div className="flex h-5 items-center">
							<input
								id="reg-accept-terms"
								name="remember"
								type="checkbox"
								checked={regAcceptTerms}
								onChange={(e) => setRegAcceptTerms(e.target.checked)}
								className="focus:ring-primary-gold h-4 w-4 rounded border border-gray-300 bg-gray-50 focus:ring-3 dark:border-gray-600 dark:bg-gray-700 dark:ring-offset-gray-800"
								required
							/>
						</div>
						<div className="ml-3 text-sm">
							<label
								htmlFor="reg-accept-terms"
								className="font-medium text-gray-900 dark:text-white"
							>
								Al registrarte, estás creando una cuenta de SOTOMAYOR CONSULTING
								INTERNATIONAL LLC y aceptas los{' '}
								<a
									href="https://sotomayorconsulting.com/inicio/politicas/"
									className="text-[#8c681d] hover:underline dark:text-[#8c681d]"
								>
									Términos de uso y la Política de privacidad.
								</a>
							</label>
						</div>
					</div>
					<button
						type="submit"
						disabled={isRegistering}
						className="w-full cursor-pointer rounded-lg bg-[#967432] px-5 py-3 text-center text-base font-medium text-white hover:bg-[#8c681d] focus:ring-4 focus:ring-[#967432]/50 focus:outline-none disabled:opacity-50"
					>
						{isRegistering ? 'Creando cuenta...' : 'Crear una cuenta'}
					</button>
				</form>
				<div className="relative">
					<div className="absolute inset-0 flex items-center">
						<div className="w-full border-t border-gray-300 dark:border-gray-600" />
					</div>
					<div className="relative flex justify-center text-sm">
						<span className="dark:bg-black-800 bg-gray-200 px-5 text-gray-500 dark:text-gray-400">
							o
						</span>
					</div>
				</div>
				<div>
					<form action="/api/auth/oauth/google" method="post">
						<button
							type="submit"
							name="provider"
							className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-gray-500 p-2.5 hover:bg-slate-700/10 dark:border-white dark:text-white dark:hover:bg-slate-300/10"
						>
							<Icon icon="ri:google-fill" className="size-5" />
							<span>Regístrate con Google</span>
						</button>
					</form>
				</div>
			</div>
		</div>
	);

	const wizardNavigation = !showRegisterForm && (
		<div
			className={cn(
				'fixed inset-x-0 bottom-4 z-40 mx-auto w-full max-w-4xl px-4',
				currentStep === 0 ? 'flex justify-center' : 'grid grid-cols-2 gap-2',
			)}
		>
			{currentStep > 0 && (
				<WizardActionButton onClick={retroceder}>Retroceder</WizardActionButton>
			)}
			{renderNextButton(
				currentStep === 0 ? 'w-4/5 border-neutral-500 md:w-3/5' : undefined,
			)}
		</div>
	);

	return (
		<>
			<Toaster />

			<Dialog open={helpDialogOpen} onOpenChange={setHelpDialogOpen}>
				<DialogContent className="sm:max-w-2xl">
					<DialogHeader>
						<div className="mb-8 flex justify-center">
							<div className="bg-brand-gold/10 border-brand-gold/20 flex h-20 w-20 items-center justify-center rounded-2xl border shadow-[0_0_30px_rgba(176,141,66,0.15)]">
								<Icon
									icon="ri:calendar-todo-line"
									className="text-primary-gold text-5xl"
								/>
							</div>
						</div>
						<DialogTitle className="text-center text-3xl leading-tight font-bold tracking-tight md:text-4xl">
							Encuentre el tipo de entidad{' '}
							<span className="text-primary-gold">
								adecuado para su negocio
							</span>
						</DialogTitle>
						<DialogDescription className="mx-auto max-w-lg text-center text-lg leading-relaxed">
							La elección de tu entidad legal es el primer gran paso. Evita
							riesgos fiscales y legales. Nuestros consultores te brindan una
							asesoría gratuita para identificar la mejor opción.
						</DialogDescription>
					</DialogHeader>
					<div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
						<a
							href="https://sotomayorconsulting.com/diagnostico-llc/"
							className="bg-primary-gold hover:bg-brand-gold-hover shadow-brand-gold/10 w-full transform rounded-lg px-8 py-4 text-center font-bold text-black shadow-lg transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] sm:w-auto"
						>
							Realiza un Diagnostico breve
						</a>
						<a
							href="https://zcal.co/t/agendar-asesoria-llc/60min"
							className="border-brand-gold/40 w-full transform rounded-lg border bg-transparent px-8 py-4 text-center font-semibold text-white transition-all duration-300 hover:scale-[1.02] hover:bg-white/5 active:scale-[0.98] sm:w-auto"
						>
							Agendar una cita
						</a>
					</div>
					<div className="mt-10 border-t border-white/5 pt-8 text-center">
						<p className="text-muted-foreground text-sm italic">
							Asegurando un crecimiento sólido y protegido en EE. UU.
						</p>
					</div>
				</DialogContent>
			</Dialog>

			<div className="relative my-8 pb-24 md:pb-28">
				<div className="my-8 grid h-full w-full items-center justify-center lg:grid-cols-2">
					{stepper}

					<div className="h-full w-full px-5 py-20">
						<div className="bg-opacity-20 z-20 grid h-full w-full place-self-center rounded-lg bg-white bg-cover bg-center drop-shadow-xl dark:bg-black">
							{currentStep === 0 && paso1}
							{currentStep === 1 && paso2}
							{currentStep === 2 && paso3}
							{currentStep === 3 && !showRegisterForm && paso4}
							{showRegisterForm && formularioRegistro}
						</div>
					</div>
				</div>
				{wizardNavigation}
			</div>
		</>
	);
}

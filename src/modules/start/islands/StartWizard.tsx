import '@shared/iconify-ri';

import * as React from 'react';
import { flushSync } from 'react-dom';
import { Icon } from '@iconify/react';
import { navigate } from 'astro:transitions/client';
import { toast } from 'sonner';

import Toaster from '@components/ui/Sonner';
import { buttonVariants } from '@components/ui/Button';
import { Checkbox } from '@components/ui/Checkbox';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from '@components/ui/Dialog';
import { FieldLabel } from '@components/ui/Field';
import { Input } from '@components/ui/Input';
import { Spinner } from '@components/ui/Spinner';
import {
	Combobox,
	ComboboxContent,
	ComboboxEmpty,
	ComboboxInput,
	ComboboxItem,
	ComboboxList,
} from '@components/ui/Combobox';
import { cn } from '@components/utils';
import type { IncorporationStartDraft } from '@shared/incorporation-draft';
import LogoDark from '../../../icons/Letras_logo_SCI.svg';
import Isotipo from '../../../icons/isotipo.svg';

import type { StartState } from '../types';

declare const turnstile: {
	render: (
		container: string | HTMLElement,
		options: {
			sitekey: string;
			theme?: 'light' | 'dark' | 'auto';
			size?: 'normal' | 'flexible' | 'compact';
			language?: string;
			callback?: (token: string) => void;
			'expired-callback'?: () => void;
			'error-callback'?: (errorCode: string) => void;
		},
	) => string;
	remove: (widgetId: string) => void;
};

interface Props {
	states: StartState[];
	initialDraft: IncorporationStartDraft;
	isAuthenticated: boolean;
	userEmail?: string | undefined;
	turnstileSiteKey?: string | undefined;
}

type AuthTab = 'sign-in' | 'sign-up';

type SignInResponse = {
	ok?: boolean;
	error?: string;
	data?: { redirect?: string };
};

type RegisterResponse = {
	ok?: boolean;
	error?: string;
	data?: {
		requiresEmailConfirmation?: boolean;
		message?: string;
		redirect?: string;
	};
};

type SaveIncorporationResponse = {
	ok?: boolean;
	message?: string;
	redirectTo?: string;
	incorporationId?: string | null;
};

const STEPS = [
	{
		icon: 'ri:building-4-line',
		title: 'Tipo de empresa',
		description: 'Elige tu entidad comercial. ¿No estás seguro? Te ayudamos.',
	},
	{
		icon: 'ri:map-pin-line',
		title: 'Estado de registro',
		description: 'Elige dónde registrar tu empresa.',
	},
	{
		icon: 'ri:file-list-3-line',
		title: 'Nombre de tu empresa',
		description: 'Propón tres opciones de nombre.',
	},
	{
		icon: 'ri:check-double-line',
		title: 'Verifica y regístrate',
		description: 'Revisa tus datos y entra a la plataforma.',
	},
];

// Estados recomendados para formar una LLC (resueltos por nombre contra la
// tabla `states` para no depender de IDs hardcodeados). El orden refleja la
// recomendación más común para no residentes: Wyoming > Delaware > Florida.
const RECOMMENDED_STATES = [
	{
		name: 'Wyoming',
		tag: 'Más elegido',
		reason: 'Máxima privacidad y costos anuales bajos.',
	},
	{
		name: 'Delaware',
		tag: 'Para inversores',
		reason: 'Marco legal ideal para startups y capital.',
	},
	{
		name: 'Florida',
		tag: 'Mercado local',
		reason: 'Ideal si operas activamente en EE. UU.',
	},
];

const STEP = {
	ENTITY_TYPE: 0,
	STATE: 1,
	COMPANY_NAME: 2,
	REVIEW: 3,
} as const;

// Mismo tratamiento de inputs que FormSignIn / FormSignUp (flat/open layout)
const cleanInputClass =
	'h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-none placeholder:text-slate-400 focus-visible:border-[#8c681d] focus-visible:ring-2 focus-visible:ring-[#8c681d]/20 dark:border-input dark:bg-white/10 dark:text-slate-100 dark:placeholder:text-neutral-500 autofill:shadow-[inset_0_0_0_1000px_white] autofill:[font-family:inherit] autofill:[font-size:inherit] dark:autofill:shadow-[inset_0_0_0_1000px_#1a1a1a] dark:autofill:[-webkit-text-fill-color:#f1f5f9] dark:caret-slate-100';

const labelClass =
	'mb-2 block text-sm font-medium text-slate-900 dark:text-white';

function openOAuthPopup(url: string) {
	const width = 500;
	const height = 600;
	const left = window.screenX + (window.outerWidth - width) / 2;
	const top = window.screenY + (window.outerHeight - height) / 2;
	return window.open(
		url,
		'oauth-popup',
		`width=${width},height=${height},left=${left},top=${top},popup=yes`,
	);
}

function GoogleIcon() {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			viewBox="0 0 24 24"
			fill="currentColor"
			className="size-5"
		>
			<path d="M3.064 7.51A10 10 0 0 1 12 2c2.695 0 4.959.991 6.69 2.605l-2.867 2.868C14.786 6.482 13.468 5.977 12 5.977c-2.605 0-4.81 1.76-5.595 4.123c-.2.6-.314 1.24-.314 1.9s.114 1.3.314 1.9c.786 2.364 2.99 4.123 5.595 4.123c1.345 0 2.49-.355 3.386-.955a4.6 4.6 0 0 0 1.996-3.018H12v-3.868h9.418c.118.654.182 1.336.182 2.045c0 3.046-1.09 5.61-2.982 7.35C16.964 21.105 14.7 22 12 22A9.996 9.996 0 0 1 2 12c0-1.614.386-3.14 1.064-4.49" />
		</svg>
	);
}

function DarkModeToggle() {
	return (
		<button
			type="button"
			onClick={() => {
				const toggle = () => {
					const isDark = document.documentElement.classList.toggle('dark');
					localStorage.setItem('color-theme', isDark ? 'dark' : 'light');
					document.dispatchEvent(new Event('dark-mode'));
				};
				if (document.startViewTransition) {
					document.startViewTransition(toggle);
				} else {
					toggle();
				}
			}}
			className="text-slate-500 hover:text-slate-700 dark:text-white dark:hover:text-slate-300"
			aria-label="Cambiar tema"
		>
			<svg
				className="hidden size-5 dark:block"
				fill="none"
				stroke="currentColor"
				strokeWidth="1.8"
				strokeLinecap="round"
				strokeLinejoin="round"
				viewBox="0 0 24 24"
			>
				<circle cx="12" cy="12" r="4" />
				<path d="M12 2v2" />
				<path d="M12 20v2" />
				<path d="M4.93 4.93l1.41 1.41" />
				<path d="M17.66 17.66l1.41 1.41" />
				<path d="M2 12h2" />
				<path d="M20 12h2" />
				<path d="M6.34 17.66l-1.41 1.41" />
				<path d="M19.07 4.93l-1.41 1.41" />
			</svg>
			<svg
				className="block size-5 dark:hidden"
				fill="none"
				stroke="currentColor"
				strokeWidth="1.8"
				strokeLinecap="round"
				strokeLinejoin="round"
				viewBox="0 0 24 24"
			>
				<path d="M12 3a6 6 0 1 0 9 9 9 9 0 1 1-9-9z" />
			</svg>
		</button>
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
		<div className="space-y-2 text-center">
			<p className="text-primary-gold text-xs font-semibold tracking-[0.25em] uppercase">
				Paso {String(step + 1).padStart(2, '0')} · de{' '}
				{String(STEPS.length).padStart(2, '0')}
			</p>
			<h1 className="text-2xl font-semibold text-slate-900 dark:text-white">
				{title}
			</h1>
			<p className="text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>
		</div>
	);
}

function SectionDivider({ label }: { label: string }) {
	return (
		<div className="flex w-full items-center gap-3">
			<div className="h-px flex-1 bg-slate-200 dark:bg-white/10" />
			<span className="text-xs text-slate-500 dark:text-slate-400">
				{label}
			</span>
			<div className="h-px flex-1 bg-slate-200 dark:bg-white/10" />
		</div>
	);
}

function PasswordToggle({
	visible,
	onToggle,
}: {
	visible: boolean;
	onToggle: () => void;
}) {
	return (
		<button
			type="button"
			onClick={onToggle}
			className="absolute inset-y-0 right-0 flex items-center pr-3 text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"
		>
			{visible ? 'Ocultar' : 'Mostrar'}
		</button>
	);
}

export default function StartWizard({
	states,
	initialDraft,
	isAuthenticated,
	userEmail,
	turnstileSiteKey,
}: Props) {
	const [currentStep, setCurrentStep] = React.useState<number>(
		initialDraft.current_step,
	);
	const [tipoDeEmpresa, setTipoDeEmpresa] = React.useState(
		initialDraft.tipo_de_empresa,
	);
	const [estadoDeEmpresa, setEstadoDeEmpresa] = React.useState(
		initialDraft.estado_de_empresa,
	);
	const [nombre1, setNombre1] = React.useState(initialDraft.nombre_1);
	const [nombre2, setNombre2] = React.useState(initialDraft.nombre_2);
	const [nombre3, setNombre3] = React.useState(initialDraft.nombre_3);

	const [showAuthPanel, setShowAuthPanel] = React.useState(false);
	const [authTab, setAuthTab] = React.useState<AuthTab>('sign-in');
	const [helpDialogOpen, setHelpDialogOpen] = React.useState(false);
	const [isSavingDraft, setIsSavingDraft] = React.useState(false);
	const [isFinalizing, setIsFinalizing] = React.useState(false);

	const [isSigningIn, setIsSigningIn] = React.useState(false);
	const [signInError, setSignInError] = React.useState<string | null>(null);
	const [showLoginPassword, setShowLoginPassword] = React.useState(false);

	const [isRegistering, setIsRegistering] = React.useState(false);
	const [signUpError, setSignUpError] = React.useState<string | null>(null);
	const [showRegPassword, setShowRegPassword] = React.useState(false);
	const [showRegConfirm, setShowRegConfirm] = React.useState(false);
	const [googlePending, setGooglePending] = React.useState(false);

	const [turnstileToken, setTurnstileToken] = React.useState<string | null>(
		null,
	);
	const turnstileRequired = !!turnstileSiteKey;

	const hasHydratedDraft = React.useRef(false);
	const popupRef = React.useRef<Window | null>(null);
	const popupCheckTimerRef = React.useRef<number | null>(null);
	const popupTimeoutRef = React.useRef<number | null>(null);

	const clearPopupWatchers = React.useCallback(() => {
		if (popupCheckTimerRef.current) {
			window.clearInterval(popupCheckTimerRef.current);
			popupCheckTimerRef.current = null;
		}
		if (popupTimeoutRef.current) {
			window.clearTimeout(popupTimeoutRef.current);
			popupTimeoutRef.current = null;
		}
		popupRef.current = null;
	}, []);

	const stopGooglePending = React.useCallback(() => {
		setGooglePending(false);
		clearPopupWatchers();
	}, [clearPopupWatchers]);

	const handleOAuthResult = React.useCallback(
		(data: unknown) => {
			if (!data || typeof data !== 'object') return;
			const result = data as { type?: string; status?: string };
			if (result.type !== 'oauth-callback') return;

			stopGooglePending();

			if (result.status === 'success') {
				navigate('/start');
			}
		},
		[stopGooglePending],
	);

	// ─── Mensajes de estado via query params (?status=&msg=) ─────
	React.useEffect(() => {
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
	}, []);

	React.useEffect(() => {
		const bc = new BroadcastChannel('oauth-result');
		bc.onmessage = (event: MessageEvent) => handleOAuthResult(event.data);

		const onStorage = (event: StorageEvent) => {
			if (event.key !== 'oauth-result' || !event.newValue) return;
			try {
				handleOAuthResult(JSON.parse(event.newValue));
			} catch {
				stopGooglePending();
			}
		};
		window.addEventListener('storage', onStorage);

		const onMessage = (event: MessageEvent) => {
			if (event.origin !== window.location.origin) return;
			handleOAuthResult(event.data);
		};
		window.addEventListener('message', onMessage);

		return () => {
			bc.close();
			window.removeEventListener('message', onMessage);
			window.removeEventListener('storage', onStorage);
			clearPopupWatchers();
		};
	}, [clearPopupWatchers, handleOAuthResult, stopGooglePending]);

	// ─── Persistencia del borrador (cookie server-side) ──────────
	const persistDraft = React.useCallback(
		async (draft: Partial<IncorporationStartDraft>) => {
			setIsSavingDraft(true);
			try {
				await fetch('/api/incorporations/draft', {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						Accept: 'application/json',
					},
					body: JSON.stringify(draft),
				});
			} finally {
				setIsSavingDraft(false);
			}
		},
		[],
	);

	React.useEffect(() => {
		const draft: IncorporationStartDraft = {
			tipo_de_empresa: tipoDeEmpresa,
			estado_de_empresa: estadoDeEmpresa,
			nombre_1: nombre1,
			nombre_2: nombre2,
			nombre_3: nombre3,
			estado_de: 'draft',
			current_step: currentStep,
		};

		if (!hasHydratedDraft.current) {
			hasHydratedDraft.current = true;
			return;
		}

		const timeoutId = window.setTimeout(() => {
			void persistDraft(draft);
		}, 250);

		return () => window.clearTimeout(timeoutId);
	}, [
		currentStep,
		estadoDeEmpresa,
		nombre1,
		nombre2,
		nombre3,
		persistDraft,
		tipoDeEmpresa,
	]);

	// ─── Cloudflare Turnstile (explicit render, solo tab sign-in) ─
	React.useEffect(() => {
		if (!turnstileSiteKey || !showAuthPanel || authTab !== 'sign-in') return;

		let widgetId: string | null = null;

		const TURNSTILE_SRC =
			'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

		const renderWidget = () => {
			const container = document.getElementById('turnstile-widget-start');
			if (!container || typeof turnstile === 'undefined') return;

			const isDark = document.documentElement.classList.contains('dark');
			widgetId = turnstile.render(container, {
				sitekey: turnstileSiteKey,
				theme: isDark ? 'dark' : 'light',
				size: 'flexible',
				language: 'es',
				callback: (token: string) => setTurnstileToken(token),
				'expired-callback': () => setTurnstileToken(null),
				'error-callback': () => setTurnstileToken(null),
			});
		};

		if (typeof turnstile !== 'undefined') {
			renderWidget();
		} else {
			const existing = document.querySelector<HTMLScriptElement>(
				`script[src^="https://challenges.cloudflare.com/turnstile"]`,
			);
			if (existing) {
				existing.addEventListener('load', renderWidget, { once: true });
			} else {
				const script = document.createElement('script');
				script.src = TURNSTILE_SRC;
				script.async = true;
				script.defer = true;
				script.onload = renderWidget;
				document.head.appendChild(script);
			}
		}

		return () => {
			if (widgetId && typeof turnstile !== 'undefined') {
				turnstile.remove(widgetId);
			}
			setTurnstileToken(null);
		};
	}, [turnstileSiteKey, showAuthPanel, authTab]);

	// ─── Navegación del wizard ────────────────────────────────────
	// Transición suave entre pasos con la View Transitions API nativa
	// (misma base que usa Astro). `flushSync` fuerza a React a aplicar el
	// cambio de estado de forma síncrona dentro del snapshot; `dir` alimenta
	// la CSS para animar hacia adelante o hacia atrás.
	const runStepTransition = React.useCallback(
		(dir: 'forward' | 'back', update: () => void) => {
			if (!document.startViewTransition) {
				update();
				return;
			}
			document.documentElement.dataset['stepDir'] = dir;
			const transition = document.startViewTransition(() => {
				flushSync(update);
			});
			void transition.finished.finally(() => {
				delete document.documentElement.dataset['stepDir'];
			});
		},
		[],
	);

	const validateNames = React.useCallback((): string | null => {
		if (!nombre1.trim()) return 'El primer nombre de empresa es obligatorio';
		if (!nombre2.trim()) return 'El segundo nombre de empresa es obligatorio';
		if (!nombre3.trim()) return 'El tercer nombre de empresa es obligatorio';
		return null;
	}, [nombre1, nombre2, nombre3]);

	const goToStep = (paso: number) => {
		const dir = paso < currentStep || showAuthPanel ? 'back' : 'forward';
		runStepTransition(dir, () => {
			setCurrentStep(paso);
			if (showAuthPanel) setShowAuthPanel(false);
		});
	};

	const handleNext = () => {
		if (currentStep === STEP.COMPANY_NAME) {
			const error = validateNames();
			if (error) {
				toast.error(error);
				return;
			}
		}
		runStepTransition('forward', () =>
			setCurrentStep((prev) => Math.min(prev + 1, STEP.REVIEW)),
		);
	};

	const handleBack = () => {
		if (showAuthPanel) {
			runStepTransition('back', () => setShowAuthPanel(false));
			return;
		}
		runStepTransition('back', () =>
			setCurrentStep((prev) => Math.max(prev - 1, 0)),
		);
	};

	const finalizeIncorporation = async () => {
		const error = validateNames();
		if (error) {
			toast.error(error);
			return;
		}

		setIsFinalizing(true);
		try {
			const formData = new FormData();
			formData.set('tipo_de_empresa', tipoDeEmpresa);
			formData.set('estado_de_empresa', String(estadoDeEmpresa));
			formData.set('nombre_1', nombre1);
			formData.set('nombre_2', nombre2);
			formData.set('nombre_3', nombre3);
			formData.set('estado_de', 'draft');

			const res = await fetch('/api/incorporations/save', {
				method: 'POST',
				headers: { Accept: 'application/json' },
				body: formData,
			});
			const result = (await res.json()) as SaveIncorporationResponse;

			if (!res.ok || result.ok === false) {
				throw new Error(result.message || 'No se pudo registrar la empresa.');
			}

			navigate(result.redirectTo || '/');
		} catch {
			toast.error('No se pudo registrar la empresa. Intenta nuevamente.');
			setIsFinalizing(false);
		}
	};

	const handleReviewContinue = async () => {
		if (isAuthenticated) {
			await finalizeIncorporation();
			return;
		}

		const error = validateNames();
		if (error) {
			toast.error(error);
			return;
		}

		runStepTransition('forward', () => {
			setShowAuthPanel(true);
			setAuthTab('sign-in');
		});
	};

	// ─── Auth: sign-in / registro (reusa endpoints existentes) ───
	const handleSignIn = async (e: React.SyntheticEvent<HTMLFormElement>) => {
		e.preventDefault();
		const formData = new FormData(e.currentTarget);

		if (turnstileRequired && !turnstileToken) {
			setSignInError('Completa la verificación de seguridad.');
			return;
		}
		if (turnstileToken) {
			formData.set('cf-turnstile-response', turnstileToken);
		}

		setIsSigningIn(true);
		setSignInError(null);
		try {
			const response = await fetch('/api/auth/sign-in', {
				method: 'POST',
				headers: { Accept: 'application/json' },
				body: formData,
			});
			const payload = (await response.json()) as SignInResponse;

			if (!response.ok || payload.ok === false) {
				throw new Error(payload.error || 'No se pudo iniciar sesión.');
			}

			navigate(payload.data?.redirect || '/start');
		} catch (error) {
			setSignInError(
				error instanceof Error ? error.message : 'No se pudo iniciar sesión.',
			);
			setIsSigningIn(false);
		}
	};

	const handleRegister = async (e: React.SyntheticEvent<HTMLFormElement>) => {
		e.preventDefault();
		const formData = new FormData(e.currentTarget);

		const password = formData.get('password')?.toString() ?? '';
		const confirmPassword = formData.get('confirm-password')?.toString() ?? '';

		if (password !== confirmPassword) {
			setSignUpError('Las contraseñas no coinciden.');
			return;
		}
		if (password.length < 8) {
			setSignUpError('La contraseña debe tener al menos 8 caracteres.');
			return;
		}

		setIsRegistering(true);
		setSignUpError(null);
		try {
			const res = await fetch('/api/auth/register-start', {
				method: 'POST',
				headers: { Accept: 'application/json' },
				body: formData,
			});
			const result = (await res.json()) as RegisterResponse;

			if (!res.ok || result.ok === false) {
				throw new Error(result.error || 'Error en el registro.');
			}

			if (result.data?.requiresEmailConfirmation === false) {
				navigate(result.data?.redirect || '/start');
				return;
			}

			toast.success(
				result.data?.message ||
					'Registro exitoso. Revisa tu email para confirmar.',
			);
			setAuthTab('sign-in');
			setIsRegistering(false);
		} catch (error) {
			setSignUpError(
				error instanceof Error ? error.message : 'Error de conexión.',
			);
			setIsRegistering(false);
		}
	};

	const handleGoogleLogin = async () => {
		if (googlePending) return;
		setGooglePending(true);

		const popup = openOAuthPopup('about:blank');
		if (!popup) {
			stopGooglePending();
			return;
		}

		popupRef.current = popup;
		popupCheckTimerRef.current = window.setInterval(() => {
			const currentPopup = popupRef.current;
			if (!currentPopup) return;
			try {
				if (currentPopup.closed) {
					stopGooglePending();
				}
			} catch {
				// noop
			}
		}, 350);

		popupTimeoutRef.current = window.setTimeout(() => {
			stopGooglePending();
		}, 2 * 60 * 1000);

		try {
			const res = await fetch('/api/auth/oauth/popup-url', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ provider: 'google' }),
			});
			const json = await res.json();
			if (json.data?.url) {
				popup.location.href = json.data.url;
			} else {
				popup.close();
				stopGooglePending();
			}
		} catch {
			popup.close();
			stopGooglePending();
		}
	};

	// ─── Datos derivados ──────────────────────────────────────────
	const nameFields = [
		{
			hint: 'Tu opción preferida',
			id: 'nombre-empresa-1',
			name: 'nombre_1',
			value: nombre1,
			setter: setNombre1,
			placeholder: 'Ej. Sotomayor Ventures LLC',
			preferred: true,
		},
		{
			hint: 'Segunda alternativa',
			id: 'nombre-empresa-2',
			name: 'nombre_2',
			value: nombre2,
			setter: setNombre2,
			placeholder: 'Ej. Sotomayor Holdings LLC',
			preferred: false,
		},
		{
			hint: 'Tercera alternativa',
			id: 'nombre-empresa-3',
			name: 'nombre_3',
			value: nombre3,
			setter: setNombre3,
			placeholder: 'Ej. Sotomayor Global LLC',
			preferred: false,
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
			value:
				states.find((s) => s.id === estadoDeEmpresa)?.name ??
				String(estadoDeEmpresa),
			step: STEP.STATE,
		},
		{
			label: 'Nombres propuestos',
			value: [nombre1, nombre2, nombre3].filter(Boolean).join(' · '),
			step: STEP.COMPANY_NAME,
		},
	];

	// ─── Panel izquierdo: marca + stepper (flat) ─────────────────
	const brandPanel = (
		<div className="group relative hidden h-full min-h-screen flex-col overflow-hidden p-10 lg:flex dark:border-r dark:border-neutral-900">
			<div className="absolute inset-0 bg-white dark:bg-transparent" />
			{/* Marca de agua sutil tipo hoja membretada. La máscara radial la
			    difumina hacia los bordes para que no se vea recortada. */}
			<img
				src={Isotipo.src}
				alt=""
				aria-hidden="true"
				className="pointer-events-none absolute -right-32 -bottom-28 z-0 w-[600px] max-w-none rotate-6 [mask-image:radial-gradient(closest-side,black_55%,transparent)] opacity-[0.04] invert select-none dark:opacity-[0.07] dark:invert-0"
			/>
			<div className="relative z-20 flex items-center text-lg font-medium">
				<a href="https://sotomayorconsulting.com/inicio/">
					<img
						src={LogoDark.src}
						alt="Sotomayor Consulting"
						className="mr-3 h-7 invert dark:invert-0"
					/>
				</a>
			</div>

			<div className="relative z-20 flex flex-1 flex-col justify-center">
				<div className="mx-auto w-full max-w-md">
					<h2 className="text-4xl font-semibold text-balance text-slate-900 dark:text-white">
						Inicie su empresa en EE.&nbsp;UU. en minutos.
					</h2>
					<p className="mt-4 text-base text-slate-500 dark:text-slate-400">
						Responda algunas preguntas para ayudarnos a formar su nueva empresa.
					</p>

					<ol className="mt-12">
						{STEPS.map((step, index) => {
							const isActive = index === currentStep;
							const isCompleted = index < currentStep;
							const isLast = index === STEPS.length - 1;
							return (
								<li key={step.title}>
									<button
										type="button"
										onClick={() => goToStep(index)}
										className="flex w-full items-start gap-4 rounded-xl px-2 py-3 text-left transition-colors hover:bg-slate-50 dark:hover:bg-white/5"
										aria-current={isActive ? 'step' : undefined}
									>
										<span
											className={cn(
												'flex size-11 shrink-0 items-center justify-center rounded-full border transition-all',
												isCompleted &&
													'border-primary-gold bg-primary-gold text-white',
												isActive &&
													!isCompleted &&
													'border-primary-gold text-primary-gold ring-primary-gold/20 ring-2',
												!isActive &&
													!isCompleted &&
													'border-slate-200 text-slate-400 dark:border-neutral-800 dark:text-neutral-500',
											)}
										>
											<Icon
												icon={isCompleted ? 'ri:check-line' : step.icon}
												className="size-5"
											/>
										</span>
										<span className="min-w-0 pt-1">
											<span
												className={cn(
													'block text-base font-semibold transition-colors',
													isActive && 'text-slate-900 dark:text-white',
													isCompleted && !isActive && 'text-primary-gold',
													!isActive &&
														!isCompleted &&
														'text-slate-400 dark:text-neutral-500',
												)}
											>
												{step.title}
											</span>
											<span
												className={cn(
													'mt-0.5 block text-sm transition-colors',
													isActive
														? 'text-slate-500 dark:text-slate-400'
														: 'text-slate-400 dark:text-neutral-600',
												)}
											>
												{step.description}
											</span>
										</span>
									</button>
									{!isLast && (
										<span
											aria-hidden="true"
											className={cn(
												'ml-[30px] block h-6 w-px',
												isCompleted
													? 'bg-primary-gold/50'
													: 'bg-slate-200 dark:bg-neutral-800',
											)}
										/>
									)}
								</li>
							);
						})}
					</ol>
				</div>
			</div>

			<div className="relative z-20 mt-auto">
				<p className="text-sm text-slate-400 italic dark:text-white/50">
					Asegurando un crecimiento sólido y protegido en EE. UU.
				</p>
			</div>
		</div>
	);

	// ─── Header móvil: logo + dots ────────────────────────────────
	const mobileHeader = (
		<div className="flex flex-col items-center gap-5 lg:hidden">
			<a href="https://sotomayorconsulting.com/inicio/">
				<img
					src={LogoDark.src}
					alt="Sotomayor Consulting"
					className="h-6 invert dark:invert-0"
				/>
			</a>
			<div className="flex items-center gap-2">
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
									: 'w-2 bg-slate-300 dark:bg-neutral-700',
						)}
						aria-label={`Ir al paso ${index + 1}`}
					/>
				))}
			</div>
		</div>
	);

	// ─── Paso 1: tipo de empresa ──────────────────────────────────
	const paso1 = (
		<div className="w-full space-y-8">
			<StepHeader
				step={STEP.ENTITY_TYPE}
				title="Estructura de la empresa"
				subtitle="Elija el tipo de entidad adecuada para su negocio."
			/>
			<div className="space-y-3">
				<label
					htmlFor="LLC_radio_btn"
					className={cn(
						'group/opt flex cursor-pointer items-center gap-4 rounded-xl border p-4 transition-all',
						tipoDeEmpresa === 'LLC'
							? 'border-[#8c681d] ring-2 ring-[#8c681d]/20'
							: 'border-slate-200 hover:border-slate-300 dark:border-neutral-800 dark:hover:border-neutral-700',
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
					<span className="bg-primary-gold/10 text-primary-gold rounded-lg p-2.5">
						<Icon icon="ri:building-4-line" className="size-5" />
					</span>
					<span className="min-w-0 flex-1">
						<span className="block text-sm font-semibold text-slate-900 dark:text-white">
							LLC
						</span>
						<span className="block text-xs text-slate-500 dark:text-slate-400">
							Tarifas mínimas + privacidad y flexibilidad inigualables.
						</span>
					</span>
					<Icon
						icon="ri:arrow-right-s-line"
						className={cn(
							'size-5 shrink-0 transition-all',
							tipoDeEmpresa === 'LLC'
								? 'text-primary-gold translate-x-0.5'
								: 'text-slate-300 group-hover/opt:text-slate-500 dark:text-neutral-600',
						)}
					/>
				</label>

				<button
					type="button"
					onClick={() => setHelpDialogOpen(true)}
					className="group/opt hover:border-primary-gold/50 flex w-full cursor-pointer items-center gap-4 rounded-xl border border-dashed border-slate-300 p-4 text-left transition-all dark:border-neutral-700"
				>
					<span className="bg-primary-gold/10 text-primary-gold rounded-lg p-2.5">
						<Icon icon="ri:question-line" className="size-5" />
					</span>
					<span className="min-w-0 flex-1">
						<span className="block text-sm font-semibold text-slate-900 dark:text-white">
							Ayúdame a elegir
						</span>
						<span className="block text-xs text-slate-500 dark:text-slate-400">
							Evaluación estratégica para entender tu etapa y el paso exacto que
							necesitas.
						</span>
					</span>
					<Icon
						icon="ri:arrow-right-s-line"
						className="group-hover/opt:text-primary-gold size-5 shrink-0 text-slate-300 transition-all group-hover/opt:translate-x-0.5 dark:text-neutral-600"
					/>
				</button>
			</div>
		</div>
	);

	// ─── Paso 2: estado de registro ───────────────────────────────
	const paso2 = (
		<div className="w-full space-y-8">
			<StepHeader
				step={STEP.STATE}
				title="Estado de registro"
				subtitle="Seleccione dónde desea registrar su empresa."
			/>
			<div className="space-y-6">
				<div className="space-y-3">
					<p className="text-xs font-medium tracking-wide text-slate-500 uppercase dark:text-slate-400">
						Estados recomendados
					</p>
					{RECOMMENDED_STATES.map((rec) => {
						const state = states.find((s) => s.name === rec.name);
						if (!state) return null;
						const selected = estadoDeEmpresa === state.id;
						return (
							<button
								key={rec.name}
								type="button"
								onClick={() => setEstadoDeEmpresa(state.id)}
								aria-pressed={selected}
								className={cn(
									'flex w-full items-center gap-3 rounded-xl border p-3.5 text-left transition-all',
									selected
										? 'border-[#8c681d] ring-2 ring-[#8c681d]/20'
										: 'border-slate-200 hover:border-slate-300 dark:border-neutral-800 dark:hover:border-neutral-700',
								)}
							>
								<span className="min-w-0 flex-1">
									<span className="flex items-center gap-2">
										<span className="text-sm font-semibold text-slate-900 dark:text-white">
											{rec.name}
										</span>
										<span className="bg-primary-gold/10 text-primary-gold rounded-full px-2 py-0.5 text-[10px] font-medium tracking-wide uppercase">
											{rec.tag}
										</span>
									</span>
									<span className="mt-0.5 block text-xs text-slate-500 dark:text-slate-400">
										{rec.reason}
									</span>
								</span>
								<span
									className={cn(
										'flex size-5 shrink-0 items-center justify-center rounded-full border transition-all',
										selected
											? 'border-primary-gold bg-primary-gold text-white'
											: 'border-slate-300 dark:border-neutral-700',
									)}
								>
									{selected && (
										<Icon icon="ri:check-line" className="size-3.5" />
									)}
								</span>
							</button>
						);
					})}
				</div>

				<SectionDivider label="o selecciona otro estado" />

				<Combobox<StartState, false>
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

	// ─── Paso 3: nombres de empresa ───────────────────────────────
	const paso3 = (
		<div className="w-full space-y-8">
			<StepHeader
				step={STEP.COMPANY_NAME}
				title="Nombre de tu empresa"
				subtitle="Danos tres opciones por si tu preferida ya está registrada."
			/>
			<div className="space-y-3">
				{nameFields.map((field, index) => (
					<div key={field.id}>
						<label
							htmlFor={field.id}
							className="mb-1.5 flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400"
						>
							{field.hint}
							{field.preferred && (
								<span className="bg-primary-gold/10 text-primary-gold rounded-full px-2 py-0.5 text-[10px] font-medium tracking-wide uppercase">
									Preferida
								</span>
							)}
						</label>
						<div className="relative">
							<span
								className={cn(
									'absolute top-1/2 left-3 flex size-6 -translate-y-1/2 items-center justify-center rounded-full text-xs font-semibold transition-colors',
									field.value.trim()
										? 'bg-primary-gold text-white'
										: 'bg-slate-100 text-slate-400 dark:bg-neutral-800 dark:text-neutral-500',
								)}
								aria-hidden="true"
							>
								{index + 1}
							</span>
							<Input
								id={field.id}
								name={field.name}
								value={field.value}
								onChange={(e) => field.setter(e.target.value)}
								placeholder={field.placeholder}
								className={cn(cleanInputClass, 'pl-12')}
								required
							/>
						</div>
					</div>
				))}
			</div>
			<p className="flex items-start gap-2 text-xs text-slate-500 dark:text-slate-400">
				<Icon
					icon="ri:information-line"
					className="text-primary-gold mt-0.5 size-4 shrink-0"
				/>
				Verificaremos la disponibilidad de tus nombres en el estado elegido y te
				contactaremos si necesitamos ajustar alguno.
			</p>
		</div>
	);

	// ─── Paso 4: revisión ─────────────────────────────────────────
	const paso4 = (
		<div className="w-full space-y-6">
			<StepHeader
				step={STEP.REVIEW}
				title="Revisa tu información"
				subtitle="Ya casi terminas — verifica tus datos antes de continuar."
			/>
			<dl className="divide-y divide-slate-200 dark:divide-white/10">
				{reviewItems.map((item) => (
					<div
						key={item.label}
						className="flex items-center justify-between gap-4 py-4"
					>
						<div className="min-w-0">
							<dt className="text-xs text-slate-500 dark:text-slate-400">
								{item.label}
							</dt>
							<dd className="mt-0.5 truncate text-sm font-semibold text-slate-900 dark:text-white">
								{item.value || 'No seleccionado'}
							</dd>
						</div>
						<button
							type="button"
							onClick={() => goToStep(item.step)}
							className="text-primary-gold shrink-0 text-sm font-medium hover:underline"
						>
							Editar
						</button>
					</div>
				))}
			</dl>
		</div>
	);

	// ─── Panel de autenticación (patrón minimalista: un formulario +
	//     enlace de texto para alternar, en vez de un segmented switcher) ─
	const isSignIn = authTab === 'sign-in';

	const switchAuthTab = (tab: AuthTab) => {
		runStepTransition(tab === 'sign-up' ? 'forward' : 'back', () =>
			setAuthTab(tab),
		);
	};

	const signInBlock = (
		<div className="space-y-6">
			<form className="space-y-4" onSubmit={handleSignIn}>
				<input type="hidden" name="next" value="/start" />
				<div>
					<FieldLabel htmlFor="login-email" className={labelClass}>
						Tu correo
					</FieldLabel>
					<Input
						id="login-email"
						type="email"
						name="email"
						className={cleanInputClass}
						placeholder="correo@ejemplo.com"
						autoComplete="email"
						required
						disabled={isSigningIn}
					/>
				</div>

				<div>
					<FieldLabel htmlFor="login-password" className={labelClass}>
						Tu contraseña
					</FieldLabel>
					<div className="relative">
						<Input
							id="login-password"
							type={showLoginPassword ? 'text' : 'password'}
							name="password"
							placeholder="••••••••"
							className={cn(cleanInputClass, 'pr-20')}
							autoComplete="current-password"
							required
							disabled={isSigningIn}
						/>
						<PasswordToggle
							visible={showLoginPassword}
							onToggle={() => setShowLoginPassword((prev) => !prev)}
						/>
					</div>
				</div>

				<div className="flex flex-wrap items-center gap-3 text-sm">
					<label className="flex items-center gap-3 text-slate-900 dark:text-white">
						<Checkbox id="login-remember" name="remember" defaultChecked />
						<span className="font-medium">Recuérdame</span>
					</label>
					<a
						href="/forgot-password"
						className="ml-auto text-sm text-slate-500 no-underline hover:underline dark:text-white"
					>
						Olvidé mi contraseña
					</a>
				</div>

				{turnstileSiteKey && <div id="turnstile-widget-start" />}

				<button
					type="submit"
					className={cn(
						buttonVariants({ variant: 'outline' }),
						'h-11 w-full rounded-xl',
					)}
					disabled={isSigningIn || (turnstileRequired && !turnstileToken)}
				>
					{isSigningIn && <Spinner data-icon="inline-start" />}
					{isSigningIn ? 'Iniciando sesión...' : 'Iniciar sesión'}
				</button>

				{signInError && <p className="text-sm text-red-500">{signInError}</p>}
			</form>

			<SectionDivider label="O continuar con" />

			<button
				type="button"
				onClick={handleGoogleLogin}
				className={cn(
					buttonVariants({ variant: 'outline' }),
					'h-11 w-full rounded-xl',
				)}
				disabled={isSigningIn || googlePending}
				>
				{googlePending ? <Spinner data-icon="inline-start" /> : <GoogleIcon />}
				{googlePending ? 'Conectando...' : 'Google'}
			</button>
		</div>
	);

	const signUpBlock = (
		<div className="space-y-6">
			<form className="space-y-4" onSubmit={handleRegister}>
				<input type="hidden" name="next" value="/start" />
				<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
					<div>
						<FieldLabel htmlFor="reg-name" className={labelClass}>
							Nombre
						</FieldLabel>
						<Input
							id="reg-name"
							type="text"
							name="name"
							className={cleanInputClass}
							placeholder="Nombre"
							autoComplete="given-name"
							required
							disabled={isRegistering}
						/>
					</div>
					<div>
						<FieldLabel htmlFor="reg-last-name" className={labelClass}>
							Apellido
						</FieldLabel>
						<Input
							id="reg-last-name"
							type="text"
							name="last-name"
							className={cleanInputClass}
							placeholder="Apellido"
							autoComplete="family-name"
							required
							disabled={isRegistering}
						/>
					</div>
				</div>

				<div>
					<FieldLabel htmlFor="reg-email" className={labelClass}>
						Tu correo
					</FieldLabel>
					<Input
						id="reg-email"
						type="email"
						name="email"
						className={cleanInputClass}
						placeholder="correo@ejemplo.com"
						autoComplete="email"
						required
						disabled={isRegistering}
					/>
				</div>

				<div>
					<FieldLabel htmlFor="reg-password" className={labelClass}>
						Contraseña
					</FieldLabel>
					<div className="relative">
						<Input
							id="reg-password"
							type={showRegPassword ? 'text' : 'password'}
							name="password"
							placeholder="Ingresa tu contraseña"
							className={cn(cleanInputClass, 'pr-20')}
							autoComplete="new-password"
							minLength={8}
							required
							disabled={isRegistering}
						/>
						<PasswordToggle
							visible={showRegPassword}
							onToggle={() => setShowRegPassword((prev) => !prev)}
						/>
					</div>
				</div>

				<div>
					<FieldLabel htmlFor="reg-confirm-password" className={labelClass}>
						Confirmar contraseña
					</FieldLabel>
					<div className="relative">
						<Input
							id="reg-confirm-password"
							type={showRegConfirm ? 'text' : 'password'}
							name="confirm-password"
							placeholder="Confirma tu contraseña"
							className={cn(cleanInputClass, 'pr-20')}
							autoComplete="new-password"
							required
							disabled={isRegistering}
						/>
						<PasswordToggle
							visible={showRegConfirm}
							onToggle={() => setShowRegConfirm((prev) => !prev)}
						/>
					</div>
				</div>

				<button
					type="submit"
					className={cn(
						buttonVariants({ variant: 'outline' }),
						'h-11 w-full rounded-xl',
					)}
					disabled={isRegistering}
				>
					{isRegistering && <Spinner data-icon="inline-start" />}
					{isRegistering ? 'Creando cuenta...' : 'Crear una cuenta'}
				</button>

				{signUpError && <p className="text-sm text-red-500">{signUpError}</p>}
			</form>

			<SectionDivider label="O continuar con" />

			<button
				type="button"
				onClick={handleGoogleLogin}
				className={cn(
					buttonVariants({ variant: 'outline' }),
					'h-11 w-full rounded-xl',
				)}
				disabled={isRegistering || googlePending}
				>
				{googlePending ? <Spinner data-icon="inline-start" /> : <GoogleIcon />}
				{googlePending ? 'Conectando...' : 'Regístrate con Google'}
			</button>

			<p className="px-4 text-center text-xs text-slate-500 dark:text-slate-400">
				Al continuar, aceptas nuestros{' '}
				<a
					href="https://sotomayorconsulting.com/inicio/politicas/"
					className="hover:text-primary-gold underline underline-offset-4"
				>
					Términos de Servicio
				</a>{' '}
				y la{' '}
				<a
					href="https://sotomayorconsulting.com/inicio/politicas/"
					className="hover:text-primary-gold underline underline-offset-4"
				>
					Política de Privacidad
				</a>
				.
			</p>
		</div>
	);

	const authPanel = (
		<div className="w-full space-y-6">
			<div className="space-y-2 text-center">
				<p className="text-primary-gold text-xs font-semibold tracking-[0.25em] uppercase">
					Último paso
				</p>
				<h1 className="text-2xl font-semibold text-slate-900 dark:text-white">
					{isSignIn ? 'Inicia sesión para continuar' : 'Crea tu cuenta gratis'}
				</h1>
				<p className="text-sm text-slate-500 dark:text-slate-400">
					{isSignIn
						? 'Accede a tu cuenta para guardar tu incorporación y continuar.'
						: 'Regístrate para guardar tu incorporación y continuar el proceso.'}
				</p>
			</div>

			{isSignIn ? signInBlock : signUpBlock}

			<p className="text-center text-sm text-slate-500 dark:text-slate-400">
				{isSignIn ? '¿Aún no tienes cuenta? ' : '¿Ya tienes una cuenta? '}
				<button
					type="button"
					onClick={() => switchAuthTab(isSignIn ? 'sign-up' : 'sign-in')}
					className="text-primary-gold font-medium underline underline-offset-4 hover:opacity-80"
				>
					{isSignIn ? 'Crea una cuenta' : 'Inicia sesión'}
				</button>
			</p>

			<div className="text-center">
				<button
					type="button"
					onClick={() =>
						runStepTransition('back', () => setShowAuthPanel(false))
					}
					className="text-sm text-slate-500 no-underline hover:underline dark:text-slate-400"
				>
					← Volver a la revisión
				</button>
			</div>
		</div>
	);

	// ─── Navegación inferior del wizard ───────────────────────────
	const wizardNavigation = !showAuthPanel && (
		<div className="w-full space-y-3">
			<button
				type="button"
				onClick={
					currentStep === STEP.REVIEW ? handleReviewContinue : handleNext
				}
				disabled={currentStep === STEP.REVIEW && isFinalizing}
				className={cn(
					'bg-primary-gold hover:bg-primary-gold/90 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold text-white transition-colors disabled:pointer-events-none disabled:opacity-60',
				)}
			>
				{isFinalizing && <Spinner data-icon="inline-start" />}
				{currentStep === STEP.REVIEW
					? isFinalizing
						? 'Guardando...'
						: isAuthenticated
							? 'Incorporar empresa'
							: 'Continuar'
					: 'Continuar'}
				{!isFinalizing && (
					<Icon icon="ri:arrow-right-line" className="size-4" />
				)}
			</button>

			<div className="flex h-5 items-center justify-center gap-4">
				{currentStep > STEP.ENTITY_TYPE && (
					<button
						type="button"
						onClick={handleBack}
						className="text-sm text-slate-500 no-underline hover:underline dark:text-slate-400"
					>
						Volver al paso anterior
					</button>
				)}
				{isSavingDraft && (
					<span className="text-xs text-slate-400 dark:text-neutral-500">
						Guardando borrador...
					</span>
				)}
			</div>
		</div>
	);

	return (
		<>
			<Toaster />

			<div className="relative flex min-h-screen w-full flex-col items-center justify-center overflow-hidden lg:grid lg:grid-cols-2 lg:px-0">
				<div className="absolute top-4 right-4 z-30 flex items-center gap-4 md:top-8 md:right-8">
					<DarkModeToggle />
					{isAuthenticated ? (
						<span className="hidden text-sm font-medium text-slate-500 md:inline-flex dark:text-white">
							{userEmail}
						</span>
					) : (
						<a
							href="/sign-in"
							className="hidden text-sm font-medium text-slate-500 no-underline hover:underline md:inline-flex dark:text-white"
						>
							Inicia sesión
						</a>
					)}
				</div>

				{brandPanel}

				<div className="flex h-full min-h-screen w-full items-center justify-center p-4 lg:p-8 dark:bg-neutral-950">
					<div className="flex w-full max-w-md flex-col items-center justify-center space-y-8 py-12 lg:py-0">
						{mobileHeader}

						<div
							className="w-full"
							style={{ viewTransitionName: 'start-step' }}
						>
							{currentStep === STEP.ENTITY_TYPE && !showAuthPanel && paso1}
							{currentStep === STEP.STATE && !showAuthPanel && paso2}
							{currentStep === STEP.COMPANY_NAME && !showAuthPanel && paso3}
							{currentStep === STEP.REVIEW && !showAuthPanel && paso4}
							{showAuthPanel && authPanel}
						</div>

						{wizardNavigation}
					</div>
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
						<a
							href="https://sotomayorconsulting.com/diagnostico-llc/"
							className="bg-primary-gold hover:bg-primary-gold/90 inline-flex h-12 w-full items-center justify-center rounded-xl px-8 text-sm font-semibold text-white transition-colors sm:w-auto"
						>
							Realiza un diagnóstico breve
						</a>
						<a
							href="https://zcal.co/t/agendar-asesoria-llc/60min"
							className={cn(
								buttonVariants({ variant: 'outline' }),
								'h-12 w-full rounded-xl px-8 sm:w-auto',
							)}
						>
							Agendar una cita
						</a>
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

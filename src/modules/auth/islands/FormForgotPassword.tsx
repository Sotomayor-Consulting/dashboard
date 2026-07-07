import {
	useState,
	useEffect,
	useCallback,
	useRef,
	type SyntheticEvent,
} from 'react';
import { buttonVariants } from '@components/ui/Button';
import { FieldLabel } from '@components/ui/Field';
import { Input } from '@components/ui/Input';
import { Spinner } from '@components/ui/Spinner';
import LogoDark from '../../../icons/Letras_logo_SCI.svg';
import Isotipo from '../../../icons/isotipo.svg';
import { cn } from '@components/utils';

declare const turnstile: {
	render: (
		container: string | HTMLElement,
		options: Record<string, unknown>,
	) => string;
	remove: (widgetId: string) => void;
	reset: (widgetId: string) => void;
};

interface FormForgotPasswordProps {
	status?: string | null;
	message?: string | null;
	turnstileSiteKey?: string | undefined;
}

export default function FormForgotPassword({
	status,
	message,
	turnstileSiteKey,
}: FormForgotPasswordProps) {
	const [pending, setPending] = useState(false);
	const [clientError, setClientError] = useState<string | null>(null);
	const [successMessage, setSuccessMessage] = useState<string | null>(null);
	const [turnstileToken, setTurnstileToken] = useState<string | null>(null);

	const turnstileRequired = !!turnstileSiteKey;

	const cleanInputClass =
		'h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-none placeholder:text-slate-400 focus-visible:border-[#8c681d] focus-visible:ring-2 focus-visible:ring-[#8c681d]/20 dark:border-input dark:bg-white/10 dark:text-slate-100 dark:placeholder:text-neutral-500 autofill:shadow-[inset_0_0_0_1000px_white] autofill:[font-family:inherit] autofill:[font-size:inherit] dark:autofill:shadow-[inset_0_0_0_1000px_#1a1a1a] dark:autofill:[-webkit-text-fill-color:#f1f5f9] dark:caret-slate-100';

	const feedbackClassName =
		status === 'success'
			? 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400'
			: status === 'info'
				? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
				: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400';

	// ─── Cloudflare Turnstile (explicit render) ─────────
	const turnstileWidgetIdRef = useRef<string | null>(null);

	// Los tokens de Turnstile son de un solo uso: tras un intento fallido
	// hay que resetear el widget para obtener un token nuevo.
	const resetTurnstile = useCallback(() => {
		setTurnstileToken(null);
		if (turnstileWidgetIdRef.current && typeof turnstile !== 'undefined') {
			turnstile.reset(turnstileWidgetIdRef.current);
		}
	}, []);

	useEffect(() => {
		if (!turnstileSiteKey) return;

		let widgetId: string | null = null;

		const TURNSTILE_SRC =
			'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

		const renderWidget = () => {
			const container = document.getElementById(
				'turnstile-widget-forgot',
			);
			if (!container || typeof turnstile === 'undefined') return;

			const isDark =
				document.documentElement.classList.contains('dark');
			widgetId = turnstile.render(container, {
				sitekey: turnstileSiteKey,
				theme: isDark ? 'dark' : 'light',
				size: 'flexible',
				language: 'es',
				callback: (token: string) => setTurnstileToken(token),
				'expired-callback': () => setTurnstileToken(null),
				'error-callback': () => setTurnstileToken(null),
			});
			turnstileWidgetIdRef.current = widgetId;
		};

		if (typeof turnstile !== 'undefined') {
			renderWidget();
		} else {
			const existing = document.querySelector<HTMLScriptElement>(
				`script[src^="https://challenges.cloudflare.com/turnstile"]`,
			);
			if (existing) {
				existing.addEventListener('load', renderWidget, {
					once: true,
				});
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
			turnstileWidgetIdRef.current = null;
		};
	}, [turnstileSiteKey]);

	const handleSubmit = async (event: SyntheticEvent<HTMLFormElement>) => {
		event.preventDefault();

		if (turnstileRequired && !turnstileToken) {
			setClientError('Completa la verificación de seguridad.');
			return;
		}

		setClientError(null);
		setSuccessMessage(null);
		setPending(true);

		try {
			const form = event.currentTarget;
			const formData = new FormData(form);
			if (turnstileToken) {
				formData.set('cf-turnstile-response', turnstileToken);
			}

			const response = await fetch(form.action, {
				method: 'POST',
				body: formData,
				headers: { Accept: 'application/json' },
			});

			const payload = (await response.json()) as {
				ok?: boolean;
				error?: string;
				data?: { message?: string };
			};

			if (!response.ok || payload.ok === false) {
				setClientError(
					payload.error ?? 'No se pudo procesar la solicitud.',
				);
				resetTurnstile();
				return;
			}

			setSuccessMessage(
				payload.data?.message ??
					'Si el email está registrado, recibirás un enlace para restablecer tu contraseña.',
			);
			form.reset();
			resetTurnstile();
		} catch {
			setClientError('Error de conexión. Inténtalo nuevamente.');
			resetTurnstile();
		} finally {
			setPending(false);
		}
	};

	return (
		<div className="relative flex min-h-screen w-full flex-col items-center justify-center overflow-hidden lg:grid lg:grid-cols-2 lg:px-0">
			<div className="absolute top-4 right-4 z-30 flex items-center gap-4 md:top-8 md:right-8">
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
					<svg className="hidden size-5 dark:block" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><circle cx="12" cy="12" r="4" /><path d="M12 2v2" /><path d="M12 20v2" /><path d="M4.93 4.93l1.41 1.41" /><path d="M17.66 17.66l1.41 1.41" /><path d="M2 12h2" /><path d="M20 12h2" /><path d="M6.34 17.66l-1.41 1.41" /><path d="M19.07 4.93l-1.41 1.41" /></svg>
					<svg className="block size-5 dark:hidden" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M12 3a6 6 0 1 0 9 9 9 9 0 1 1-9-9z" /></svg>
				</button>
				<a
					href="/sign-in"
					className="hidden text-sm font-medium text-slate-500 no-underline hover:underline md:inline-flex dark:text-white"
				>
					Inicia sesión
				</a>
			</div>

			<div className="group relative hidden h-full min-h-screen flex-col overflow-hidden p-10 lg:flex dark:border-r dark:border-neutral-900">
				<div className="absolute inset-0 bg-white dark:bg-transparent" />
				<div className="relative z-20 flex items-center text-lg font-medium text-white">
					<a href="https://sotomayorconsulting.com/inicio/">
						<img
							src={LogoDark.src}
							alt="Sotomayor Consulting"
							className="mr-3 h-7 invert dark:invert-0"
						/>
					</a>
				</div>
				<div className="absolute inset-x-0 inset-y-0 flex h-full items-center justify-center [mask-image:radial-gradient(400px_circle_at_center,white,transparent)]">
					<div className="absolute size-96 rounded-full bg-black/8 blur-3xl transition duration-500 group-hover:scale-110 group-hover:bg-white/12 dark:bg-white/8" />
					<img
						src={Isotipo.src}
						alt="Sotomayor Consulting"
						className="relative size-150 invert transition duration-500 ease-out group-hover:-translate-y-2 group-hover:scale-105 group-hover:rotate-2 dark:invert-0"
					/>
				</div>
				<div className="relative z-20 mt-auto text-white">
					<blockquote className="space-y-2 text-black dark:text-white">
						<p className="text-lg">
							&quot;Las grandes cosas en los negocios nunca las hace una sola
							persona; las hace un equipo de personas.&quot;
						</p>
						<footer className="text-sm dark:text-white/70">- Steve Jobs</footer>
					</blockquote>
				</div>
			</div>

			<div className="flex h-full min-h-screen items-center justify-center p-4 dark:bg-neutral-950 lg:p-8">
				<div className="flex w-full max-w-sm flex-col items-center justify-center space-y-6">
					<div className="space-y-2 text-center">
						<h1 className="text-2xl font-semibold text-slate-900 dark:text-white">
							Recupera tu contraseña
						</h1>
						<p className="text-sm text-slate-500 dark:text-slate-400">
							Escribe tu correo y te enviaremos un enlace para
							restablecerla.
						</p>
					</div>

					{status && message ? (
						<p
							className={cn(
								'w-full rounded-lg px-4 py-3 text-sm',
								feedbackClassName,
							)}
						>
							{message}
						</p>
					) : null}

					{successMessage ? (
						<p className="w-full rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700 dark:bg-green-900/30 dark:text-green-400">
							{successMessage}
						</p>
					) : null}

					<form
						className="w-full space-y-4"
						method="POST"
						action="/api/auth/forgot-password"
						onSubmit={handleSubmit}
					>
						<div>
							<FieldLabel
								htmlFor="email"
								className="mb-2 block text-sm font-medium text-slate-900 dark:text-white"
							>
								Tu correo
							</FieldLabel>
							<Input
								id="email"
								type="email"
								name="email"
								className={cleanInputClass}
								placeholder="correo@ejemplo.com"
								autoComplete="email"
								required
								disabled={pending}
							/>
						</div>

						{turnstileSiteKey && (
							<div id="turnstile-widget-forgot" />
						)}

						<button
							type="submit"
							className={cn(
								buttonVariants({ variant: 'outline' }),
								'h-11 w-full rounded-xl',
							)}
							disabled={
								pending ||
								(turnstileRequired && !turnstileToken)
							}
						>
							{pending && <Spinner data-icon="inline-start" />}
							{pending
								? 'Enviando...'
								: 'Restablecer contraseña'}
						</button>

						{clientError ? (
							<p className="text-sm text-red-500">
								{clientError}
							</p>
						) : null}
					</form>

					<p className="px-8 text-center text-sm text-slate-500 dark:text-slate-400">
						<a
							href="/sign-in"
							className="text-sm text-slate-500 no-underline hover:underline dark:text-white"
						>
							Volver a iniciar sesión
						</a>
					</p>
				</div>
			</div>
		</div>
	);
}

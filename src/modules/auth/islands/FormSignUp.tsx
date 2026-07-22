import {
	useActionState,
	useState,
	useEffect,
	useCallback,
	useRef,
} from 'react';
import { navigate } from 'astro:transitions/client';
import { Field, FieldLabel, FieldDescription } from '@components/ui/Field';
import { buttonVariants } from '@components/ui/Button';
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

type FormState = { error: string | null };
type RegisterResponse = {
	ok?: boolean;
	data?: {
		requiresEmailConfirmation?: boolean;
		message?: string;
		redirect?: string;
	};
	error?: string;
};

type FormSignUpProps = {
	turnstileSiteKey?: string | null;
};

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

export default function FormSignUp({ turnstileSiteKey }: FormSignUpProps) {
	const [googlePending, setGooglePending] = useState<boolean>(false);
	const [isVisible, setIsVisible] = useState<boolean>(false);
	const [isConfirmVisible, setIsConfirmVisible] = useState<boolean>(false);
	const [turnstileToken, setTurnstileToken] = useState<string | null>(null);

	const handleOAuthMessage = useCallback((event: MessageEvent) => {
		if (event.origin !== window.location.origin) return;
		if (event.data?.type !== 'oauth-callback') return;
		setGooglePending(false);
		if (event.data.status === 'success') {
			navigate('/');
		}
	}, []);

	useEffect(() => {
		window.addEventListener('message', handleOAuthMessage);
		return () => window.removeEventListener('message', handleOAuthMessage);
	}, [handleOAuthMessage]);

	// ─── Cloudflare Turnstile (explicit render) ─────────
	const turnstileWidgetIdRef = useRef<string | null>(null);

	// Los tokens de Turnstile son de un solo uso: tras un intento de registro
	// fallido hay que resetear el widget para obtener un token nuevo.
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
			const container = document.getElementById('turnstile-widget-signup');
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
			turnstileWidgetIdRef.current = widgetId;
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
			turnstileWidgetIdRef.current = null;
		};
	}, [turnstileSiteKey]);

	const handleGoogleLogin = async () => {
		setGooglePending(true);
		try {
			const res = await fetch('/api/auth/oauth/popup-url', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ provider: 'google' }),
			});
			const json = await res.json();
			if (json.data?.url) {
				const popup = openOAuthPopup(json.data.url);
				const timer = setInterval(() => {
					if (!popup || popup.closed) {
						clearInterval(timer);
						setGooglePending(false);
					}
				}, 500);
			} else {
				setGooglePending(false);
			}
		} catch {
			setGooglePending(false);
		}
	};

	const turnstileRequired = !!turnstileSiteKey;

	const [registerState, registerAction, registerPending] = useActionState(
		async (_prev: FormState, formData: FormData): Promise<FormState> => {
			const password = formData.get('password')?.toString() ?? '';
			const confirmPassword =
				formData.get('confirm-password')?.toString() ?? '';

			if (password !== confirmPassword) {
				return { error: 'Las contraseñas no coinciden.' };
			}

			if (password.length < 8) {
				return {
					error: 'La contraseña debe tener al menos 8 caracteres.',
				};
			}

			if (turnstileRequired && !turnstileToken) {
				return { error: 'Completa la verificación de seguridad.' };
			}

			try {
				if (turnstileToken) {
					formData.set('cf-turnstile-response', turnstileToken);
				}
				const response = await fetch('/api/auth/register', {
					method: 'POST',
					headers: { Accept: 'application/json' },
					body: formData,
				});
				const result = (await response.json()) as RegisterResponse;

				if (!response.ok || !result.ok) {
					resetTurnstile();
					return {
						error:
							result.error ??
							'No se pudo procesar el registro. Intenta nuevamente.',
					};
				}

				if (result.data?.requiresEmailConfirmation) {
					const params = new URLSearchParams({
						status: 'success',
						msg:
							result.data.message ??
							'¡Registro exitoso! Revisa tu correo para confirmar tu cuenta.',
					});
					window.location.href = `${result.data.redirect ?? '/sign-in'}?${params.toString()}`;
					return { error: null };
				}

				window.location.href = result.data?.redirect ?? '/';
				return { error: null };
			} catch {
				resetTurnstile();
				return {
					error: 'No se pudo procesar el registro. Intenta nuevamente.',
				};
			}
		},
		{ error: null },
	);

	const anyPending = registerPending || googlePending;
	const cleanInputClass =
		'h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-none placeholder:text-slate-400 focus-visible:border-[#8c681d] focus-visible:ring-2 focus-visible:ring-[#8c681d]/20 dark:border-input dark:bg-white/10 dark:text-slate-100 dark:placeholder:text-neutral-500 autofill:shadow-[inset_0_0_0_1000px_white] autofill:[font-family:inherit] autofill:[font-size:inherit] dark:autofill:shadow-[inset_0_0_0_1000px_#1a1a1a] dark:autofill:[-webkit-text-fill-color:#f1f5f9] dark:caret-slate-100';

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
					className="rounded-lg p-3 text-slate-500 hover:text-slate-700 dark:text-white dark:hover:text-slate-300"
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
				<a
					href="/sign-in"
					className="hidden py-2 text-sm font-medium text-slate-500 no-underline hover:underline md:inline-flex dark:text-white"
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

			<div className="flex h-full min-h-screen items-center justify-center p-4 lg:p-8 dark:bg-neutral-950">
				<div className="flex w-full max-w-md flex-col items-center justify-center space-y-6">
					<div className="space-y-2 text-center">
						<h1 className="text-2xl font-semibold text-slate-900 dark:text-white">
							Crea tu cuenta gratuita
						</h1>
						<p className="text-sm text-slate-500 dark:text-slate-400">
							Completa tus datos para comenzar a usar la plataforma.
						</p>
					</div>

					<form className="w-full space-y-4" action={registerAction}>
						<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
							<div>
								<FieldLabel
									htmlFor="name"
									className="mb-2 block text-sm font-medium text-slate-900 dark:text-white"
								>
									Nombre
								</FieldLabel>
								<Input
									type="text"
									name="name"
									id="name"
									className={cleanInputClass}
									placeholder="Nombre"
									autoComplete="given-name"
									required
									disabled={anyPending}
								/>
							</div>
							<div>
								<FieldLabel
									htmlFor="last-name"
									className="mb-2 block text-sm font-medium text-slate-900 dark:text-white"
								>
									Apellido
								</FieldLabel>
								<Input
									type="text"
									name="last-name"
									id="last-name"
									className={cleanInputClass}
									placeholder="Apellido"
									autoComplete="family-name"
									required
									disabled={anyPending}
								/>
							</div>
						</div>

						<div>
							<FieldLabel
								htmlFor="email"
								className="mb-2 block text-sm font-medium text-slate-900 dark:text-white"
							>
								Tu correo
							</FieldLabel>
							<Input
								type="email"
								name="email"
								id="email"
								className={cleanInputClass}
								placeholder="correo@ejemplo.com"
								autoComplete="email"
								required
								disabled={anyPending}
							/>
						</div>

						<Field>
							<FieldLabel
								htmlFor="password"
								className="text-sm font-medium text-slate-900 dark:text-white"
							>
								Contraseña
							</FieldLabel>
							<div className="relative">
								<Input
									type={isVisible ? 'text' : 'password'}
									name="password"
									id="password"
									placeholder="Ingresa tu contraseña"
									className={cn(cleanInputClass, 'pr-16')}
									autoComplete="new-password"
									required
									minLength={8}
									disabled={anyPending}
								/>
								<button
									type="button"
									onClick={() => setIsVisible((prev) => !prev)}
									className="absolute inset-y-0 right-0 flex items-center pr-3 text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"
								>
									{isVisible ? 'Ocultar' : 'Mostrar'}
								</button>
							</div>
							<FieldDescription>
								Debe contener mayúsculas, minúsculas, número y carácter
								especial.
							</FieldDescription>
						</Field>

						<Field>
							<FieldLabel
								htmlFor="confirm-password"
								className="text-sm font-medium text-slate-900 dark:text-white"
							>
								Confirmar contraseña
							</FieldLabel>
							<div className="relative">
								<Input
									type={isConfirmVisible ? 'text' : 'password'}
									name="confirm-password"
									id="confirm-password"
									placeholder="Confirma tu contraseña"
									className={cn(cleanInputClass, 'pr-16')}
									autoComplete="new-password"
									required
									disabled={anyPending}
								/>
								<button
									type="button"
									onClick={() => setIsConfirmVisible((prev) => !prev)}
									className="absolute inset-y-0 right-0 flex items-center pr-3 text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"
								>
									{isConfirmVisible ? 'Ocultar' : 'Mostrar'}
								</button>
							</div>
							<FieldDescription>
								Vuelve a ingresar tu contraseña para confirmar.
							</FieldDescription>
						</Field>

						{turnstileSiteKey && <div id="turnstile-widget-signup" />}

						<button
							type="submit"
							className={cn(
								buttonVariants({ variant: 'outline' }),
								'h-11 w-full rounded-xl',
							)}
							disabled={anyPending || (turnstileRequired && !turnstileToken)}
						>
							{registerPending && <Spinner data-icon="inline-start" />}
							{registerPending ? 'Creando cuenta...' : 'Crear una cuenta'}
						</button>

						{registerState.error && (
							<p className="text-sm text-red-500">{registerState.error}</p>
						)}
					</form>

					<div className="flex w-full items-center gap-3">
						<div className="h-px flex-1 bg-slate-200 dark:bg-white/10" />
						<span className="text-xs text-slate-500 dark:text-slate-400">
							O continuar con
						</span>
						<div className="h-px flex-1 bg-slate-200 dark:bg-white/10" />
					</div>

					<button
						type="button"
						onClick={handleGoogleLogin}
						className={cn(
							buttonVariants({ variant: 'outline' }),
							'h-11 w-full rounded-xl',
						)}
						disabled={anyPending}
					>
						{googlePending ? (
							<Spinner data-icon="inline-start" />
						) : (
							<svg
								xmlns="http://www.w3.org/2000/svg"
								viewBox="0 0 24 24"
								fill="currentColor"
								className="size-5"
							>
								<path d="M3.064 7.51A10 10 0 0 1 12 2c2.695 0 4.959.991 6.69 2.605l-2.867 2.868C14.786 6.482 13.468 5.977 12 5.977c-2.605 0-4.81 1.76-5.595 4.123c-.2.6-.314 1.24-.314 1.9s.114 1.3.314 1.9c.786 2.364 2.99 4.123 5.595 4.123c1.345 0 2.49-.355 3.386-.955a4.6 4.6 0 0 0 1.996-3.018H12v-3.868h9.418c.118.654.182 1.336.182 2.045c0 3.046-1.09 5.61-2.982 7.35C16.964 21.105 14.7 22 12 22A9.996 9.996 0 0 1 2 12c0-1.614.386-3.14 1.064-4.49" />
							</svg>
						)}
						{googlePending ? 'Conectando...' : 'Regístrate con Google'}
					</button>

					<p className="px-8 text-center text-sm text-slate-500 dark:text-slate-400">
						<a
							href="/sign-in"
							className="inline-block py-3 text-sm text-slate-500 no-underline hover:underline dark:text-white"
						>
							¿Ya tienes una cuenta? Inicia sesión
						</a>
					</p>

					<p className="px-8 text-center text-sm text-slate-500 dark:text-slate-400">
						Al continuar, aceptas nuestros{' '}
						<a
							href="https://sotomayorconsulting.com/inicio/politicas/"
							className="hover:text-primary inline-block py-3 underline underline-offset-4"
						>
							Términos de Servicio
						</a>{' '}
						y la{' '}
						<a
							href="https://sotomayorconsulting.com/inicio/politicas/"
							className="hover:text-primary inline-block py-3 underline underline-offset-4"
						>
							Política de Privacidad
						</a>
						.
					</p>
				</div>
			</div>
		</div>
	);
}

import {
	useState,
	useEffect,
	useCallback,
	useRef,
	type MouseEvent,
	type SyntheticEvent,
} from 'react';
import { navigate } from 'astro:transitions/client';
import { buttonVariants } from '@components/ui/Button';
import { FieldLabel } from '@components/ui/Field';
import { Input } from '@components/ui/Input';
import { Spinner } from '@components/ui/Spinner';
import { Checkbox } from '@components/ui/Checkbox';
import LogoDark from '../../../icons/Letras_logo_SCI.svg';
import Isotipo from '../../../icons/isotipo.svg';
import { cn } from '@components/utils';

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
	reset: (widgetId: string) => void;
};

declare const google: {
	accounts: {
		id: {
			initialize: (config: {
				client_id: string;
				callback: (response: { credential: string }) => void;
				nonce?: string;
				use_fedcm_for_prompt?: boolean;
				params?: { nonce?: string };
			}) => void;
			prompt: (
				callback?: (notification: {
					isNotDisplayed: () => boolean;
					isSkippedMoment: () => boolean;
					getNotDisplayedReason: () => string;
					getSkippedReason: () => string;
				}) => void,
			) => void;
		};
	};
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

interface FormSignInProps {
	turnstileSiteKey?: string | undefined;
}

export default function FormSignIn({ turnstileSiteKey }: FormSignInProps) {
	const [googlePending, setGooglePending] = useState<boolean>(false);
	const [isVisible, setIsVisible] = useState<boolean>(false);
	const popupRef = useRef<Window | null>(null);
	const popupCheckTimerRef = useRef<number | null>(null);
	const popupTimeoutRef = useRef<number | null>(null);

	const clearPopupWatchers = useCallback(() => {
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

	const stopGooglePending = useCallback(() => {
		setGooglePending(false);
		clearPopupWatchers();
	}, [clearPopupWatchers]);

	const handleOAuthResult = useCallback(
		(data: any) => {
			if (data?.type !== 'oauth-callback') return;
			stopGooglePending();
			if (data.status === 'success') {
				navigate('/');
			}
		},
		[stopGooglePending],
	);

	useEffect(() => {
		// BroadcastChannel: funciona aunque COOP rompa window.opener
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

		// Fallback: window.postMessage (si el popup aún tiene opener)
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

	// ─── Google One Tap ──────────────────────────────────
	// Ref: https://developers.google.com/identity/gsi/web/guides/display-button
	// Ref: https://developers.google.com/identity/gsi/web/reference/js-reference
	const nonceRef = useRef<string>('');

	useEffect(() => {
		const clientId = import.meta.env.PUBLIC_GOOGLE_CLIENT_ID;
		if (!clientId) return;

		let cancelled = false;

		const handleOneTapResponse = async (response: { credential: string }) => {
			if (cancelled) return;
			setGooglePending(true);
			try {
				const res = await fetch('/api/auth/oauth/google-one-tap', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						credential: response.credential,
						nonce: nonceRef.current,
					}),
				});
				const json = await res.json();
				if (json.ok) {
					navigate('/');
				} else {
					setGooglePending(false);
				}
			} catch {
				setGooglePending(false);
			}
		};

		const loadGsiScript = (): Promise<void> => {
			const GSI_SRC = 'https://accounts.google.com/gsi/client';
			if (typeof google !== 'undefined') return Promise.resolve();

			return new Promise((resolve, reject) => {
				const existing = document.querySelector<HTMLScriptElement>(
					`script[src="${GSI_SRC}"]`,
				);
				if (existing) {
					if (typeof google !== 'undefined') {
						resolve();
					} else {
						existing.addEventListener('load', () => resolve(), {
							once: true,
						});
						existing.addEventListener('error', () => reject(), {
							once: true,
						});
					}
					return;
				}

				const script = document.createElement('script');
				script.src = GSI_SRC;
				script.async = true;
				script.onload = () => resolve();
				script.onerror = () => reject();
				document.head.appendChild(script);
			});
		};

		const initOneTap = async () => {
			try {
				await loadGsiScript();
			} catch {
				console.warn('[Google One Tap] No se pudo cargar el script GSI');
				return;
			}
			if (cancelled) return;

			const nonce = crypto.randomUUID();
			nonceRef.current = nonce;
			const encoder = new TextEncoder();
			const hashBuffer = await crypto.subtle.digest(
				'SHA-256',
				encoder.encode(nonce),
			);
			const hashedNonce = Array.from(new Uint8Array(hashBuffer))
				.map((b) => b.toString(16).padStart(2, '0'))
				.join('');

			google.accounts.id.initialize({
				client_id: clientId,
				callback: handleOneTapResponse,
				nonce: hashedNonce,
				use_fedcm_for_prompt: true,
			});

			google.accounts.id.prompt();
		};

		initOneTap();

		return () => {
			cancelled = true;
		};
	}, []);

	// ─── Cloudflare Turnstile (explicit render) ─────────
	// Ref: https://developers.cloudflare.com/turnstile/get-started/client-side-rendering
	const turnstileWidgetIdRef = useRef<string | null>(null);

	// Los tokens de Turnstile son de un solo uso: tras un intento de login
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
			const container = document.getElementById('turnstile-widget');
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

		popupTimeoutRef.current = window.setTimeout(
			() => {
				stopGooglePending();
			},
			2 * 60 * 1000,
		);

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

	const [emailPending, setEmailPending] = useState(false);
	const [emailError, setEmailError] = useState<string | null>(null);
	const [turnstileToken, setTurnstileToken] = useState<string | null>(null);

	const handleEmailSubmit = async (e: SyntheticEvent<HTMLFormElement>) => {
		e.preventDefault();
		if (turnstileRequired && !turnstileToken) {
			setEmailError('Completa la verificación de seguridad.');
			return;
		}
		setEmailPending(true);
		setEmailError(null);
		try {
			const formData = new FormData(e.currentTarget);
			if (turnstileToken) {
				formData.set('cf-turnstile-response', turnstileToken);
			}
			const response = await fetch('/api/auth/sign-in', {
				method: 'POST',
				body: formData,
				headers: { Accept: 'application/json' },
			});
			const data = await response.json();
			if (data.ok) {
				navigate(data.data?.redirect ?? '/');
			} else {
				setEmailPending(false);
				setEmailError(data.error ?? 'Error al iniciar sesión.');
				resetTurnstile();
			}
		} catch {
			setEmailPending(false);
			setEmailError('Error de conexión.');
			resetTurnstile();
		}
	};

	const togglePasswordVisibility = (e: MouseEvent<HTMLButtonElement>) => {
		e.preventDefault();
		setIsVisible(!isVisible);
	};

	const anyPending = emailPending || googlePending;
	const turnstileRequired = !!turnstileSiteKey;
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
					<svg className="hidden size-5 dark:block" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><circle cx="12" cy="12" r="4" /><path d="M12 2v2" /><path d="M12 20v2" /><path d="M4.93 4.93l1.41 1.41" /><path d="M17.66 17.66l1.41 1.41" /><path d="M2 12h2" /><path d="M20 12h2" /><path d="M6.34 17.66l-1.41 1.41" /><path d="M19.07 4.93l-1.41 1.41" /></svg>
					<svg className="block size-5 dark:hidden" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M12 3a6 6 0 1 0 9 9 9 9 0 1 1-9-9z" /></svg>
				</button>
				<a
					href="/sign-up"
					className="hidden py-2 text-sm font-medium text-slate-500 no-underline hover:underline md:inline-flex dark:text-white"
				>
					Crear cuenta
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
							Inicia sesión
						</h1>
						<p className="text-sm text-slate-500 dark:text-slate-400">
							Accede con tu cuenta para continuar.
						</p>
					</div>

					<form
						className="w-full space-y-4"
						method="POST"
						action="/api/auth/sign-in"
						onSubmit={handleEmailSubmit}
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
								disabled={anyPending}
							/>
						</div>

						<div>
							<FieldLabel
								htmlFor="password"
								className="mb-2 block text-sm font-medium text-slate-900 dark:text-white"
							>
								Tu contraseña
							</FieldLabel>
							<div className="relative">
								<Input
									type={isVisible ? 'text' : 'password'}
									name="password"
									id="password"
									placeholder="••••••••"
									className={cn(cleanInputClass, 'pr-20')}
									autoComplete="current-password"
									required
									disabled={anyPending}
								/>
								<button
									type="button"
									onClick={togglePasswordVisibility}
									className="absolute inset-y-0 right-0 flex items-center pr-3 text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"
								>
									{isVisible ? 'Ocultar' : 'Mostrar'}
								</button>
							</div>
						</div>

						<div className="flex flex-wrap items-center gap-3 text-sm">
							<label className="flex items-center gap-3 text-slate-900 dark:text-white">
								<Checkbox
									id="remember"
									aria-describedby="remember"
									name="remember"
									defaultChecked
								/>
								<span className="font-medium">Recuérdame</span>
							</label>
							<a
								href="/forgot-password"
								className="ml-auto py-3 text-sm text-slate-500 no-underline hover:underline dark:text-white"
							>
								Olvidé mi contraseña
							</a>
						</div>

						{turnstileSiteKey && (
							<div id="turnstile-widget" />
						)}

						<button
							type="submit"
							className={cn(
								buttonVariants({ variant: 'outline' }),
								'h-11 w-full rounded-xl',
							)}
							disabled={anyPending || (turnstileRequired && !turnstileToken)}
						>
							{emailPending && <Spinner data-icon="inline-start" />}
							{emailPending ? 'Iniciando sesión...' : 'Iniciar sesión'}
						</button>

						{emailError && <p className="text-sm text-red-500">{emailError}</p>}
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
						{googlePending ? 'Conectando...' : 'Google'}
					</button>

					<p className="text-muted-foreground px-8 text-center text-sm text-slate-500 dark:text-slate-400">
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

import {
	useState,
	useEffect,
	useCallback,
	useRef,
	type MouseEvent,
	type SyntheticEvent,
} from 'react';
import { buttonVariants } from '@components/ui/Button';
import { FieldLabel, FieldLegend } from '@components/ui/Field';
import { Input } from '@components/ui/Input';
import { Spinner } from '@components/ui/Spinner';
import { Checkbox } from '@components/ui/Checkbox';
import LogoDark from '../../../icons/Letras_logo_SCI.svg';
import Isotipo from '../../../icons/isotipo.svg';
import { cn } from '@components/utils';

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
			prompt: () => void;
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

export default function FormSignIn() {
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
				window.location.href = '/';
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
	const oneTapInitialized = useRef(false);
	const nonceRef = useRef<string>('');

	useEffect(() => {
		const clientId = import.meta.env.PUBLIC_GOOGLE_CLIENT_ID;
		if (!clientId || oneTapInitialized.current) return undefined;

		const handleOneTapResponse = async (response: { credential: string }) => {
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
					window.location.href = '/';
				} else {
					setGooglePending(false);
				}
			} catch {
				setGooglePending(false);
			}
		};

		const initOneTap = async () => {
			if (typeof google === 'undefined') return;
			oneTapInitialized.current = true;

			// Generar nonce y su hash SHA-256 para Google
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

		// El script puede ya estar cargado o cargar después
		if (typeof google !== 'undefined') {
			initOneTap();
		} else {
			window.addEventListener('google-one-tap-loaded', initOneTap, {
				once: true,
			});
			return () =>
				window.removeEventListener('google-one-tap-loaded', initOneTap);
		}

		return undefined;
	}, []);

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

	const handleEmailSubmit = async (e: SyntheticEvent<HTMLFormElement>) => {
		e.preventDefault();
		setEmailPending(true);
		setEmailError(null);
		try {
			const formData = new FormData(e.currentTarget);
			const response = await fetch('/api/auth/sign-in', {
				method: 'POST',
				body: formData,
				headers: { Accept: 'application/json' },
			});
			const data = await response.json();
			if (data.ok) {
				// Las cookies de sesión ya fueron seteadas por Set-Cookie headers.
				// Navegar para que el browser haga un request fresco con las cookies.
				window.location.href = data.data?.redirect ?? '/';
			} else {
				setEmailPending(false);
				setEmailError(data.error ?? 'Error al iniciar sesión.');
			}
		} catch {
			setEmailPending(false);
			setEmailError('Error de conexión.');
		}
	};

	const togglePasswordVisibility = (e: MouseEvent<HTMLButtonElement>) => {
		e.preventDefault();
		setIsVisible(!isVisible);
	};

	const anyPending = emailPending || googlePending;
	const cleanInputClass =
		'h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-none placeholder:text-slate-400 focus-visible:border-[#8c681d] focus-visible:ring-2 focus-visible:ring-[#8c681d]/20 dark:border-slate-700 dark:bg-white/10 dark:text-slate-100 dark:placeholder:text-slate-500';

	return (
		<div className="relative flex min-h-screen w-full flex-col items-center justify-center overflow-hidden lg:grid lg:grid-cols-2 lg:px-0">
			<a
				href="/sign-up"
				className={cn(
					buttonVariants({ variant: 'ghost' }),
					'absolute top-4 right-4 z-30 hidden md:top-8 md:right-8 md:inline-flex',
				)}
			>
				Crear cuenta
			</a>

			<div className="group relative hidden h-full min-h-screen flex-col overflow-hidden p-10 lg:flex dark:border-r dark:border-slate-800">
				<div className="absolute inset-0 bg-slate-900 dark:bg-white/5" />
				<div className="relative z-20 flex items-center text-lg font-medium text-white">
					<img
						src={LogoDark.src}
						alt="Sotomayor Consulting"
						className="mr-3 h-7 invert dark:invert-0"
					/>
				</div>
				<div className="absolute inset-x-0 inset-y-0 flex h-full items-center justify-center [mask-image:radial-gradient(400px_circle_at_center,white,transparent)]">
					<div className="absolute size-96 rounded-full bg-white/8 blur-3xl transition duration-500 group-hover:scale-110 group-hover:bg-white/12" />
					<img
						src={Isotipo.src}
						alt="Sotomayor Consulting"
						className="relative size-150 invert transition duration-500 ease-out group-hover:-translate-y-2 group-hover:scale-105 group-hover:rotate-2 dark:invert-0"
					/>
				</div>
				<div className="relative z-20 mt-auto text-white">
					<blockquote className="space-y-2">
						<p className="text-lg">
							&quot;Las chicas buenas van para el cielo, y las malas para el
							vitara&quot;
						</p>
						<footer className="text-sm text-white/70">Joann Salgero</footer>
					</blockquote>
				</div>
			</div>

			<div className="flex h-full min-h-screen items-center justify-center p-4 lg:p-8">
				<div className="flex w-full max-w-md flex-col items-center justify-center space-y-6">
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
						{googlePending ? 'Conectando...' : 'Continuar con Google'}
					</button>

					<div className="w-full rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-white/5">
						<div className="mb-6 space-y-2 text-center">
							<FieldLegend className="w-full text-2xl font-semibold text-slate-900 dark:text-white">
								Inicia sesión
							</FieldLegend>
							<p className="text-sm text-slate-500 dark:text-slate-400">
								Accede con tu cuenta para continuar.
							</p>
						</div>

						<form
							className="space-y-4"
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
									className={cn(
										buttonVariants({ variant: 'link' }),
										'ml-auto px-0 text-sm',
									)}
								>
									Olvidé mi contraseña
								</a>
							</div>

							<button
								type="submit"
								className={cn(
									buttonVariants({ variant: 'default' }),
									'h-11 w-full rounded-xl',
								)}
								disabled={anyPending}
							>
								{emailPending && <Spinner data-icon="inline-start" />}
								{emailPending ? 'Iniciando sesión...' : 'Iniciar sesión'}
							</button>

							{emailError && (
								<p className="text-sm text-red-500">{emailError}</p>
							)}
						</form>
					</div>

					<div className="text-muted-foreground space-y-2 px-8 text-center text-xs text-slate-500 dark:text-slate-400">
						<p>
							Esta es una plataforma interna de Sotomayor Consulting para
							gestionar accesos, documentos y seguimiento operativo.
						</p>
						<p>
							<a
								href="/sign-up"
								className="hover:text-primary underline underline-offset-4"
							>
								Crear una cuenta
							</a>
						</p>
					</div>

					<p className="text-muted-foreground px-8 text-center text-sm text-slate-500 dark:text-slate-400">
						Al continuar, aceptas nuestros{' '}
						<a
							href="https://sotomayorconsulting.com/inicio/politicas/"
							className="hover:text-primary underline underline-offset-4"
						>
							Términos de Servicio
						</a>{' '}
						y la{' '}
						<a
							href="https://sotomayorconsulting.com/inicio/politicas/"
							className="hover:text-primary underline underline-offset-4"
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

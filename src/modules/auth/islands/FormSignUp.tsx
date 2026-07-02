import { useActionState, useState, useEffect, useCallback } from 'react';
import {
	FieldLabel,
	FieldLegend,
	FieldDescription,
} from '@components/ui/Field';
import { buttonVariants } from '@components/ui/Button';
import { Input } from '@components/ui/Input';
import { Spinner } from '@components/ui/Spinner';
import { Checkbox } from '@components/ui/Checkbox';
import LogoDark from '../../../icons/Letras_logo_SCI.svg';
import Isotipo from '../../../icons/isotipo.svg';
import { cn } from '@components/utils';
import PasswordMeter from '@components/forms/PasswordMeter';

type FormState = { error: string | null };

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

export default function FormSignUp() {
	const [googlePending, setGooglePending] = useState<boolean>(false);
	const [isConfirmVisible, setIsConfirmVisible] = useState<boolean>(false);

	const handleOAuthMessage = useCallback((event: MessageEvent) => {
		if (event.origin !== window.location.origin) return;
		if (event.data?.type !== 'oauth-callback') return;
		setGooglePending(false);
		if (event.data.status === 'success') {
			window.location.href = '/';
		}
	}, []);

	useEffect(() => {
		window.addEventListener('message', handleOAuthMessage);
		return () => window.removeEventListener('message', handleOAuthMessage);
	}, [handleOAuthMessage]);

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

	const [registerState, registerAction, registerPending] = useActionState(
		async (_prev: FormState, formData: FormData): Promise<FormState> => {
			try {
				const response = await fetch('/api/auth/register', {
					method: 'POST',
					body: formData,
					redirect: 'follow',
				});

				window.location.href = response.url;
				return { error: null };
			} catch {
				return {
					error: 'No se pudo procesar el registro. Intenta nuevamente.',
				};
			}
		},
		{ error: null },
	);

	const anyPending = registerPending || googlePending;
	const cleanInputClass =
		'h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-none placeholder:text-slate-400 focus-visible:border-[#8c681d] focus-visible:ring-2 focus-visible:ring-[#8c681d]/20 dark:border-slate-700 dark:bg-white/10 dark:text-slate-100 dark:placeholder:text-slate-500';

	return (
		<div className="relative flex min-h-screen w-full flex-col items-center justify-center overflow-hidden lg:grid lg:grid-cols-2 lg:px-0">
			<a
				href="/sign-in"
				className={cn(
					buttonVariants({ variant: 'ghost' }),
					'absolute top-4 right-4 z-30 hidden md:top-8 md:right-8 md:inline-flex',
				)}
			>
				Inicia sesión
			</a>
			<div className="group relative hidden h-full min-h-screen flex-col overflow-hidden p-10 lg:flex dark:border-r dark:border-slate-800">
				<div className="absolute inset-0 bg-white dark:bg-white/5" />
				<div className="relative z-20 flex items-center text-lg font-medium text-white">
					<a href="https://sotomayorconsulting.com/inicio/">
						<img
							src={LogoDark.src}
							alt="Sotomayor Consulting"
							className="mr-3 h-7 invert dark:invert-0"
						/>
					</a>
				</div>
				<div className="absolute inset-x-0 inset-y-0 flex h-full items-center justify-center [mask-image:radial-gradient(400px_circle_at_center,black,transparent)] dark:[mask-image:radial-gradient(400px_circle_at_center,white,transparent)]">
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
							&quot;Las chicas buenas van para el cielo, y las malas para el
							vitara&quot;
						</p>
						<footer className="text-sm dark:text-white/70">
							Joann Salgero
						</footer>
					</blockquote>
				</div>
			</div>

			<div className="flex h-full min-h-screen items-center justify-center p-4 lg:p-8">
				<div className="flex w-full max-w-md flex-col items-center justify-center space-y-6">
					<div className="w-full rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-white/5">
						<div className="mb-6 space-y-2 text-center">
							<FieldLegend className="w-full text-2xl font-semibold text-slate-900 dark:text-white">
								Crea tu cuenta gratuita
							</FieldLegend>
							<p className="text-sm text-slate-500 dark:text-slate-400">
								Completa tus datos para comenzar a usar la plataforma.
							</p>
						</div>

						<form className="space-y-4" action={registerAction}>
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

							<div>
								<FieldLabel
									htmlFor="password"
									className="mb-2 block text-sm font-medium text-slate-900 dark:text-white"
								>
									Contraseña
								</FieldLabel>
								<PasswordMeter
									id="password"
									name="password"
									placeholder="********"
									required
									minLength={8}
									confirmInputId="confirm-password"
									disabled={anyPending}
								/>
							</div>

							<div>
								<FieldLabel
									htmlFor="confirm-password"
									className="mb-2 block text-sm font-medium text-slate-900 dark:text-white"
								>
									Confirmar contrasena
								</FieldLabel>
								<div className="relative">
									<Input
										type={isConfirmVisible ? 'text' : 'password'}
										name="confirm-password"
										id="confirm-password"
										placeholder="********"
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
							</div>

							<div className="flex items-start gap-3 text-sm">
								<Checkbox
									id="terminos"
									aria-describedby="terminos"
									name="terminos"
									className="mt-0.5 shrink-0"
									required
									disabled={anyPending}
								/>
								<FieldDescription className="min-w-0 flex-1 font-medium text-slate-900 dark:text-white">
									Al completar tu registro, creas una cuenta en Sotomayor
									Consulting y aceptas los{' '}
									<a
										href="https://sotomayorconsulting.com/inicio/politicas/"
										className="text-[#8c681d] hover:underline"
									>
										Terminos de uso y la Politica de privacidad
									</a>
								</FieldDescription>
							</div>

							<button
								type="submit"
								className={cn(
									buttonVariants({ variant: 'outline' }),
									'h-11 w-full rounded-xl',
								)}
								disabled={anyPending}
							>
								{registerPending && <Spinner data-icon="inline-start" />}
								{registerPending ? 'Creando cuenta...' : 'Crear una cuenta'}
							</button>

							{registerState.error && (
								<p className="text-sm text-red-500">{registerState.error}</p>
							)}
						</form>
					</div>

					<button
						type="button"
						onClick={handleGoogleLogin}
						className={cn(
							buttonVariants({ variant: 'outline' }),
							'h-11 w-full max-w-md rounded-xl',
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
						{googlePending ? 'Conectando...' : 'Registrate con Google'}
					</button>

					<div className="text-muted-foreground space-y-2 px-8 text-center text-xs text-slate-500 dark:text-slate-400">
						<p>
							Esta es una plataforma interna de Sotomayor Consulting para
							gestionar accesos, documentos y seguimiento operativo.
						</p>
						<p>
							<a
								href="/sign-in"
								className="hover:text-primary underline underline-offset-4"
							>
								Ya tienes una cuenta? Inicia sesión
							</a>
						</p>
					</div>
				</div>
			</div>
		</div>
	);
}

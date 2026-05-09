import { useActionState, useState, useEffect, useCallback } from 'react';
import {
	FieldLabel,
	FieldLegend,
	FieldDescription,
} from '@components/ui/field';
import { buttonVariants } from '@components/ui/button';
import { Input } from '@components/ui/input';
import { Spinner } from '@components/ui/spinner';
import { Checkbox } from '@components/ui/checkbox';
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
		'h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 focus-visible:border-[#8c681d] focus-visible:ring-2 focus-visible:ring-[#8c681d]/30 dark:border-slate-600 dark:bg-[#0b1220] dark:text-slate-100 dark:placeholder:text-slate-500';

	return (
		<div className="pt:mt-0 mx-auto mb-0 grid w-full grid-cols-1 gap-5 px-6 pt-0 lg:grid-cols-2">
			<div className="pt:mt-0 mx-auto flex w-full flex-col items-center justify-center px-4 pt-0 sm:px-6">
				<div className="w-full max-w-xl space-y-7 rounded-2xl border border-slate-200/70 bg-white/95 p-6 shadow-xl shadow-slate-200/40 backdrop-blur-sm sm:p-8 dark:border-slate-700/60 dark:bg-[#020817]/90 dark:shadow-black/30">
					<a
						href="/sign-up"
						className="mb-8 flex items-center justify-center text-2xl font-semibold lg:mb-10 dark:text-white"
					>
						<img
							src="/logo-en-blanco.svg"
							alt="Sotomayor Consulting"
							className="mr-4 hidden h-9 dark:block"
						/>
						<img
							src="/logo-en-negro.svg"
							alt="Sotomayor Consulting"
							className="mr-4 block h-9 dark:hidden"
						/>
					</a>

					<FieldLegend className="text-2xl font-bold text-slate-900 dark:text-white">
						Crea tu cuenta gratuita
					</FieldLegend>

					<form className="mt-8 space-y-6" action={registerAction}>
						<div className="grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-2">
							<div className="col">
								<FieldLabel
									htmlFor="name"
									className="mb-2 block text-sm font-medium text-gray-900 dark:text-white"
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
							<div className="col">
								<FieldLabel
									htmlFor="last-name"
									className="mb-2 block text-sm font-medium text-gray-900 dark:text-white"
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
								className="mb-2 block text-sm font-medium text-gray-900 dark:text-white"
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
								className="mb-2 block text-sm font-medium text-gray-900 dark:text-white"
							>
								Contrasena
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
								className="mb-2 block text-sm font-medium text-gray-900 dark:text-white"
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
									className="absolute inset-y-0 right-0 flex items-center pr-3 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
								>
									{isConfirmVisible ? 'Ocultar' : 'Mostrar'}
								</button>
							</div>
						</div>

						<div className="flex items-start gap-2">
							<Checkbox
								id="terminos"
								aria-describedby="terminos"
								name="terminos"
								className="mt-0.5 shrink-0"
								required
								disabled={anyPending}
							/>
							<FieldDescription className="min-w-0 flex-1 font-medium text-gray-900 dark:text-white">
								Al completar tu registro, creas una cuenta en Sotomayor
								Consulting y aceptas los{' '}
								<a
									href="https://sotomayorconsulting.com/inicio/politicas/"
									className="text-[#8c681d] hover:underline"
								>
									Términos de uso y la Política de privacidad
								</a>
							</FieldDescription>
						</div>

						<button
							type="submit"
							className={cn(
								buttonVariants({ variant: 'outline' }),
								'h-11 w-full cursor-pointer',
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
					<div>
						<div className="inline-flex w-full items-center justify-center">
							<hr className="my-5 h-px w-11/12 border-0 bg-slate-300 dark:bg-slate-700" />
							<span className="absolute z-10 bg-white px-5 font-medium text-slate-600 dark:bg-[#020817] dark:text-slate-300">
								o
							</span>
						</div>
					</div>
					<div>
						<button
							type="button"
							onClick={handleGoogleLogin}
							className={cn(
								buttonVariants({ variant: 'outline' }),
								'h-11 w-full cursor-pointer',
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
					</div>

					<div className="text-sm font-medium text-slate-600 dark:text-slate-400">
						Ya tienes una cuenta?{' '}
						<a
							href="/sign-in"
							className={cn(
								buttonVariants({ variant: 'link' }),
								'ml-auto text-sm',
							)}
						>
							Inicia sesion
						</a>
					</div>
				</div>
			</div>

			<div className="pt:mt-0 mt-8 hidden h-full w-full flex-col items-center justify-center self-center px-6 lg:mt-0 lg:flex lg:items-start">
				<div className="my-5 flex w-4/5 flex-col">
					<div className="mb-5 flex items-center justify-center text-center lg:justify-start lg:text-left">
						<svg
							className="mr-4 hidden w-7 text-[#967432] lg:block"
							fill="currentColor"
							viewBox="0 0 20 20"
							xmlns="http://www.w3.org/2000/svg"
						>
							<path
								fillRule="evenodd"
								d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
								clipRule="evenodd"
							></path>
						</svg>
						<h3 className="text-2xl font-bold text-gray-900 dark:text-white">
							Creacion de LLCs de forma rapida
						</h3>
					</div>

					<p className="text-center text-base text-gray-900 lg:text-left dark:text-white">
						Crea tu empresa en minutos. Con nuestro proceso simplificado, solo
						necesitas unos pocos clics para registrar tu LLC y empezar a operar.
						Nos encargamos de todo el papeleo para que puedas enfocarte en tu
						negocio.
					</p>
				</div>

				<div className="my-5 flex w-4/5 flex-col">
					<div className="mb-5 flex items-center justify-center text-center lg:justify-start lg:text-left">
						<svg
							className="mr-4 hidden w-7 text-[#967432] lg:block"
							fill="currentColor"
							viewBox="0 0 20 20"
							xmlns="http://www.w3.org/2000/svg"
						>
							<path
								fillRule="evenodd"
								d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
								clipRule="evenodd"
							></path>
						</svg>
						<h3 className="text-2xl font-bold text-gray-900 dark:text-white">
							Incorporacion de empresas
						</h3>
					</div>

					<p className="text-center text-base text-gray-900 lg:text-left dark:text-white">
						Crea tu estructura empresarial en minutos. Ya sea para tu negocio,
						para proteger tu patrimonio con una holding, operativas, trust o
						fideicomisos, nuestro proceso simplificado te permite establecer la
						estructura legal perfecta en unos pocos clics.
					</p>
				</div>
			</div>
		</div>
	);
}

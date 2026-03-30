import { useState, useEffect, useCallback, useActionState } from 'react';
import { buttonVariants } from '@components/components/ui/button';
import { FieldLabel, FieldLegend } from '@components/components/ui/field';
import { Input } from '@components/components/ui/input';
import { Spinner } from '@components/components/ui/spinner';
import { Checkbox } from '@components/components/ui/checkbox';
import { cn } from '@components/lib/utils';

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

export default function FormSignIn() {
	const [googlePending, setGooglePending] = useState<boolean>(false);
	const [isVisible, setIsVisible] = useState<boolean>(false);

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
			const res = await fetch('/api/auth/oauth-popup-url', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ provider: 'google' }),
			});
			const json = await res.json();
			if (json.data?.url) {
				openOAuthPopup(json.data.url);
			} else {
				setGooglePending(false);
			}
		} catch {
			setGooglePending(false);
		}
	};

	const [emailState, emailAction, emailPending] = useActionState(
		async (_prev: FormState, formData: FormData): Promise<FormState> => {
			const response = await fetch('/api/auth/signin', {
				method: 'POST',
				body: formData,
				redirect: 'follow',
			});
			window.location.href = response.url;
			return { error: null };
		},
		{ error: null },
	);

	const togglePasswordVisibility = (e: React.MouseEvent<HTMLButtonElement>) => {
		e.preventDefault();
		setIsVisible(!isVisible);
	};

	const anyPending = emailPending || googlePending;
	const cleanInputClass =
		'h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 focus-visible:border-[#8c681d] focus-visible:ring-2 focus-visible:ring-[#8c681d]/30 dark:border-slate-600 dark:bg-[#0b1220] dark:text-slate-100 dark:placeholder:text-slate-500';

	return (
		<div className="mx-auto flex w-full flex-col items-center justify-center px-6 pt-10">
			<div className="dark:bg-black-900 min-h-[720px] w-full max-w-xl space-y-8 rounded-lg bg-gray-200 p-6 shadow sm:p-8">
				<a
					href="/sign-in"
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

				<FieldLegend className="dark:text-yellow text-2xl font-bold">
					Inicia sesión
				</FieldLegend>

				<form className="mt-8 space-y-6" action={emailAction}>
					<div>
						<FieldLabel
							htmlFor="email"
							className="mb-2 block text-sm font-medium text-gray-900 dark:text-white"
						>
							Tu correo
						</FieldLabel>
						<Input
							id="email"
							type="email"
							name="email"
							className={cleanInputClass}
							placeholder="you@example.com"
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
							Tu contraseña
						</FieldLabel>
						<div className="relative">
							<Input
								type={isVisible ? 'text' : 'password'}
								name="password"
								id="password"
								placeholder="••••••••"
								className={cleanInputClass}
								autoComplete="current-password"
								required
								disabled={anyPending}
							/>
							<button
								type="button"
								onClick={togglePasswordVisibility}
								className="absolute inset-y-0 right-0 flex items-center pr-3 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
							>
								{isVisible ? 'Ocultar' : 'Mostrar'}
							</button>
						</div>
					</div>

					<div className="flex flex-wrap items-start">
						<div className="flex h-5 items-center">
							<Checkbox
								id="remember"
								aria-describedby="remember"
								name="remember"
								defaultChecked
							/>
						</div>
						<div className="ml-3 text-sm">
							<FieldLabel
								htmlFor="remember"
								className="font-medium text-gray-900 dark:text-white"
							>
								Recuérdame
							</FieldLabel>
						</div>
						<a
							href="/forgot-password"
							className={cn(
								buttonVariants({ variant: 'link' }),
								'ml-auto text-sm',
							)}
						>
							Olvidé mi contraseña
						</a>
					</div>

					<div className="flex w-full">
						<button
							type="submit"
							className={cn(
								buttonVariants({ variant: 'outline' }),
								'h-11 w-full cursor-pointer',
							)}
							disabled={anyPending}
						>
							{emailPending && <Spinner data-icon="inline-start" />}
							{emailPending ? 'Iniciando sesión...' : 'Iniciar sesión'}
						</button>
					</div>

					{emailState.error && (
						<p className="text-sm text-red-500">{emailState.error}</p>
					)}

					<div className="text-sm font-medium text-gray-500 dark:text-gray-400">
						¿No tienes una cuenta?{' '}
						<a
							href="/sign-up"
							className={cn(
								buttonVariants({ variant: 'link' }),
								'ml-auto text-sm',
							)}
						>
							Crear una cuenta
						</a>
					</div>

					<div>
						<div className="inline-flex w-full items-center justify-center">
							<hr className="dark:bg-black-100 my-5 h-px w-11/12 border-0 bg-gray-300" />
							<span className="dark:bg-black-900 absolute z-10 bg-white px-5 font-medium text-gray-900 dark:text-white">
								o
							</span>
						</div>
					</div>
				</form>

				<div className="mt-8">
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
						{googlePending ? 'Conectando...' : 'Iniciar con Google'}
					</button>
				</div>
			</div>
		</div>
	);
}

import { useState, type SyntheticEvent } from 'react';
import { navigate } from 'astro:transitions/client';
import { buttonVariants } from '@components/ui/Button';
import { Field, FieldLabel, FieldDescription } from '@components/ui/Field';
import { Input } from '@components/ui/Input';
import { Spinner } from '@components/ui/Spinner';
import LogoDark from '../../../icons/Letras_logo_SCI.svg';
import Isotipo from '../../../icons/isotipo.svg';
import { cn } from '@components/utils';

interface FormResetPasswordProps {
	email?: string;
	status?: string | null;
	message?: string | null;
}

export default function FormResetPassword({
	email = '',
	status,
	message,
}: FormResetPasswordProps) {
	const [password, setPassword] = useState('');
	const [confirmPassword, setConfirmPassword] = useState('');
	const [showPassword, setShowPassword] = useState(false);
	const [showConfirmPassword, setShowConfirmPassword] = useState(false);
	const [pending, setPending] = useState(false);
	const [clientError, setClientError] = useState<string | null>(null);

	const cleanInputClass =
		'h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-none placeholder:text-slate-400 focus-visible:border-[#8c681d] focus-visible:ring-2 focus-visible:ring-[#8c681d]/20 dark:border-input dark:bg-white/10 dark:text-slate-100 dark:placeholder:text-neutral-500 autofill:shadow-[inset_0_0_0_1000px_white] autofill:[font-family:inherit] autofill:[font-size:inherit] dark:autofill:shadow-[inset_0_0_0_1000px_#1a1a1a] dark:autofill:[-webkit-text-fill-color:#f1f5f9] dark:caret-slate-100';

	const isPasswordValid = password.length >= 6;
	const passwordsMatch = password.length > 0 && password === confirmPassword;

	const handleSubmit = async (event: SyntheticEvent<HTMLFormElement>) => {
		event.preventDefault();

		if (!isPasswordValid) {
			setClientError('La contraseña debe tener al menos 6 caracteres.');
			return;
		}

		if (!passwordsMatch) {
			setClientError('Las contraseñas no coinciden.');
			return;
		}

		setClientError(null);
		setPending(true);

		try {
			const form = event.currentTarget;
			const response = await fetch(form.action, {
				method: 'POST',
				body: new FormData(form),
				headers: {
					Accept: 'application/json',
				},
			});

			const payload = (await response.json()) as {
				ok?: boolean;
				error?: string;
				data?: { redirectTo?: string };
			};

			if (!response.ok || payload.ok === false) {
				setClientError(payload.error ?? 'No se pudo actualizar la contraseña.');
				return;
			}

			if (payload.data?.redirectTo) {
				navigate(payload.data.redirectTo);
				return;
			}

			setClientError('No se recibió una redirección válida.');
		} catch {
			setClientError('Error de conexión. Inténtalo nuevamente.');
		} finally {
			setPending(false);
		}
	};

	const feedbackClassName =
		status === 'success'
			? 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400'
			: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400';

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
							Restablecer contraseña
						</h1>
						<p className="text-sm text-slate-500 dark:text-slate-400">
							Ingresa tu nueva contraseña para recuperar el acceso a tu cuenta.
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

					<form
						className="w-full space-y-4"
						method="POST"
						action="/api/auth/reset-password"
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
								value={email || 'No disponible'}
								className={cn(
									cleanInputClass,
									'cursor-not-allowed bg-slate-100 text-slate-500 dark:bg-[#111827] dark:text-slate-400',
								)}
								disabled
								readOnly
							/>
						</div>

						<Field>
							<FieldLabel
								htmlFor="password"
								className="mb-2 block text-sm font-medium text-slate-900 dark:text-white"
							>
								Nueva contraseña
							</FieldLabel>
							<div className="relative">
								<Input
									id="password"
									name="password"
									type={showPassword ? 'text' : 'password'}
									value={password}
									onChange={(event) => setPassword(event.target.value)}
									placeholder="Mínimo 6 caracteres"
									className={cn(cleanInputClass, 'pr-16')}
									autoComplete="new-password"
									minLength={6}
									required
									disabled={pending}
								/>
								<button
									type="button"
									onClick={() => setShowPassword((prev) => !prev)}
									className="absolute inset-y-0 right-0 flex items-center pr-3 text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"
								>
									{showPassword ? 'Ocultar' : 'Mostrar'}
								</button>
							</div>
							<FieldDescription className="text-xs text-slate-500 dark:text-slate-400">
								Debe tener al menos 6 caracteres.
							</FieldDescription>
						</Field>

						<Field>
							<FieldLabel
								htmlFor="confirm-password"
								className="mb-2 block text-sm font-medium text-slate-900 dark:text-white"
							>
								Confirmar nueva contraseña
							</FieldLabel>
							<div className="relative">
								<Input
									id="confirm-password"
									name="confirm-password"
									type={showConfirmPassword ? 'text' : 'password'}
									value={confirmPassword}
									onChange={(event) => setConfirmPassword(event.target.value)}
									placeholder="Repite tu contraseña"
									className={cn(cleanInputClass, 'pr-16')}
									autoComplete="new-password"
									minLength={6}
									required
									disabled={pending}
								/>
								<button
									type="button"
									onClick={() => setShowConfirmPassword((prev) => !prev)}
									className="absolute inset-y-0 right-0 flex items-center pr-3 text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"
								>
									{showConfirmPassword ? 'Ocultar' : 'Mostrar'}
								</button>
							</div>
							{confirmPassword.length > 0 && !passwordsMatch ? (
								<FieldDescription className="text-xs text-red-500">
									Las contraseñas no coinciden.
								</FieldDescription>
							) : null}
							{passwordsMatch ? (
								<FieldDescription className="text-xs text-green-600 dark:text-green-400">
									Las contraseñas coinciden.
								</FieldDescription>
							) : null}
						</Field>

						<button
							type="submit"
							className={cn(
								buttonVariants({ variant: 'outline' }),
								'h-11 w-full rounded-xl',
							)}
							disabled={pending}
						>
							{pending && <Spinner data-icon="inline-start" />}
							{pending ? 'Actualizando...' : 'Establecer nueva contraseña'}
						</button>

						{clientError ? (
							<p className="text-sm text-red-500">{clientError}</p>
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

import { useState, type FormEvent } from 'react';
import { buttonVariants } from '@components/ui/Button';
import { FieldLabel, FieldLegend } from '@components/ui/Field';
import { Input } from '@components/ui/Input';
import { Spinner } from '@components/ui/Spinner';
import { cn } from '@components/utils';
import LogoLight from '../../../icons/logo-sotomayor-consulting.svg';
import LogoDark from '../../../icons/logo-sotomayor-consulting-black.svg';

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
		'h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 focus-visible:border-[#8c681d] focus-visible:ring-2 focus-visible:ring-[#8c681d]/30 dark:border-slate-600 dark:bg-[#0b1220] dark:text-slate-100 dark:placeholder:text-slate-500';

	const isPasswordValid = password.length >= 6;
	const passwordsMatch = password.length > 0 && password === confirmPassword;

	const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();

		if (!isPasswordValid) {
			setClientError('La contrasena debe tener al menos 6 caracteres.');
			return;
		}

		if (!passwordsMatch) {
			setClientError('Las contrasenas no coinciden.');
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
				setClientError(payload.error ?? 'No se pudo actualizar la contrasena.');
				return;
			}

			if (payload.data?.redirectTo) {
				window.location.href = payload.data.redirectTo;
				return;
			}

			setClientError('No se recibio una redireccion valida.');
		} catch {
			setClientError('Error de conexion. Intentalo nuevamente.');
		} finally {
			setPending(false);
		}
	};

	const feedbackClassName =
		status === 'success'
			? 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400'
			: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400';

	return (
		<div className="mx-auto flex w-full flex-col items-center justify-center px-6 pt-10">
			<div className="w-full max-w-xl space-y-8 rounded-lg bg-gray-200 p-6 shadow sm:p-8 dark:bg-black">
				<a
					href="/"
					className="mb-8 flex items-center justify-center text-2xl font-semibold lg:mb-10 dark:text-white"
				>
					<img
						src={LogoLight.src}
						alt="Sotomayor Consulting"
						className="mr-4 hidden h-10 dark:block"
					/>
					<img
						src={LogoDark.src}
						alt="Sotomayor Consulting"
						className="mr-4 block h-10 invert dark:hidden"
					/>
				</a>

				<FieldLegend className="dark:text-yellow text-2xl font-bold">
					Restablecer contrasena
				</FieldLegend>

				<p className="text-base font-normal text-gray-500 dark:text-gray-400">
					Ingresa tu nueva contrasena para recuperar el acceso a tu cuenta.
				</p>

				{status && message ? (
					<p className={cn('rounded-lg px-4 py-3 text-sm', feedbackClassName)}>
						{message}
					</p>
				) : null}

				{clientError ? <p className="text-sm text-red-500">{clientError}</p> : null}

				<form
					className="mt-8 space-y-6"
					method="POST"
					action="/api/auth/reset-password"
					onSubmit={handleSubmit}
				>
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
							value={email || 'No disponible'}
							className={cn(cleanInputClass, 'cursor-not-allowed bg-slate-100 text-slate-500 dark:bg-[#111827] dark:text-slate-400')}
							disabled
							readOnly
						/>
					</div>

					<div>
						<FieldLabel
							htmlFor="password"
							className="mb-2 block text-sm font-medium text-gray-900 dark:text-white"
						>
							Nueva contrasena
						</FieldLabel>
						<div className="relative">
							<Input
								id="password"
								name="password"
								type={showPassword ? 'text' : 'password'}
								value={password}
								onChange={(event) => setPassword(event.target.value)}
								placeholder="Minimo 6 caracteres"
								className={cn(cleanInputClass, 'pr-16')}
								autoComplete="new-password"
								minLength={6}
								required
							/>
							<button
								type="button"
								onClick={() => setShowPassword((prev) => !prev)}
								className="absolute inset-y-0 right-0 flex items-center pr-3 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
							>
								{showPassword ? 'Ocultar' : 'Mostrar'}
							</button>
						</div>
						{password.length > 0 && !isPasswordValid ? (
							<p className="mt-1 text-xs text-red-500">
								La contrasena debe tener al menos 6 caracteres.
							</p>
						) : null}
					</div>

					<div>
						<FieldLabel
							htmlFor="confirm-password"
							className="mb-2 block text-sm font-medium text-gray-900 dark:text-white"
						>
							Confirmar nueva contrasena
						</FieldLabel>
						<div className="relative">
							<Input
								id="confirm-password"
								name="confirm-password"
								type={showConfirmPassword ? 'text' : 'password'}
								value={confirmPassword}
								onChange={(event) => setConfirmPassword(event.target.value)}
								placeholder="Repite tu contrasena"
								className={cn(cleanInputClass, 'pr-16')}
								autoComplete="new-password"
								minLength={6}
								required
							/>
							<button
								type="button"
								onClick={() => setShowConfirmPassword((prev) => !prev)}
								className="absolute inset-y-0 right-0 flex items-center pr-3 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
							>
								{showConfirmPassword ? 'Ocultar' : 'Mostrar'}
							</button>
						</div>
						{confirmPassword.length > 0 && !passwordsMatch ? (
							<p className="mt-1 text-xs text-red-500">
								Las contrasenas no coinciden.
							</p>
						) : null}
						{passwordsMatch ? (
							<p className="mt-1 text-xs text-green-600 dark:text-green-400">
								Las contrasenas coinciden.
							</p>
						) : null}
					</div>

					<div className="flex items-start gap-2">
						<input
							id="terms"
							name="terms"
							type="checkbox"
							className="mt-0.5 size-4 shrink-0 rounded border border-slate-300 accent-[#8c681d]"
							required
						/>
						<FieldLabel
							htmlFor="terms"
							className="min-w-0 flex-1 font-medium text-gray-900 dark:text-white"
						>
							Acepto los{' '}
							<a
								href="https://sotomayorconsulting.com/inicio/terminos/"
								className="text-[#8c681d] hover:underline"
							>
								Terminos y Condiciones
							</a>
						</FieldLabel>
					</div>

					<div className="flex w-full">
						<button
							type="submit"
							className={cn(
								buttonVariants({ variant: 'outline' }),
								'h-11 w-full cursor-pointer',
							)}
							disabled={pending}
						>
							{pending && <Spinner data-icon="inline-start" />}
							{pending ? 'Actualizando...' : 'Establecer nueva contrasena'}
						</button>
					</div>

					<div className="text-sm font-medium text-gray-500 dark:text-gray-400">
						¿Recordaste tu contrasena?{' '}
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
				</form>
			</div>
		</div>
	);
}

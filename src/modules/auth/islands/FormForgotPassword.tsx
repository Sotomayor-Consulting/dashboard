import { useState, type FormEvent } from 'react';
import { buttonVariants } from '@components/ui/Button';
import { FieldLabel, FieldLegend } from '@components/ui/Field';
import { Input } from '@components/ui/Input';
import { Spinner } from '@components/ui/Spinner';
import { cn } from '@components/utils';
import LogoLight from '../../../icons/logo-sotomayor-consulting.svg';
import LogoDark from '../../../icons/logo-sotomayor-consulting-black.svg';

interface FormForgotPasswordProps {
	status?: string | null;
	message?: string | null;
}

export default function FormForgotPassword({
	status,
	message,
}: FormForgotPasswordProps) {
	const [pending, setPending] = useState(false);
	const [clientError, setClientError] = useState<string | null>(null);
	const [successMessage, setSuccessMessage] = useState<string | null>(null);

	const cleanInputClass =
		'h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 focus-visible:border-[#8c681d] focus-visible:ring-2 focus-visible:ring-[#8c681d]/30 dark:border-slate-600 dark:bg-[#0b1220] dark:text-slate-100 dark:placeholder:text-slate-500';

	const feedbackClassName =
		status === 'success'
			? 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400'
			: status === 'info'
				? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
				: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400';

	const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();

		setClientError(null);
		setSuccessMessage(null);
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
				data?: { message?: string };
			};

			if (!response.ok || payload.ok === false) {
				setClientError(payload.error ?? 'No se pudo procesar la solicitud.');
				return;
			}

			setSuccessMessage(
				payload.data?.message ??
					'Si el email está registrado, recibirás un enlace para restablecer tu contraseña.',
			);
			form.reset();
		} catch {
			setClientError('Error de conexion. Intentalo nuevamente.');
		} finally {
			setPending(false);
		}
	};

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
					¿Olvidaste tu contraseña?
				</FieldLegend>

				<p className="text-base font-normal text-gray-500 dark:text-gray-400">
					¡No te preocupes! Solo escribe tu correo electrónico y te enviaremos
					un enlace para restablecer tu contraseña.
				</p>

				{status && message ? (
					<p className={cn('rounded-lg px-4 py-3 text-sm', feedbackClassName)}>
						{message}
					</p>
				) : null}

				{successMessage ? (
					<p className="rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700 dark:bg-green-900/30 dark:text-green-400">
						{successMessage}
					</p>
				) : null}

				<form
					className="mt-8 space-y-6"
					method="POST"
					action="/api/auth/forgot-password"
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
							name="email"
							className={cleanInputClass}
							placeholder="correo@ejemplo.com"
							autoComplete="email"
							required
							disabled={pending}
						/>
					</div>

					<div className="flex items-start gap-2">
						<input
							id="remember"
							name="remember"
							type="checkbox"
							className="mt-0.5 size-4 shrink-0 rounded border border-slate-300 accent-[#8c681d]"
							required
							disabled={pending}
						/>
						<FieldLabel
							htmlFor="remember"
							className="min-w-0 flex-1 font-medium text-gray-900 dark:text-white"
						>
							Acepto los{' '}
							<a
								href="https://sotomayorconsulting.com/inicio/terminos/"
								className="text-[#8c681d] hover:underline"
							>
								Términos y Condiciones
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
							{pending ? 'Enviando...' : 'Restablecer contraseña'}
						</button>
					</div>

					{clientError ? <p className="text-sm text-red-500">{clientError}</p> : null}

					<div className="text-sm font-medium text-gray-500 dark:text-gray-400">
						¿Recordaste tu contraseña?{' '}
						<a
							href="/sign-in"
							className={cn(
								buttonVariants({ variant: 'link' }),
								'ml-auto text-sm',
							)}
						>
							Inicia sesión
						</a>
					</div>
				</form>
			</div>
		</div>
	);
}

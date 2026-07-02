import { useState, type FormEvent } from 'react';
import { buttonVariants } from '@components/ui/Button';
import { FieldLabel, FieldLegend } from '@components/ui/Field';
import { Input } from '@components/ui/Input';
import { Spinner } from '@components/ui/Spinner';
import { Checkbox } from '@components/ui/Checkbox';
import LogoDark from '../../../icons/Letras_logo_SCI.svg';
import Isotipo from '../../../icons/isotipo.svg';
import { cn } from '@components/utils';

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
		'h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-none placeholder:text-slate-400 focus-visible:border-[#8c681d] focus-visible:ring-2 focus-visible:ring-[#8c681d]/20 dark:border-slate-700 dark:bg-white/10 dark:text-slate-100 dark:placeholder:text-slate-500';

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
					'Si el email esta registrado, recibirás un enlace para restablecer tu contraseña.',
			);
			form.reset();
		} catch {
			setClientError('Error de conexión. Inténtalo nuevamente.');
		} finally {
			setPending(false);
		}
	};

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
								Olvidaste tu contraseña
							</FieldLegend>
							<p className="text-sm text-slate-500 dark:text-slate-400">
								Escribe tu correo y te enviaremos un enlace para restablecer tu
								contraseña.
							</p>
						</div>

						{status && message ? (
							<p
								className={cn(
									'mb-4 rounded-lg px-4 py-3 text-sm',
									feedbackClassName,
								)}
							>
								{message}
							</p>
						) : null}

						{successMessage ? (
							<p className="mb-4 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700 dark:bg-green-900/30 dark:text-green-400">
								{successMessage}
							</p>
						) : null}

						<form
							className="space-y-4"
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

							<div className="flex items-start gap-3 text-sm">
								<label className="flex items-start gap-3 text-slate-900 dark:text-white">
									<Checkbox
										id="remember"
										name="remember"
										className="mt-0.5"
										required
										disabled={pending}
									/>
									<span className="min-w-0 flex-1 font-medium">
										Acepto los{' '}
										<a
											href="https://sotomayorconsulting.com/inicio/terminos/"
											className="text-[#8c681d] hover:underline"
										>
											Terminos y Condiciones
										</a>
									</span>
								</label>
							</div>

							<button
								type="submit"
								className={cn(
									buttonVariants({ variant: 'outline' }),
									'h-11 w-full rounded-xl',
								)}
								disabled={pending}
							>
								{pending && <Spinner data-icon="inline-start" />}
								{pending ? 'Enviando...' : 'Restablecer contraseña'}
							</button>

							{clientError ? (
								<p className="text-sm text-red-500">{clientError}</p>
							) : null}
						</form>
					</div>

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
								Volver a iniciar sesion
							</a>
						</p>
					</div>

					<p className="text-muted-foreground px-8 text-center text-sm text-slate-500 dark:text-slate-400">
						Al continuar, aceptas nuestros{' '}
						<a
							href="https://sotomayorconsulting.com/inicio/politicas/"
							className="hover:text-primary underline underline-offset-4"
						>
							Terminos de Servicio
						</a>{' '}
						y la{' '}
						<a
							href="https://sotomayorconsulting.com/inicio/politicas/"
							className="hover:text-primary underline underline-offset-4"
						>
							Politica de Privacidad
						</a>
						.
					</p>
				</div>
			</div>
		</div>
	);
}

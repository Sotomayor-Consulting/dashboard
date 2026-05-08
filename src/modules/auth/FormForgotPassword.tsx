import { useActionState } from 'react';
import { buttonVariants } from '@components/ui/button';
import { FieldLabel, FieldLegend } from '@components/ui/field';
import { Input } from '@components/ui/input';
import { Spinner } from '@components/ui/spinner';
import { Checkbox } from '@components/ui/checkbox';
import { cn } from '@components/lib/utils';

type FormState = { error: string | null };

export default function FormForgotPassword() {
	const [state, formAction, pending] = useActionState(
		async (_prev: FormState, formData: FormData): Promise<FormState> => {
			const response = await fetch('/api/auth/forgot-password', {
				method: 'POST',
				body: formData,
				redirect: 'follow',
			});
			window.location.href = response.url;
			return { error: null };
		},
		{ error: null },
	);

	const cleanInputClass =
		'h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 focus-visible:border-[#8c681d] focus-visible:ring-2 focus-visible:ring-[#8c681d]/30 dark:border-slate-600 dark:bg-[#0b1220] dark:text-slate-100 dark:placeholder:text-slate-500';

	return (
		<div className="mx-auto flex w-full flex-col items-center justify-center px-6 pt-10">
			<div className="dark:bg-black-900 w-full max-w-xl space-y-8 rounded-lg bg-gray-200 p-6 shadow sm:p-8">
				<a
					href="/"
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
					¿Olvidaste tu contraseña?
				</FieldLegend>

				<p className="text-base font-normal text-gray-500 dark:text-gray-400">
					¡No te preocupes! Solo escribe tu correo electrónico y te enviaremos
					un código para restablecer tu contraseña.
				</p>

				<form className="mt-8 space-y-6" action={formAction}>
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
						<Checkbox
							id="remember"
							aria-describedby="remember"
							name="remember"
							className="mt-0.5 shrink-0"
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

					{state.error && (
						<p className="text-sm text-red-500">{state.error}</p>
					)}

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

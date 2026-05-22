import { Icon } from '@iconify/react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@components/ui/Button';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@components/ui/Dialog';
import { Input } from '@components/ui/Input';
import { Label } from '@components/ui/Label';

interface Props {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

/**
 * Modal para invitar a un nuevo usuario por correo. Envía un email con
 * link de sign-up vía Supabase Auth. Solo admin/operaciones.
 */
export function InviteUserDialog({ open, onOpenChange }: Props) {
	const [email, setEmail] = useState('');
	const qc = useQueryClient();

	const mutation = useMutation({
		mutationFn: async (mail: string) => {
			const res = await fetch('/api/admin/users/invite', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email: mail }),
			});
			if (!res.ok) {
				const data = (await res.json().catch(() => ({}))) as {
					error?: string;
				};
				throw new Error(data.error ?? 'No se pudo enviar la invitación');
			}
		},
		onSuccess: () => {
			toast.success(`Invitación enviada a ${email}`);
			qc.invalidateQueries({ queryKey: ['admin', 'users'] });
			setEmail('');
			onOpenChange(false);
		},
		onError: (err) => {
			toast.error(
				err instanceof Error ? err.message : 'No se pudo enviar la invitación',
			);
		},
	});

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<Icon icon="ri:send-plane-line" className="h-5 w-5" />
						Invitar usuario
					</DialogTitle>
					<DialogDescription>
						Le enviaremos un correo con un enlace para crear su cuenta.
					</DialogDescription>
				</DialogHeader>

				<form
					onSubmit={(e) => {
						e.preventDefault();
						if (email.trim()) mutation.mutate(email.trim());
					}}
					className="space-y-4 py-2"
				>
					<div>
						<Label
							htmlFor="invite-email"
							className="mb-1.5 block text-xs font-medium"
						>
							Email
						</Label>
						<Input
							id="invite-email"
							type="email"
							value={email}
							onChange={(e) => setEmail(e.target.value)}
							placeholder="usuario@dominio.com"
							required
							autoFocus
							className="!h-9"
						/>
					</div>

					<DialogFooter className="pt-2">
						<Button
							type="button"
							variant="outline"
							size="sm"
							onClick={() => onOpenChange(false)}
							disabled={mutation.isPending}
						>
							Cancelar
						</Button>
						<Button type="submit" size="sm" disabled={mutation.isPending}>
							{mutation.isPending ? 'Enviando…' : 'Enviar invitación'}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}

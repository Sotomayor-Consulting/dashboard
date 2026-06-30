import { useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@components/ui/Button';
import { Checkbox } from '@components/ui/Checkbox';
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@components/ui/Dialog';
import {
	Field,
	FieldDescription,
	FieldGroup,
	FieldLabel,
} from '@components/ui/Field';
import { Input } from '@components/ui/Input';
import { HtmlEditor } from '@components/forms/HtmlEditor';

interface Props {
	open: boolean;
	onClose: () => void;
	userId: string;
	email: string;
	userName: string;
}

export function UserDrawerEmailModal({
	open,
	onClose,
	userId,
	email,
	userName,
}: Props) {
	const [title, setTitle] = useState('');
	const [message, setMessage] = useState('');
	const [actionUrl, setActionUrl] = useState('');
	const [actionLabel, setActionLabel] = useState('');
	const [sendEmail, setSendEmail] = useState(false);
	const [loading, setLoading] = useState(false);

	const reset = () => {
		setTitle('');
		setMessage('');
		setActionUrl('');
		setActionLabel('');
		setSendEmail(false);
	};

	const handleClose = () => {
		reset();
		onClose();
	};

	const messageIsEmpty = message.replace(/<[^>]+>/g, '').trim() === '';

	const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
		e.preventDefault();
		if (!title.trim() || messageIsEmpty) return;

		setLoading(true);
		try {
			const res = await fetch('/api/notifications/send', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					userId,
					title,
					message,
					action_url: actionUrl || undefined,
					action_label: actionLabel || undefined,
					sendEmail,
				}),
			});

			const data = (await res.json()) as {
				success: boolean;
				warning?: string;
				error?: string;
			};

			if (data.success) {
				if (data.warning) {
					toast.warning(data.warning);
				} else {
					toast.success('Notificación enviada correctamente');
				}
				handleClose();
			} else {
				toast.error(data.error ?? 'No se pudo enviar la notificación');
			}
		} catch {
			toast.error('Error de red al enviar la notificación');
		} finally {
			setLoading(false);
		}
	};

	return (
		<Dialog
			open={open}
			onOpenChange={(o) => {
				if (!o) handleClose();
			}}
		>
			<DialogContent showCloseButton className="sm:max-w-lg">
				<DialogHeader>
					<DialogTitle>Enviar notificación</DialogTitle>
					<DialogDescription>
						Destino: {userName}
						{email ? ` (${email})` : ''}
					</DialogDescription>
				</DialogHeader>

				<form onSubmit={handleSubmit}>
					<FieldGroup className="gap-4">
						<Field>
							<FieldLabel>Título</FieldLabel>
							<Input
								required
								type="text"
								value={title}
								onChange={(e) => setTitle(e.target.value)}
								placeholder="Título de la notificación / asunto del correo"
							/>
						</Field>

						<Field>
							<FieldLabel>Mensaje</FieldLabel>
							<HtmlEditor
								value={message}
								onChange={setMessage}
								ariaLabel="Mensaje de la notificación"
							/>
							<FieldDescription>
								Da formato al texto (negrita, cursiva, tamaño, enlaces). Se usa
								como cuerpo del correo y contenido de la notificación.
							</FieldDescription>
						</Field>

						<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
							<Field>
								<FieldLabel>
									URL{' '}
									<span className="text-muted-foreground font-normal">
										(opcional)
									</span>
								</FieldLabel>
								<Input
									type="text"
									value={actionUrl}
									onChange={(e) => setActionUrl(e.target.value)}
									placeholder="/my-companies/..."
								/>
							</Field>
							<Field>
								<FieldLabel>
									Texto del botón{' '}
									<span className="text-muted-foreground font-normal">
										(opcional)
									</span>
								</FieldLabel>
								<Input
									type="text"
									value={actionLabel}
									onChange={(e) => setActionLabel(e.target.value)}
									placeholder="Ver detalle"
								/>
							</Field>
						</div>

						<Field orientation="horizontal">
							<Checkbox
								id="send-email-cb"
								checked={sendEmail}
								onCheckedChange={(checked) => setSendEmail(checked === true)}
							/>
							<FieldLabel htmlFor="send-email-cb">
								Enviar también por correo
							</FieldLabel>
						</Field>
						{sendEmail && (
							<FieldDescription>
								El correo usa el <strong>título</strong> como asunto y el{' '}
								<strong>mensaje (HTML)</strong> como cuerpo.
							</FieldDescription>
						)}
					</FieldGroup>

					<DialogFooter className="mt-4">
						<DialogClose render={<Button variant="outline" type="button" />}>
							Cancelar
						</DialogClose>
						<Button
							type="submit"
							disabled={loading || !title.trim() || messageIsEmpty}
						>
							{loading ? 'Enviando...' : 'Enviar notificación'}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}

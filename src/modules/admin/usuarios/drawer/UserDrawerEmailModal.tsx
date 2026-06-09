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
import { Textarea } from '@components/ui/Textarea';

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
	const [message, setMessage] = useState('');
	const [link, setLink] = useState('');
	const [linkLabel, setLinkLabel] = useState('');
	const [sendEmail, setSendEmail] = useState(false);
	const [emailSubject, setEmailSubject] = useState('');
	const [emailHtml, setEmailHtml] = useState('');
	const [loading, setLoading] = useState(false);

	const reset = () => {
		setMessage('');
		setLink('');
		setLinkLabel('');
		setSendEmail(false);
		setEmailSubject('');
		setEmailHtml('');
	};

	const handleClose = () => {
		reset();
		onClose();
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!message.trim()) return;

		setLoading(true);
		try {
			const res = await fetch('/api/notifications/send', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					userId,
					message,
					link: link || undefined,
					linkLabel: linkLabel || undefined,
					sendEmail,
					emailSubject: emailSubject || undefined,
					emailHtml: emailHtml || undefined,
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
							<FieldLabel>Mensaje</FieldLabel>
							<Textarea
								required
								rows={4}
								value={message}
								onChange={(e) => setMessage(e.target.value)}
								placeholder="Escribe el mensaje de la notificación..."
							/>
						</Field>

						<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
							<Field>
								<FieldLabel>
									URL{' '}
									<span className="font-normal text-muted-foreground">
										(opcional)
									</span>
								</FieldLabel>
								<Input
									type="text"
									value={link}
									onChange={(e) => setLink(e.target.value)}
									placeholder="/my-companies/..."
								/>
							</Field>
							<Field>
								<FieldLabel>
									Texto del botón{' '}
									<span className="font-normal text-muted-foreground">
										(opcional)
									</span>
								</FieldLabel>
								<Input
									type="text"
									value={linkLabel}
									onChange={(e) => setLinkLabel(e.target.value)}
									placeholder="Ver detalle"
								/>
							</Field>
						</div>

						<Field orientation="horizontal">
							<Checkbox
								id="send-email-cb"
								checked={sendEmail}
								onCheckedChange={(checked) =>
									setSendEmail(checked === true)
								}
							/>
							<FieldLabel htmlFor="send-email-cb">
								Enviar también por correo
							</FieldLabel>
						</Field>

						{sendEmail && (
							<FieldGroup className="gap-3 rounded-lg border border-border p-3">
								<Field>
									<FieldLabel>
										Asunto{' '}
										<span className="font-normal text-muted-foreground">
											(opcional)
										</span>
									</FieldLabel>
									<Input
										type="text"
										value={emailSubject}
										onChange={(e) => setEmailSubject(e.target.value)}
										placeholder="Tienes una nueva notificacion"
									/>
								</Field>
								<Field>
									<FieldLabel>
										HTML del correo{' '}
										<span className="font-normal text-muted-foreground">
											(opcional)
										</span>
									</FieldLabel>
									<Textarea
										rows={4}
										value={emailHtml}
										onChange={(e) => setEmailHtml(e.target.value)}
										placeholder="<p>Hola,</p><p>...</p>"
									/>
									<FieldDescription>
										Si no se proporciona, se usa la plantilla por defecto.
									</FieldDescription>
								</Field>
							</FieldGroup>
						)}
					</FieldGroup>

					<DialogFooter className="mt-4">
						<DialogClose
							render={<Button variant="outline" type="button" />}
						>
							Cancelar
						</DialogClose>
						<Button
							type="submit"
							disabled={loading || !message.trim()}
						>
							{loading ? 'Enviando...' : 'Enviar notificación'}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}

import { Icon } from '@iconify/react';
import { useEffect, useState } from 'react';
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
import { Label } from '@components/ui/Label';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@components/ui/Select';
import { Textarea } from '@components/ui/Textarea';
import { cn } from '@components/utils';

type Category = 'general' | 'bug' | 'sugerencia' | 'ux';

const CATEGORIES: { value: Category; label: string; icon: string }[] = [
	{ value: 'general', label: 'General', icon: 'ri:chat-1-line' },
	{ value: 'bug', label: 'Reportar un bug', icon: 'ri:bug-line' },
	{ value: 'sugerencia', label: 'Sugerencia', icon: 'ri:lightbulb-line' },
	{ value: 'ux', label: 'Experiencia de uso', icon: 'ri:sparkling-line' },
];

const MAX_MESSAGE = 4000;

export default function FeedbackDialog() {
	const [open, setOpen] = useState(false);
	const [category, setCategory] = useState<Category>('general');
	const [rating, setRating] = useState<number | null>(null);
	const [hover, setHover] = useState<number | null>(null);
	const [message, setMessage] = useState('');
	const [submitting, setSubmitting] = useState(false);

	useEffect(() => {
		const handler = () => setOpen(true);
		window.addEventListener('open-feedback-dialog', handler);
		return () => window.removeEventListener('open-feedback-dialog', handler);
	}, []);

	function reset() {
		setCategory('general');
		setRating(null);
		setHover(null);
		setMessage('');
		setSubmitting(false);
	}

	function handleOpenChange(next: boolean) {
		setOpen(next);
		if (!next) reset();
	}

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		const trimmed = message.trim();
		if (!trimmed) {
			toast.error('Por favor escribe un mensaje.');
			return;
		}

		setSubmitting(true);
		try {
			const res = await fetch('/api/feedback/create', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					category,
					message: trimmed,
					rating,
					page_url: window.location.href,
				}),
			});
			const data = (await res.json().catch(() => ({}))) as {
				ok?: boolean;
				error?: string;
			};
			if (!res.ok || !data.ok) {
				toast.error(data.error ?? 'No se pudo enviar el feedback.');
				setSubmitting(false);
				return;
			}
			toast.success('¡Gracias! Tu feedback se envió correctamente.');
			handleOpenChange(false);
		} catch {
			toast.error('No se pudo conectar con el servidor.');
			setSubmitting(false);
		}
	}

	const displayRating = hover ?? rating ?? 0;

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogContent className="sm:max-w-lg">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<Icon icon="ri:message-3-line" className="h-5 w-5" />
						Enviar feedback
						<span className="ml-1 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-950/40 dark:text-amber-400">
							Beta
						</span>
					</DialogTitle>
					<DialogDescription>
						Estamos en fase beta. Cuéntanos qué viste, qué te gustaría mejorar
						o qué falla. Tu feedback nos ayuda a priorizar.
					</DialogDescription>
				</DialogHeader>

				<form onSubmit={handleSubmit} className="space-y-4 py-1">
					<div>
						<Label
							htmlFor="fb-category"
							className="mb-1.5 block text-xs font-medium"
						>
							Categoría
						</Label>
						<Select
							value={category}
							onValueChange={(v) => setCategory(v as Category)}
						>
							<SelectTrigger id="fb-category" className="!h-9 w-full text-sm">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{CATEGORIES.map((c) => (
									<SelectItem key={c.value} value={c.value}>
										<span className="flex items-center gap-2">
											<Icon icon={c.icon} className="h-4 w-4" />
											{c.label}
										</span>
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					<div>
						<Label className="mb-1.5 block text-xs font-medium">
							¿Cómo calificarías tu experiencia?{' '}
							<span className="text-muted-foreground font-normal">
								(opcional)
							</span>
						</Label>
						<div
							className="flex items-center gap-1"
							onMouseLeave={() => setHover(null)}
						>
							{[1, 2, 3, 4, 5].map((n) => (
								<button
									key={n}
									type="button"
									onClick={() => setRating(n === rating ? null : n)}
									onMouseEnter={() => setHover(n)}
									aria-label={`${n} estrellas`}
									className={cn(
										'rounded-md p-1 transition-colors',
										n <= displayRating
											? 'text-yellow-400'
											: 'text-gray-300 dark:text-gray-600',
									)}
								>
									<Icon icon="ri:star-fill" className="h-6 w-6" />
								</button>
							))}
							{rating !== null && (
								<button
									type="button"
									onClick={() => setRating(null)}
									className="text-muted-foreground ml-2 text-xs underline"
								>
									Limpiar
								</button>
							)}
						</div>
					</div>

					<div>
						<Label
							htmlFor="fb-message"
							className="mb-1.5 block text-xs font-medium"
						>
							Mensaje
						</Label>
						<Textarea
							id="fb-message"
							rows={5}
							maxLength={MAX_MESSAGE}
							value={message}
							onChange={(e) => setMessage(e.target.value)}
							placeholder="Describe brevemente tu feedback..."
							required
							className="resize-none text-sm"
						/>
						<div className="mt-1 flex justify-end">
							<span className="text-muted-foreground text-xs tabular-nums">
								{message.length} / {MAX_MESSAGE}
							</span>
						</div>
					</div>

					<DialogFooter className="pt-2">
						<Button
							type="button"
							variant="outline"
							size="sm"
							onClick={() => handleOpenChange(false)}
							disabled={submitting}
						>
							Cancelar
						</Button>
						<Button type="submit" size="sm" disabled={submitting}>
							{submitting ? (
								<>
									<Icon icon="ri:loader-4-line" className="h-4 w-4 animate-spin" />
									Enviando…
								</>
							) : (
								<>
									<Icon icon="ri:send-plane-line" className="h-4 w-4" />
									Enviar feedback
								</>
							)}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}

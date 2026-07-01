import { useRef, useState } from 'react';
import { toast } from 'sonner';

interface Props {
	initialAvatarUrl?: string | null;
	fallbackSeed?: string | undefined;
}

export default function PictureUploaderIsland({ initialAvatarUrl, fallbackSeed }: Props) {
	const [previewUrl, setPreviewUrl] = useState<string | null>(initialAvatarUrl ?? null);
	const [uploading, setUploading] = useState(false);
	const inputRef = useRef<HTMLInputElement>(null);

	const fallback = `https://api.dicebear.com/9.x/thumbs/svg?seed=${fallbackSeed ?? ''}`;

	function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
		const file = e.target.files?.[0];
		if (!file) return;
		const localUrl = URL.createObjectURL(file);
		setPreviewUrl(localUrl);
	}

	async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
		e.preventDefault();
		const file = inputRef.current?.files?.[0];
		if (!file) {
			toast.error('Selecciona una imagen primero.');
			return;
		}

		const formData = new FormData();
		formData.append('avatar', file);

		setUploading(true);
		try {
			const res = await fetch('/api/users/update-avatar', {
				method: 'POST',
				headers: { Accept: 'application/json' },
				body: formData,
			});

			const json = await res.json();

			if (!res.ok || !json.ok) {
				toast.error(json.error ?? 'Error al subir la imagen.');
				return;
			}

			// Actualizar preview con la URL pública definitiva (cache-bust)
			setPreviewUrl(`${json.avatarUrl}?t=${Date.now()}`);

			// Sincronizar los avatares del navbar/sidebar sin recargar la página
			document
				.querySelectorAll<HTMLImageElement>('[data-user-avatar]')
				.forEach((img) => {
					img.src = `${json.avatarUrl}?t=${Date.now()}`;
				});

			toast.success('Foto de perfil actualizada.');

			// Limpiar input
			if (inputRef.current) inputRef.current.value = '';
		} catch {
			toast.error('Error de red. Intenta de nuevo.');
		} finally {
			setUploading(false);
		}
	}

	return (
		<div className="flex items-center gap-5">
			{/* Avatar */}
			<div className="relative h-16 w-16 shrink-0">
				<img
					src={previewUrl ?? fallback}
					alt="Foto de perfil"
					className="h-16 w-16 rounded-full object-cover border border-border"
				/>
				{uploading && (
					<div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40">
						<svg
							className="h-5 w-5 animate-spin text-white"
							xmlns="http://www.w3.org/2000/svg"
							fill="none"
							viewBox="0 0 24 24"
						>
							<circle
								className="opacity-25"
								cx="12"
								cy="12"
								r="10"
								stroke="currentColor"
								strokeWidth="4"
							/>
							<path
								className="opacity-75"
								fill="currentColor"
								d="M4 12a8 8 0 018-8v8H4z"
							/>
						</svg>
					</div>
				)}
			</div>

			{/* Form */}
			<form onSubmit={handleSubmit} className="flex items-center gap-3">
				<label className="btn-outline cursor-pointer">
					Seleccionar archivo
					<input
						ref={inputRef}
						className="hidden"
						type="file"
						accept="image/*"
						onChange={handleFileChange}
					/>
				</label>
				<button type="submit" className="btn-primary" disabled={uploading}>
					{uploading ? 'Subiendo…' : 'Subir'}
				</button>
			</form>
		</div>
	);
}

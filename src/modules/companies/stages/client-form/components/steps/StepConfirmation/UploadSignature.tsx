import { Icon } from '@iconify/react';
import { useCallback, useRef, useState } from 'react';

import { cn } from '@components/utils';
import { Button } from '@components/ui/Button';

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 200;
const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
const MAX_SIZE = 2 * 1024 * 1024; // 2 MB

interface Props {
	onChange: (dataUrl: string | null) => void;
}

/**
 * Permite subir una imagen con la firma. La normaliza a 800x200 sobre fondo
 * transparente, preservando proporción y centrándola.
 */
export function UploadSignature({ onChange }: Props) {
	const inputRef = useRef<HTMLInputElement>(null);
	const [preview, setPreview] = useState<string | null>(null);
	const [fileName, setFileName] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);

	const reset = useCallback(() => {
		setPreview(null);
		setFileName(null);
		setError(null);
		onChange(null);
		if (inputRef.current) inputRef.current.value = '';
	}, [onChange]);

	const handleFile = useCallback(
		(file: File) => {
			setError(null);
			if (!ACCEPTED_TYPES.includes(file.type)) {
				setError('Formato no soportado. Usa PNG, JPG o WEBP.');
				return;
			}
			if (file.size > MAX_SIZE) {
				setError('Imagen demasiado grande (máx. 2 MB).');
				return;
			}

			const reader = new FileReader();
			reader.onload = () => {
				const src = String(reader.result);
				const img = new Image();
				img.onload = () => {
					const canvas = document.createElement('canvas');
					canvas.width = CANVAS_WIDTH;
					canvas.height = CANVAS_HEIGHT;
					const ctx = canvas.getContext('2d');
					if (!ctx) {
						setError('No se pudo procesar la imagen.');
						return;
					}
					const scale = Math.min(
						CANVAS_WIDTH / img.width,
						CANVAS_HEIGHT / img.height,
					);
					const w = img.width * scale;
					const h = img.height * scale;
					const x = (CANVAS_WIDTH - w) / 2;
					const y = (CANVAS_HEIGHT - h) / 2;
					ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
					ctx.drawImage(img, x, y, w, h);
					const dataUrl = canvas.toDataURL('image/png');
					setPreview(dataUrl);
					setFileName(file.name);
					onChange(dataUrl);
				};
				img.onerror = () => setError('No se pudo cargar la imagen.');
				img.src = src;
			};
			reader.onerror = () => setError('No se pudo leer el archivo.');
			reader.readAsDataURL(file);
		},
		[onChange],
	);

	const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (file) handleFile(file);
	};

	const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
		e.preventDefault();
		const file = e.dataTransfer.files?.[0];
		if (file) handleFile(file);
	};

	return (
		<div>
			<div
				className={cn(
					'border-border bg-card flex items-center justify-center overflow-hidden rounded-lg border-2 border-dashed',
					!preview && 'hover:border-accent/50 cursor-pointer transition-colors',
				)}
				style={{ height: 160 }}
				onClick={() => !preview && inputRef.current?.click()}
				onDragOver={(e) => e.preventDefault()}
				onDrop={onDrop}
			>
				<input
					ref={inputRef}
					type="file"
					accept={ACCEPTED_TYPES.join(',')}
					onChange={onInputChange}
					className="hidden"
				/>
				{preview ? (
					<img
						src={preview}
						alt="Firma subida"
						className="h-full max-h-full max-w-full object-contain"
					/>
				) : (
					<div className="flex flex-col items-center gap-1 p-4 text-center">
						<Icon
							icon="ri:upload-cloud-2-line"
							className="text-muted-foreground h-7 w-7"
						/>
						<span className="text-foreground text-sm font-medium">
							Sube una imagen de tu firma
						</span>
						<span className="text-muted-foreground text-xs">
							PNG, JPG o WEBP — máx. 2 MB
						</span>
					</div>
				)}
			</div>

			<div className="mt-2 flex items-center justify-between gap-3">
				<p className="text-muted-foreground truncate text-xs">
					{fileName ?? 'Recomendado: imagen con fondo claro y firma oscura.'}
				</p>
				{preview ? (
					<div className="flex gap-2">
						<Button
							type="button"
							variant="outline"
							size="sm"
							onClick={() => inputRef.current?.click()}
						>
							Cambiar
						</Button>
						<Button type="button" variant="outline" size="sm" onClick={reset}>
							Quitar
						</Button>
					</div>
				) : (
					<Button
						type="button"
						variant="outline"
						size="sm"
						onClick={() => inputRef.current?.click()}
					>
						Seleccionar archivo
					</Button>
				)}
			</div>

			{error && (
				<p className="text-destructive mt-2 text-xs" role="alert">
					{error}
				</p>
			)}
		</div>
	);
}

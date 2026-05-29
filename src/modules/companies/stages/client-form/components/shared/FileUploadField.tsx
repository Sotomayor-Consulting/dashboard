import { Icon } from '@iconify/react';
import { useRef } from 'react';

import { cn } from '@components/utils';
import { Label } from '@components/ui/Label';

import {
	ACCEPTED_FILE_TYPES,
	MAX_FILE_SIZE,
	MAX_FILE_SIZE_LABEL,
} from '../../constants';

interface Props {
	id: string;
	label: string;
	description?: string;
	file: File | null;
	onFileChange: (file: File | null) => void;
	accept?: string;
	maxSizeLabel?: string;
	error?: string;
}

export function FileUploadField({
	id,
	label,
	description,
	file,
	onFileChange,
	accept = '.pdf,.jpg,.jpeg,.png',
	maxSizeLabel = MAX_FILE_SIZE_LABEL,
	error,
}: Props) {
	const inputRef = useRef<HTMLInputElement>(null);

	const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const selected = e.target.files?.[0] || null;
		if (selected && selected.size > MAX_FILE_SIZE) {
			onFileChange(null);
			return;
		}
		if (
			selected &&
			ACCEPTED_FILE_TYPES.length > 0 &&
			!ACCEPTED_FILE_TYPES.includes(selected.type)
		) {
			onFileChange(null);
			return;
		}
		onFileChange(selected);
	};

	return (
		<div>
			<Label
				htmlFor={id}
				className="text-[13px] font-medium"
				style={{ color: 'var(--cf-ink)' }}
			>
				{label}
			</Label>
			{description && (
				<p
					className="mt-0.5 mb-2 text-[12px]"
					style={{ color: 'var(--cf-ink-soft)' }}
				>
					{description}
				</p>
			)}

			<input
				ref={inputRef}
				type="file"
				id={id}
				accept={accept}
				onChange={handleChange}
				className="hidden"
			/>

			{file ? (
				/* ── Estado cargado: card con ícono, nombre, meta y badge ── */
				<div
					className="mt-2 flex items-center gap-3 rounded-[12px] border p-3"
					style={{
						background: 'var(--cf-bg-card)',
						borderColor: error ? 'var(--cf-danger-border)' : 'var(--cf-line)',
					}}
				>
					<div
						className="grid h-10 w-10 shrink-0 place-items-center rounded-[10px]"
						style={{
							background: 'var(--cf-bg-subtle)',
							color: 'var(--cf-ink-mute)',
						}}
					>
						<Icon icon="ri:file-text-line" className="h-5 w-5" />
					</div>
					<div className="min-w-0 flex-1">
						<div
							className="truncate text-[13.5px] font-semibold tracking-[-0.005em]"
							style={{ color: 'var(--cf-ink)' }}
						>
							{file.name}
						</div>
						<div
							className="mt-0.5 text-[11.5px]"
							style={{ color: 'var(--cf-ink-soft)' }}
						>
							{formatFileSize(file.size)}
						</div>
					</div>
					<span
						className="inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold"
						style={{
							background: 'var(--cf-accent-soft)',
							color: 'var(--cf-accent-ink)',
						}}
					>
						<Icon icon="ri:check-line" className="h-3 w-3" />
						Cargado
					</span>
					<button
						type="button"
						onClick={() => onFileChange(null)}
						aria-label="Eliminar archivo"
						className="ml-1 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[var(--cf-ink-soft)] transition-colors hover:bg-red-50 hover:text-[var(--cf-danger)] dark:hover:bg-red-950/30"
					>
						<Icon icon="ri:delete-bin-line" className="h-4 w-4" />
					</button>
				</div>
			) : (
				/* ── Estado vacío: dropzone dashed ── */
				<div
					className={cn(
						'mt-2 flex cursor-pointer flex-col items-center gap-1 rounded-[12px] border-2 border-dashed p-5 text-center transition-colors',
					)}
					style={{
						borderColor: error
							? 'var(--cf-danger-border)'
							: 'var(--cf-line-strong)',
						background: 'var(--cf-bg-card)',
					}}
					onClick={() => inputRef.current?.click()}
				>
					<Icon
						icon="ri:upload-cloud-2-line"
						className="h-6 w-6"
						style={{ color: 'var(--cf-ink-soft)' }}
					/>
					<span
						className="text-[13px] font-medium"
						style={{ color: 'var(--cf-ink-mute)' }}
					>
						Haz clic para subir
					</span>
					<span
						className="text-[11.5px]"
						style={{ color: 'var(--cf-ink-soft)' }}
					>
						Máx. {maxSizeLabel}
					</span>
				</div>
			)}

			{error && (
				<p className="mt-1 text-[12px]" style={{ color: 'var(--cf-danger)' }}>
					{error}
				</p>
			)}
		</div>
	);
}

/** Formatea bytes a una etiqueta legible (KB / MB). */
function formatFileSize(bytes: number): string {
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
	return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

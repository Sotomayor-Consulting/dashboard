'use client';

import * as React from 'react';
import { UploadCloud, X } from 'lucide-react';
import { Button } from '@components/ui/Button';
import { cn } from '@components/utils';

type Props = {
	name?: string;
	id?: string;
	accept?: string;
	maxSizeMb?: number;
	required?: boolean;
	disabled?: boolean;
	disabledReason?: string;
	multiple?: boolean;
	className?: string;
	helperText?: string;
	onFilesChange?: (files: File[]) => void;
	onValidationError?: (message: string) => void;
};

function toMb(bytes: number): string {
	return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export default function DocumentDropzoneField({
	name = 'file',
	id = 'document-dropzone-file',
	accept = '.pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.webp',
	maxSizeMb = 15,
	required = false,
	disabled = false,
	disabledReason,
	multiple = false,
	className,
	helperText,
	onFilesChange,
	onValidationError,
}: Props) {
	const inputRef = React.useRef<HTMLInputElement | null>(null);
	const [files, setFiles] = React.useState<File[]>([]);
	const [error, setError] = React.useState<string>('');
	const [isDragging, setIsDragging] = React.useState(false);

	const maxBytes = maxSizeMb * 1024 * 1024;

	const validateFiles = React.useCallback(
		(nextFiles: File[]): boolean => {
			if (nextFiles.length === 0) {
				setFiles([]);
				setError('');
				onFilesChange?.([]);
				return true;
			}

			for (const file of nextFiles) {
				if (file.size > maxBytes) {
					const message = `El archivo ${file.name} supera el límite de ${maxSizeMb} MB.`;
					setError(message);
					onValidationError?.(message);
					return false;
				}
			}

			setError('');
			setFiles(nextFiles);
			onFilesChange?.(nextFiles);
			return true;
		},
		[maxBytes, maxSizeMb, onFilesChange, onValidationError],
	);

	const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		const selected = Array.from(event.target.files ?? []);
		if (!validateFiles(selected) && inputRef.current) {
			inputRef.current.value = '';
		}
	};

	const assignFilesToInput = (droppedFiles: File[]) => {
		if (!inputRef.current) return;
		const transfer = new DataTransfer();
		for (const file of droppedFiles) {
			transfer.items.add(file);
		}
		inputRef.current.files = transfer.files;
		inputRef.current.dispatchEvent(new Event('change', { bubbles: true }));
	};

	const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
		event.preventDefault();
		setIsDragging(false);
		if (disabled) return;
		const dropped = Array.from(event.dataTransfer.files ?? []);
		if (dropped.length === 0) return;
		const firstDropped = dropped[0];
		if (!firstDropped) return;
		const normalized = multiple ? dropped : [firstDropped];
		assignFilesToInput(normalized);
	};

	const clearFiles = () => {
		if (inputRef.current) {
			inputRef.current.value = '';
		}
		setFiles([]);
		setError('');
		onFilesChange?.([]);
	};

	const helper =
		helperText ||
		`Formatos permitidos: ${accept}. Tamaño máximo: ${maxSizeMb} MB.`;
	const firstFile = files[0];

	return (
		<div className={cn('space-y-2', className)}>
			<div
				className={cn(
					'rounded-lg border border-dashed p-4 transition-colors',
					disabled
						? 'cursor-not-allowed border-gray-200 bg-gray-50 opacity-70 dark:border-gray-700 dark:bg-white/5'
						: 'cursor-pointer border-gray-300 hover:border-blue-400 dark:border-gray-600',
					isDragging && !disabled
						? 'border-blue-500 bg-blue-50/60 dark:bg-blue-500/10'
						: '',
				)}
				onDragEnter={(event) => {
					event.preventDefault();
					if (!disabled) setIsDragging(true);
				}}
				onDragOver={(event) => event.preventDefault()}
				onDragLeave={(event) => {
					event.preventDefault();
					setIsDragging(false);
				}}
				onDrop={handleDrop}
				onClick={() => {
					if (!disabled) inputRef.current?.click();
				}}
			>
				<input
					ref={inputRef}
					id={id}
					name={name}
					type="file"
					accept={accept}
					required={required && files.length === 0}
					disabled={disabled}
					multiple={multiple}
					onChange={handleInputChange}
					className="sr-only"
				/>

				<div className="flex flex-col items-center justify-center gap-2 text-center">
					<UploadCloud className="h-8 w-8 text-gray-500 dark:text-gray-300" />
					<p className="text-sm font-medium text-gray-700 dark:text-gray-200">
						Arrastra y suelta el archivo aquí o haz clic para seleccionar.
					</p>
					<p className="text-xs text-gray-500 dark:text-gray-400">{helper}</p>
					{disabledReason ? (
						<p className="text-xs font-medium text-amber-700 dark:text-amber-300">
							{disabledReason}
						</p>
					) : null}
				</div>
			</div>

			{firstFile ? (
				<div className="rounded-md border bg-white p-2 text-sm dark:bg-white/5">
					<div className="flex items-center justify-between gap-2">
						<div className="min-w-0">
							<p className="truncate font-medium">{firstFile.name}</p>
							<p className="text-muted-foreground text-xs">
								{toMb(firstFile.size)}
							</p>
						</div>
						<Button
							type="button"
							variant="outline"
							size="icon-sm"
							onClick={clearFiles}
							disabled={disabled}
						>
							<X className="h-4 w-4" />
						</Button>
					</div>
				</div>
			) : null}

			{error ? (
				<p className="text-sm font-medium text-red-600 dark:text-red-400">
					{error}
				</p>
			) : null}
		</div>
	);
}

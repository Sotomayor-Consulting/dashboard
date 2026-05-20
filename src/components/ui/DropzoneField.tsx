'use client';

import * as React from 'react';
import { UploadCloud, X } from 'lucide-react';
import { Button } from '@components/ui/Button';
import { cn } from '@components/utils';

export const DROPZONE_ACCEPT_DOCUMENTS =
	'.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt';
export const DROPZONE_ACCEPT_IMAGES = '.png,.jpg,.jpeg,.webp';
export const DROPZONE_ACCEPT_DOCS_AND_IMAGES =
	`${DROPZONE_ACCEPT_DOCUMENTS},${DROPZONE_ACCEPT_IMAGES}`;

type DropzoneSize = 'sm' | 'md' | 'lg';

const DROPZONE_SIZE_CLASSES: Record<DropzoneSize, string> = {
	sm: 'p-3',
	md: 'p-4',
	lg: 'p-6',
};

const DROPZONE_ICON_CLASSES: Record<DropzoneSize, string> = {
	sm: 'h-5 w-5',
	md: 'h-7 w-7',
	lg: 'h-9 w-9',
};

const DROPZONE_TITLE_CLASSES: Record<DropzoneSize, string> = {
	sm: 'text-xs font-medium',
	md: 'text-sm font-medium',
	lg: 'text-base font-medium',
};

export type DropzoneFieldProps = {
	name?: string | undefined;
	id?: string | undefined;
	size?: DropzoneSize | undefined;
	accept?: string | undefined;
	maxFileSizeMb?: number | undefined;
	maxFiles?: number | undefined;
	multipleFiles?: boolean | undefined;
	required?: boolean | undefined;
	disabled?: boolean | undefined;
	disabledReason?: string | undefined;
	className?: string | undefined;
	helperText?: string | undefined;
	title?: string | undefined;
	description?: string | undefined;
	showFileList?: boolean | undefined;
	hideTriggerWhenSingleFileSelected?: boolean | undefined;
	onFilesChange?: ((files: File[]) => void) | undefined;
	onValidationError?: ((message: string) => void) | undefined;
	children?: React.ReactNode | undefined;
};

type DropzoneContextValue = {
	name: string;
	id: string;
	size: DropzoneSize;
	accept: string;
	required: boolean;
	disabled: boolean;
	disabledReason?: string | undefined;
	helperText: string;
	isDragging: boolean;
	error: string;
	files: File[];
	showFileList: boolean;
	shouldHideTrigger: boolean;
	multipleFiles: boolean;
	inputRef: React.RefObject<HTMLInputElement | null>;
	handleInputChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
	handleTriggerDrop: (event: React.DragEvent<HTMLDivElement>) => void;
	setIsDragging: (value: boolean) => void;
	openPicker: () => void;
	removeFileAt: (index: number) => void;
};

const DropzoneContext = React.createContext<DropzoneContextValue | null>(null);

function useDropzoneContext(componentName: string) {
	const context = React.useContext(DropzoneContext);
	if (!context) {
		throw new Error(`${componentName} must be used within DropzoneField.`);
	}
	return context;
}

function toMb(bytes: number): string {
	return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function parseAcceptedTypes(accept: string): Set<string> {
	return new Set(
		accept
			.split(',')
			.map((value) => value.trim().toLowerCase())
			.filter(Boolean),
	);
}

function isFileTypeAccepted(file: File, acceptedTypes: Set<string>): boolean {
	if (acceptedTypes.size === 0) return true;

	const extension = file.name.includes('.')
		? `.${file.name.split('.').pop()?.toLowerCase() ?? ''}`
		: '';
	const mime = file.type.toLowerCase();

	for (const acceptedType of acceptedTypes) {
		if (acceptedType.endsWith('/*')) {
			const baseMime = acceptedType.replace('/*', '/');
			if (mime.startsWith(baseMime)) return true;
			continue;
		}

		if (acceptedType.startsWith('.')) {
			if (extension === acceptedType) return true;
			continue;
		}

		if (mime === acceptedType) return true;
	}

	return false;
}

function areSameFile(a: File, b: File): boolean {
	return (
		a.name === b.name && a.size === b.size && a.lastModified === b.lastModified
	);
}

function mergeUniqueFiles(current: File[], incoming: File[]): File[] {
	const next = [...current];
	for (const file of incoming) {
		if (!next.some((existing) => areSameFile(existing, file))) {
			next.push(file);
		}
	}
	return next;
}

export function DropzoneField({
	name = 'file',
	id = 'dropzone-file',
	size = 'md',
	accept = DROPZONE_ACCEPT_DOCS_AND_IMAGES,
	maxFileSizeMb = 15,
	maxFiles = 1,
	multipleFiles = false,
	required = false,
	disabled = false,
	disabledReason,
	className,
	helperText,
	title = 'Arrastra y suelta archivos aqui',
	description = 'o haz clic para seleccionar desde tu dispositivo.',
	showFileList = true,
	hideTriggerWhenSingleFileSelected = true,
	onFilesChange,
	onValidationError,
	children,
}: DropzoneFieldProps) {
	const inputRef = React.useRef<HTMLInputElement | null>(null);
	const [files, setFiles] = React.useState<File[]>([]);
	const [error, setError] = React.useState('');
	const [isDragging, setIsDragging] = React.useState(false);

	const normalizedMaxFiles = Math.max(1, maxFiles);
	const allowMultiple = multipleFiles || normalizedMaxFiles > 1;
	const maxBytes = maxFileSizeMb * 1024 * 1024;
	const acceptedTypes = React.useMemo(() => parseAcceptedTypes(accept), [accept]);

	const validateFiles = React.useCallback(
		(nextFiles: File[]): boolean => {
			if (nextFiles.length === 0) {
				setFiles([]);
				setError('');
				onFilesChange?.([]);
				return true;
			}

			if (nextFiles.length > normalizedMaxFiles) {
				const message =
					normalizedMaxFiles === 1
						? 'Solo puedes subir 1 archivo.'
						: `Solo puedes subir hasta ${normalizedMaxFiles} archivos.`;
				setError(message);
				onValidationError?.(message);
				return false;
			}

			for (const file of nextFiles) {
				if (!isFileTypeAccepted(file, acceptedTypes)) {
					const message = `El archivo ${file.name} no tiene un formato permitido.`;
					setError(message);
					onValidationError?.(message);
					return false;
				}

				if (file.size > maxBytes) {
					const message = `El archivo ${file.name} supera el limite de ${maxFileSizeMb} MB.`;
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
		[
			acceptedTypes,
			maxBytes,
			maxFileSizeMb,
			normalizedMaxFiles,
			onFilesChange,
			onValidationError,
		],
	);

	const assignFilesToInput = React.useCallback((nextFiles: File[]) => {
		if (!inputRef.current) return;
		const transfer = new DataTransfer();
		for (const file of nextFiles) {
			transfer.items.add(file);
		}
		inputRef.current.files = transfer.files;
		inputRef.current.dispatchEvent(new Event('change', { bubbles: true }));
	}, []);

	const handleInputChange = React.useCallback(
		(event: React.ChangeEvent<HTMLInputElement>) => {
			const selected = Array.from(event.target.files ?? []);
			const incoming = allowMultiple
				? selected.slice(0, normalizedMaxFiles)
				: selected.slice(0, 1);

			const merged = allowMultiple
				? mergeUniqueFiles(files, incoming).slice(0, normalizedMaxFiles)
				: incoming;

			if (!validateFiles(merged) && inputRef.current) {
				inputRef.current.value = '';
			}
		},
		[allowMultiple, files, normalizedMaxFiles, validateFiles],
	);

	const handleTriggerDrop = React.useCallback(
		(event: React.DragEvent<HTMLDivElement>) => {
			event.preventDefault();
			setIsDragging(false);
			if (disabled) return;

			const dropped = Array.from(event.dataTransfer.files ?? []);
			if (dropped.length === 0) return;

			const incoming = allowMultiple
				? dropped.slice(0, normalizedMaxFiles)
				: dropped.slice(0, 1);
			const merged = allowMultiple
				? mergeUniqueFiles(files, incoming).slice(0, normalizedMaxFiles)
				: incoming;

			assignFilesToInput(merged);
		},
		[allowMultiple, assignFilesToInput, disabled, files, normalizedMaxFiles],
	);

	const removeFileAt = React.useCallback(
		(index: number) => {
			const nextFiles = files.filter((_, currentIndex) => currentIndex !== index);

			if (inputRef.current) {
				if (nextFiles.length === 0) {
					inputRef.current.value = '';
				} else {
					const transfer = new DataTransfer();
					for (const file of nextFiles) {
						transfer.items.add(file);
					}
					inputRef.current.files = transfer.files;
				}
			}

			setFiles(nextFiles);
			setError('');
			onFilesChange?.(nextFiles);
		},
		[files, onFilesChange],
	);

	const openPicker = React.useCallback(() => {
		if (!disabled) inputRef.current?.click();
	}, [disabled]);

	const computedHelperText =
		helperText ||
		`Formatos permitidos: ${accept}. Tamano maximo: ${maxFileSizeMb} MB.${allowMultiple ? ` Hasta ${normalizedMaxFiles} archivos.` : ''}`;

	const shouldHideTrigger =
		!allowMultiple && hideTriggerWhenSingleFileSelected && files.length > 0;

	const contextValue = React.useMemo<DropzoneContextValue>(
		() => ({
			name,
			id,
			size,
			accept,
			required,
			disabled,
			disabledReason,
			helperText: computedHelperText,
			isDragging,
			error,
			files,
			showFileList,
			shouldHideTrigger,
			multipleFiles: allowMultiple,
			inputRef,
			handleInputChange,
			handleTriggerDrop,
			setIsDragging,
			openPicker,
			removeFileAt,
		}),
		[
			accept,
			allowMultiple,
			computedHelperText,
			disabled,
			disabledReason,
			error,
			files,
			handleInputChange,
			handleTriggerDrop,
			id,
			inputRef,
			isDragging,
			name,
			openPicker,
			required,
			removeFileAt,
			size,
			shouldHideTrigger,
			showFileList,
		],
	);

	return (
		<DropzoneContext.Provider value={contextValue}>
			<div className={cn('space-y-2', className)} data-slot="dropzone-field">
				{children ?? (
					<>
						<DropzoneTrigger>
							<DropzoneIcon />
							<DropzoneTitle>{title}</DropzoneTitle>
							<DropzoneDescription>{description}</DropzoneDescription>
							<DropzoneHint />
						</DropzoneTrigger>
						<DropzoneFileList />
						<DropzoneError />
					</>
				)}
			</div>
		</DropzoneContext.Provider>
	);
}

export function DropzoneTrigger({
	className,
	children,
}: React.ComponentProps<'div'>) {
	const context = useDropzoneContext('DropzoneTrigger');

	if (context.shouldHideTrigger) return null;

	return (
		<div
			data-slot="dropzone-trigger"
			className={cn(
				'rounded-lg border border-dashed transition-colors',
				DROPZONE_SIZE_CLASSES[context.size],
				context.disabled
					? 'cursor-not-allowed border-gray-200 bg-gray-50 opacity-70 dark:border-gray-700 dark:bg-white/5'
					: 'cursor-pointer border-gray-300 hover:border-primary/60 dark:border-gray-600',
				context.isDragging && !context.disabled
					? 'border-primary bg-primary/5 dark:bg-primary/10'
					: '',
				className,
			)}
			onDragEnter={(event) => {
				event.preventDefault();
				if (!context.disabled) context.setIsDragging(true);
			}}
			onDragOver={(event) => event.preventDefault()}
			onDragLeave={(event) => {
				event.preventDefault();
				context.setIsDragging(false);
			}}
			onDrop={context.handleTriggerDrop}
			onClick={context.openPicker}
			onKeyDown={(event) => {
				if (event.key === 'Enter' || event.key === ' ') {
					event.preventDefault();
					context.openPicker();
				}
			}}
			role="button"
			tabIndex={context.disabled ? -1 : 0}
			aria-label="Subir archivos"
			aria-disabled={context.disabled}
		>
			<input
				ref={context.inputRef}
				id={context.id}
				name={context.name}
				type="file"
				accept={context.accept}
				required={context.required && context.files.length === 0}
				disabled={context.disabled}
				multiple={context.multipleFiles}
				onChange={context.handleInputChange}
				className="sr-only"
			/>
			<div
				className={cn(
					'flex flex-col items-center justify-center text-center',
					context.size === 'sm' ? 'gap-1.5' : 'gap-2',
				)}
			>
				{children}
				{context.disabledReason ? (
					<p className="text-xs font-medium text-amber-700 dark:text-amber-300">
						{context.disabledReason}
					</p>
				) : null}
			</div>
		</div>
	);
}

export function DropzoneIcon({ className }: { className?: string }) {
	const context = useDropzoneContext('DropzoneIcon');
	return (
		<UploadCloud
			data-slot="dropzone-icon"
			className={cn(
				DROPZONE_ICON_CLASSES[context.size],
				'text-gray-500 dark:text-gray-300',
				className,
			)}
		/>
	);
}

export function DropzoneTitle({
	className,
	children,
}: React.ComponentProps<'p'>) {
	const context = useDropzoneContext('DropzoneTitle');
	return (
		<p
			data-slot="dropzone-title"
			className={cn(
				DROPZONE_TITLE_CLASSES[context.size],
				'text-gray-700 dark:text-gray-200',
				className,
			)}
		>
			{children}
		</p>
	);
}

export function DropzoneDescription({
	className,
	children,
}: React.ComponentProps<'p'>) {
	if (!children) return null;
	return (
		<p
			data-slot="dropzone-description"
			className={cn('text-xs text-gray-500 dark:text-gray-400', className)}
		>
			{children}
		</p>
	);
}

export function DropzoneHint({ className }: { className?: string }) {
	const context = useDropzoneContext('DropzoneHint');
	return (
		<p
			data-slot="dropzone-hint"
			className={cn('text-xs text-gray-500 dark:text-gray-400', className)}
		>
			{context.helperText}
		</p>
	);
}

export function DropzoneFileList({ className }: { className?: string }) {
	const context = useDropzoneContext('DropzoneFileList');
	if (!context.showFileList || context.files.length === 0) return null;

	const isSingleView = !context.multipleFiles && context.files.length === 1;

	return (
		<div
			data-slot="dropzone-file-list"
			className={cn(isSingleView ? '' : 'space-y-2', className)}
		>
			{context.files.map((file, index) => (
				<DropzoneFileItem
					key={`${file.name}-${file.lastModified}-${index}`}
					file={file}
					index={index}
					single={isSingleView}
				/>
			))}
		</div>
	);
}

function DropzoneFileItem({
	file,
	index,
	single,
}: {
	file: File;
	index: number;
	single: boolean;
}) {
	const context = useDropzoneContext('DropzoneFileItem');

	return (
		<div
			data-slot="dropzone-file-item"
			className={cn(
				'rounded-md border bg-white text-sm dark:bg-white/5',
				single ? 'px-3 py-2' : 'p-2',
			)}
		>
			<div className="flex items-center justify-between gap-2">
				<div className="min-w-0">
					<p className="truncate font-medium">{file.name}</p>
					<p className="text-muted-foreground text-xs">{toMb(file.size)}</p>
				</div>
				<DropzoneRemoveButton
					onClick={() => context.removeFileAt(index)}
					disabled={context.disabled}
				/>
			</div>
		</div>
	);
}

export function DropzoneRemoveButton({
	className,
	...props
}: React.ComponentProps<typeof Button>) {
	return (
		<Button
			type="button"
			variant="outline"
			size="icon-sm"
			aria-label="Eliminar archivo"
			className={className}
			{...props}
		>
			<X className="h-4 w-4" />
		</Button>
	);
}

export function DropzoneError({ className }: { className?: string }) {
	const context = useDropzoneContext('DropzoneError');
	if (!context.error) return null;

	return (
		<p
			data-slot="dropzone-error"
			className={cn('text-sm font-medium text-red-600 dark:text-red-400', className)}
		>
			{context.error}
		</p>
	);
}

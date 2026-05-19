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
			<Label htmlFor={id} className="text-sm font-medium">
				{label}
			</Label>
			{description && (
				<p className="text-muted-foreground mt-0.5 mb-2 text-xs">
					{description}
				</p>
			)}
			<div
				className={cn(
					'mt-2 cursor-pointer rounded-lg border-2 border-dashed p-4 text-center transition-colors',
					file
						? 'border-accent bg-accent/5'
						: 'border-border hover:border-accent/50',
					error && 'border-destructive',
				)}
				onClick={() => inputRef.current?.click()}
			>
				<input
					ref={inputRef}
					type="file"
					id={id}
					accept={accept}
					onChange={handleChange}
					className="hidden"
				/>
				{file ? (
					<div className="flex items-center justify-center gap-2 text-sm">
						<Icon icon="ri:check-line" className="text-accent h-4 w-4" />
						<span className="text-foreground max-w-[200px] truncate">
							{file.name}
						</span>
						<button
							type="button"
							onClick={(e) => {
								e.stopPropagation();
								onFileChange(null);
							}}
							className="text-muted-foreground hover:text-destructive ml-2"
						>
							<Icon icon="ri:delete-bin-line" className="h-4 w-4" />
						</button>
					</div>
				) : (
					<div className="flex flex-col items-center gap-1">
						<Icon
							icon="ri:upload-cloud-2-line"
							className="text-muted-foreground h-6 w-6"
						/>
						<span className="text-muted-foreground text-sm">
							Haz clic para subir
						</span>
						<span className="text-muted-foreground text-xs">
							Máx. {maxSizeLabel}
						</span>
					</div>
				)}
			</div>
			{error && <p className="text-destructive mt-1 text-xs">{error}</p>}
		</div>
	);
}

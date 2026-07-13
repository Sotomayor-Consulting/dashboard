import {
	DropzoneField,
	DROPZONE_ACCEPT_DOCS_AND_IMAGES,
} from '@components/ui/DropzoneField';

type Props = {
	name?: string;
	id?: string;
	accept?: string;
	maxSizeMb?: number;
	maxFiles?: number;
	required?: boolean;
	disabled?: boolean;
	disabledReason?: string;
	multiple?: boolean;
	className?: string;
	helperText?: string;
	title?: string;
	description?: string;
	showFileList?: boolean;
	onFilesChange?: (files: File[]) => void;
	onValidationError?: (message: string) => void;
};

export default function DocumentDropzoneField({
	name = 'file',
	id = 'document-dropzone-file',
	accept = DROPZONE_ACCEPT_DOCS_AND_IMAGES,
	maxSizeMb = 15,
	maxFiles = 1,
	required = false,
	disabled = false,
	disabledReason,
	multiple = false,
	className,
	helperText,
	title,
	description,
	showFileList,
	onFilesChange,
	onValidationError,
}: Props) {
	return (
		<DropzoneField
			name={name}
			id={id}
			accept={accept}
			maxFileSizeMb={maxSizeMb}
			maxFiles={maxFiles}
			required={required}
			disabled={disabled}
			disabledReason={disabledReason}
			multipleFiles={multiple}
			className={className}
			helperText={helperText}
			title={title}
			description={description}
			showFileList={showFileList}
			onFilesChange={onFilesChange}
			onValidationError={onValidationError}
		/>
	);
}

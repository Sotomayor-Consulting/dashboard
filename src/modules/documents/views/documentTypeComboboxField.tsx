import * as React from 'react';
import {
	DocumentTypeCombobox,
	type DocumentTypeLite,
} from './documentTypeCombobox';

type Props = {
	documentTypes: DocumentTypeLite[];
	name?: string;
	defaultValue?: string;
	placeholder?: string | undefined;
};

export function DocumentTypeComboboxField({
	documentTypes,
	name = 'documentTypeId',
	defaultValue = '',
	placeholder,
}: Props) {
	const [value, setValue] = React.useState(defaultValue);

	return (
		<div className="w-full">
			<DocumentTypeCombobox
				documentTypes={documentTypes}
				value={value}
				onChange={setValue}
				placeholder={placeholder ?? ''}
			/>
			<input type="hidden" name={name} value={value} />
		</div>
	);
}

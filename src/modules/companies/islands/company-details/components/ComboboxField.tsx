import {
	Combobox,
	ComboboxContent,
	ComboboxEmpty,
	ComboboxInput,
	ComboboxItem,
	ComboboxList,
} from '@components/ui/Combobox';

export interface ComboboxOption {
	value: string;
	label: string;
}

interface Props {
	id?: string;
	options: ComboboxOption[];
	value: string | null;
	onChange: (value: string | null) => void;
	placeholder?: string;
	emptyText?: string;
	disabled?: boolean;
	allowClear?: boolean;
}

/**
 * Combobox simple basado en `@components/ui/Combobox` (base-ui).
 * Soporta búsqueda typing-en-el-input + selección por click.
 */
export function ComboboxField({
	id,
	options,
	value,
	onChange,
	placeholder = 'Seleccione',
	emptyText = 'No hay coincidencias.',
	disabled,
	allowClear = false,
}: Props) {
	const selectedItem =
		value === null ? null : (options.find((o) => o.value === value) ?? null);

	return (
		<Combobox<ComboboxOption>
			items={options}
			itemToStringValue={(item) => item.value}
			itemToStringLabel={(item) => item.label}
			value={selectedItem}
			onValueChange={(item) =>
				onChange(item ? (item as ComboboxOption).value : null)
			}
		>
			<ComboboxInput
				id={id}
				placeholder={placeholder}
				disabled={disabled}
				showClear={allowClear}
				className="w-full"
			/>
			<ComboboxContent>
				<ComboboxEmpty>{emptyText}</ComboboxEmpty>
				<ComboboxList>
					{(item: ComboboxOption) => (
						<ComboboxItem key={item.value} value={item}>
							{item.label}
						</ComboboxItem>
					)}
				</ComboboxList>
			</ComboboxContent>
		</Combobox>
	);
}

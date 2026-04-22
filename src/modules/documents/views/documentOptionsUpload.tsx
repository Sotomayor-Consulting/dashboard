'use client';

import {
	Combobox,
	ComboboxContent,
	ComboboxEmpty,
	ComboboxInput,
	ComboboxItem,
	ComboboxList,
} from '@components/components/ui/combobox';

export type DocumentOption = {
	code: number;
	name: string;
};

type ComboboxItems = {
	items: DocumentOption[];
	placeholder?: string;
};

export function DocumentOptions({
	items,
	placeholder = 'Selecciona una opción',
}: ComboboxItems) {
	return (
		<Combobox items={items}>
			<ComboboxInput placeholder={placeholder} />
			<ComboboxContent>
				<ComboboxEmpty>No se encontraron elementos.</ComboboxEmpty>
				<ComboboxList>
					{(item: DocumentOption) => (
						<ComboboxItem key={item.code} value={String(item.name)}>
							{item.name}
						</ComboboxItem>
					)}
				</ComboboxList>
			</ComboboxContent>
		</Combobox>
	);
}

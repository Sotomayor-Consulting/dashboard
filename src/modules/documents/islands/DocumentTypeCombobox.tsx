import * as React from 'react';

import {
	Combobox,
	ComboboxCollection,
	ComboboxContent,
	ComboboxEmpty,
	ComboboxGroup,
	ComboboxInput,
	ComboboxItem,
	ComboboxLabel,
	ComboboxList,
} from '@components/ui/Combobox';
import { LEGAL_CATEGORY_LABELS } from '../document-ui';

export type DocumentTypeLite = {
	id: number;
	name: string;
	legal_category: string;
	applies_to: string;
	is_active: boolean;
};

type DocumentTypeGroup = { value: string; items: DocumentTypeLite[] };

type Props = {
	documentTypes: DocumentTypeLite[];
	value?: string;
	onChange: (value: string) => void;
	placeholder?: string;
};

/**
 * Combobox de tipo de documento: se escribe directamente en el input para
 * filtrar, agrupado por la categoría legal que viene de la BD
 * (`documents.document_types.legal_category`).
 */
export function DocumentTypeCombobox({
	documentTypes,
	value,
	onChange,
	placeholder = 'Seleccionar tipo de documento',
}: Props) {
	const groups = React.useMemo<DocumentTypeGroup[]>(() => {
		const map = new Map<string, DocumentTypeLite[]>();
		for (const doc of documentTypes) {
			const category = doc.legal_category ?? 'other';
			if (!map.has(category)) map.set(category, []);
			map.get(category)!.push(doc);
		}
		return [...map.entries()].map(([category, items]) => ({
			value: category,
			items,
		}));
	}, [documentTypes]);

	const selected =
		documentTypes.find((doc) => String(doc.id) === value) ?? null;

	return (
		<Combobox
			items={groups}
			itemToStringValue={(item: DocumentTypeLite) => String(item.id)}
			itemToStringLabel={(item: DocumentTypeLite) => item.name}
			value={selected}
			onValueChange={(item) =>
				onChange(item ? String((item as DocumentTypeLite).id) : '')
			}
		>
			<ComboboxInput placeholder={placeholder} showClear className="w-full" />
			<ComboboxContent>
				<ComboboxEmpty>No se encontraron tipos de documento</ComboboxEmpty>
				<ComboboxList>
					{(group: DocumentTypeGroup) => (
						<ComboboxGroup key={group.value} items={group.items}>
							<ComboboxLabel>
								{LEGAL_CATEGORY_LABELS[group.value] ?? group.value}
							</ComboboxLabel>
							<ComboboxCollection>
								{(item: DocumentTypeLite) => (
									<ComboboxItem key={item.id} value={item}>
										{item.name}
									</ComboboxItem>
								)}
							</ComboboxCollection>
						</ComboboxGroup>
					)}
				</ComboboxList>
			</ComboboxContent>
		</Combobox>
	);
}

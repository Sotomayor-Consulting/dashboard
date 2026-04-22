import * as React from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';

import { cn } from '@components/lib/utils';
import { Button } from '@components/components/ui/button';
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from '@components/components/ui/command';
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from '@components/components/ui/popover';

export type DocumentTypeLite = {
	id: number;
	code: number;
	name: string;
	legal_category: string;
	applies_to: string;
	is_active: boolean;
};

type Props = {
	documentTypes: DocumentTypeLite[];
	value?: string;
	onChange: (value: string) => void;
	placeholder?: string;
};

export function DocumentTypeCombobox({
	documentTypes,
	value,
	onChange,
	placeholder = 'Seleccionar tipo de documento',
}: Props) {
	const [open, setOpen] = React.useState(false);

	const selected = documentTypes.find((doc) => String(doc.id) === value);

	return (
		<div className="w-full">
			<Popover open={open} onOpenChange={setOpen}>
				<PopoverTrigger asChild>
					<Button
						type="button"
						variant="outline"
						role="combobox"
						aria-expanded={open}
						className="w-full justify-between"
					>
						{selected ? `${selected.code} - ${selected.name}` : placeholder}
						<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0" />
					</Button>
				</PopoverTrigger>

				<PopoverContent className="w-[--radix-popover-trigger-width] p-0">
					<Command>
						<CommandInput
							className="bg-dark w-full focus:outline-hidden"
							placeholder="Buscar tipo de documento..."
						/>
						<CommandList>
							<CommandEmpty>No se encontraron tipos de documento</CommandEmpty>
							<CommandGroup>
								{documentTypes.map((doc) => (
									<CommandItem
										key={doc.id}
										value={`${doc.code} ${doc.name} ${doc.legal_category} ${doc.applies_to}`}
										onSelect={() => {
											onChange(String(doc.id));
											setOpen(false);
										}}
									>
										<Check
											className={cn(
												'mr-2 h-4 w-4',
												value === String(doc.id)
													? 'opacity-100'
													: 'opacity-0',
											)}
										/>
										<div className="flex flex-col">
											<span>
												{doc.code} - {doc.name}
											</span>
											<span className="text-muted-foreground text-xs">
												{doc.legal_category} · {doc.applies_to}
											</span>
										</div>
									</CommandItem>
								))}
							</CommandGroup>
						</CommandList>
					</Command>
				</PopoverContent>
			</Popover>
		</div>
	);
}

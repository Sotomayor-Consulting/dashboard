import { useEffect } from 'react';
import { EditorContent, useEditor, type Editor } from '@tiptap/react';
import { StarterKit } from '@tiptap/starter-kit';
import { FontSize, TextStyle } from '@tiptap/extension-text-style';
import {
	Combobox,
	ComboboxContent,
	ComboboxEmpty,
	ComboboxInput,
	ComboboxItem,
	ComboboxList,
} from '@components/ui/Combobox';
import {
	Bold,
	Italic,
	Link as LinkIcon,
	Underline as UnderlineIcon,
	Unlink,
} from 'lucide-react';

import { Button } from '@components/ui/Button';
import { cn } from '@components/utils';

interface HtmlEditorProps {
	value: string;
	onChange: (html: string) => void;
	ariaLabel?: string;
	className?: string;
}

type FontSizeOption = { label: string; value: string };

const FONT_SIZES: FontSizeOption[] = [
	{ label: 'Pequeño', value: '14px' },
	{ label: 'Normal', value: '' },
	{ label: 'Grande', value: '20px' },
];

function ToolbarButton({
	active,
	disabled,
	onClick,
	label,
	children,
}: {
	active?: boolean;
	disabled?: boolean;
	onClick: () => void;
	label: string;
	children: React.ReactNode;
}) {
	return (
		<Button
			type="button"
			variant="ghost"
			size="icon"
			aria-label={label}
			title={label}
			aria-pressed={active}
			disabled={disabled}
			onClick={onClick}
			className={cn(
				'text-muted-foreground hover:text-foreground h-8 w-8 cursor-pointer',
				active && 'bg-accent text-foreground',
			)}
		>
			{children}
		</Button>
	);
}

export function HtmlEditor({
	value,
	onChange,
	ariaLabel = 'Editor de mensaje',
	className,
}: HtmlEditorProps) {
	const editor = useEditor({
		immediatelyRender: false,
		extensions: [
			StarterKit.configure({
				heading: false,
				bulletList: false,
				orderedList: false,
				listItem: false,
				blockquote: false,
				codeBlock: false,
				code: false,
				horizontalRule: false,
				strike: false,
				link: {
					openOnClick: false,
					autolink: true,
					defaultProtocol: 'https',
				},
			}),
			TextStyle,
			FontSize,
		],
		content: value,
		editorProps: {
			attributes: {
				'aria-label': ariaLabel,
				class: cn(
					'max-h-64 min-h-32 w-full overflow-y-auto px-2.5 py-2 text-sm focus:outline-none',
					'[&_p]:my-1 [&_a]:text-primary-600 [&_a]:underline',
				),
			},
		},
		onUpdate: ({ editor }) => onChange(editor.getHTML()),
	});

	// Re-sincroniza cuando el padre cambia el valor externamente (p.ej. reset).
	useEffect(() => {
		if (!editor) return;
		if (value !== editor.getHTML()) {
			editor.commands.setContent(value, { emitUpdate: false });
		}
	}, [editor, value]);

	if (!editor) return null;

	const promptLink = (ed: Editor) => {
		const previous = ed.getAttributes('link').href as string | undefined;
		const url = window.prompt('URL del enlace', previous ?? 'https://');
		if (url === null) return;
		if (url.trim() === '') {
			ed.chain().focus().extendMarkRange('link').unsetLink().run();
			return;
		}
		ed.chain()
			.focus()
			.extendMarkRange('link')
			.setLink({ href: url.trim() })
			.run();
	};

	const currentFontSize =
		(editor.getAttributes('textStyle').fontSize as string | undefined) ?? '';
	const selectedFontSize =
		FONT_SIZES.find((s) => s.value === currentFontSize) ?? null;

	const applyFontSize = (item: FontSizeOption | null) => {
		const size = item?.value ?? '';
		const chain = editor.chain().focus();
		if (size) chain.setFontSize(size).run();
		else chain.unsetFontSize().run();
	};

	return (
		<div
			className={cn(
				'border-input focus-within:border-ring focus-within:ring-ring/50 dark:bg-input/30 rounded-lg border bg-transparent focus-within:ring-3',
				className,
			)}
		>
			<div className="border-input flex flex-wrap items-center gap-1 border-b p-1">
				<ToolbarButton
					label="Negrita"
					active={editor.isActive('bold')}
					onClick={() => editor.chain().focus().toggleBold().run()}
				>
					<Bold className="h-4 w-4" />
				</ToolbarButton>
				<ToolbarButton
					label="Cursiva"
					active={editor.isActive('italic')}
					onClick={() => editor.chain().focus().toggleItalic().run()}
				>
					<Italic className="h-4 w-4" />
				</ToolbarButton>
				<ToolbarButton
					label="Subrayado"
					active={editor.isActive('underline')}
					onClick={() => editor.chain().focus().toggleUnderline().run()}
				>
					<UnderlineIcon className="h-4 w-4" />
				</ToolbarButton>

				<Combobox<FontSizeOption>
					items={FONT_SIZES}
					itemToStringValue={(item) => item.value}
					itemToStringLabel={(item) => item.label}
					value={selectedFontSize}
					onValueChange={(item) => applyFontSize(item as FontSizeOption | null)}
				>
					<ComboboxInput
						aria-label="Tamaño de texto"
						placeholder="Tamaño"
						className="w-[130px]"
					/>
					<ComboboxContent>
						<ComboboxEmpty>Sin coincidencias.</ComboboxEmpty>
						<ComboboxList>
							{(item: FontSizeOption) => (
								<ComboboxItem key={item.label} value={item}>
									{item.label}
								</ComboboxItem>
							)}
						</ComboboxList>
					</ComboboxContent>
				</Combobox>

				<ToolbarButton
					label="Insertar enlace"
					active={editor.isActive('link')}
					onClick={() => promptLink(editor)}
				>
					<LinkIcon className="h-4 w-4" />
				</ToolbarButton>
				<ToolbarButton
					label="Quitar enlace"
					disabled={!editor.isActive('link')}
					onClick={() => editor.chain().focus().unsetLink().run()}
				>
					<Unlink className="h-4 w-4" />
				</ToolbarButton>
			</div>

			<EditorContent editor={editor} />
		</div>
	);
}

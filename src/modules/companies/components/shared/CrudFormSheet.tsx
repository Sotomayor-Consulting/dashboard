import * as React from 'react';
import { Button } from '@components/ui/Button';
import { cn } from '@components/utils';
import {
	Sheet,
	SheetContent,
	SheetFooter,
	SheetHeader,
	SheetTitle,
} from '@components/ui/Sheet';

interface Props {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	title: string;
	submitLabel: string;
	onSubmit: () => void;
	children: React.ReactNode;
	submitDisabled?: boolean;
	description?: string;
	/**
	 * Menú de opciones de la cabecera, a la izquierda de la X. Es el sitio de
	 * las acciones que no son "guardar": editar la persona, eliminar. Detrás de
	 * un menú y no como botón suelto para que un clic errado no dispare algo
	 * destructivo.
	 */
	headerMenu?: React.ReactNode;
	/**
	 * Contenido fijo bajo el título: identidad de la entidad que se edita. No
	 * scrollea con el cuerpo, así sigue visible al cambiar de pestaña.
	 */
	headerContent?: React.ReactNode;
}

export default function CrudFormSheet({
	open,
	onOpenChange,
	title,
	submitLabel,
	onSubmit,
	children,
	submitDisabled,
	description,
	headerMenu,
	headerContent,
}: Props) {
	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			{/*
			  El scroll vive en el cuerpo, no en el popup: con `overflow-y-auto` en
			  el contenedor, secciones altas (direcciones, documentos) empujaban el
			  footer fuera de la vista en lugar de dejarlo anclado abajo.
			*/}
			<SheetContent
				side="right"
				className="flex h-dvh max-w-[500px] flex-col gap-0 overflow-hidden sm:max-w-2xl"
			>
				{/*
				  Con `headerContent` el encabezado ES la ficha de la entidad, así que
				  el título pasa a ser solo accesible: repetir "Editar miembro" encima
				  de su nombre no aportaba nada.
				*/}
				<SheetHeader
					className={cn(
						'shrink-0 pr-24',
						headerContent ? 'sr-only p-0' : 'pb-3',
					)}
				>
					<SheetTitle>{title}</SheetTitle>
					{description ? (
						<p className="text-muted-foreground text-sm">{description}</p>
					) : null}
				</SheetHeader>
				{/* `right-12` deja libre el hueco de la X, que va en `right-3`. */}
				{headerMenu ? (
					<div className="absolute top-3 right-12 z-10">{headerMenu}</div>
				) : null}
				{/* El contenido trae sus propias secciones con padding y separadores,
				    como el drawer de empresas: aquí solo se fija y se delimita. */}
				{headerContent ? (
					<div className="border-border shrink-0 border-b">{headerContent}</div>
				) : null}
				<div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto pb-4">
					{children}
				</div>
				<CrudSheetFooter
					submitLabel={submitLabel}
					onSubmit={onSubmit}
					{...(submitDisabled !== undefined && { submitDisabled })}
					onCancel={() => onOpenChange(false)}
				/>
			</SheetContent>
		</Sheet>
	);
}

/**
 * Footer único de los sheets CRUD: una sola fila con guardar y cancelar. Las
 * acciones destructivas viven en el menú de la cabecera, no aquí.
 */
export function CrudSheetFooter({
	submitLabel,
	onSubmit,
	submitDisabled,
	onCancel,
	cancelLabel = 'Cancelar',
}: {
	submitLabel: string;
	onSubmit: () => void;
	submitDisabled?: boolean;
	onCancel: () => void;
	cancelLabel?: string;
}) {
	// Mismo gutter que el encabezado y el cuerpo (px-5), y el aire vertical de
	// arriba y abajo del sheet igualado.
	return (
		<SheetFooter className="border-border shrink-0 flex-row items-center gap-2 border-t px-5 py-4">
			<Button type="button" onClick={onSubmit} disabled={submitDisabled}>
				{submitLabel}
			</Button>
			<Button type="button" variant="outline" onClick={onCancel}>
				{cancelLabel}
			</Button>
		</SheetFooter>
	);
}

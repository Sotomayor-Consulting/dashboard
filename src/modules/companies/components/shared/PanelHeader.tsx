import * as React from 'react';

interface Props {
	/** Label small-caps sobre el título (p.ej. "MIEMBROS"). */
	kicker: string;
	title: string;
	/** Línea de resumen bajo el título (count, porcentajes, etc.). */
	meta?: React.ReactNode;
	/** Acción a la derecha (p.ej. botón "Agregar"). */
	action?: React.ReactNode;
}

/**
 * Header simétrico de los paneles del detalle de empresa (Información,
 * Direcciones, Miembros, Documentos). Un solo lugar para el patrón
 * full-bleed + kicker + título + meta.
 */
export default function PanelHeader({ kicker, title, meta, action }: Props) {
	return (
		<header className="border-border flex items-end justify-between gap-4 border-b px-7 pt-6 pb-4">
			<div>
				<p className="text-[11.5px] font-semibold tracking-wider text-gray-500 uppercase dark:text-gray-400">
					{kicker}
				</p>
				<h3 className="mt-1 text-[22px] font-semibold text-gray-900 dark:text-gray-100">
					{title}
				</h3>
				{meta ? (
					<p className="mt-1 text-[12.5px] text-gray-500 dark:text-gray-400">
						{meta}
					</p>
				) : null}
			</div>
			{action}
		</header>
	);
}

// ─── Triggers para <dialog> nativo ───────────────────────
// Único glue necesario: abrir/cerrar por data-attribute (delegado, funciona
// también con triggers renderizados por islands React) y cerrar al hacer
// click en el ::backdrop. Todo lo demás — ESC, focus trap, top layer,
// aria — lo aporta el elemento <dialog> del navegador.
//
//   <button data-dialog-show="mi-dialog">Abrir</button>
//   <dialog id="mi-dialog"> … <button data-dialog-hide="mi-dialog">×</button></dialog>
//
// Un <dialog> con data-static no se cierra al hacer click fuera.

declare global {
	interface Window {
		__nativeDialogsBound?: boolean;
	}
}

export function initNativeDialogs(): void {
	if (window.__nativeDialogsBound) return;
	window.__nativeDialogsBound = true;

	document.addEventListener('click', (event) => {
		const target = event.target as HTMLElement | null;
		if (!target) return;

		const trigger = target.closest<HTMLElement>(
			'[data-dialog-show], [data-dialog-hide]',
		);
		if (trigger) {
			const showId = trigger.getAttribute('data-dialog-show');
			const hideId = trigger.getAttribute('data-dialog-hide');
			const dialog = document.getElementById(showId ?? hideId ?? '');
			if (dialog instanceof HTMLDialogElement) {
				if (showId) dialog.showModal();
				else dialog.close();
			}
			return;
		}

		// Click sobre el ::backdrop: el target es el propio <dialog> pero las
		// coordenadas caen fuera de su caja.
		if (target instanceof HTMLDialogElement && !target.hasAttribute('data-static')) {
			const rect = target.getBoundingClientRect();
			const inside =
				event.clientX >= rect.left &&
				event.clientX <= rect.right &&
				event.clientY >= rect.top &&
				event.clientY <= rect.bottom;
			if (!inside) target.close();
		}
	});
}

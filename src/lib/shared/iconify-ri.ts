import { addCollection } from '@iconify/react';
import riIcons from '@iconify-json/ri/icons.json';

/**
 * Registra el set `ri` (Remix Icons) de forma offline para `@iconify/react`.
 * Sin esto, el componente <Icon /> intenta descargarlos desde
 * https://api.iconify.design en runtime y queda en blanco si la red falla
 * o tarda.
 *
 * Side-effect import: basta con `import '@shared/iconify-ri'` una vez en
 * cualquier island/entrypoint del cliente. El registro es global a
 * `@iconify/react`, así que con que uno lo importe en el bundle alcanza,
 * pero conviene importarlo por isla para que el code-splitting no lo
 * deje fuera de un island específico.
 */
let registered = false;

if (!registered) {
	addCollection(riIcons as Parameters<typeof addCollection>[0]);
	registered = true;
}

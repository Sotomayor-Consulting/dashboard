import { addCollection } from '@iconify/react';
import riIcons from '@iconify-json/ri/icons.json';

/**
 * Registra el set `ri` (Remix Icons) de forma offline para `@iconify/react`.
 * Sin esto, el componente <Icon /> intenta descargarlos desde
 * https://api.iconify.design en runtime y queda en blanco si la red falla
 * o tarda.
 *
 * Side-effect import: basta con `import './icons'` una vez en el island raíz.
 */
let registered = false;

if (!registered) {
	addCollection(riIcons as Parameters<typeof addCollection>[0]);
	registered = true;
}

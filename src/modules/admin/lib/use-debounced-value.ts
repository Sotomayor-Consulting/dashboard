import { useEffect, useState } from 'react';

/**
 * Devuelve `value` solo después de que el usuario deja de cambiarlo por
 * `delayMs`. Útil para inputs de búsqueda donde no queremos filtrar
 * (o pegar a la API) en cada keystroke.
 */
export function useDebouncedValue<T>(value: T, delayMs = 200): T {
	const [debounced, setDebounced] = useState(value);

	useEffect(() => {
		const t = setTimeout(() => setDebounced(value), delayMs);
		return () => clearTimeout(t);
	}, [value, delayMs]);

	return debounced;
}

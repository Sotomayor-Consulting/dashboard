import * as React from 'react';

export interface Country {
	id: number;
	iso: string | null;
	name: string | null;
	phone_code: string | null;
}

export interface StateItem {
	id: number;
	country_id: number;
	name: string | null;
	code: string | null;
}

// ── Caches module-level (singletons en el bundle del browser) ─────────────────
//
// countries: una sola lista global. Se carga la primera vez y se reusa.
// states: por country_id. Se carga al pedir, se reusa siempre después.
// El HTTP también cachea (1h fresh + 1d SWR), así que recargas de página
// tampoco vuelven a pegarle al server.

let countriesCache: Country[] | null = null;
let countriesInflight: Promise<Country[]> | null = null;

const statesCache = new Map<number, StateItem[]>();
const statesInflight = new Map<number, Promise<StateItem[]>>();

async function fetchJson<T>(url: string): Promise<T> {
	const res = await fetch(url, { credentials: 'include' });
	const payload = await res.json().catch(() => null);
	if (!res.ok || !payload?.ok) {
		throw new Error(payload?.error ?? 'Network error');
	}
	return payload.data as T;
}

async function loadCountries(): Promise<Country[]> {
	if (countriesCache) return countriesCache;
	if (countriesInflight) return countriesInflight;
	countriesInflight = (async () => {
		try {
			const data = await fetchJson<Country[]>('/api/locations/countries');
			countriesCache = data;
			return data;
		} finally {
			countriesInflight = null;
		}
	})();
	return countriesInflight;
}

async function loadStates(countryId: number): Promise<StateItem[]> {
	const cached = statesCache.get(countryId);
	if (cached) return cached;
	const pending = statesInflight.get(countryId);
	if (pending) return pending;
	const promise = (async () => {
		try {
			const data = await fetchJson<StateItem[]>(
				`/api/locations/states?countryId=${countryId}`,
			);
			statesCache.set(countryId, data);
			return data;
		} finally {
			statesInflight.delete(countryId);
		}
	})();
	statesInflight.set(countryId, promise);
	return promise;
}

/**
 * Hook para acceso reactivo a countries/states. Comparte caché entre
 * componentes (singleton module-level).
 *
 * Uso:
 *   const { countries, states, isLoadingStates, error } = useLocations(countryId);
 *
 * `countries` se carga al montar el primer consumidor (lazy global).
 * `states` se carga al cambiar `countryId` (null/undefined → array vacío).
 */
export function useLocations(countryId: number | null | undefined) {
	const [countries, setCountries] = React.useState<Country[]>(
		countriesCache ?? [],
	);
	const [states, setStates] = React.useState<StateItem[]>(
		countryId !== null && countryId !== undefined
			? (statesCache.get(countryId) ?? [])
			: [],
	);
	const [isLoadingCountries, setIsLoadingCountries] = React.useState(
		countriesCache === null,
	);
	const [isLoadingStates, setIsLoadingStates] = React.useState(false);
	const [error, setError] = React.useState<string | null>(null);

	// Countries: carga lazy una sola vez (compartida globalmente).
	React.useEffect(() => {
		let cancelled = false;
		if (countriesCache) {
			setCountries(countriesCache);
			setIsLoadingCountries(false);
			return;
		}
		setIsLoadingCountries(true);
		loadCountries()
			.then((data) => {
				if (cancelled) return;
				setCountries(data);
				setError(null);
			})
			.catch((err) => {
				if (cancelled) return;
				setError(err instanceof Error ? err.message : 'Error inesperado');
			})
			.finally(() => {
				if (!cancelled) setIsLoadingCountries(false);
			});
		return () => {
			cancelled = true;
		};
	}, []);

	// States: re-carga cuando cambia countryId.
	React.useEffect(() => {
		let cancelled = false;
		if (countryId === null || countryId === undefined) {
			setStates([]);
			setIsLoadingStates(false);
			return;
		}
		const cached = statesCache.get(countryId);
		if (cached) {
			setStates(cached);
			setIsLoadingStates(false);
			return;
		}
		setIsLoadingStates(true);
		loadStates(countryId)
			.then((data) => {
				if (cancelled) return;
				setStates(data);
				setError(null);
			})
			.catch((err) => {
				if (cancelled) return;
				setError(err instanceof Error ? err.message : 'Error inesperado');
				setStates([]);
			})
			.finally(() => {
				if (!cancelled) setIsLoadingStates(false);
			});
		return () => {
			cancelled = true;
		};
	}, [countryId]);

	return {
		countries,
		states,
		isLoadingCountries,
		isLoadingStates,
		error,
	};
}

/**
 * Precarga eager (útil en pages cuando sabés que vas a necesitar los datos
 * pronto, p. ej. en un onMount o handler).
 */
export const preloadCountries = loadCountries;
export const preloadStates = loadStates;

import type { SupabaseClient } from '@supabase/supabase-js';

export interface CountryRow {
	id: number;
	iso: string | null;
	name: string | null;
	phone_code: string | null;
}

const TTL_MS = 60 * 60 * 1000; // 1 hora — datos geográficos casi nunca cambian.

let cache: { data: CountryRow[]; expiresAt: number } | null = null;
let inflight: Promise<CountryRow[]> | null = null;

/**
 * Lista todos los países (cached). Singleton process-level con TTL de 1h.
 * Si dos requests caen al mismo tiempo, ambas reusan la misma promesa
 * inflight para evitar consultas duplicadas.
 */
export async function listCountries(
	supabase: SupabaseClient,
): Promise<CountryRow[]> {
	const now = Date.now();
	if (cache && cache.expiresAt > now) return cache.data;
	if (inflight) return inflight;

	inflight = (async () => {
		try {
			const { data, error } = await supabase
				.from('countries')
				.select('id, iso, name, phone_code')
				.order('name', { ascending: true });
			if (error) throw error;
			cache = { data: (data ?? []) as CountryRow[], expiresAt: now + TTL_MS };
			return cache.data;
		} finally {
			inflight = null;
		}
	})();

	return inflight;
}

/** Invalida la caché. Útil después de DDL/migraciones manuales. */
export function clearCountriesCache() {
	cache = null;
}

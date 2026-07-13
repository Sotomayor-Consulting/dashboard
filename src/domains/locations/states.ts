import type { SupabaseClient } from '@supabase/supabase-js';

export interface StateRow {
	id: number;
	country_id: number;
	name: string | null;
	code: string | null;
}

const TTL_MS = 60 * 60 * 1000; // 1 hora.

interface CacheEntry {
	data: StateRow[];
	expiresAt: number;
}

const cache = new Map<number, CacheEntry>();
const inflight = new Map<number, Promise<StateRow[]>>();

/**
 * Lista los estados de un país (cached por country_id). Singleton process-level
 * con TTL de 1h. Concurrent calls al mismo country_id comparten la misma
 * promesa inflight para evitar consultas duplicadas.
 */
export async function listStatesByCountry(
	supabase: SupabaseClient,
	countryId: number,
): Promise<StateRow[]> {
	const now = Date.now();
	const cached = cache.get(countryId);
	if (cached && cached.expiresAt > now) return cached.data;
	const pending = inflight.get(countryId);
	if (pending) return pending;

	const promise = (async () => {
		try {
			const { data, error } = await supabase
				.from('states')
				.select('id, country_id, name, code')
				.eq('country_id', countryId)
				.order('name', { ascending: true });
			if (error) throw error;
			const rows = (data ?? []) as StateRow[];
			cache.set(countryId, { data: rows, expiresAt: now + TTL_MS });
			return rows;
		} finally {
			inflight.delete(countryId);
		}
	})();

	inflight.set(countryId, promise);
	return promise;
}

/**
 * Dado un state_id, retorna el country_id asociado (con cache propio).
 * Útil para pre-seleccionar país cuando solo conocemos el state guardado.
 */
const stateToCountry = new Map<number, number>();

export async function getCountryIdByState(
	supabase: SupabaseClient,
	stateId: number,
): Promise<number | null> {
	if (stateToCountry.has(stateId)) {
		return stateToCountry.get(stateId) ?? null;
	}
	const { data, error } = await supabase
		.from('states')
		.select('country_id')
		.eq('id', stateId)
		.maybeSingle<{ country_id: number | null }>();
	if (error) throw error;
	const countryId = data?.country_id ?? null;
	if (countryId !== null) stateToCountry.set(stateId, countryId);
	return countryId;
}

/** Invalida toda la caché de states. */
export function clearStatesCache() {
	cache.clear();
	stateToCountry.clear();
}

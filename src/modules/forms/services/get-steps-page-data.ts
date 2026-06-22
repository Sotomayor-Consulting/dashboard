import type { SupabaseClient } from '@supabase/supabase-js';
import { getUsStates } from '@modules/companies/services/get-us-states';

export async function getStepsPageData(
	supabase: SupabaseClient,
): Promise<{ estados: { Estado: string }[] }> {
	// La tabla `estados` fue reemplazada por `states` (filtrada por country_id).
	// Reusamos el dominio canónico `getUsStates` y adaptamos a la forma { Estado }.
	const states = await getUsStates(supabase);
	return { estados: states.map((s) => ({ Estado: s.name })) };
}

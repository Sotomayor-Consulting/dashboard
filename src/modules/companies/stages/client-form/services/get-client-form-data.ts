import type { SupabaseClient } from '@supabase/supabase-js';

import { actividadesGeneral } from '@domains/utils/generals/activities';

import type { Activity } from '../data/activities';

export interface ClientFormBootstrapData {
	activities: Activity[];
}

/**
 * Agregador SSR para el wizard del cliente.
 * Carga las opciones dinámicas que vienen de DB.
 *
 * Se invoca desde `ClientForm.astro` y el resultado se inyecta como prop
 * al island `ClientFormWizard.tsx`.
 */
export async function getClientFormBootstrapData(
	supabase: SupabaseClient,
): Promise<ClientFormBootstrapData> {
	const activitiesRaw = (await actividadesGeneral(supabase)) ?? [];
	const activities = activitiesRaw as unknown as Activity[];
	return { activities };
}

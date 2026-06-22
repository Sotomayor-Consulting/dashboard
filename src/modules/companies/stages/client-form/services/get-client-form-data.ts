import type { SupabaseClient } from '@supabase/supabase-js';
import { createLogger } from '@infrastructure/logging';

const log = createLogger('client-form.data');

import { actividadesGeneral } from '@domains/utils/generals/activities';
import { getCountries } from '@domains/countries';
import { getUsStates } from '@modules/companies/services/get-us-states';
import type { Country } from '@modules/companies/types';

import type { Activity } from '../data/activities';

/** Opción de estado disponible para el combobox de la Identity Card. */
export interface EstadoOption {
	/** Nombre completo (ej. "Florida"). */
	nombre: string;
	/** Abreviatura de 2 letras (ej. "FL"). */
	codigo: string;
}

/** Identidad pre-cargada de la solicitud (3 nombres + estado). */
export interface IncorporationIdentity {
	/** Las 3 opciones de nombre en orden de preferencia. */
	nameOptions: [string, string, string];
	/** Estado de incorporación (texto, ej. "Florida"). */
	estadoIncorporacion: string | null;
}

/** País serializable para el island (sin el id interno). */
export interface CountryOption {
	iso: string;
	name: string;
	phoneCode: string;
}

export interface ClientFormBootstrapData {
	activities: Activity[];
	/** Identidad pre-cargada (nombres + estado). */
	identity: IncorporationIdentity;
	/** Lista de estados disponibles para editar el estado de incorporación. */
	estados: EstadoOption[];
	/** Países desde public.countries. */
	countries: CountryOption[];
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
	empresaId: string,
): Promise<ClientFormBootstrapData> {
	const [activitiesRaw, identity, estados, countriesRaw] = await Promise.all([
		actividadesGeneral(supabase),
		getIncorporationIdentity(supabase, empresaId),
		getEstados(supabase),
		getCountries(supabase),
	]);
	const activities = (activitiesRaw ?? []) as unknown as Activity[];
	const countries: CountryOption[] = (countriesRaw ?? []).map(
		(c: Country) => ({
			iso: c.iso,
			name: c.name,
			phoneCode: c.phone_code,
		}),
	);
	return { activities, identity, estados, countries };
}

/**
 * Lee la identidad pre-cargada de la incorporación: los 3 nombres y el estado.
 */
async function getIncorporationIdentity(
	supabase: SupabaseClient,
	empresaId: string,
): Promise<IncorporationIdentity> {
	const { data, error } = await supabase
		.from('incorporations')
		.select('principal_name, possible_names, formation_state:formation_state_id ( name )')
		.eq('id', empresaId)
		.single();

	if (error || !data) {
		log.error('Error fetching incorporation identity', { error });
		return { nameOptions: ['', '', ''], estadoIncorporacion: null };
	}

	const options = (data.possible_names as string[] | null) ?? [];
	const principal = (data.principal_name as string | null) ?? options[0] ?? '';
	const rest = options.filter((n) => n && n !== principal);

	const stateRow = data.formation_state as unknown as { name: string } | null;

	return {
		nameOptions: [principal, rest[0] ?? '', rest[1] ?? ''],
		estadoIncorporacion: stateRow?.name ?? null,
	};
}

/** Lista de estados de US (nombre + código) desde la tabla `states`. */
async function getEstados(supabase: SupabaseClient): Promise<EstadoOption[]> {
	// La tabla `estados` fue reemplazada por `states` (filtrada por country_id).
	// Reusamos el dominio canónico `getUsStates`.
	const states = await getUsStates(supabase);
	return states
		.map((s) => ({ nombre: s.name, codigo: s.code }))
		.filter((e) => e.nombre);
}

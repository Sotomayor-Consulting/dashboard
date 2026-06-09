import type { SupabaseClient } from '@supabase/supabase-js';
import { createLogger } from '@infrastructure/logging';

const log = createLogger('client-form.data');

import { actividadesGeneral } from '@domains/utils/generals/activities';

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

export interface ClientFormBootstrapData {
	activities: Activity[];
	/** Identidad pre-cargada (nombres + estado). */
	identity: IncorporationIdentity;
	/** Lista de estados disponibles para editar el estado de incorporación. */
	estados: EstadoOption[];
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
	const [activitiesRaw, identity, estados] = await Promise.all([
		actividadesGeneral(supabase),
		getIncorporationIdentity(supabase, empresaId),
		getEstados(supabase),
	]);
	const activities = (activitiesRaw ?? []) as unknown as Activity[];
	return { activities, identity, estados };
}

/**
 * Lee la identidad pre-cargada de la incorporación: los 3 nombres y el estado.
 */
async function getIncorporationIdentity(
	supabase: SupabaseClient,
	empresaId: string,
): Promise<IncorporationIdentity> {
	const { data, error } = await supabase
		.from('empresas_incorporaciones')
		.select('nombre_1, nombre_2, nombre_3, estado_de_incorporacion')
		.eq('empresa_incorporacion_id', empresaId)
		.single();

	if (error || !data) {
		log.error('Error fetching incorporation identity', { error });
		return { nameOptions: ['', '', ''], estadoIncorporacion: null };
	}

	return {
		nameOptions: [
			(data.nombre_1 as string | null) ?? '',
			(data.nombre_2 as string | null) ?? '',
			(data.nombre_3 as string | null) ?? '',
		],
		estadoIncorporacion:
			(data.estado_de_incorporacion as string | null) ?? null,
	};
}

/** Lista de estados disponibles (nombre + abreviatura) desde la tabla `estados`. */
async function getEstados(supabase: SupabaseClient): Promise<EstadoOption[]> {
	const { data, error } = await supabase
		.from('estados')
		.select('Estado, abreviatura')
		.order('Estado', { ascending: true });

	if (error || !data) {
		log.error('Error fetching estados', { error });
		return [];
	}

	return data
		.map((row) => ({
			nombre: (row.Estado as string | null) ?? '',
			codigo: (row.abreviatura as string | null) ?? '',
		}))
		.filter((e) => e.nombre);
}

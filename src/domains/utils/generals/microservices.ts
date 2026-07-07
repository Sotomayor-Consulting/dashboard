import type { SupabaseClient } from '@supabase/supabase-js';
import { createLogger } from '@infrastructure/logging';

const log = createLogger('domains.microservices');

export const ListaDeMicroServiciosActivos = async (
	supabase: SupabaseClient,
) => {
	// Catálogo canónico: catalogs.services (addons vendibles sueltos).
	const { data, error } = await supabase
		.schema('catalogs')
		.from('services')
		.select(
			`id, slug, nombre:name,
			precio:price, descripcion:description, icono:icon, etiqueta:label`,
		)
		.eq('is_active', true)
		.eq('sellable_alone', true);
	if (error) {
		log.error('Error fetching microservicios activos', { error });
		throw error;
	}

	return data;
};

export const serviciosExtras = async (supabase: SupabaseClient) => {
	const { data, error } = await supabase
		.from('servicio_extra')
		.select('*')
		.eq('estado', 'Activo')
		.order('created_at', { ascending: false });
	if (error) {
		log.error('Error fetching servicios Extras', { error });
		throw error;
	}
	return data;
};

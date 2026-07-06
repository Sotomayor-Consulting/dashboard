import type { SupabaseClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '@infrastructure/supabase/admin';
import { createLogger } from '@infrastructure/logging';

const log = createLogger('domains.services');

// Catálogo canónico de planes: catalogs.service_plans (schema `catalogs` expuesto
// en PostgREST). Los alias del select mantienen el shape en español (nombre,
// precio, descripcion…) que consumen las vistas; `id`/`slug`/`plan_kind` son canónicos.
const PLAN_SELECT_LEGACY = `id, slug, plan_kind, sort_order,
	nombre:name, precio:price,
	descripcion:description, etiqueta:label, categoria:metadata->>categoria,
	servicio_activo:is_active, created_at`;

export const ListaServiciosGeneral = async (supabase: SupabaseClient) => {
	const { data, error } = await supabase
		.schema('catalogs')
		.from('service_plans')
		.select(PLAN_SELECT_LEGACY)
		.order('sort_order', { ascending: true });
	if (error) {
		log.error('Error fetching todos servicios', { error });
		throw error;
	}

	return data;
};

export const ListaServiciosStripe = async (_supabase: SupabaseClient) => {
	// supabaseAdmin: el pricing se muestra en rutas públicas (pre-registro) y la
	// RLS del catálogo es authenticated-only; service_role evita abrir el catálogo a anon.
	const { data, error } = await supabaseAdmin
		.schema('catalogs')
		.from('service_plans')
		.select(PLAN_SELECT_LEGACY)
		.eq('is_active', true)
		.eq('plan_kind', 'base')
		.order('sort_order', { ascending: true });
	if (error) {
		log.error('Error fetching servicios de para pago', { error });
		throw error;
	}

	return data;
};

export const getServicioUpgrade = async (supabase: SupabaseClient) => {
	const { data, error } = await supabase
		.schema('catalogs')
		.from('service_plans')
		.select('id, slug, nombre:name, precio:price')
		.eq('slug', 'upgrade')
		.eq('is_active', true)
		.maybeSingle();
	if (error) {
		log.error('Error fetching servicios upgrade para pago', { error });
		throw error;
	}

	return data;
};

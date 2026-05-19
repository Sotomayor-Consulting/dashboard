/**
 * Tipos de la tabla `activity` consumida por el wizard.
 * Los datos NO están hardcodeados aquí — se cargan en el .astro
 * usando `actividadesGeneral(supabase)` de `@domains/utils/generals/activities`
 * y se pasan como prop al island del wizard.
 *
 * La forma coincide con el SELECT del domain:
 *   id, irs_code, name_es, name_en,
 *   category:category_id ( id, name, sector:sector_id ( id, name ) )
 */

export interface ActivitySector {
	id: string | number;
	name: string;
}

export interface ActivityCategory {
	id: string | number;
	name: string;
	sector: ActivitySector | null;
}

export interface Activity {
	id: string;
	irs_code: string;
	name_es: string;
	name_en: string;
	category: ActivityCategory | null;
}

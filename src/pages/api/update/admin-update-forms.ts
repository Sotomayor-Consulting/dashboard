// src/pages/api/admin/formularios/update.ts
export const prerender = false;

import type { APIRoute } from 'astro';
import { createSupabaseServerClient } from '@lib/supabase';
import { safeBack } from '@lib/security/headers';

const BACK_PATH = '/formularios/';

export const POST: APIRoute = async ({ request, cookies, redirect, url, locals }) => {
	const back = safeBack(url.searchParams.get('back'), BACK_PATH);

	try {
		// 1) Sesión
		const supabase = createSupabaseServerClient({ headers: request.headers, cookies });

		// 2) Usuario y autorización admin desde locals
		const { data: { user: actor }, error: userErr } = await supabase.auth.getUser();
		if (userErr || !actor) {
			return redirect(
				`${back}?status=error&msg=${encodeURIComponent('No autenticado')}`,
			);
		}
		const userRoles = locals.userRoles || [];
		const isAdmin = userRoles.includes('admin');
		if (!isAdmin) {
			return redirect(
				`${back}?status=error&msg=${encodeURIComponent('No autorizado')}`,
			);
		}

		// 3) Form data
		const form = await request.formData();

		// PK (hidden input)
		const formId = form.get('service_id')?.toString().trim();
		if (!formId) {
			return redirect(
				`${back}?status=error&msg=${encodeURIComponent('Falta el ID del formulario')}`,
			);
		}

		// Campos mapeados
		const titulo = form.get('titulo-form')?.toString().trim();
		const slugRaw = form.get('categoria-form')?.toString().trim(); // en BD: slug
		const schemaJsonRaw = form.get('json-update')?.toString().trim();
		const descripcion = form.get('descripcion-form-update')?.toString().trim();
		const estadoRaw = form.get('estado')?.toString().trim();

		// Tema: solo actualizar si viene JSON no vacío
		const temaRaw = form.get('tema-form-update')?.toString().trim();

		// 4) Normalizaciones / validaciones
		let schema_json: any | undefined;
		if (schemaJsonRaw) {
			try {
				schema_json = JSON.parse(schemaJsonRaw);
			} catch {
				return redirect(
					`${back}?status=error&msg=${encodeURIComponent('JSON del formulario inválido')}`,
				);
			}
		}

		let tema_json: any | undefined;
		if (temaRaw && temaRaw.length > 0) {
			try {
				tema_json = JSON.parse(temaRaw);
			} catch {
				return redirect(
					`${back}?status=error&msg=${encodeURIComponent('JSON del tema inválido')}`,
				);
			}
		}
		// Nota: si no vino temaRaw o vino vacío, NO tocamos tema_json

		let estado: boolean | undefined;
		if (estadoRaw === 'true') estado = true;
		if (estadoRaw === 'false') estado = false;

		const slug = slugRaw || undefined;

		// 5) Payload selectivo
		const payload: Record<string, any> = {
			updated_at: new Date().toISOString(),
		};
		if (titulo) payload.titulo = titulo;
		if (typeof estado === 'boolean') payload.estado = estado;
		if (slug) payload.slug = slug;
		if (typeof schema_json !== 'undefined') payload.schema_json = schema_json;
		if (typeof descripcion !== 'undefined' && descripcion !== '')
			payload.descripcion = descripcion;
		if (typeof tema_json !== 'undefined') payload.tema_json = tema_json; // solo si vino JSON válido

		// Sin cambios
		if (Object.keys(payload).length === 1) {
			return redirect(
				`${back}?status=success&msg=${encodeURIComponent('Sin cambios')}`,
			);
		}

		// 6) Update
		const { error } = await supabase
			.from('formularios')
			.update(payload)
			.eq('form_id', formId);

		if (error) {
			const msg = `Error al actualizar formulario: ${error.message}`;
			return redirect(`${back}?status=error&msg=${encodeURIComponent(msg)}`);
		}

		return redirect(
			`${back}?status=success&msg=${encodeURIComponent('Formulario actualizado correctamente')}`,
		);
	} catch (e: any) {
		const msg = encodeURIComponent(`Error inesperado: ${e?.message ?? e}`);
		return redirect(`${back}?status=error&msg=${msg}`);
	}
};

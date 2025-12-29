// src/pages/api/admin/formularios/update.ts
export const prerender = false;

import type { APIRoute } from 'astro';
import { supabase } from '../../../lib/supabase';

const FALLBACK_BACK = '/crud/formularios';

export const POST: APIRoute = async ({ request, cookies, redirect, url }) => {
	// 0) Leer el form UNA sola vez y sacar el slug temprano
	const form = await request.formData();

	// slug principal desde <input type="hidden" name="slug" />
	let slug =
		form.get('slug')?.toString().trim() ||
		url.searchParams.get('slug')?.toString().trim() ||
		'';

	// Util para construir la URL de retorno
	const backPath = () =>
		slug ? `/empresas/${slug}/crud/formularios` : FALLBACK_BACK;

	try {
		// 1) Sesión
		const at = cookies.get('sb-access-token');
		const rt = cookies.get('sb-refresh-token');
		if (!at || !rt) {
			return redirect(
				`${backPath()}?status=error&msg=${encodeURIComponent('No autenticado')}`,
			);
		}
		const { error: sErr } = await supabase.auth.setSession({
			access_token: at.value,
			refresh_token: rt.value,
		});
		if (sErr) {
			return redirect(
				`${backPath()}?status=error&msg=${encodeURIComponent('No fue posible establecer su sesión')}`,
			);
		}

		// 2) Usuario
		const { data: userRes, error: userErr } = await supabase.auth.getUser();
		const actor = userRes?.user;
		if (userErr || !actor) {
			return redirect(
				`${backPath()}?status=error&msg=${encodeURIComponent('No autenticado')}`,
			);
		}

		// 3) Verificación admin global (tabla usuarios_empresas)
		const { data: isAdminRes, error: rpcErr } = await supabase.rpc(
			'is_admin_global_empresas',
		);
		const isAdmin = !rpcErr && Boolean(isAdminRes);
		if (!isAdmin) {
			return redirect(
				`${backPath()}?status=error&msg=${encodeURIComponent('No autorizado')}`,
			);
		}

		// 4) PK (acepta form_id o service_id)
		const formId =
			form.get('form_id')?.toString().trim() ||
			form.get('service_id')?.toString().trim() ||
			'';
		if (!formId) {
			return redirect(
				`${backPath()}?status=error&msg=${encodeURIComponent('Falta el ID del formulario')}`,
			);
		}

		// 4.b) Si aún no tenemos slug, lo resolvemos por DB: formularios → empresa.slug
		if (!slug) {
			const { data: fInfo } = await supabase
				.from('formularios')
				.select('empresa:empresa ( slug )')
				.eq('form_id', formId)
				.single();
			slug = (fInfo as any)?.empresa?.slug || '';
		}

		// 5) Campos mapeados
		const titulo = form.get('titulo-form')?.toString().trim();
		const slugRaw = form.get('categoria-form')?.toString().trim(); // slug del formulario
		const schemaJsonRaw = form.get('json-update')?.toString().trim();
		const descripcion = form.get('descripcion-form-update')?.toString().trim();
		const estadoRaw = form.get('estado')?.toString().trim();
		const temaRaw = form.get('tema-form-update')?.toString().trim();

		// 6) Normalizaciones / validaciones
		let schema_json: any | undefined;
		if (schemaJsonRaw) {
			try {
				schema_json = JSON.parse(schemaJsonRaw);
			} catch {
				return redirect(
					`${backPath()}?status=error&msg=${encodeURIComponent('JSON del formulario inválido')}`,
				);
			}
		}

		let tema_json: any | undefined;
		if (temaRaw && temaRaw.length > 0) {
			try {
				tema_json = JSON.parse(temaRaw);
			} catch {
				return redirect(
					`${backPath()}?status=error&msg=${encodeURIComponent('JSON del tema inválido')}`,
				);
			}
		}

		let estado: boolean | undefined;
		if (estadoRaw === 'true') estado = true;
		if (estadoRaw === 'false') estado = false;

		const slugForm = slugRaw || undefined; // slug del formulario (no confundir con slug de empresa)

		// 7) Build payload (solo campos presentes)
		const payload: Record<string, any> = {
			updated_at: new Date().toISOString(),
		};
		if (titulo) payload.titulo = titulo;
		if (typeof estado === 'boolean') payload.estado = estado;
		if (slugForm) payload.slug = slugForm;
		if (typeof schema_json !== 'undefined') payload.schema_json = schema_json;
		if (typeof descripcion !== 'undefined' && descripcion !== '')
			payload.descripcion = descripcion;
		if (typeof tema_json !== 'undefined') payload.tema_json = tema_json;

		// Sin cambios
		if (Object.keys(payload).length === 1) {
			return redirect(
				`${backPath()}?status=success&msg=${encodeURIComponent('Sin cambios')}`,
			);
		}

		// 8) UPDATE
		const { error: updErr } = await supabase
			.from('formularios')
			.update(payload)
			.eq('form_id', formId);

		if (updErr) {
			const msg = `Error al actualizar formulario: ${updErr.message}`;
			return redirect(
				`${backPath()}?status=error&msg=${encodeURIComponent(msg)}`,
			);
		}

		return redirect(
			`${backPath()}?status=success&msg=${encodeURIComponent('Formulario actualizado correctamente')}`,
		);
	} catch (e: any) {
		const msg = encodeURIComponent(`Error inesperado: ${e?.message ?? e}`);
		return redirect(`${backPath()}?status=error&msg=${msg}`);
	}
};

// src/pages/api/admin/formularios/insert.ts
export const prerender = false;

import type { APIRoute } from 'astro';
import { supabase } from '../../../lib/supabase';

const BACK_PATH = '/crud/formularios';

export const POST: APIRoute = async ({ request, cookies, redirect, url }) => {
	const back = url.searchParams.get('back') || BACK_PATH;

	try {
		// 1) Sesión desde cookies
		const at = cookies.get('sb-access-token');
		const rt = cookies.get('sb-refresh-token');
		if (!at || !rt) {
			return redirect(
				`${back}?status=error&msg=${encodeURIComponent('No autenticado')}`,
			);
		}
		await supabase.auth.setSession({
			access_token: at.value,
			refresh_token: rt.value,
		});

		// 2) Usuario y autorización admin
		const { data: userRes, error: userErr } = await supabase.auth.getUser();
		const actor = userRes?.user;
		if (userErr || !actor) {
			return redirect(
				`${back}?status=error&msg=${encodeURIComponent('No autenticado')}`,
			);
		}
		const { data: isAdminRes, error: rpcErr } = await supabase.rpc('is_admin', {
			uid: actor.id,
		});
		const isAdmin = !rpcErr && Boolean(isAdminRes);
		if (!isAdmin) {
			return redirect(
				`${back}?status=error&msg=${encodeURIComponent('No autorizado')}`,
			);
		}

		// 3) Form data (para INSERT no usamos service_id)
		const form = await request.formData();

		const titulo = form.get('titulo-form')?.toString().trim();
		const slugRaw = form.get('categoria-form')?.toString().trim(); // mapea a slug
		const schemaJsonRaw = form.get('json-update')?.toString().trim();
		const descripcion = form.get('descripcion-form-update')?.toString().trim();
		const estadoRaw = form.get('estado')?.toString().trim();
		const temaRaw = form.get('tema-form-update')?.toString().trim();

		// 4) Validaciones mínimas (requeridos para crear)
		if (!titulo) {
			return redirect(
				`${back}?status=error&msg=${encodeURIComponent('Falta el título')}`,
			);
		}
		if (!slugRaw) {
			return redirect(
				`${back}?status=error&msg=${encodeURIComponent('Falta la categoría (slug)')}`,
			);
		}
		if (!schemaJsonRaw) {
			return redirect(
				`${back}?status=error&msg=${encodeURIComponent('Falta el JSON del formulario')}`,
			);
		}

		// 5) Normalizaciones
		let schema_json: any;
		try {
			schema_json = JSON.parse(schemaJsonRaw);
		} catch {
			return redirect(
				`${back}?status=error&msg=${encodeURIComponent('JSON del formulario inválido')}`,
			);
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

		let estado: boolean = false; // por defecto inactivo si no envían nada
		if (estadoRaw === 'true') estado = true;
		if (estadoRaw === 'false') estado = false;

		const slug = slugRaw; // si quieres: slugRaw.toLowerCase().replace(/\s+/g, "-")

		// 6) Obtener siguiente revision por slug (max + 1)
		const { data: revRows, error: revErr } = await supabase
			.from('formularios')
			.select('revision')
			.eq('slug', slug)
			.order('revision', { ascending: false })
			.limit(1);

		if (revErr) {
			const msg = `No se pudo calcular la revisión: ${revErr.message}`;
			return redirect(`${back}?status=error&msg=${encodeURIComponent(msg)}`);
		}

		const nextRevision =
			revRows && revRows.length > 0 && Number.isInteger(revRows[0].revision)
				? (revRows[0].revision as number) + 1
				: 1;

		// 7) Build payload de INSERT
		const nowIso = new Date().toISOString();
		const insertPayload: Record<string, any> = {
			slug,
			revision: nextRevision,
			titulo,
			descripcion: typeof descripcion === 'string' ? descripcion : null,
			estado,
			schema_json,
			creado_por: actor.id,
			created_at: nowIso,
			updated_at: nowIso,
		};

		if (typeof tema_json !== 'undefined') {
			insertPayload.tema_json = tema_json;
		}

		// 8) Insert
		const { data: inserted, error: insErr } = await supabase
			.from('formularios')
			.insert(insertPayload)
			.select('form_id')
			.single();

		if (insErr) {
			const msg = `Error al crear formulario: ${insErr.message}`;
			return redirect(`${back}?status=error&msg=${encodeURIComponent(msg)}`);
		}

		const newId = inserted?.form_id;
		return redirect(
			`${back}?status=success&msg=${encodeURIComponent('Formulario creado correctamente')}` +
				(newId ? `&id=${encodeURIComponent(newId)}` : ''),
		);
	} catch (e: any) {
		const msg = encodeURIComponent(`Error inesperado: ${e?.message ?? e}`);
		return redirect(`${back}?status=error&msg=${msg}`);
	}
};

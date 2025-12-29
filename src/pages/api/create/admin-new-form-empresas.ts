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
				`${back}?status=error&msg=${encodeURIComponent('No autenticado.')}`,
			);
		}
		const { error: sErr } = await supabase.auth.setSession({
			access_token: at.value,
			refresh_token: rt.value,
		});
		if (sErr) {
			return redirect(
				`${back}?status=error&msg=${encodeURIComponent('No fue posible establecer la sesión.')}`,
			);
		}

		// 2) Usuario
		const { data: userRes, error: userErr } = await supabase.auth.getUser();
		const actor = userRes?.user;
		if (userErr || !actor) {
			return redirect(
				`${back}?status=error&msg=${encodeURIComponent('No autenticado.')}`,
			);
		}

		// 3) Form data
		const form = await request.formData();

		const titulo = form.get('titulo-form')?.toString().trim();
		const slugRaw = form.get('categoria-form')?.toString().trim(); // mapea a slug
		const schemaJsonRaw = form.get('json-update')?.toString().trim();
		const descripcion = form.get('descripcion-form-update')?.toString().trim();
		const estadoRaw = form.get('estado')?.toString().trim();
		const temaRaw = form.get('tema-form-update')?.toString().trim();

		// ⚠️ Empresa (acepta varias fuentes)
		let empresaId = form.get('empresa_id')?.toString().trim() || '';
		const empresaSlugFromForm = form.get('empresa_slug')?.toString().trim();
		const empresaSlugFromQS =
			url.searchParams.get('empresa_slug') || url.searchParams.get('slug');

		// 3a) Si no vino empresa_id, intenta por slug
		if (!empresaId && (empresaSlugFromForm || empresaSlugFromQS)) {
			const slugToFind = (empresaSlugFromForm || empresaSlugFromQS) as string;
			const { data: emp, error: empErr } = await supabase
				.from('empresa')
				.select('empresa_id')
				.eq('slug', slugToFind)
				.single();

			if (!empErr && emp?.empresa_id) {
				empresaId = emp.empresa_id as string;
			}
		}

		// 3b) Fallback: central (si definiste central_empresa_id())
		if (!empresaId) {
			try {
				const { data: centralId } = await supabase.rpc('central_empresa_id');
				if (centralId) empresaId = String(centralId);
			} catch {
				/* noop */
			}
		}

		if (!empresaId) {
			return redirect(
				`${back}?status=error&msg=${encodeURIComponent('No se pudo determinar la empresa del formulario.')}`,
			);
		}

		// 4) Validaciones mínimas
		if (!titulo) {
			return redirect(
				`${back}?status=error&msg=${encodeURIComponent('Falta el título.')}`,
			);
		}
		if (!slugRaw) {
			return redirect(
				`${back}?status=error&msg=${encodeURIComponent('Falta la categoría (slug).')}`,
			);
		}
		if (!schemaJsonRaw) {
			return redirect(
				`${back}?status=error&msg=${encodeURIComponent('Falta el JSON del formulario.')}`,
			);
		}

		// 5) Normalizaciones
		const slug = slugRaw; // si quieres: slugRaw.toLowerCase().replace(/\s+/g, "-")

		let schema_json: any;
		try {
			schema_json = JSON.parse(schemaJsonRaw);
		} catch {
			return redirect(
				`${back}?status=error&msg=${encodeURIComponent('JSON del formulario inválido.')}`,
			);
		}

		let tema_json: any | undefined;
		if (temaRaw && temaRaw.length > 0) {
			try {
				tema_json = JSON.parse(temaRaw);
			} catch {
				return redirect(
					`${back}?status=error&msg=${encodeURIComponent('JSON del tema inválido.')}`,
				);
			}
		}

		let estado: boolean = false;
		if (estadoRaw === 'true') estado = true;
		if (estadoRaw === 'false') estado = false;

		// 6) Autorización: admin de la empresa o admin central
		//    is_admin_for(empresaId) OR is_central_admin()
		let isAuthorized = false;
		try {
			const [{ data: adminFor }, { data: centralAdmin }] = await Promise.all([
				supabase.rpc('is_admin_for', { p_empresa_id: empresaId }),
				supabase.rpc('is_central_admin'),
			]);
			isAuthorized = Boolean(adminFor) || Boolean(centralAdmin);
		} catch {
			isAuthorized = false;
		}

		if (!isAuthorized) {
			return redirect(
				`${back}?status=error&msg=${encodeURIComponent('No autorizado.')}`,
			);
		}

		// 7) Obtener siguiente revision por (empresa_id, slug)
		const { data: revRows, error: revErr } = await supabase
			.from('formularios')
			.select('revision')
			.eq('empresa_id', empresaId)
			.eq('slug', slug)
			.order('revision', { ascending: false })
			.limit(1);

		if (revErr) {
			const msg = `No se pudo calcular la revisión: ${revErr.message}`;
			return redirect(`${back}?status=error&msg=${encodeURIComponent(msg)}`);
		}

		const nextRevision =
			revRows &&
			revRows.length > 0 &&
			Number.isInteger(revRows[0].revision as number)
				? (revRows[0].revision as number) + 1
				: 1;

		// 8) Build payload de INSERT
		const nowIso = new Date().toISOString();
		const insertPayload: Record<string, any> = {
			empresa_id: empresaId, // 👈 requerido por tu esquema
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

		// 9) Insert
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
			`${back}?status=success&msg=${encodeURIComponent('Formulario creado correctamente.')}` +
				(newId ? `&id=${encodeURIComponent(newId)}` : ''),
		);
	} catch (e: any) {
		const msg = encodeURIComponent(`Error inesperado: ${e?.message ?? e}`);
		return redirect(`${back}?status=error&msg=${msg}`);
	}
};

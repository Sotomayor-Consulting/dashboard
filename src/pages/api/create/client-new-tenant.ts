// src/pages/api/empresa/crear.ts
export const prerender = false;

import type { APIRoute } from 'astro';
import { supabase } from '../../../lib/supabase';

const BACK_PATH = '/pages/crear-empresa';
const BUCKET = 'empresa-logos';
const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

const normalizeImageMime = (mime?: string) => {
	if (!mime) return 'image/png';
	const m = mime.toLowerCase();
	if (m === 'image/jpg' || m === 'image/pjpeg') return 'image/jpeg';
	if (m === 'image/x-png') return 'image/png';
	return m;
};

const isImageMime = (mime?: string) =>
	!!mime && normalizeImageMime(mime).startsWith('image/');

const extFromMime = (mime?: string) => {
	const m = normalizeImageMime(mime);
	if (m === 'image/jpeg') return 'jpg';
	if (m === 'image/png') return 'png';
	if (m === 'image/webp') return 'webp';
	if (m === 'image/svg+xml') return 'svg';
	if (m === 'image/gif') return 'gif';
	return 'png';
};

export const POST: APIRoute = async ({ request, cookies, redirect, url }) => {
	const back = url.searchParams.get('back') || BACK_PATH;

	try {
		// 1) Sesión
		const at = cookies.get('sb-access-token');
		const rt = cookies.get('sb-refresh-token');
		if (!at || !rt) {
			return redirect(
				`${back}?status=error&msg=${encodeURIComponent('Debe iniciar sesión para crear una empresa.')}`,
			);
		}
		const { error: sErr } = await supabase.auth.setSession({
			access_token: at.value,
			refresh_token: rt.value,
		});
		if (sErr) {
			return redirect(
				`${back}?status=error&msg=${encodeURIComponent('No fue posible establecer su sesión.')}`,
			);
		}

		// 2) Usuario
		const {
			data: { user },
			error: uErr,
		} = await supabase.auth.getUser();
		if (uErr || !user) {
			return redirect(
				`${back}?status=error&msg=${encodeURIComponent('Error de autenticación.')}`,
			);
		}

		// 3) Form
		const form = await request.formData();
		const nombre = form.get('nombre_empresa')?.toString().trim();
		const slug = form.get('slug_empresa')?.toString().trim();
		const logo = form.get('logo-empresa') as File | null;

		if (!nombre) {
			return redirect(
				`${back}?status=error&msg=${encodeURIComponent('El nombre de la empresa es obligatorio.')}`,
			);
		}
		if (!slug) {
			return redirect(
				`${back}?status=error&msg=${encodeURIComponent('El slug de la empresa es obligatorio.')}`,
			);
		}
		if (!/^[a-z0-9-]+$/.test(slug)) {
			return redirect(
				`${back}?status=error&msg=${encodeURIComponent('El slug solo puede contener letras minúsculas, números y guiones.')}`,
			);
		}

		// 4) Crear empresa (RPC retorna empresa_id)
		const { data: empresaId, error: rpcErr } = await supabase.rpc(
			'crear_empresa_base',
			{
				p_nombre_empresa: nombre,
				p_slug_empresa: slug,
			},
		);
		if (rpcErr || !empresaId) {
			const msg =
				rpcErr?.message ?? 'No se pudo obtener el identificador de la empresa.';
			return redirect(
				`${back}?status=error&msg=${encodeURIComponent('No fue posible registrar la empresa: ' + msg)}`,
			);
		}

		// 5) Subir logotipo (opcional) → bucket público `empresa-logos`
		let logoUrl = '';
		if (logo && logo.size > 0) {
			const normMime = normalizeImageMime(logo.type);

			if (!isImageMime(logo.type)) {
				return redirect(
					`${back}?status=error&msg=${encodeURIComponent(`El archivo no parece ser una imagen válida (MIME: ${logo.type || 'desconocido'}).`)}`,
				);
			}
			if (logo.size > MAX_BYTES) {
				return redirect(
					`${back}?status=error&msg=${encodeURIComponent(`La imagen supera ${MAX_BYTES / (1024 * 1024)} MB.`)}`,
				);
			}

			try {
				// Limpieza previa del directorio empresaId/ (best-effort)
				const { data: existing } = await supabase.storage
					.from(BUCKET)
					.list(empresaId, { limit: 100 });
				if (existing?.length) {
					const toDelete = existing.map((f) => `${empresaId}/${f.name}`);
					try {
						await supabase.storage.from(BUCKET).remove(toDelete);
					} catch {}
				}

				// File -> Uint8Array (más fiable en SSR)
				const bin = new Uint8Array(await logo.arrayBuffer());
				const ext = logo.name?.includes('.')
					? logo.name.split('.').pop()!.toLowerCase()
					: extFromMime(normMime);
				const path = `${empresaId}/logo.${ext}`;

				const { error: upErr } = await supabase.storage
					.from(BUCKET)
					.upload(path, bin, {
						upsert: true,
						contentType: normMime || 'application/octet-stream',
					});
				if (upErr) {
					return redirect(
						`${back}?status=error&msg=${encodeURIComponent('No fue posible cargar el logotipo: ' + upErr.message)}`,
					);
				}

				// URL pública (si el bucket es público)
				const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);
				logoUrl = `${pub.publicUrl}?v=${Date.now()}`;
			} catch (e: any) {
				return redirect(
					`${back}?status=error&msg=${encodeURIComponent('No fue posible cargar el logotipo: ' + (e?.message || e))}`,
				);
			}
		}

		// 6) empresa_settings (upsert por empresa_id)
		const { error: setErr } = await supabase
			.from('empresa_settings')
			.upsert(
				{ empresa_id: empresaId, logo_url: logoUrl ?? '', theme: null },
				{ onConflict: 'empresa_id' },
			);
		if (setErr) {
			return redirect(
				`${back}?status=error&msg=${encodeURIComponent('No fue posible guardar la configuración de la empresa: ' + setErr.message)}`,
			);
		}

		// 7) Éxito (mensaje formal, sin mención al estado del logo)
		const okMsg = `Su empresa "${nombre}" se creó con éxito.`;
		return redirect(
			`/empresas/${slug}/?status=success&msg=${encodeURIComponent(okMsg)}`,
		);
	} catch (e: any) {
		const msg =
			typeof e?.message === 'string' ? e.message : 'Error inesperado.';
		return redirect(`${back}?status=error&msg=${encodeURIComponent(msg)}`);
	}
};

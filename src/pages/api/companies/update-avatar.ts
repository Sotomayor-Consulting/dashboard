export const prerender = false;

import type { APIRoute } from 'astro';
import { createSupabaseServerClient } from '@infrastructure/supabase';

const FALLBACK_BACK = '/settings';

export const POST: APIRoute = async ({ request, cookies, redirect, url }) => {
	try {
		// 0) Leer el form una vez para tomar el slug y el archivo
		const form = await request.formData();

		// slug desde hidden <input name="slug" /> o ?slug=
		let slug =
			form.get('slug')?.toString().trim() ||
			url.searchParams.get('slug')?.toString().trim() ||
			'';

		// Helper de redirección
		const back = () =>
			(slug ? `/incorporations/${slug}/settings` : FALLBACK_BACK);

		// 1) Sesión
		const supabase = createSupabaseServerClient({ headers: request.headers, cookies });

		// 2) Usuario
		const {
			data: { user },
			error: uerr,
		} = await supabase.auth.getUser();
		if (uerr || !user) {
			return redirect(
				`${back()}?status=error&msg=${encodeURIComponent('No autenticado')}`,
			);
		}

		// 3) Archivo (desde el form leído arriba)
		const file = form.get('avatar') as File | null;

		if (!file || file.size === 0) {
			return redirect(
				`${back()}?status=error&msg=${encodeURIComponent('Archivo obligatorio')}`,
			);
		}
		if (!file.type?.startsWith('image/')) {
			return redirect(
				`${back()}?status=error&msg=${encodeURIComponent('El archivo debe ser una imagen')}`,
			);
		}
		if (file.size > 2 * 1024 * 1024) {
			return redirect(
				`${back()}?status=error&msg=${encodeURIComponent('La imagen no puede superar 2MB')}`,
			);
		}

		// 4) Limpiar archivos previos del usuario
		const avatarPrefix = `avatars/${user.id}`;
		const { data: existing, error: listErr } = await supabase.storage
			.from('public-assets')
			.list(avatarPrefix, { limit: 100 });

		if (!listErr && existing?.length) {
			const toDelete = existing.map((f) => `${avatarPrefix}/${f.name}`);
			try {
				await supabase.storage.from('public-assets').remove(toDelete);
			} catch {}
		}

		// 5) Subir nuevo avatar con nombre determinístico
		const ext = (file.name.split('.').pop() || 'png').toLowerCase();
		const newPath = `${avatarPrefix}/avatar.${ext}`;

		const { error: upErr } = await supabase.storage
			.from('public-assets')
			.upload(newPath, file, {
				upsert: true,
				contentType: file.type || 'application/octet-stream',
			});

		if (upErr) {
			return redirect(
				`${back()}?status=error&msg=${encodeURIComponent(':' + upErr.message)}`,
			);
		}

		// 6) URL pública
		const { data: pub } = supabase.storage
			.from('public-assets')
			.getPublicUrl(newPath);
		let avatarUrl = `${pub.publicUrl}?v=${Date.now()}`;

		// 7) Guardar avatar_url en la tabla usuarios
		const { error: upsertErr } = await supabase
			.from('usuarios')
			.upsert(
				{ user_id: user.id, avatar_url: avatarUrl },
				{ onConflict: 'user_id' },
			);

		if (upsertErr) {
			return redirect(
				`${back()}?status=error&msg=${encodeURIComponent('DB: ' + upsertErr.message)}`,
			);
		}

		// 8) OK
		return redirect(
			`${back()}?status=success&msg=${encodeURIComponent('Avatar actualizado')}`,
		);
	} catch (e: any) {
		const msg = typeof e?.message === 'string' ? e.message : 'Error inesperado';
		return new Response(msg, { status: 500 });
	}
};

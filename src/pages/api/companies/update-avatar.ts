export const prerender = false;

import type { APIRoute } from 'astro';
import sharp from 'sharp';
import { createSupabaseServerClient } from '@infrastructure/supabase';

const AVATAR_SIZE = 400;

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

		// 5) Convertir a WebP 400×400 y subir
		const inputBuffer = Buffer.from(await file.arrayBuffer());
		const webpBuffer = await sharp(inputBuffer)
			.resize(AVATAR_SIZE, AVATAR_SIZE, { fit: 'cover', position: 'centre' })
			.webp({ quality: 82 })
			.toBuffer();

		const newPath = `${avatarPrefix}/avatar.webp`;

		const { error: upErr } = await supabase.storage
			.from('public-assets')
			.upload(newPath, webpBuffer, {
				upsert: true,
				contentType: 'image/webp',
			});

		if (upErr) {
			return redirect(
				`${back()}?status=error&msg=${encodeURIComponent(':' + upErr.message)}`,
			);
		}

		// 6) Guardar SOLO el path relativo (getAvatarUrl construye la URL completa)
		const { error: upsertErr } = await supabase
			.from('usuarios')
			.upsert(
				{ user_id: user.id, avatar_url: newPath },
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

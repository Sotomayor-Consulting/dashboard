export const prerender = false;

import type { APIRoute } from 'astro';
import sharp from 'sharp';
import { createSupabaseServerClient } from '@infrastructure/supabase';
import { safeBack } from '@infrastructure/security/headers';

const BACK_PATH = '/profile/';
const AVATAR_SIZE = 400;

function jsonOk(data: object) {
	return new Response(JSON.stringify(data), {
		status: 200,
		headers: { 'Content-Type': 'application/json' },
	});
}

function jsonError(msg: string, status = 400) {
	return new Response(JSON.stringify({ ok: false, error: msg }), {
		status,
		headers: { 'Content-Type': 'application/json' },
	});
}

export const POST: APIRoute = async ({ request, cookies, redirect, url }) => {
	const wantsJson = request.headers.get('Accept')?.includes('application/json');

	try {
		const back = safeBack(url.searchParams.get('back'), BACK_PATH);

		const supabase = createSupabaseServerClient({ headers: request.headers, cookies });

		const {
			data: { user },
			error: uerr,
		} = await supabase.auth.getUser();
		if (uerr || !user) {
			if (wantsJson) return jsonError('No autenticado', 401);
			return redirect(`${back}?status=error&msg=${encodeURIComponent('No autenticado')}`);
		}

		const form = await request.formData();
		const file = form.get('avatar') as File | null;

		if (!file || file.size === 0) {
			if (wantsJson) return jsonError('Archivo obligatorio');
			return redirect(`${back}?status=error&msg=${encodeURIComponent('Archivo obligatorio')}`);
		}
		if (!file.type.startsWith('image/')) {
			if (wantsJson) return jsonError('El archivo debe ser una imagen');
			return redirect(`${back}?status=error&msg=${encodeURIComponent('El archivo debe ser una imagen')}`);
		}
		if (file.size > 5 * 1024 * 1024) {
			if (wantsJson) return jsonError('La imagen no puede superar 5 MB');
			return redirect(`${back}?status=error&msg=${encodeURIComponent('La imagen no puede superar 5 MB')}`);
		}

		// Limpiar archivos previos
		const avatarPrefix = `avatars/${user.id}`;
		const { data: existing, error: listErr } = await supabase.storage
			.from('public-assets')
			.list(avatarPrefix, { limit: 100 });

		if (!listErr && existing && existing.length > 0) {
			const toDelete = existing.map((f) => `${avatarPrefix}/${f.name}`);
			try {
				await supabase.storage.from('public-assets').remove(toDelete);
			} catch {}
		}

		// Convertir a WebP 400×400
		const inputBuffer = Buffer.from(await file.arrayBuffer());
		const webpBuffer = await sharp(inputBuffer)
			.resize(AVATAR_SIZE, AVATAR_SIZE, { fit: 'cover', position: 'centre' })
			.webp({ quality: 82 })
			.toBuffer();

		const newPath = `${avatarPrefix}/avatar.webp`;

		const { error: upErr } = await supabase.storage
			.from('public-assets')
			.upload(newPath, webpBuffer, { upsert: true, contentType: 'image/webp' });

		if (upErr) {
			if (wantsJson) return jsonError(upErr.message);
			return redirect(`${back}?status=error&msg=${encodeURIComponent(upErr.message)}`);
		}

		const { error: upsertErr } = await supabase
			.from('usuarios')
			.upsert({ user_id: user.id, avatar_url: newPath }, { onConflict: 'user_id' });

		if (upsertErr) {
			if (wantsJson) return jsonError(upsertErr.message);
			return redirect(`${back}?status=error&msg=${encodeURIComponent(upsertErr.message)}`);
		}

		// Construir URL pública para devolver al cliente
		const { data: publicData } = supabase.storage.from('public-assets').getPublicUrl(newPath);

		if (wantsJson) return jsonOk({ ok: true, avatarUrl: publicData.publicUrl });
		return redirect(`${back}?status=success&msg=${encodeURIComponent('Avatar actualizado')}`);
	} catch (e: any) {
		const msg = typeof e?.message === 'string' ? e.message : 'Error inesperado';
		if (wantsJson) return jsonError(msg, 500);
		return new Response(msg, { status: 500 });
	}
};

// src/pages/api/profile/avatar.ts
export const prerender = false;

import type { APIRoute } from 'astro';
import { supabase } from '../../../lib/supabase';

const BACK_PATH = '/settings';

export const POST: APIRoute = async ({ request, cookies, redirect, url }) => {
	try {
		const back = url.searchParams.get('back') || BACK_PATH;

		// 1) Sesión
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

		// 2) Usuario
		const {
			data: { user },
			error: uerr,
		} = await supabase.auth.getUser();
		if (uerr || !user) {
			return redirect(
				`${back}?status=error&msg=${encodeURIComponent('No autenticado')}`,
			);
		}

		// 3) Archivo
		const form = await request.formData();
		const file = form.get('avatar') as File | null;

		if (!file || file.size === 0) {
			return redirect(
				`${back}?status=error&msg=${encodeURIComponent('Archivo obligatorio')}`,
			);
		}
		if (!file.type.startsWith('image/')) {
			return redirect(
				`${back}?status=error&msg=${encodeURIComponent('El archivo debe ser una imagen')}`,
			);
		}
		if (file.size > 2 * 1024 * 1024) {
			return redirect(
				`${back}?status=error&msg=${encodeURIComponent('La imagen no puede superar 2MB')}`,
			);
		}

		// 4) Limpiar archivos previos del usuario (no usamos avatar_path)
		const { data: existing, error: listErr } = await supabase.storage
			.from('avatars')
			.list(user.id, { limit: 100 });

		if (!listErr && existing && existing.length > 0) {
			const toDelete = existing.map((f) => `${user.id}/${f.name}`);
			// si falla la eliminación, no rompemos el flujo
			try {
				await supabase.storage.from('avatars').remove(toDelete);
			} catch {}
		}

		// 5) Subir el nuevo avatar con nombre determinístico
		const ext = (file.name.split('.').pop() || 'png').toLowerCase();
		const newPath = `${user.id}/avatar.${ext}`;

		const { error: upErr } = await supabase.storage
			.from('avatars')
			.upload(newPath, file, {
				upsert: true,
				contentType: file.type || 'application/octet-stream',
			});

		if (upErr) {
			return redirect(
				`${back}?status=error&msg=${encodeURIComponent(':' + upErr.message)}`,
			);
		}

		// 6) URL (pública). Si el bucket es privado, usa createSignedUrl.
		const { data: pub } = supabase.storage
			.from('avatars')
			.getPublicUrl(newPath);
		let avatarUrl = pub.publicUrl;
		avatarUrl = `${avatarUrl}?v=${Date.now()}`; // cache-busting

		// 7) Guardar SOLO avatar_url en la tabla
		const { error: upsertErr } = await supabase
			.from('usuarios')
			.upsert(
				{ user_id: user.id, avatar_url: avatarUrl },
				{ onConflict: 'user_id' },
			);

		if (upsertErr) {
			return redirect(
				`${back}?status=error&msg=${encodeURIComponent('DB: ' + upsertErr.message)}`,
			);
		}

		// 8) OK
		return redirect(
			`${back}?status=success&msg=${encodeURIComponent('Avatar actualizado')}`,
		);
	} catch (e: any) {
		const msg = typeof e?.message === 'string' ? e.message : 'Error inesperado';
		return new Response(msg, { status: 500 });
	}
};

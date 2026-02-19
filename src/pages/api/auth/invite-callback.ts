// src/pages/api/auth/invite-callback.ts
// ─── Thin handler: Invite Callback ──────────────────────
import type { APIRoute } from 'astro';
import { createSupabaseServerClient } from '@lib/supabase';
import { AuthService, AuthError } from '@lib/auth';

export const GET: APIRoute = async ({ url, request, cookies, redirect }) => {
	const code = url.searchParams.get('code') ?? undefined;
	const token = url.searchParams.get('token') ?? undefined;

	try {
		const supabase = createSupabaseServerClient({
			headers: request.headers,
			cookies,
		});
		const auth = new AuthService(supabase, cookies);

		await auth.handleInviteCallback({ code, token });

		return redirect('/');
	} catch (error) {
		const message =
			error instanceof AuthError
				? error.message
				: 'Error al procesar invitación.';
		return new Response(message, { status: 400 });
	}
};

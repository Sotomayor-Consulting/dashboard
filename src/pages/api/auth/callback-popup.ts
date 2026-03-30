// src/pages/api/auth/callback-popup.ts
// ─── OAuth Callback for Popup Flow ────────────────────
// Intercambia el code por sesión y cierra el popup,
// notificando a la ventana padre que el login fue exitoso.
export const prerender = false;

import type { APIRoute } from 'astro';
import { createSupabaseServerClient } from '@lib/supabase';
import { AuthService, AuthError } from '@lib/auth';

export const GET: APIRoute = async ({ url, request, cookies }) => {
	const code = url.searchParams.get('code');
	const oauthError = url.searchParams.get('error');
	const oauthErrorDesc = url.searchParams.get('error_description');

	let status: 'success' | 'error' = 'success';
	let message = 'Sesión iniciada correctamente.';

	if (oauthError) {
		status = 'error';
		message =
			oauthErrorDesc ??
			'No se pudo completar el inicio de sesión. Inténtalo nuevamente.';
	} else if (!code) {
		status = 'error';
		message = 'No se recibió código de autorización.';
	} else {
		try {
			const supabase = createSupabaseServerClient({
				headers: request.headers,
				cookies,
			});
			const auth = new AuthService(supabase, cookies);
			await auth.exchangeCodeForSession(code);
		} catch (error) {
			status = 'error';
			message =
				error instanceof AuthError
					? error.message
					: 'Error en autenticación.';
		}
	}

	// Responder con HTML que cierra el popup y notifica a la ventana padre
	const html = `<!DOCTYPE html>
<html>
<head><title>Autenticación</title></head>
<body>
<script>
  if (window.opener) {
    window.opener.postMessage(
      { type: 'oauth-callback', status: '${status}', message: ${JSON.stringify(message)} },
      window.location.origin
    );
  }
  window.close();
</script>
<p>Autenticación completada. Esta ventana se cerrará automáticamente.</p>
<p>Si no se cierra, <a href="/">haz clic aquí</a>.</p>
</body>
</html>`;

	return new Response(html, {
		status: 200,
		headers: { 'Content-Type': 'text/html; charset=utf-8' },
	});
};

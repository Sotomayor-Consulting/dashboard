import type { APIRoute } from 'astro';
import { createSupabaseServerClient } from '@infrastructure/supabase';
import { setDefaultBillingInfo } from '@domains/users/billing';
import { createLogger } from '@infrastructure/logging';

const log = createLogger('billing.set-default');

const BILLING_URL = '/profile/billing';

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
	const supabase = createSupabaseServerClient({
		headers: request.headers,
		cookies,
	});

	const {
		data: { user },
	} = await supabase.auth.getUser();

	if (!user) {
		return redirect(`${BILLING_URL}?status=error&msg=No+autenticado`);
	}

	try {
		const form = await request.formData();
		const billingId = String(form.get('billing_id') ?? '').trim();

		if (!billingId) {
			return redirect(
				`${BILLING_URL}?status=error&msg=ID+de+dirección+inválido`,
			);
		}

		const ok = await setDefaultBillingInfo(supabase, billingId, user.id);

		if (!ok) {
			return redirect(
				`${BILLING_URL}?status=error&msg=No+se+pudo+actualizar`,
			);
		}

		return redirect(
			`${BILLING_URL}?status=success&msg=Dirección+predeterminada+actualizada`,
		);
	} catch (e) {
		log.error('exception', { error: e });
		return redirect(
			`${BILLING_URL}?status=error&msg=Error+interno`,
		);
	}
};

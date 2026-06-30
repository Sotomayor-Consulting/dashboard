import type { APIRoute } from 'astro';
import { createSupabaseServerClient } from '@infrastructure/supabase';
import { updateBillingInfo } from '@domains/users/billing';
import { createLogger } from '@infrastructure/logging';

const log = createLogger('billing.update');

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
		const country_id = Number(form.get('country_id'));
		const city = String(form.get('city') ?? '').trim();
		const line1 = String(form.get('line1') ?? '').trim();

		if (!billingId || !country_id || !city || !line1) {
			return redirect(
				`${BILLING_URL}?status=error&msg=Faltan+campos+obligatorios`,
			);
		}

		const ok = await updateBillingInfo(supabase, billingId, user.id, {
			country_id,
			city,
			line1,
			line2: String(form.get('line2') ?? '').trim() || null,
			zip: String(form.get('zip') ?? '').trim() || null,
			phone: String(form.get('phone') ?? '').trim() || null,
			email: String(form.get('email') ?? '').trim() || null,
		});

		if (!ok) {
			return redirect(
				`${BILLING_URL}?status=error&msg=Error+al+actualizar`,
			);
		}

		return redirect(
			`${BILLING_URL}?status=success&msg=Dirección+actualizada`,
		);
	} catch (e) {
		log.error('exception', { error: e });
		return redirect(
			`${BILLING_URL}?status=error&msg=Error+interno`,
		);
	}
};

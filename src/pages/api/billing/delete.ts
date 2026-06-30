import type { APIRoute } from 'astro';
import { createSupabaseServerClient } from '@infrastructure/supabase';
import {
	deleteBillingInfo,
	getBillingInfoById,
	setDefaultBillingInfo,
	getAllBillingInfo,
} from '@domains/users/billing';
import { createLogger } from '@infrastructure/logging';

const log = createLogger('billing.delete');

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

		const existing = await getBillingInfoById(supabase, billingId, user.id);
		if (!existing) {
			return redirect(
				`${BILLING_URL}?status=error&msg=Dirección+no+encontrada`,
			);
		}

		const wasDefault = existing.is_default;

		const ok = await deleteBillingInfo(supabase, billingId, user.id);
		if (!ok) {
			return redirect(
				`${BILLING_URL}?status=error&msg=No+se+pudo+eliminar`,
			);
		}

		if (wasDefault) {
			const remaining = await getAllBillingInfo(supabase, user.id);
			if (remaining.length > 0) {
				await setDefaultBillingInfo(
					supabase,
					remaining[0]!.id,
					user.id,
				);
			}
		}

		return redirect(
			`${BILLING_URL}?status=success&msg=Dirección+eliminada`,
		);
	} catch (e) {
		log.error('exception', { error: e });
		return redirect(
			`${BILLING_URL}?status=error&msg=Error+interno`,
		);
	}
};

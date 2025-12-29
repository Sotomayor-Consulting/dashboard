import { executeKw } from '../lib/odoo/client';
import type { OdooPartner, ServiceResponse } from '../types/odoo';

export async function getReferralsByEmail(
	email: string,
): Promise<ServiceResponse<OdooPartner[]>> {
	try {
		// Intentamos conectar con Odoo...
		const parents = (await executeKw(
			'res.partner',
			'search_read',
			[[['email', '=', email]]],
			{ fields: ['id'], limit: 1 },
		)) as OdooPartner[];

		if (!parents?.length) return { success: true, data: [] };

		const referrals = (await executeKw(
			'res.partner',
			'search_read',
			[[['x_referido_id', '=', parents[0].id]]],
			{
				fields: [
					'name',
					'email',
					'phone',
					'city',
					'sale_order_ids',
					'create_date',
				],
				limit: 100,
			},
		)) as OdooPartner[];

		const orders = (await executeKw(
			'sale.order',
			'search_read',
			[[['id', '=', 151]]],
			{ fields: ['display_name'], limit: 100 },
		)) as OdooPartner[];

		console.log('orders :>> ', orders);

		referrals.forEach((element) => {});

		return { success: true, data: referrals };
	} catch (error) {
		console.error(
			`[Odoo Service Error] Fallo al conectar. Razón: ${(error as Error).message}`,
		);

		return {
			success: false,
			data: [],
			error: 'El sistema de referidos no está disponible momentáneamente.',
		};
	}
}

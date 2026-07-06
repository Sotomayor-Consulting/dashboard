export const prerender = false;

import type { APIRoute } from 'astro';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { createSupabaseServerClient } from '@infrastructure/supabase';
import { supabaseAdmin } from '@infrastructure/supabase/admin';
import { SECURITY_HEADERS } from '@infrastructure/security/headers';
import { canManageCompanyData } from '@shared/roles';
import { createLogger } from '@infrastructure/logging';

const log = createLogger('payment.invoice');

const STATUS_LABELS: Record<string, string> = {
	succeeded: 'Pagado',
	pending: 'Pendiente',
	processing: 'Procesando',
	failed: 'Fallido',
	refunded: 'Reembolsado',
	canceled: 'Cancelado',
};

const fmtUsd = (amount: number) =>
	new Intl.NumberFormat('en-US', {
		style: 'currency',
		currency: 'USD',
	}).format(amount);

const fmtDate = (value: string) =>
	new Date(value).toLocaleDateString('es-ES', {
		day: '2-digit',
		month: 'long',
		year: 'numeric',
	});

export const GET: APIRoute = async ({ params, request, cookies, locals }) => {
	const pagoId = params.pagoId;
	if (!pagoId) {
		return new Response(JSON.stringify({ error: 'Falta el ID del pago' }), {
			status: 400,
			headers: SECURITY_HEADERS,
		});
	}

	const supabase = createSupabaseServerClient({
		headers: request.headers,
		cookies,
	});
	const {
		data: { user },
		error: authError,
	} = await supabase.auth.getUser();

	if (authError || !user) {
		return new Response(JSON.stringify({ error: 'No autenticado' }), {
			status: 401,
			headers: SECURITY_HEADERS,
		});
	}

	const { data: pago, error } = await supabaseAdmin
		.from('pagos')
		.select(
			`
			id_pagos, amount, status, created_at, stripe_payment_intent_id, user_id,
			usuarios:user_id ( nombre, apellido, correo ),
			servicios:service_plans ( nombre:name ),
			incorporations:empresa_incorporacion_id ( principal_name )
			`,
		)
		.eq('id_pagos', pagoId)
		.maybeSingle();

	if (error || !pago) {
		log.error('Pago no encontrado', { error, pagoId });
		return new Response(JSON.stringify({ error: 'Pago no encontrado' }), {
			status: 404,
			headers: SECURITY_HEADERS,
		});
	}

	const isOwner = pago.user_id === user.id;
	const isStaff = canManageCompanyData(locals.userRoles ?? []);
	if (!isOwner && !isStaff) {
		return new Response(JSON.stringify({ error: 'No autorizado' }), {
			status: 403,
			headers: SECURITY_HEADERS,
		});
	}

	const usuario = Array.isArray(pago.usuarios)
		? pago.usuarios[0]
		: pago.usuarios;
	const servicio = Array.isArray(pago.servicios)
		? pago.servicios[0]
		: pago.servicios;
	const incorporation = Array.isArray(pago.incorporations)
		? pago.incorporations[0]
		: pago.incorporations;

	const clienteNombre =
		[usuario?.nombre, usuario?.apellido].filter(Boolean).join(' ').trim() ||
		usuario?.correo ||
		'Cliente';

	try {
		const pdfDoc = await PDFDocument.create();
		const page = pdfDoc.addPage([595.28, 841.89]); // A4
		const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
		const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

		const marginX = 56;
		let y = 780;

		const ink = rgb(0.1, 0.1, 0.12);
		const muted = rgb(0.45, 0.45, 0.48);
		const brand = rgb(0.075, 0.29, 0.93); // #134aed

		page.drawText('SOTOMAYOR CONSULTING', {
			x: marginX,
			y,
			size: 16,
			font: fontBold,
			color: brand,
		});
		y -= 20;
		page.drawText('Factura / recibo de pago', {
			x: marginX,
			y,
			size: 11,
			font,
			color: muted,
		});

		y -= 40;
		page.drawLine({
			start: { x: marginX, y },
			end: { x: 595.28 - marginX, y },
			thickness: 1,
			color: rgb(0.87, 0.87, 0.89),
		});

		const row = (label: string, value: string) => {
			y -= 34;
			page.drawText(label.toUpperCase(), {
				x: marginX,
				y,
				size: 9,
				font: fontBold,
				color: muted,
			});
			y -= 15;
			page.drawText(value || '—', {
				x: marginX,
				y,
				size: 12,
				font,
				color: ink,
			});
		};

		row('Cliente', clienteNombre);
		row('Empresa', incorporation?.principal_name ?? '—');
		row('Servicio', servicio?.nombre ?? 'Servicio');
		row('Fecha de pago', fmtDate(pago.created_at));
		row('Método de pago', 'Tarjeta de crédito');
		row('Estado', STATUS_LABELS[pago.status] ?? pago.status);
		row('ID de transacción', pago.stripe_payment_intent_id);

		y -= 30;
		page.drawLine({
			start: { x: marginX, y },
			end: { x: 595.28 - marginX, y },
			thickness: 1,
			color: rgb(0.87, 0.87, 0.89),
		});

		y -= 40;
		page.drawText('TOTAL PAGADO', {
			x: marginX,
			y,
			size: 10,
			font: fontBold,
			color: muted,
		});
		page.drawText(fmtUsd(Number(pago.amount)), {
			x: 595.28 - marginX - 140,
			y,
			size: 20,
			font: fontBold,
			color: brand,
		});

		page.drawText(
			`Factura generada el ${fmtDate(new Date().toISOString())} · ID de pago: ${pago.id_pagos}`,
			{
				x: marginX,
				y: 60,
				size: 8,
				font,
				color: muted,
			},
		);

		const pdfBytes = await pdfDoc.save();

		return new Response(pdfBytes as BodyInit, {
			status: 200,
			headers: {
				'Content-Type': 'application/pdf',
				'Content-Disposition': `attachment; filename="factura-${pago.id_pagos}.pdf"`,
				'Cache-Control': 'no-store',
			},
		});
	} catch (err) {
		log.error('Error generando factura PDF', { err, pagoId });
		return new Response(
			JSON.stringify({ error: 'Error interno generando la factura' }),
			{ status: 500, headers: SECURITY_HEADERS },
		);
	}
};

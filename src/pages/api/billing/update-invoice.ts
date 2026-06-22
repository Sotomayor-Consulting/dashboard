export const prerender = false;

import type { APIRoute } from 'astro';
import { createSupabaseServerClient } from '@infrastructure/supabase';
import { createLogger } from '@infrastructure/logging';

const log = createLogger('billing.update-invoice');

const BACK_PATH = '/settings';

// Lista de campos requeridos y sus nombres legibles
const REQUIRED_FIELDS = {
	tipo_de_persona: 'Tipo de persona',
	razon_social: 'Razón social / Nombre',
	correo_electronico_factura: 'Correo electrónico',
	telefono: 'Teléfono',
	direccion_factura: 'Dirección',
	pais_factura: 'País',
	ciudad_factura: 'Ciudad',
	documento_de_identidad_factura: 'Documento de identidad',
	tipo_de_documento_factura: 'Tipo de documento',
} as const;

type RequiredFieldKey = keyof typeof REQUIRED_FIELDS;

type BillingFormData = Record<RequiredFieldKey, string>;

function isValidEmail(email: string): boolean {
	const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
	return emailRegex.test(email);
}


export const POST: APIRoute = async ({ request, cookies, redirect, url }) => {
	// Sanitizar parámetro "back" para evitar open redirects
	const backParam = url.searchParams.get('back');
	const back = backParam && backParam.startsWith('/') ? backParam : BACK_PATH;

	const redirectWithMessage = (
		status: 'error' | 'success',
		msg: string,
	): Response => {
		const encoded = encodeURIComponent(msg);
		return redirect(`${back}?status=${status}&msg=${encoded}`);
	};

	try {
		// 1) Sesión
		const supabase = createSupabaseServerClient({ headers: request.headers, cookies });

		// 2) Obtener usuario autenticado
		const {
			data: { user },
			error: userErr,
		} = await supabase.auth.getUser();

		if (userErr || !user) {
			log.error('Error al obtener usuario autenticado', { error: userErr });
			return redirectWithMessage(
				'error',
				'No autenticado. Por favor inicia sesión.',
			);
		}

		// 4) Obtener y validar datos del formulario
		const form = await request.formData();

		const formData = {} as BillingFormData;
		const missingFields: string[] = [];

		(Object.keys(REQUIRED_FIELDS) as RequiredFieldKey[]).forEach((fieldKey) => {
			const raw = form.get(fieldKey);
			const value = typeof raw === 'string' ? raw.trim() : '';

			if (!value) {
				missingFields.push(REQUIRED_FIELDS[fieldKey]);
			} else {
				formData[fieldKey] = value;
			}
		});

		if (missingFields.length > 0) {
			return redirectWithMessage(
				'error',
				`Faltan los siguientes campos obligatorios: ${missingFields.join(', ')}`,
			);
		}

		// 5) Validar formato del correo electrónico
		if (!isValidEmail(formData.correo_electronico_factura)) {
			return redirectWithMessage(
				'error',
				'El correo electrónico no tiene un formato válido.',
			);
		}



		// 7) Preparar payload para la base de datos
		const payload = {
			user_id: user.id,
			personería: formData.tipo_de_persona,
			nombre_o_razon_social: formData.razon_social,
			correo: formData.correo_electronico_factura,
			telefono: formData.telefono,
			direccion_linea_1: formData.direccion_factura,
			ciudad: formData.ciudad_factura,
			pais: formData.pais_factura,
			documento_de_identidad: formData.documento_de_identidad_factura,
			tipo_de_documento: formData.tipo_de_documento_factura,

		};

		// 8) Intentar upsert en la base de datos
		const { error } = await supabase
			.from('billing_info')
			.upsert(payload, { onConflict: 'user_id' });

		if (error) {
			log.error('Error de Supabase en upsert(billing_info)', { error });

			let errorMsg = 'Error al guardar los datos';

			if (error.code === '23505') {
				// Violación de unicidad
				errorMsg = 'Ya existe un registro de facturación para este usuario.';
			} else if (error.code === '23503') {
				// Violación de llave foránea
				errorMsg = 'Error de referencia: usuario no encontrado.';
			} else if (error.message?.includes('ON CONFLICT')) {
				errorMsg =
					'Error de configuración de la tabla (ON CONFLICT). Contacta al administrador.';
			}

			return redirectWithMessage(
				'error',
				`${errorMsg} Detalle técnico: ${error.message}`,
			);
		}

		// 9) Éxito
		return redirectWithMessage(
			'success',
			'Datos de facturación guardados correctamente.',
		);
	} catch (err) {
		log.error('Error inesperado', { error: err });
		return redirectWithMessage(
			'error',
			'Error interno del servidor. Intenta más tarde.',
		);
	}
};

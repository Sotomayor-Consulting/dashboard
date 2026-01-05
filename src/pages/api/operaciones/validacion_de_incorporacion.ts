// src/pages/api/operaciones/validacion_de_incorporacion.ts
export const prerender = false;

import type { APIRoute } from 'astro';
import { supabase } from '../../../lib/supabase';

const BACK_PATH = '/crud/verficacion-incorporacion';

const UUID_RE =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const asString = (v: any) => (typeof v === 'string' ? v.trim() : '');
const asBool = (v: any) => v === true || v === 'Si' || v === 'sí' || v === 'SI';
const safeArray = (v: any) => (Array.isArray(v) ? v : []);

const asNumber = (v: any) => {
	if (v === null || v === undefined) return null;
	if (typeof v === 'number' && Number.isFinite(v)) return v;
	const s = String(v).trim().replace('%', '').replace(',', '.');
	const n = Number(s);
	return Number.isFinite(n) ? n : null;
};

export const POST: APIRoute = async ({ request, cookies, redirect, url }) => {
	const back = url.searchParams.get('back') || BACK_PATH;

	try {
		// 1) Sesión desde cookies (mantener simple)
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

		// 2) Usuario y autorización admin
		const { data: userRes, error: userErr } = await supabase.auth.getUser();
		const actor = userRes?.user;
		if (userErr || !actor) {
			return redirect(
				`${back}?status=error&msg=${encodeURIComponent('No autenticado')}`,
			);
		}

		const { data: isAdminRes, error: rpcErr } = await supabase.rpc('is_admin', {
			uid: actor.id,
		});
		const isAdmin = !rpcErr && Boolean(isAdminRes);
		if (!isAdmin) {
			return redirect(
				`${back}?status=error&msg=${encodeURIComponent('No autorizado')}`,
			);
		}

		// 3) Body JSON (SurveyJS)
		const body = await request.json().catch(() => null);

		const submission_id = body?.submission_id?.toString().trim();
		const empresa_id = body?.empresa_id?.toString().trim();
		const approved_data = body?.approved_data;

		// 4) Validaciones mínimas
		if (!submission_id || !UUID_RE.test(submission_id)) {
			return redirect(
				`${back}?status=error&msg=${encodeURIComponent('submission_id inválido')}`,
			);
		}
		if (!empresa_id || !UUID_RE.test(empresa_id)) {
			return redirect(
				`${back}?status=error&msg=${encodeURIComponent('empresa_id inválido')}`,
			);
		}
		if (!approved_data || typeof approved_data !== 'object') {
			return redirect(
				`${back}?status=error&msg=${encodeURIComponent(
					'approved_data debe ser un objeto JSON',
				)}`,
			);
		}

		// 5) Anti-tampering: submission -> empresa_id
		const { data: envio, error: envioErr } = await supabase
			.from('formularios_envios')
			.select('submission_id, empresa_incorporacion_id, status, form_id')
			.eq('submission_id', submission_id)
			.single();

		if (envioErr || !envio) {
			return redirect(
				`${back}?status=error&msg=${encodeURIComponent('Envío no encontrado')}`,
			);
		}
		if (envio.empresa_incorporacion_id !== empresa_id) {
			return redirect(
				`${back}?status=error&msg=${encodeURIComponent(
					'Mismatch: envío no corresponde a esa empresa',
				)}`,
			);
		}

		const nowIso = new Date().toISOString();

		// 6) Guardar JSON aprobado + status
		const { error: updErr } = await supabase
			.from('formularios_envios')
			.update({
				respuestas_validadas: approved_data,
				verificacion_operaciones: true,
				updated_at: nowIso,
			})
			.eq('submission_id', submission_id);

		if (updErr) {
			const msg = `Error al guardar validación: ${updErr.message}`;
			return redirect(`${back}?status=error&msg=${encodeURIComponent(msg)}`);
		}

		// ===== EMPRESA =====
		const socios = safeArray(approved_data?.panel_socios);
    const manager_sci = asBool(approved_data?.manager_sci);
		const manager_es_miembro = asBool(approved_data?.manager_es_miembro);

		const companyRow = {
			empresa_incorporacion_id: empresa_id,
			Obtendra_ingresos_desde_eeuu: asBool(
				approved_data?.ingresos_provenientes_de_Estados_Unidos,
			),
			actividad_no_listada: asString(approved_data?.actividad_en_lista) || null,
			actividad: asString(approved_data?.Actividad) || null,
			forma_administracion: asString(approved_data?.forma_administracion) || null,
			forma_tributacion: asString(approved_data?.forma_tributacion) || null,
			direccion_operativa_eeuu:
				asString(approved_data?.direccion_operativa_eeuu) || null,
			direccion_eeuu: asString(approved_data?.Direccion) || null,
			condado_eeuu: asString(approved_data?.Condado) || null,
			ciudad_eeuu: asString(approved_data?.Ciudad) || null,
			estado_eeuu: asString(approved_data?.Estado) || null,
			codigo_postal_eeuu: asString(approved_data?.codigo_postal) || null,
			Pais_operativo: asString(approved_data?.Pais_) || null,
			direccion_empresa: asString(approved_data?.direccion_empresa) || null,
			informacion_miembros: asString(approved_data?.informacion_miembros) || null,
			responsable_irs: asString(approved_data?.responsable_irs) || null,
			fecha_de_validacion: nowIso,
			updated_at: nowIso,
      manager_sci: manager_sci,
      manager_es_miembro: manager_es_miembro,
      manager_fuera_de_la_lista: asBool(approved_data?.agregar_otros_socios)
		};

		const { error: upCompanyErr } = await supabase
			.from('empresas_incorporaciones')
			.upsert(companyRow, { onConflict: 'empresa_incorporacion_id' });

		if (upCompanyErr) {
			const msg = `Error upsert empresa: ${upCompanyErr.message}`;
			return redirect(`${back}?status=error&msg=${encodeURIComponent(msg)}`);
		}

		// ===== Managers flags + sets (para roles de socios) =====
		

		const managersSonSocios = approved_data?.manager_es_miembro === true;
		const agregarOtrosSocios = approved_data?.agregar_otros_socios === true;

		const selectedNames = Array.isArray(approved_data?.managers_nombres_seleccionados)
			? approved_data.managers_nombres_seleccionados
			: [];

		// Comparación exacta (sin normalizar)
		const managerNameSet = new Set(
			selectedNames
				.map((n: any) => (typeof n === 'string' ? n.trim() : ''))
				.filter(Boolean),
		);

		// ===== SOCIOS (roles manager desde el MISMO JSON) =====
		const peopleRows = socios.map((s: any) => {
			const nombre = asString(s?.Nombres_completos);
			const isManager = managersSonSocios && managerNameSet.has(nombre);

			return {
				id_empresa: empresa_id,
				roles: isManager ? ['socio', 'manager'] : ['socio'],
				tipo_de_socio: asString(s?.tipo_socio) || null,
				nombre_de_socio: nombre || null,
				correo: asString(s?.correoelectronico).toLowerCase() || null,
				porcentaje: asNumber(s?.porcentaje ?? s?.Porcentaje) ?? null,
				estado_civil: asString(s?.estado_civil) || null,
				residente_fiscal: asString(s?.residente_fiscal_eeuu) || null,
				numero_de_pasaporte: asString(s?.numero_pasaporte) || null,
				nacionalidad: asString(s?.nacionalidad) || null,
				numero_de_seguro_social: asString(s?.ssn) || null,
				numero_itin: asString(s?.itin) || null,
				pais_planilla: asString(s?.pais_factura_servicio_basico) || null,
				direccion_planilla: asString(s?.direccion_planilla_socio) || null,
				updated_at: nowIso,
			};
		});

		const { data: peopleUp, error: upPeopleErr } = await supabase
			.from('socios_validados')
			.upsert(peopleRows, { onConflict: 'id_empresa,correo' })
			.select('id, correo');

		if (upPeopleErr) {
			const msg = `Error en subida de datos de socios: ${upPeopleErr.message}`;
			return redirect(`${back}?status=error&msg=${encodeURIComponent(msg)}`);
		}

		const personIdByEmail = new Map<string, string>();
		for (const p of peopleUp ?? []) {
			if (p.correo) personIdByEmail.set(String(p.correo).toLowerCase(), p.id);
		}

		// ===== MANAGERS_VALIDADOS (3 condiciones) =====
		// SurveyJS manda "Managers": [...]
		const managers = safeArray(approved_data?.Managers);

		// Caso B: managers_son_socios === false -> insertar Managers
		// Caso C: managers_son_socios === true && agregar_otros_socios === true -> insertar Managers también
		const debeInsertarManagers =
			managersSonSocios === false || (managersSonSocios === true && agregarOtrosSocios);

		if (debeInsertarManagers) {
			if (managers.length === 0) {
				return redirect(
					`${back}?status=error&msg=${encodeURIComponent(
						'Se esperaba el arreglo Managers pero llegó vacío',
					)}`,
				);
			}

			const managerRows = managers.map((m: any) => ({
				empresa_incorporacion_id: empresa_id,

				// columnas (mismos nombres del JSON)
				Nombres_manager: asString(m?.Nombres_manager) || null,
				Correo_electronico_manager:
					asString(m?.Correo_electronico_manager).toLowerCase() || null,
				residente_fiscal_en_EE_UU_manager: asBool(m?.residente_fiscal_en_EE_UU_manager),
				Numero_de_ITIN_manager: asString(m?.Numero_de_ITIN_manager) || null,
				numero_seguro_social: asString(m?.numero_seguro_social) || null,
				Numero_de_pasaporte_manager: asString(m?.Numero_de_pasaporte_manager) || null,
				Pais_de_nacionalidad_manager: asString(m?.País_de_nacionalidad_manager) || null,
				manager_misma_direccion_empresa: asBool(m?.manager_misma_direccion_empresa),
        Pais_de_nacionalidad_manager_2: asString(m?.País_de_nacionalidad_manager_2) || null,
        Direccion_de_Manager: asString(m?.Dirección_de_Manager) || null,
				created_at: nowIso,
				updated_at: nowIso,
			}));

			// sin delete (operaciones valida una vez)
			const { error: insManagersErr } = await supabase
				.from('managers_validados')
				.insert(managerRows);

			if (insManagersErr) {
				const msg = `Error insert managers: ${insManagersErr.message}`;
				return redirect(`${back}?status=error&msg=${encodeURIComponent(msg)}`);
			}
		}

		// OK
		return redirect(
			`${back}?status=success&msg=${encodeURIComponent(
				'Validación guardada correctamente',
			)}&submission_id=${encodeURIComponent(submission_id)}&empresa_id=${encodeURIComponent(
				empresa_id,
			)}`,
		);
	} catch (e: any) {
		const msg = encodeURIComponent(`Error inesperado: ${e?.message ?? e}`);
		return redirect(`${back}?status=error&msg=${msg}`);
	}
};

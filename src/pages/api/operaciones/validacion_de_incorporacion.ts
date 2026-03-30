// src/pages/api/operaciones/validacion_de_incorporacion.ts
export const prerender = false;

import type { APIRoute } from 'astro';
import { createSupabaseServerClient } from '@lib/supabase';
import { safeBack, SECURITY_HEADERS } from '@lib/security/headers';
import crypto from 'node:crypto';

const BACK_PATH = '/admin/verificacion/';
const BUCKET = 'documentos_empresas'; // <-- tu bucket

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

// carpeta "segura"
const folderize = (name: string) =>
	asString(name)
		.replace(/[\/\\?%*:|"<>]/g, '-') // inválidos en paths
		.replace(/\s+/g, ' ')
		.trim();

const stripDataUrlPrefix = (s: string) => {
	const str = asString(s);
	const idx = str.indexOf('base64,');
	return idx >= 0 ? str.slice(idx + 'base64,'.length) : str;
};

const mimeFromDataUrl = (s: string) => {
	const str = asString(s);
	const m = str.match(/^data:([^;]+);base64,/i);
	return m?.[1] ? m[1].trim().toLowerCase() : '';
};

const extFromMime = (mime: string) => {
	const m = asString(mime).toLowerCase();
	if (m.includes('pdf')) return 'pdf';
	if (m.includes('png')) return 'png';
	if (m.includes('jpeg') || m.includes('jpg')) return 'jpg';
	if (m.includes('webp')) return 'webp';
	if (m.includes('gif')) return 'gif';
	return 'bin';
};

const sanitizeFileName = (name: string) => {
	const n = asString(name) || 'archivo';
	return n.replace(/[\/\\?%*:|"<>]/g, '-');
};

// ---------- JSON helpers ----------
const jlog = (_debug_id: string, _step: string, _data?: any) => {
	// En prod puedes bajar ruido: if (import.meta.env.DEV) ...
	// console.log(`[validacion:${debug_id}] ${step}`, data ?? '');
};

const jerr = (debug_id: string, step: string, err: any, extra?: any) => {
	console.error(`[validacion:${debug_id}] ERROR @ ${step}`);
	console.error(err);
	if (extra) console.error(`[validacion:${debug_id}] EXTRA`, extra);
};

const jsonOk = (body: any, status = 200) =>
	new Response(JSON.stringify(body), {
		status,
		headers: { ...SECURITY_HEADERS },
	});

const normSbErr = (e: any) => {
	// PostgREST / Supabase errors suelen traer: message, details, hint, code
	if (!e) return null;
	if (typeof e === 'string') return { message: e };
	return {
		message: e.message ?? String(e),
		code: e.code ?? null,
		details: e.details ?? null,
		hint: e.hint ?? null,
	};
};

export const POST: APIRoute = async ({ request, cookies, url, locals }) => {
	const debug_id = crypto.randomUUID().slice(0, 8);
	const back = safeBack(url.searchParams.get('back'), BACK_PATH); // (lo dejamos por si lo usas en front)

	try {
		jlog(debug_id, 'START', { back });

		// 1) Cliente Supabase SSR
		const supabase = createSupabaseServerClient({ headers: request.headers, cookies });

		// 2) Usuario y autorización admin
		const { data: { user: actor }, error: userErr } = await supabase.auth.getUser();
		if (userErr || !actor) {
			return jsonOk(
				{
					ok: false,
					debug_id,
					step: 'auth.user',
					error: normSbErr(userErr) ?? { message: 'No autenticado' },
				},
				401,
			);
		}

		const userRoles = locals.userRoles || [];
		const isAdmin = userRoles.includes('admin');
		if (!isAdmin) {
			return jsonOk(
				{
					ok: false,
					debug_id,
					step: 'auth.admin',
					error: { message: 'No autorizado' },
				},
				403,
			);
		}

		// 3) Body JSON (SurveyJS)
		const body = await request.json().catch(() => null);

		const submission_id = body?.submission_id?.toString().trim();
		const empresa_id = body?.empresa_id?.toString().trim();
		let approved_data = body?.approved_data;

		// 4) Validaciones mínimas
		if (!submission_id || !UUID_RE.test(submission_id)) {
			return jsonOk(
				{
					ok: false,
					debug_id,
					step: 'validate.submission_id',
					error: { message: 'submission_id inválido' },
				},
				400,
			);
		}
		if (!empresa_id || !UUID_RE.test(empresa_id)) {
			return jsonOk(
				{
					ok: false,
					debug_id,
					step: 'validate.empresa_id',
					error: { message: 'empresa_id inválido' },
				},
				400,
			);
		}
		if (!approved_data || typeof approved_data !== 'object') {
			return jsonOk(
				{
					ok: false,
					debug_id,
					step: 'validate.approved_data',
					error: { message: 'approved_data debe ser un objeto JSON' },
				},
				400,
			);
		}

		const nowIso = new Date().toISOString();

		// 5) Anti-tampering: submission -> empresa_id
		{
			const { data: envio, error: envioErr } = await supabase
				.from('formularios_envios')
				.select('submission_id, empresa_incorporacion_id, status, form_id')
				.eq('submission_id', submission_id)
				.single();

			if (envioErr || !envio) {
				return jsonOk(
					{
						ok: false,
						debug_id,
						step: 'anti_tampering.envio',
						error: normSbErr(envioErr) ?? { message: 'Envío no encontrado' },
					},
					404,
				);
			}
			if (envio.empresa_incorporacion_id !== empresa_id) {
				return jsonOk(
					{
						ok: false,
						debug_id,
						step: 'anti_tampering.mismatch',
						error: { message: 'Mismatch: envío no corresponde a esa empresa' },
						meta: { envio_empresa: envio.empresa_incorporacion_id, empresa_id },
					},
					400,
				);
			}
		}

		// =========================================================
		// 6) Subida de documentos a Storage + reemplazo en JSON
		// =========================================================
		approved_data = JSON.parse(JSON.stringify(approved_data)); // clonar para mutar

		const uploadFileObj = async (baseFolder: string, fileObj: any) => {
			if (!fileObj || typeof fileObj !== 'object') return null;

			const rawName = sanitizeFileName(asString(fileObj?.name));
			const type = asString(fileObj?.type).toLowerCase();
			const content = asString(fileObj?.content);

			if (!content) return null;

			const pureB64 = stripDataUrlPrefix(content);
			const bytes = Buffer.from(pureB64, 'base64');

			let ext = 'bin';
			if (rawName.includes('.')) ext = rawName.split('.').pop()!.toLowerCase();
			else if (type) ext = extFromMime(type);

			const baseName = rawName.includes('.')
				? rawName.slice(0, rawName.lastIndexOf('.'))
				: rawName;

			const suffix = crypto.randomUUID().slice(0, 8);
			const finalName = `${baseName || 'archivo'}_${suffix}.${ext}`;
			const storage_path = `${baseFolder}/${finalName}`;

			const { error: upErr } = await supabase.storage
				.from(BUCKET)
				.upload(storage_path, bytes, {
					upsert: true,
					contentType: type,
				});

			if (upErr) {
				throw new Error(
					`Storage upload error (${storage_path}): ${upErr.message}`,
				);
			}

			const { data: pub } = supabase.storage
				.from(BUCKET)
				.getPublicUrl(storage_path);

			return {
				name: rawName || finalName,
				type: type || null,
				storage_path,
				public_url: pub?.publicUrl,
			};
		};

		const uploadFileArray = async (baseFolder: string, arr: any[]) => {
			const out: any[] = [];
			for (const f of safeArray(arr)) {
				const r = await uploadFileObj(baseFolder, f);
				if (r) out.push(r);
			}
			return out;
		};

		const uploadFirmaString = async (firmaDataUrl: string) => {
			const mime = mimeFromDataUrl(firmaDataUrl) || 'image/png';
			const ext = extFromMime(mime);
			const pureB64 = stripDataUrlPrefix(firmaDataUrl);
			const bytes = Buffer.from(pureB64, 'base64');

			const storage_path = `${empresa_id}/documentos_socios/firma/firma.${ext}`;

			const { error: upErr } = await supabase.storage
				.from(BUCKET)
				.upload(storage_path, bytes, {
					upsert: true,
					contentType: mime,
				});

			if (upErr) {
				throw new Error(
					`Storage upload error (${storage_path}): ${upErr.message}`,
				);
			}

			const { data: pub } = supabase.storage
				.from(BUCKET)
				.getPublicUrl(storage_path);

			return {
				name: `firma.${ext}`,
				type: mime,
				storage_path,
				public_url: pub?.publicUrl,
			};
		};

		// Root: factura_servicio_basico (empresa)
		{
			const arr = safeArray(approved_data?.factura_servicio_basico);
			if (arr.length) {
				const baseFolder = `${empresa_id}/documentos_socios/empresa/servicio_basico`;
				approved_data.factura_servicio_basico = await uploadFileArray(
					baseFolder,
					arr,
				);
			}
		}

		// firma (string base64)
		{
			const f = asString(approved_data?.firma);
			if (f && f.startsWith('data:') && f.includes('base64,')) {
				approved_data.firma = await uploadFirmaString(f);
			}
		}

		// socios
		const socios = safeArray(approved_data?.panel_socios);
		for (const s of socios) {
			const nombreSocio = folderize(asString(s?.Nombres_completos) || 'socio');

			const pasArr = safeArray(s?.Pasaporte);
			if (pasArr.length) {
				const baseFolder = `${empresa_id}/documentos_socios/${nombreSocio}/pasaporte`;
				s.Pasaporte = await uploadFileArray(baseFolder, pasArr);
			}

			const sbArr = safeArray(s?.factura_servicio_basico_socio);
			if (sbArr.length) {
				const baseFolder = `${empresa_id}/documentos_socios/${nombreSocio}/servicio_basico`;
				s.factura_servicio_basico_socio = await uploadFileArray(
					baseFolder,
					sbArr,
				);
			}
		}

		// managers (si vienen)
		const managers = safeArray(approved_data?.Managers);
		for (const m of managers) {
			const nombreManager = folderize(
				asString(m?.Nombres_manager) || 'manager',
			);

			const pasArr = safeArray(m?.Pasaporte_escaneado_manager);
			if (pasArr.length) {
				const baseFolder = `${empresa_id}/documentos_socios/${nombreManager}/pasaporte`;
				m.Pasaporte_escaneado_manager = await uploadFileArray(
					baseFolder,
					pasArr,
				);
			}

			const sbArr = safeArray(m?.Factura_de_Servicio_Basico_manager);
			if (sbArr.length) {
				const baseFolder = `${empresa_id}/documentos_socios/${nombreManager}/servicio_basico`;
				m.Factura_de_Servicio_Basico_manager = await uploadFileArray(
					baseFolder,
					sbArr,
				);
			}
		}

		// =========================================================
		// 7) Guardar JSON aprobado (ya con storage refs)
		// =========================================================
		{
			const { error: updErr } = await supabase
				.from('formularios_envios')
				.update({
					respuestas_validadas: approved_data,
					verificacion_operaciones: true,
					updated_at: nowIso,
				})
				.eq('submission_id', submission_id);

			if (updErr) {
				jerr(debug_id, 'db.formularios_envios.update', updErr);
				return jsonOk(
					{
						ok: false,
						debug_id,
						step: 'db.formularios_envios.update',
						error: normSbErr(updErr),
					},
					500,
				);
			}
		}

		// =========================================================
		// 8) INSERT/UPSERT tablas (empresa / socios / managers_validados)
		// =========================================================

		// EMPRESA
		{
			const manager_sci = asBool(approved_data?.manager_sci);
			const manager_es_miembro = asBool(approved_data?.manager_es_miembro);

			const companyRow = {
				porcentaje_de_incorporacion: '10',
				empresa_incorporacion_id: empresa_id,
				Obtendra_ingresos_desde_eeuu: asBool(
					approved_data?.ingresos_provenientes_de_Estados_Unidos,
				),
				actividad_no_listada:
					asString(approved_data?.actividad_en_lista) || 'Si está en la lista',
				actividad: asString(approved_data?.Actividad) || null,
				forma_administracion:
					asString(approved_data?.forma_administracion) || null,
				forma_tributacion: asString(approved_data?.forma_tributacion) || null,
				direccion_operativa_eeuu:
					asString(approved_data?.direccion_operativa_eeuu) || null,
				direccion_eeuu: asString(approved_data?.Direccion) || null,
				condado_eeuu: asString(approved_data?.Condado) || null,
				ciudad_eeuu: asString(approved_data?.Ciudad) || null,
				estado_eeuu: asString(approved_data?.Estado) || null,
				codigo_postal_eeuu: asNumber(approved_data?.codigo_postal) ?? null,
				Pais_operativo: asString(approved_data?.Pais_) || null,
				direccion_empresa: asString(approved_data?.direccion_empresa) || null,
				informacion_miembros:
					asString(approved_data?.informacion_miembros) || null,
				responsable_irs: asString(approved_data?.responsable_irs) || null,
				fecha_de_validacion: nowIso,
				manager_sci,
				manager_es_miembro,
				manager_fuera_de_la_lista: asBool(approved_data?.agregar_otros_socios),
			};

			const { data, error: upCompanyErr } = await supabase
				.from('empresas_incorporaciones')
				.update(companyRow)
				.eq('empresa_incorporacion_id', empresa_id)
				.select('empresa_incorporacion_id')
				.maybeSingle();

			if (upCompanyErr) {
				jerr(debug_id, 'db.empresas_incorporaciones.upsert', upCompanyErr, {
					companyRow,
				});
				return jsonOk(
					{
						ok: false,
						debug_id,
						step: 'db.empresas_incorporaciones.upsert',
						error: normSbErr(upCompanyErr),
						meta: { companyRow },
					},
					500,
				);
			}

			jlog(debug_id, 'db.empresas_incorporaciones.upsert.OK', data);
		}

		// MANAGERS: 3 condiciones
		const managersSonSocios = approved_data?.manager_es_miembro === true;
		const agregarOtrosSocios = approved_data?.agregar_otros_socios === true;

		const selectedNames = Array.isArray(approved_data?.Seleccion_managers)
			? approved_data.Seleccion_managers
			: [];

		const managerNameSet = new Set(
			selectedNames
				.map((n: any) => (typeof n === 'string' ? n.trim() : ''))
				.filter(Boolean),
		);

		// SOCIOS
		{
			const peopleRows = socios.map((s: any) => {
				const nombre = asString(s?.Nombres_completos);
				const isManager = managersSonSocios && managerNameSet.has(nombre);

				return {
					id_empresa: empresa_id,
					roles: isManager ? ['socio', 'manager'] : ['socio'],
					tipo_de_socio: asString(s?.tipo_socio) || null,
					nombre_de_socio: nombre || null,
					correo: asString(s?.correoelectronico).toLowerCase() || null,
					porcentaje: asNumber(s?.Porcentaje) ?? null,
					estado_civil: asString(s?.estado_civil) || null,
					residente_fiscal: asString(s?.residente_fiscal_eeuu) || null,
					numero_de_pasaporte: asString(s?.numero_pasaporte) || null,
					pais_de_nacionalidad: asString(s?.nacionalidad) || null,
					numero_de_seguro_social: asString(s?.ssn) || null,
					numero_itin: asString(s?.itin) || null,
					pais_planilla: asString(s?.pais_factura_servicio_basico) || null,
					direccion_planilla: asString(s?.direccion_planilla_socio) || null,
					updated_at: nowIso,
				};
			});

			const { error: upPeopleErr } = await supabase
				.from('socios_validados')
				.upsert(peopleRows);

			if (upPeopleErr) {
				jerr(debug_id, 'db.socios_validados.upsert', upPeopleErr, {
					sampleRow: peopleRows?.[0],
				});
				return jsonOk(
					{
						ok: false,
						debug_id,
						step: 'db.socios_validados.upsert',
						error: normSbErr(upPeopleErr),
					},
					500,
				);
			}

			jlog(debug_id, 'db.socios_validados.upsert.OK', {
				count: peopleRows.length,
			});
		}

		// MANAGERS_VALIDADOS: caso B o C
		{
			const debeInsertarManagers =
				managersSonSocios === false ||
				(managersSonSocios === true && agregarOtrosSocios === true);

			if (debeInsertarManagers) {
				if (managers.length === 0) {
					return jsonOk(
						{
							ok: false,
							debug_id,
							step: 'validate.managers_array',
							error: {
								message: 'Se esperaba el arreglo Managers pero llegó vacío',
							},
						},
						400,
					);
				}

				const managerRows = managers.map((m: any) => ({
					empresa_incorporacion_id: empresa_id,

					Nombres_manager: asString(m?.Nombres_manager) || null,
					Correo_electronico_manager:
						asString(m?.Correo_electronico_manager).toLowerCase() || null,
					residente_fiscal_en_EE_UU_manager: asBool(
						m?.residente_fiscal_en_EE_UU_manager,
					),
					Numero_de_ITIN_manager: asString(m?.Numero_de_ITIN_manager) || null,
					numero_seguro_social: asString(m?.numero_seguro_social) || null,
					Numero_de_pasaporte_manager:
						asString(m?.Numero_de_pasaporte_manager) || null,
					Pais_de_nacionalidad_manager:
						asString(m?.País_de_nacionalidad_manager) || null,
					manager_misma_direccion_empresa: asBool(
						m?.manager_misma_direccion_empresa,
					),

					Pais_de_nacionalidad_manager_2:
						asString(m?.Pais_de_nacionalidad_manager_2) ||
						asString(m?.País_de_nacionalidad_manager_2) ||
						null,

					Direccion_de_Manager:
						asString(m?.Direccion_de_Manager) ||
						asString(m?.Dirección_de_Manager) ||
						null,

					created_at: nowIso,
					updated_at: nowIso,
				}));

				const { error: insManagersErr } = await supabase
					.from('managers_validados')
					.insert(managerRows);

				if (insManagersErr) {
					jerr(debug_id, 'db.managers_validados.insert', insManagersErr, {
						sampleRow: managerRows?.[0],
					});
					return jsonOk(
						{
							ok: false,
							debug_id,
							step: 'db.managers_validados.insert',
							error: normSbErr(insManagersErr),
						},
						500,
					);
				}

				jlog(debug_id, 'db.managers_validados.insert.OK', {
					count: managerRows.length,
				});
			} else {
				jlog(debug_id, 'db.managers_validados.skip', {
					managersSonSocios,
					agregarOtrosSocios,
				});
			}
		}

		// OK
		return jsonOk({
			ok: true,
			debug_id,
			submission_id,
			empresa_id,
			back,
			meta: {
				managersSonSocios,
				agregarOtrosSocios,
				socios_count: socios.length,
				managers_count: managers.length,
			},
		});
	} catch (e: any) {
		console.error(`[validacion:${debug_id}] FATAL`, { message: e?.message ?? String(e), stack: e?.stack ?? null });
		return jsonOk(
			{
				ok: false,
				debug_id,
				step: 'catch',
				error: { message: 'Error interno del servidor. Contacta al administrador.' },
			},
			500,
		);
	}
};

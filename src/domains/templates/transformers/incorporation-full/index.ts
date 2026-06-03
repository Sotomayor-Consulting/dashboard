import type { Transformer } from '../types';
import { supabaseAdmin } from '@infrastructure/supabase/admin';
import { formatDate, formatName } from '../helpers';

interface FullData {
	incorporation: Record<string, unknown>;
	planning_design: Record<string, unknown> | null;
	members: Record<string, unknown>[];
	client: Record<string, unknown> | null;
	company: Record<string, unknown> | null;
}

async function fetchFullData(incorporationId: string): Promise<FullData> {
	const [incorporation, planningDesign, company] = await Promise.all([
		supabaseAdmin
			.from('empresas_incorporaciones')
			.select('*')
			.eq('empresa_incorporacion_id', incorporationId)
			.maybeSingle()
			.then((r) => (r.data ?? {}) as Record<string, unknown>),

		supabaseAdmin
			.from('workflow.planning_design_reports')
			.select('*')
			.eq('incorporation_id', incorporationId)
			.maybeSingle()
			.then((r) => (r.data ?? null) as Record<string, unknown> | null),

		supabaseAdmin
			.from('empresa')
			.select('*')
			.eq('empresa_incorporacion_id', incorporationId)
			.maybeSingle()
			.then((r) => (r.data ?? null) as Record<string, unknown> | null),
	]);

	const companyId = company?.empresa_id as string | undefined;

	let members: Record<string, unknown>[] = [];
	if (companyId) {
		const { data: memberRows } = await supabaseAdmin
			.from('members')
			.select('*, company_members!inner(*)')
			.eq('company_members.company_id', companyId)
			.is('company_members.deleted_at', null)
			.eq('company_members.is_active', true);

		if (memberRows) members = memberRows as unknown as Record<string, unknown>[];
	}

	const userId = incorporation.user_id as string | undefined;
	let client: Record<string, unknown> | null = null;
	if (userId) {
		const { data: userData } = await supabaseAdmin
			.from('usuarios')
			.select('*')
			.eq('user_id', userId)
			.maybeSingle();

		if (userData) client = userData as Record<string, unknown>;
	}

	return { incorporation, planning_design: planningDesign, members, client, company };
}

export const incorporationFullTransformer: Transformer = {
	id: 'incorporation_full',
	name: 'Incorporación Completa',
	description: 'Agrega todos los datos relacionados a una incorporación: planning & design, miembros, cliente, empresa',
	entityType: 'incorporation_case',

	async evaluate(row: Record<string, unknown>): Promise<Record<string, string | boolean | string[]>> {
		const incorporationId = row.empresa_incorporacion_id as string;
		const full = await fetchFullData(incorporationId);

		const result: Record<string, string | boolean | string[]> = {};

		// ── Incorporation case fields ──
		const incMap: Record<string, string> = {
			business_name_1: 'nombre_1',
			business_name_2: 'nombre_2',
			business_name_3: 'nombre_3',
			business_type: 'tipo_de_negocio',
			formation_state: 'estado_de_incorporacion',
			management_type: 'forma_administracion',
			taxation_type: 'forma_tributacion',
			status: 'estado',
			business_address: 'direccion_empresa',
			us_address: 'direccion_eeuu',
			us_city: 'ciudad_eeuu',
			us_state: 'estado_eeuu',
			us_zip: 'codigo_postal_eeuu',
			us_county: 'condado_eeuu',
			percentage: 'porcentaje_de_incorporacion',
			source: 'source',
			created_at: 'created_at',
		};

		for (const [key, col] of Object.entries(incMap)) {
			const val = full.incorporation[col];
			if (val != null) result[key] = String(val);
		}

		// ── Planning & Design report fields ──
		if (full.planning_design) {
			const pdMap: Record<string, string> = {
				pd_state_id: 'state_id',
				pd_activity_id: 'activity_id',
				pd_confidentiality: 'confidentiality',
				pd_administration_form: 'administration_form',
				pd_tax_tributation: 'tax_tributation',
				pd_accounting_method: 'accounting_method',
				pd_members_number: 'members_number',
				pd_income_us: 'income_us',
				pd_designated_manager: 'designated_manager',
				pd_company_description: 'company_description',
				pd_meeting_resume: 'meeting_resume',
			};

			for (const [key, col] of Object.entries(pdMap)) {
				const val = full.planning_design[col];
				if (val != null) result[key] = String(val);
			}
		}

		// ── Client (usuario) fields ──
		if (full.client) {
			const userMap: Record<string, string> = {
				client_name: 'nombre',
				client_last_name: 'apellido',
				client_email: 'correo',
				client_phone: 'telf',
				client_address_line1: 'direccion_linea1',
				client_address_line2: 'direccion_linea2',
				client_city: 'ciudad',
				client_id_type: 'tipo_identificacion',
				client_id_number: 'numero_de_identificacion',
				client_person_type: 'tipo_persona',
				client_birth_date: 'fecha_nacimiento',
				client_organization: 'organizacion',
				client_partner_code: 'codigo_de_partner',
			};

			for (const [key, col] of Object.entries(userMap)) {
				const val = full.client[col];
				if (val != null) result[key] = String(val);
			}

			result['client_full_name'] = formatName(full.client.nombre, full.client.apellido);
		}

		// ── Company (empresa) fields ──
		if (full.company) {
			const compMap: Record<string, string> = {
				company_legal_name: 'nombre',
				company_slug: 'slug',
				company_status: 'estado',
				company_entity_type: 'entity_type',
				company_filing_number: 'filing_number',
				company_identification_number: 'identification_number',
				company_management_type: 'management_type',
				company_tax_clasification: 'tax_clasification',
				company_incorporation_date: 'incorporation_date',
			};

			for (const [key, col] of Object.entries(compMap)) {
				const val = full.company[col];
				if (val != null) result[key] = String(val);
			}
		}

		// ── Members ──
		if (full.members.length > 0) {
			result['members_count'] = String(full.members.length);

			result['member_1_full_name'] = formatName(
				full.members[0]?.first_name,
				full.members[0]?.last_name,
			);
			result['member_1_person_type'] = String(full.members[0]?.person_type ?? '');
			result['member_1_id_type'] = String(full.members[0]?.identification_type ?? '');
			result['member_1_id_number'] = String(full.members[0]?.identification_number ?? '');

			if (full.members.length > 1) {
				result['member_2_full_name'] = formatName(
					full.members[1]?.first_name,
					full.members[1]?.last_name,
				);
				result['member_2_person_type'] = String(full.members[1]?.person_type ?? '');
				result['member_2_id_type'] = String(full.members[1]?.identification_type ?? '');
				result['member_2_id_number'] = String(full.members[1]?.identification_number ?? '');
			}
		}

		// ── Incorporation metadata ──
		if (full.incorporation.created_at) {
			result['incorporation_created_at'] = formatDate(full.incorporation.created_at);
		}
		if (full.incorporation.updated_at) {
			result['incorporation_updated_at'] = formatDate(full.incorporation.updated_at);
		}

		return result;
	},
};

import type { SupabaseClient } from '@supabase/supabase-js';
import { recordAuditEvent } from '@domains/audit/audit-events';

type ManagementType = 'member-managed' | 'manager-managed';
type CanonicalCompanyStatus = 'draft' | 'pending_validation';

interface IncorporationForCompany {
	empresa_incorporacion_id: string;
	company_id?: string | null;
	user_id: string;
	nombre_1: string | null;
	tipo_de_negocio: string | null;
	state_id: number | null;
	activity_id: number | null;
	activity_description: string | null;
	descripcion_empresa?: string | null;
	forma_administracion: string | null;
	forma_tributacion: string | null;
	Obtendra_ingresos_desde_eeuu: boolean | null;
}

const normalizeManagementType = (value: string | null): ManagementType => {
	const normalized = (value ?? '').toLowerCase();
	if (normalized.includes('manager')) return 'manager-managed';
	return 'member-managed';
};

export async function getCanonicalCompanyIdForIncorporation(
	supabase: SupabaseClient,
	incorporationId: string,
): Promise<string | null> {
	const { data, error } = await supabase
		.from('empresas_incorporaciones')
		.select('company_id')
		.eq('empresa_incorporacion_id', incorporationId)
		.maybeSingle<{ company_id: string | null }>();

	if (error) throw error;
	return data?.company_id ?? null;
}

export async function createCanonicalCompanyFromIncorporation(
	supabase: SupabaseClient,
	incorporationId: string,
	actorUserId: string,
	status: CanonicalCompanyStatus = 'draft',
): Promise<string> {
	const { data: incorporation, error: incorporationError } = await supabase
		.from('empresas_incorporaciones')
		.select(
			`empresa_incorporacion_id, company_id, user_id, nombre_1,
			tipo_de_negocio, state_id, activity_id, activity_description,
			descripcion_empresa, forma_administracion, forma_tributacion,
			Obtendra_ingresos_desde_eeuu`,
		)
		.eq('empresa_incorporacion_id', incorporationId)
		.maybeSingle<IncorporationForCompany>();

	if (incorporationError) throw incorporationError;
	if (!incorporation) {
		throw new Error('INCORPORATION_NOT_FOUND');
	}
	if (incorporation.company_id) return incorporation.company_id;

	const now = new Date().toISOString();
	const { data: company, error: companyError } = await supabase
		.from('companies')
		.insert({
			user_id: incorporation.user_id,
			legal_name: incorporation.nombre_1,
			entity_type: 'llc',
			formation_state_id: incorporation.state_id,
			tax_clasification: incorporation.forma_tributacion,
			management_type: normalizeManagementType(
				incorporation.forma_administracion,
			),
			activity_code_id: incorporation.activity_id,
			activity_description:
				incorporation.activity_description ??
				incorporation.descripcion_empresa ??
				null,
			us_source_income: Boolean(incorporation.Obtendra_ingresos_desde_eeuu),
			legal_status: status,
			created_by: actorUserId,
			updated_by: actorUserId,
			created_at: now,
			updated_at: now,
		})
		.select('id')
		.single<{ id: string }>();

	if (companyError) throw companyError;

	const { error: updateError } = await supabase
		.from('empresas_incorporaciones')
		.update({
			company_id: company.id,
			updated_at: now,
		})
		.eq('empresa_incorporacion_id', incorporationId);

	if (updateError) throw updateError;

	await recordAuditEvent({
		entityType: 'company',
		entityId: company.id,
		parentType: 'incorporation',
		parentId: incorporationId,
		action: 'create',
		changedBy: actorUserId,
		afterData: {
			id: company.id,
			incorporation_id: incorporationId,
			legal_status: status,
			legal_name: incorporation.nombre_1,
		},
	});

	return company.id;
}

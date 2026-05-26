import type { SupabaseClient } from '@supabase/supabase-js';
import { BusinessRuleError } from './errors';

export type ManagementType = 'member-managed' | 'manager-managed';

/**
 * Reglas de negocio en torno al `management_type` de la empresa.
 *
 * - `member-managed` → la LLC no debe tener managers separados; los socios
 *   gestionan. Si un `company_member` se marca `is_manager=true` está roto.
 * - `manager-managed` → debe existir al menos un `company_member` activo
 *   con `is_manager=true`.
 *
 * Estas reglas se evalúan ANTES de persistir cambios. Si fallan, se lanza
 * `BusinessRuleError` para que la capa de API responda 422 y el UI
 * pueda mostrar un toast amigable.
 */

interface ActiveCounts {
	managers: number;
	total: number;
}

async function countActiveRoles(
	supabase: SupabaseClient,
	companyId: string,
): Promise<ActiveCounts> {
	const { data, error } = await supabase
		.from('company_members')
		.select('id, is_manager')
		.eq('company_id', companyId)
		.is('deleted_at', null);

	if (error) throw error;
	const rows = data ?? [];
	return {
		total: rows.length,
		managers: rows.filter((r) => r.is_manager === true).length,
	};
}

async function getCompanyManagementType(
	supabase: SupabaseClient,
	companyId: string,
): Promise<ManagementType | null> {
	const { data, error } = await supabase
		.from('companies')
		.select('management_type')
		.eq('id', companyId)
		.maybeSingle<{ management_type: ManagementType | null }>();

	if (error) throw error;
	return data?.management_type ?? null;
}

/**
 * Llamar desde createCompanyMember / updateCompanyMember ANTES de hacer el insert/update.
 *
 * @param next Lo que va a quedar después del cambio. Si el caller no sabe
 *             es_manager final, pasa el valor que se está escribiendo.
 */
export async function assertMemberRoleAllowed(
	supabase: SupabaseClient,
	companyId: string,
	next: { is_manager: boolean },
) {
	if (!next.is_manager) return;
	const managementType = await getCompanyManagementType(supabase, companyId);
	if (managementType === 'member-managed') {
		throw new BusinessRuleError(
			'MANAGER_NOT_ALLOWED_IN_MEMBER_MANAGED',
			'Esta empresa es "member-managed". Cambia el tipo de administración antes de agregar managers.',
		);
	}
}

/**
 * Llamar desde softDeleteCompanyMember / updateCompanyMember ANTES del commit
 * cuando la operación PODRÍA dejar la empresa sin managers (delete de un
 * manager o quitar el flag is_manager).
 */
export async function assertManagerInvariantOnRemoval(
	supabase: SupabaseClient,
	companyId: string,
	removingCompanyMemberId: number,
) {
	const managementType = await getCompanyManagementType(supabase, companyId);
	if (managementType !== 'manager-managed') return;

	// Verifica que queden ≥1 manager activo después de excluir la fila
	// que se está eliminando o despromoviendo.
	const { data, error } = await supabase
		.from('company_members')
		.select('id')
		.eq('company_id', companyId)
		.eq('is_manager', true)
		.is('deleted_at', null)
		.neq('id', removingCompanyMemberId)
		.limit(1);

	if (error) throw error;
	if (!data || data.length === 0) {
		throw new BusinessRuleError(
			'MANAGER_REQUIRED_FOR_MANAGER_MANAGED',
			'Esta empresa es "manager-managed" y requiere al menos un manager. Asigna otro manager antes de quitar este.',
		);
	}
}

/**
 * Llamar antes de actualizar `companies.management_type` para validar que
 * el cambio sea consistente con los company_members actuales.
 */
export async function assertManagementTypeChange(
	supabase: SupabaseClient,
	companyId: string,
	nextType: ManagementType,
) {
	const counts = await countActiveRoles(supabase, companyId);

	if (nextType === 'manager-managed' && counts.managers === 0) {
		throw new BusinessRuleError(
			'CANNOT_SWITCH_TO_MANAGER_MANAGED_WITHOUT_MANAGERS',
			'No puedes cambiar a "manager-managed" sin al menos un manager registrado.',
		);
	}

	if (nextType === 'member-managed' && counts.managers > 0) {
		throw new BusinessRuleError(
			'CANNOT_SWITCH_TO_MEMBER_MANAGED_WITH_MANAGERS',
			'No puedes cambiar a "member-managed" mientras existan managers activos. Quita el rol de manager primero.',
		);
	}
}

/**
 * Para consumo en SSR/UI: ¿la empresa cumple las reglas del tipo seleccionado?
 * No lanza, retorna el diagnóstico.
 */
export async function checkManagementTypeHealth(
	supabase: SupabaseClient,
	companyId: string,
): Promise<{
	ok: boolean;
	managementType: ManagementType | null;
	managers: number;
	reason?: string;
}> {
	const [managementType, counts] = await Promise.all([
		getCompanyManagementType(supabase, companyId),
		countActiveRoles(supabase, companyId),
	]);

	if (managementType === 'manager-managed' && counts.managers === 0) {
		return {
			ok: false,
			managementType,
			managers: counts.managers,
			reason: 'Falta al menos un manager.',
		};
	}
	if (managementType === 'member-managed' && counts.managers > 0) {
		return {
			ok: false,
			managementType,
			managers: counts.managers,
			reason: 'Existen managers en una empresa member-managed.',
		};
	}
	return { ok: true, managementType, managers: counts.managers };
}

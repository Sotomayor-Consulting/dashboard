/**
 * Reglas de negocio que dependen del ESTADO de incorporación de la LLC
 * (Florida, Wyoming, Delaware, …).
 *
 * Distintos estados tienen requisitos distintos de divulgación pública de
 * socios y managers. Este módulo centraliza esas reglas para que la UI
 * (StepMembers / StepManager) las consuma de forma declarativa.
 *
 * Fuentes (mayo 2026):
 *   · Florida — El Annual Report de Sunbiz exige nombre, dirección y cargo de
 *     cada manager/managing member; queda en el registro público.
 *     https://dos.fl.gov/sunbiz/manage-business/efile/annual-report/instructions/
 *   · Wyoming — Las Articles of Organization no exigen listar socios/managers;
 *     el estado es privacy-friendly.
 *   · Delaware — El Certificate of Formation no exige socios/managers y las LLC
 *     no presentan annual report → no hay divulgación pública.
 */

export type VisibilityRule =
	/** El cliente elige libremente Pública/Privada. */
	| 'choice'
	/** Se fuerza Pública y se bloquea el toggle. */
	| 'force-public'
	/** Se fuerza Privada y se bloquea el toggle. */
	| 'force-private'
	/** Pre-selecciona Privada pero el cliente puede cambiar a Pública. */
	| 'default-private'
	/** Pre-selecciona Pública pero el cliente puede cambiar a Privada. */
	| 'default-public';

export interface VisibilityPolicy {
	rule: VisibilityRule;
	/** Texto explicativo (tooltip) cuando la regla bloquea el toggle. */
	reason?: string;
}

export interface IncorporationRules {
	/** Visibilidad de la información de los socios. */
	membersVisibility: VisibilityPolicy;
	/** Visibilidad de la información del manager. */
	managerVisibility: VisibilityPolicy;
}

/** Default neutro — replica el comportamiento actual (elección libre). */
export const DEFAULT_RULES: IncorporationRules = {
	membersVisibility: { rule: 'choice' },
	managerVisibility: { rule: 'choice' },
};

const FLORIDA_REASON =
	'En Florida, el Annual Report de Sunbiz exige divulgar públicamente el nombre y dirección de los socios y managers. Por eso esta información debe registrarse como pública.';

const WYOMING_REASON =
	'Wyoming no exige divulgar socios ni managers, así que la mantenemos privada por defecto para proteger tu identidad. Aun así, en algunos casos conviene hacerla pública —por ejemplo, para facilitar la apertura de cuentas bancarias, dar más credibilidad ante clientes, socios o inversionistas, o cuando tu giro de negocio requiere transparencia. Puedes cambiarla según tu necesidad.';

const DELAWARE_REASON =
	'Delaware no exige divulgar socios ni managers (las LLC no presentan Annual Report), así que la mantenemos privada por defecto para proteger tu identidad. Aun así, en algunos casos conviene hacerla pública —por ejemplo, para facilitar la apertura de cuentas bancarias, dar más credibilidad ante clientes, socios o inversionistas, o cuando tu giro de negocio requiere transparencia. Puedes cambiarla según tu necesidad.';

const FLORIDA_REASON_PASSIVE =
	'En Florida solo se divulgan públicamente los administradores (managers). Como esta LLC es Manager-Managed, los socios pasivos pueden mantenerse privados.';

export type FormaAdministracion =
	| 'manager-managed'
	| 'member-managed'
	| string
	| null
	| undefined;

function normalizeState(estado: string | null | undefined): string {
	return (estado ?? '')
		.normalize('NFD')
		.replace(/[̀-ͯ]/g, '')
		.trim()
		.toLowerCase();
}

/**
 * Devuelve las reglas aplicables según el estado de incorporación Y la forma
 * de administración (las reglas de divulgación pública dependen de ambos).
 *
 * - Florida (estado público): se divulga *quien administra*.
 *     · Member-Managed → los socios son los administradores → socios públicos.
 *     · Manager-Managed → se divulgan los managers; los socios pasivos no.
 * - Wyoming / Delaware (estados privados): ni socios ni managers se divulgan.
 * - Otros estados / sin estado: elección libre (default neutro).
 */
export function getIncorporationRules(
	estado: string | null | undefined,
	forma?: FormaAdministracion,
): IncorporationRules {
	const key = normalizeState(estado);
	const isManagerManaged = forma === 'manager-managed';

	if (key === 'florida') {
		return {
			// Los socios son públicos solo cuando ellos administran (member-managed).
			membersVisibility: isManagerManaged
				? { rule: 'choice', reason: FLORIDA_REASON_PASSIVE }
				: { rule: 'force-public', reason: FLORIDA_REASON },
			// Los managers son públicos cuando existen (manager-managed).
			managerVisibility: { rule: 'force-public', reason: FLORIDA_REASON },
		};
	}

	if (key === 'wyoming') {
		return {
			membersVisibility: { rule: 'default-private', reason: WYOMING_REASON },
			managerVisibility: { rule: 'default-private', reason: WYOMING_REASON },
		};
	}

	if (key === 'delaware') {
		return {
			membersVisibility: { rule: 'default-private', reason: DELAWARE_REASON },
			managerVisibility: { rule: 'default-private', reason: DELAWARE_REASON },
		};
	}

	return DEFAULT_RULES;
}

/** True si la política bloquea el toggle (force-*). */
export function isLockedPolicy(policy: VisibilityPolicy): boolean {
	return policy.rule === 'force-public' || policy.rule === 'force-private';
}

/**
 * Valor booleano de "información pública" FORZADO por una política (force-*),
 * o `null` si no fuerza nada. El llamador debe bloquear el toggle.
 */
export function forcedPublicValue(policy: VisibilityPolicy): boolean | null {
	if (policy.rule === 'force-public') return true;
	if (policy.rule === 'force-private') return false;
	return null;
}

/**
 * Valor PRE-SELECCIONADO por una política (default-*), o `null` si no aplica.
 * El llamador lo usa como valor inicial pero deja que el cliente lo cambie.
 */
export function defaultPublicValue(policy: VisibilityPolicy): boolean | null {
	if (policy.rule === 'default-public') return true;
	if (policy.rule === 'default-private') return false;
	return null;
}

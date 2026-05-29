import { createContext, useContext } from 'react';

import { DEFAULT_RULES, type IncorporationRules } from './incorporation-rules';

/**
 * Contexto que expone las reglas de negocio derivadas del estado de
 * incorporación a cualquier step del formulario (StepMembers, StepManager…).
 */
const IncorporationRulesContext =
	createContext<IncorporationRules>(DEFAULT_RULES);

export const IncorporationRulesProvider = IncorporationRulesContext.Provider;

/** Hook para leer las reglas aplicables dentro de cualquier step. */
export function useIncorporationRules(): IncorporationRules {
	return useContext(IncorporationRulesContext);
}

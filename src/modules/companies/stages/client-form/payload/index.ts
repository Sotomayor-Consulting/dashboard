// Superficie pública del contrato de persistencia del formulario.
//
// La escritura SIEMPRE produce v2 (`toIncorporationFormPayload`). La lectura
// (`parseIncorporationFormPayload`) acepta v2 y v1 (compat). El resto del app
// importa desde aquí y no necesita saber la versión vigente.

export {
	INCORPORATION_FORM_VERSION,
	toIncorporationFormPayloadV2 as toIncorporationFormPayload,
	fromIncorporationFormPayloadV2,
	parseIncorporationFormPayload,
	validateIncorporationFormPayload,
	isDraftPayloadShape,
} from './v2';
export type { IncorporationFormPayloadV2, MemberV2, ManagerV2 } from './v2';

// Helpers version-agnósticos (operan sobre ClientFormData, no sobre el payload).
export { computeFormProgress, stepLabel } from './v1';

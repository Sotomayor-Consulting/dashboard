// Superficie pública del contrato de persistencia del formulario.

export {
	INCORPORATION_FORM_VERSION,
	toIncorporationFormPayloadV2 as toIncorporationFormPayload,
	fromIncorporationFormPayloadV2,
	parseIncorporationFormPayload,
	validateIncorporationFormPayload,
	isDraftPayloadShape,
	resolveManagerAddresses,
	computeFormProgress,
	stepLabel,
} from './incorporation-form-payload';
export type {
	CountryRefV2,
	IncorporationFormPayloadV2,
	MemberV2,
	ManagerV2,
} from './incorporation-form-payload';

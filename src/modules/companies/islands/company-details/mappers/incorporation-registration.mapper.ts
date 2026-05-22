import type {
	IncorporationRegistrationInput,
	UpdateIncorporationDetailsRequest,
} from '../schemas/incorporation-registration.schema';

export function mapIncorporationFormToUpdateRequest(
	empresaIncorporacionId: string,
	values: IncorporationRegistrationInput,
): UpdateIncorporationDetailsRequest {
	return {
		empresa_incorporacion_id: empresaIncorporacionId,
		name_option_1: values.nameOption1,
		name_option_2: values.nameOption2,
		name_option_3: values.nameOption3,
		business_type: values.businessType,
		state_id: values.stateId,
	};
}

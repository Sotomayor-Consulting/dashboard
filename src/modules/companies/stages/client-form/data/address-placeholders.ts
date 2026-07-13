// Placeholders estandarizados para los formularios de dirección.
//
// Convención inspirada en Stripe/Google/Airbnb: los placeholders son
// **idénticos en todos los formularios de dirección** del wizard (operativa,
// socio y manager) y sirven como **pista de formato**, no como ejemplo
// específico de un país.
//
// Reglas:
//  - Mismo texto sin importar el país elegido (sin condicionales `isUS`).
//  - Cortos y descriptivos del FORMATO esperado.
//  - Para selects de "acción" (`Selecciona…`) y para inputs de "formato"
//    (`Calle y número`).
//
// Un solo punto de edición para futuros ajustes de UX.

export const ADDRESS_PLACEHOLDERS = {
	country: 'Selecciona un país',
	line1: 'Calle y número',
	line2: 'Apartamento, suite, etc.',
	city: 'Ciudad',
	county: 'Condado',
	stateInput: 'Estado o provincia',
	stateSelect: 'Selecciona un estado',
	postalCode: 'Código postal',
} as const;

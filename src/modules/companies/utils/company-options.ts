export const BUSINESS_TYPES = [
	{ value: 'LLC', label: 'LLC' },
	{ value: 'C-corporation', label: 'C-Corporation' },
] as const;

export const PROCESS_STATES = [
	{ value: 'draft', label: 'Borrador' },
	{ value: 'active', label: 'Activo' },
	{ value: 'upgrade', label: 'Upgrade' },
] as const;

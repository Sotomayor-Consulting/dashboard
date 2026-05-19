import type { MaritalStatus } from '../types';

export interface MaritalStatusOption {
	value: Exclude<MaritalStatus, ''>;
	label: string;
}

export const MARITAL_STATUS_OPTIONS: readonly MaritalStatusOption[] = [
	{ value: 'single', label: 'Soltero/a' },
	{ value: 'married', label: 'Casado/a' },
	{ value: 'divorced', label: 'Divorciado/a' },
	{ value: 'widowed', label: 'Viudo/a' },
] as const;

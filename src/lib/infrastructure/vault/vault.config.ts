import type { VaultOptions } from 'node-vault';

export const vaultConfig: VaultOptions = {
	apiVersion: 'v1',
	endpoint: process.env.VAULT_ENDPOINT!,
	// Token se asigna dinámicamente vía AppRole login o desde env para dev
	...(process.env.VAULT_TOKEN ? { token: process.env.VAULT_TOKEN } : {}),
};

// AppRole credentials (producción)
export const APPROLE_CONFIG = {
	roleId: process.env.VAULT_ROLE_ID,
	secretId: process.env.VAULT_SECRET_ID,
} as const;

// Paths de secretos en Vault (KV v2)
// El prefijo "data" es requerido por KV v2 para lectura via API
export const SECRET_PATHS = {
	supabase: 'app-sci/data/production/supabase',
	smtp: 'app-sci/data/production/smtp',
	stripe: 'app-sci/data/production/stripe',
	integrations: 'app-sci/data/production/integrations',
} as const;

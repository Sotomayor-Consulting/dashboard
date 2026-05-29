import type { VaultOptions } from 'node-vault';

export const vaultConfig: VaultOptions = {
	apiVersion: 'v1',
	endpoint: process.env.VAULT_ENDPOINT!,
	token: process.env.VAULT_TOKEN!,
};

// Paths de secretos en Vault (KV v2 — dev mode usa secret/ por defecto)
export const SECRET_PATHS = {
	supabase: 'secret/data/dashboard/supabase',
	smtp: 'secret/data/dashboard/smtp',
	stripe: 'secret/data/dashboard/stripe',
	integrations: 'secret/data/dashboard/integrations',
} as const;

// Entrypoint de producción — carga secretos de Vault antes de arrancar Astro
// Soporta dos modos de auth:
//   - Dev:        VAULT_ENDPOINT + VAULT_TOKEN
//   - Producción: VAULT_ENDPOINT + VAULT_ROLE_ID + VAULT_SECRET_ID (AppRole)

const VAULT_ENDPOINT = process.env.VAULT_ENDPOINT;
const hasToken = !!process.env.VAULT_TOKEN;
const hasAppRole = !!(process.env.VAULT_ROLE_ID && process.env.VAULT_SECRET_ID);

if (VAULT_ENDPOINT && (hasToken || hasAppRole)) {
	const { loadSecretsIntoEnv } = await import(
		'./src/lib/infrastructure/vault/secrets-loader.ts'
	);
	await loadSecretsIntoEnv();
} else {
	console.warn(
		'[vault] Credenciales de Vault no definidas — arrancando sin Vault (modo local)',
	);
}

await import('./dist/server/entry.mjs');

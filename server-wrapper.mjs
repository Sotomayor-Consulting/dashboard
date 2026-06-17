// Entrypoint de producción — carga secretos de Vault antes de arrancar Astro
// Reemplaza `node server.mjs` por `node server-wrapper.mjs` en el Dockerfile CMD

const VAULT_ENDPOINT = process.env.VAULT_ENDPOINT;
const VAULT_TOKEN = process.env.VAULT_TOKEN;

if (VAULT_ENDPOINT && VAULT_TOKEN) {
	const { loadSecretsIntoEnv } = await import(
		'./src/lib/infrastructure/vault/secrets-loader.ts'
	);
	await loadSecretsIntoEnv();
} else {
	console.warn(
		'[vault] VAULT_ENDPOINT o VAULT_TOKEN no definidos — arrancando sin Vault (modo local)',
	);
}

await import('./dist/server/entry.mjs');

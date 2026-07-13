import vault from 'node-vault';
import { vaultConfig, APPROLE_CONFIG, SECRET_PATHS } from './vault.config.ts';
import { createLogger } from '../logging/logger.ts';

const log = createLogger('vault');

/**
 * Autentica con Vault vía AppRole y retorna un cliente con token válido.
 * Si VAULT_TOKEN está presente (dev mode), lo usa directamente.
 */
async function getAuthenticatedClient() {
	const client = vault(vaultConfig);

	// Dev mode: token estático desde .env
	if (process.env.VAULT_TOKEN) {
		log.info('Usando VAULT_TOKEN estático (dev mode)');
		return client;
	}

	// Producción: AppRole login
	const { roleId, secretId } = APPROLE_CONFIG;
	if (!roleId || !secretId) {
		throw new Error(
			'Vault: se requiere VAULT_TOKEN (dev) o VAULT_ROLE_ID + VAULT_SECRET_ID (producción)',
		);
	}

	log.info('Autenticando con Vault vía AppRole');
	const result = await client.approleLogin({
		role_id: roleId,
		secret_id: secretId,
	});

	client.token = result.auth.client_token;
	log.info('AppRole login exitoso', {
		policies: result.auth.policies,
		ttl: result.auth.lease_duration,
	});

	return client;
}

export async function loadSecretsIntoEnv(): Promise<void> {
	const client = await getAuthenticatedClient();

	await Promise.all(
		Object.values(SECRET_PATHS).map(async (path) => {
			try {
				const result = await client.read(path);
				// KV v2 anida los secretos bajo data.data
				const secrets: Record<string, string> =
					result.data?.data ?? result.data;
				for (const [key, value] of Object.entries(secrets)) {
					process.env[key] = value;
				}
			} catch (err: unknown) {
				const status = (err as { response?: { statusCode?: number } })
					?.response?.statusCode;
				if (status === 404) {
					log.warn('Path no encontrado (ignorado)', { path });
				} else {
					throw err;
				}
			}
		}),
	);
	log.info('Secretos cargados en process.env');
}

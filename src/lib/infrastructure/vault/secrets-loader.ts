import vault from 'node-vault';
import { vaultConfig, SECRET_PATHS } from './vault.config.ts';
import { createLogger } from '../logging/logger.ts';

const log = createLogger('vault');

export async function loadSecretsIntoEnv(): Promise<void> {
	const client = vault(vaultConfig);

	await Promise.all(
		Object.values(SECRET_PATHS).map(async (path) => {
			try {
				const result = await client.read(path);
				// KV v2 anida los secretos bajo data.data
				const secrets: Record<string, string> = result.data?.data ?? result.data;
				for (const [key, value] of Object.entries(secrets)) {
					process.env[key] = value;
				}
			} catch (err: unknown) {
				// En dev mode, paths que no existen aún no deben romper el startup
				const status = (err as { response?: { statusCode?: number } })?.response?.statusCode;
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

// Deploy script — lee PUBLIC_* de Vault y ejecuta docker compose build + up
// Uso: node --experimental-strip-types scripts/deploy.mjs [development|production]
//
// Requiere en el entorno (.env o exportadas):
//   VAULT_ENDPOINT + VAULT_TOKEN (dev) o VAULT_ROLE_ID + VAULT_SECRET_ID (prod)

import { config } from 'dotenv';
import { spawn } from 'child_process';

config();

const VAULT_ENV = process.argv[2] || process.env.VAULT_ENV || 'production';
process.env.VAULT_ENV = VAULT_ENV;

console.log(`[deploy] Entorno: ${VAULT_ENV}`);

const { loadSecretsIntoEnv } = await import(
	'../src/lib/infrastructure/vault/secrets-loader.ts'
);
await loadSecretsIntoEnv();

console.log('[deploy] Secretos cargados desde Vault');

const gitSha = process.env.GIT_SHA || 'dev';

// docker compose build — las PUBLIC_* se pasan via env (docker-compose.yml las lee como ${VAR})
// No necesitamos --build-arg porque docker-compose.yml ya las interpola desde el entorno
console.log('[deploy] Building Docker image...');

const build = spawn('docker', ['compose', 'build'], {
	stdio: 'inherit',
	shell: true,
	env: {
		...process.env,
		GIT_SHA: gitSha,
		VAULT_ENV,
	},
});

build.on('exit', (code) => {
	if (code !== 0) {
		console.error(`[deploy] Build failed (exit ${code})`);
		process.exit(code ?? 1);
	}

	console.log('[deploy] Starting container...');
	const up = spawn('docker', ['compose', 'up', '-d'], {
		stdio: 'inherit',
		shell: true,
		env: {
			...process.env,
			VAULT_ENV,
		},
	});

	up.on('exit', (upCode) => {
		if (upCode === 0) {
			console.log(`[deploy] Deployed (${VAULT_ENV})`);
		} else {
			console.error(`[deploy] docker compose up failed (exit ${upCode})`);
		}
		process.exit(upCode ?? 0);
	});
});

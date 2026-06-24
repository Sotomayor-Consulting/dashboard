// Arranca el dev server de Astro cargando secretos desde Vault primero
// Uso: node scripts/dev-with-vault.mjs

import { config } from 'dotenv';

// config() debe correr ANTES del import del secrets-loader
// porque vault.config.ts lee process.env.VAULT_ENDPOINT al importarse
config();

const { loadSecretsIntoEnv } = await import('../src/lib/infrastructure/vault/secrets-loader.ts');
import { spawn } from 'child_process';

await loadSecretsIntoEnv();

const dev = spawn('pnpm astro dev --host', { stdio: 'inherit', shell: true });

dev.on('exit', (code) => process.exit(code ?? 0));

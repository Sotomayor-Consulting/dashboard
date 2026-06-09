// src/lib/infrastructure/logging/logger.ts
// ─── Logger de aplicación (Winston) ─────────────────────
//
// IMPORTANTE: Solo servidor. Winston depende de APIs de Node (no debe
// importarse desde archivos `.client.ts`, islands `.tsx` ni scripts inline
// `.astro` — rompería el bundle de Vite). Para logs de cliente usar console.*.
//
// Uso recomendado (child logger con contexto, reemplaza el patrón `[tag]`):
//
//   import { createLogger } from '@infrastructure/logging';
//   const log = createLogger('webhook');
//   log.info('pago registrado', { paymentId });
//   log.error('handler error', { err });
//
// El campo `context` reemplaza los prefijos manuales tipo `[webhook]`.

import winston from 'winston';

const { combine, timestamp, errors, json, colorize, printf, splat } =
	winston.format;

// `import.meta.env` lo inyecta Vite/Astro en el bundle SSR, pero este módulo
// también puede cargarse desde scripts Node planos (p.ej. dev-with-vault.mjs)
// donde no existe → fallback a NODE_ENV.
const IS_PRODUCTION =
	import.meta.env?.PROD ?? process.env.NODE_ENV === 'production';

/**
 * Nivel por defecto: `info` en prod, `debug` en dev.
 * Override con la env var `LOG_LEVEL` (error|warn|info|http|verbose|debug|silly).
 */
const LEVEL =
	process.env.LOG_LEVEL ?? (IS_PRODUCTION ? 'info' : 'debug');

/**
 * Formato dev: legible y coloreado para la terminal.
 * `[timestamp] LEVEL [context]: message  { ...meta }`
 */
const devFormat = combine(
	colorize(),
	timestamp({ format: 'HH:mm:ss.SSS' }),
	errors({ stack: true }),
	splat(),
	printf((info) => {
		const { timestamp, level, message, context, stack, ...meta } = info;
		const tag = context ? ` [${context as string}]` : '';
		const rest = Object.keys(meta).length
			? `  ${JSON.stringify(meta)}`
			: '';
		const body = (stack as string) ?? (message as string);
		return `${timestamp as string} ${level}${tag}: ${body}${rest}`;
	}),
);

/**
 * Formato prod: JSON estructurado en stdout (lo recoge Docker/serverless).
 * Una línea por evento → fácil de parsear/indexar (Loki, CloudWatch, etc.).
 */
const prodFormat = combine(
	timestamp(),
	errors({ stack: true }),
	splat(),
	json(),
);

export const logger = winston.createLogger({
	level: LEVEL,
	format: IS_PRODUCTION ? prodFormat : devFormat,
	// Solo Console: en Docker el stdout es la fuente de logs canónica.
	transports: [new winston.transports.Console()],
	// No tumbar el proceso si un transport falla.
	exitOnError: false,
});

/**
 * Crea un child logger con un `context` fijo (reemplaza los prefijos `[tag]`).
 *
 * @example
 *   const log = createLogger('AuthService.register');
 *   log.error('Supabase error', { err });
 */
export function createLogger(context: string) {
	return logger.child({ context });
}

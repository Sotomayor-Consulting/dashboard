import axios, { type InternalAxiosRequestConfig } from 'axios';

const ALLOWED_ODOO_HOST = ['sotomayorconsulting.odoo.com'] as const;

type OdooConfig = {
	baseUrl: URL;
	apikey: string;
	odooUrl: URL;
};

let cachedConfig: OdooConfig | null = null;

function getEnvUrl(value: string | undefined, envName: string) {
	if (!value) {
		throw new Error(`Missing ${envName} environment variable`);
	}

	try {
		return new URL(value);
	} catch {
		throw new Error(`Invalid ${envName} environment variable`);
	}
}

function getOdooConfig(): OdooConfig {
	if (cachedConfig) {
		return cachedConfig;
	}

	const odooUrl = getEnvUrl(import.meta.env.ODOO_HOST_URL, 'ODOO_HOST_URL');

	if (
		!ALLOWED_ODOO_HOST.includes(
			odooUrl.hostname as (typeof ALLOWED_ODOO_HOST)[number],
		)
	) {
		throw new Error(`host not allowed: ${odooUrl.hostname}`);
	}

	const apikey = import.meta.env.ODOO_API_KEY;
	if (!apikey) {
		throw new Error('Missing ODOO_API_KEY environment variable');
	}

	cachedConfig = {
		baseUrl: getEnvUrl(
			import.meta.env.ODOO_BASE_API_URL,
			'ODOO_BASE_API_URL',
		),
		apikey,
		odooUrl,
	};

	return cachedConfig;
}

export const apiClient = axios.create({
	headers: { 'Content-Type': 'application/json' },
	timeout: 10_000,
});

// Interceptor para agregar la api key en cada solicitud
apiClient.interceptors.request.use(
	(requestConfig: InternalAxiosRequestConfig): InternalAxiosRequestConfig => {
		const config = getOdooConfig();
		requestConfig.baseURL = config.baseUrl.href;
		requestConfig.headers.Authorization = `Bearer ${config.apikey}`;
		return requestConfig;
	},
	(error: unknown) => {
		return Promise.reject(
			error instanceof Error ? error : new Error(String(error)),
		);
	},
);

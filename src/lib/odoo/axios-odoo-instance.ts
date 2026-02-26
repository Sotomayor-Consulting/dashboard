import axios, { type InternalAxiosRequestConfig } from 'axios';

const config = {
	base_url: new URL(import.meta.env.ODOO_BASE_API_URL),
	apikey: import.meta.env.ODOO_API_KEY,
    odoo_url: new URL(import.meta.env.ODOO_HOST_URL),
};
const ALLOWED_ODOO_HOST = ['sotomayorconsulting.odoo.com'] as const;

if (!ALLOWED_ODOO_HOST.includes(config.odoo_url.hostname as typeof ALLOWED_ODOO_HOST[number])) {
    throw new Error(`host not allowed: ${config.odoo_url.hostname}`);
}

// Todo: Habilitar esta validación cuando se tenga un entorno de desarrollo con https
// if (config.odoo_url.protocol !== 'https') {
//     throw new Error('the protocol must be https');
// }

export const apiClient = axios.create({
    baseURL: config.base_url.href,
    headers: {'Content-Type': 'application/json' },
    timeout: 10_000,
});

// Interceptor para agregar la api key en cada solicitud
apiClient.interceptors.request.use(
    (requestConfig: InternalAxiosRequestConfig): InternalAxiosRequestConfig => {
        requestConfig.headers.Authorization = `Bearer ${config.apikey}`;
        return requestConfig;
    },
    (error: unknown) => {
        return Promise.reject(error instanceof Error ? error : new Error(String(error)));
    }
);
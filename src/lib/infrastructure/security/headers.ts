export const SECURITY_HEADERS = {
    'Content-Type': 'application/json',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    'Cache-Control': 'no-store',
}

/**
 * Valida un parámetro de redirect para prevenir open redirects.
 * Solo permite rutas relativas que empiecen con "/" (no "//", no URLs absolutas).
 */
export function safeBack(raw: string | null | undefined, fallback: string): string {
    if (!raw) return fallback;
    const trimmed = raw.trim();
    if (trimmed.startsWith('/') && !trimmed.startsWith('//')) {
        return trimmed;
    }
    return fallback;

}
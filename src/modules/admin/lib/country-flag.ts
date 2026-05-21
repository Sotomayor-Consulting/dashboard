/**
 * Convierte un código ISO 3166-1 alpha-2 (ej. "US") al emoji bandera (🇺🇸).
 * Cada letra A–Z se mapea a su Regional Indicator Symbol (U+1F1E6..U+1F1FF).
 *
 * Devuelve null si el iso es inválido (longitud != 2 o caracteres no A–Z).
 */
export function isoToFlag(iso: string | null | undefined): string | null {
	if (!iso) return null;
	const code = iso.trim().toUpperCase();
	if (code.length !== 2 || !/^[A-Z]{2}$/.test(code)) return null;
	const offset = 0x1f1e6 - 'A'.charCodeAt(0);
	return String.fromCodePoint(
		code.charCodeAt(0) + offset,
		code.charCodeAt(1) + offset,
	);
}

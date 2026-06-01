export function safeJsonParse<T = Record<string, unknown>>(
  raw: unknown,
  fallback: T,
): T {
  if (typeof raw !== 'string' || !raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function formatDate(raw: unknown): string {
  if (!raw) return '';
  const date = new Date(String(raw));
  if (Number.isNaN(date.getTime())) return String(raw);
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  const year = date.getUTCFullYear();
  return `${month}/${day}/${year}`;
}

export function formatName(first?: unknown, last?: unknown): string {
  const parts = [String(first ?? '').trim(), String(last ?? '').trim()].filter(Boolean);
  return parts.length > 0 ? parts.join(' ').toUpperCase() : '';
}

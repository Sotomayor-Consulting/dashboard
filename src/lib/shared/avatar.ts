import type { SupabaseClient } from '@supabase/supabase-js';

const BUCKET = 'public-assets';

const NULL_VALUES = new Set(['NULL', 'null', '', undefined]);

export function getAvatarUrl(
	path: string | null | undefined,
	supabase?: SupabaseClient,
): string | null {
	if (!path || NULL_VALUES.has(path)) return null;
	if (path.startsWith('http://') || path.startsWith('https://')) return path;
	if (supabase) {
		const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
		return data.publicUrl;
	}
	return path;
}

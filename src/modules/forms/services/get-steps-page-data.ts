import type { SupabaseClient } from '@supabase/supabase-js';

export async function getStepsPageData(
	supabase: SupabaseClient,
): Promise<{ estados: { Estado: string }[] }> {
	const { data: estados } = await supabase
		.from('estados')
		.select('Estado');

	return { estados: estados ?? [] };
}

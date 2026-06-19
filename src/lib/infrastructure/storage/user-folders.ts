import type { SupabaseClient } from '@supabase/supabase-js';

export const getUserFolders = async (
	supabase: SupabaseClient,
	userId: string,
	empresaId: string,
) => {
	const path = `${userId}/companies/${empresaId}/documents`;
	const { data, error } = await supabase.storage.from('documents').list(path, {
		limit: 100,
		offset: 0,
		sortBy: { column: 'created_at', order: 'desc' },
	});

	if (error) throw error;
	return data;
};

import { supabase } from '@lib/supabase';

export const getUserFolders = async (userId: string, empresaId: string) => {
	const path = `${userId}/companies/${empresaId}/documents`;
	const { data, error } = await supabase.storage.from('test').list(path, {
		limit: 100,
		offset: 0,
		sortBy: { column: 'created_at', order: 'desc' },
	});

	if (error) throw error;
	return data;
};

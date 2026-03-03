import { createClient } from '@supabase/supabase-js';

const supabaseBrowser = createClient(
	import.meta.env.PUBLIC_SUPABASE_URL!,
	import.meta.env.PUBLIC_SUPABASE_ANON_KEY!,
	{
		auth: {
			persistSession: true,
			autoRefreshToken: true,
		},
	}
);

export const getSignedUrlClient = async (path: string) => {
	const { data, error } = await supabaseBrowser.storage
		.from('test')
		.createSignedUrl(path, 3600);

	if (error) throw error;
	return data.signedUrl;
};

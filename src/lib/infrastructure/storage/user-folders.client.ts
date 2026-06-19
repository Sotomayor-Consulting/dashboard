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
	const { data: { session } } = await supabaseBrowser.auth.getSession();
	console.log('Session:', session);
	
	const { data, error } = await supabaseBrowser.storage
		.from('documents')
		.createSignedUrl(path, 3600);

	if (error) {
		console.error('Storage error:', error);
		throw error;
	}
	return data.signedUrl;
};

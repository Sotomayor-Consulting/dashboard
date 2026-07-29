// src/lib/supabase/browser.ts
// ─── Cliente Supabase para el browser (singleton via @supabase/ssr) ─────
import { createBrowserClient } from '@supabase/ssr';

export const supabaseBrowser = createBrowserClient(
	import.meta.env.PUBLIC_SUPABASE_URL!,
	import.meta.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
	{
		isSingleton: true,
		global: {
			headers: {},
		},
		realtime: { params: { eventsPerSecond: 10 } },
	},
);

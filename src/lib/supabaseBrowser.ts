// src/lib/supabaseBrowser.ts
import { createClient } from '@supabase/supabase-js'

export const supabaseBrowser = createClient(
  import.meta.env.SUPABASE_URL!,
  import.meta.env.SUPABASE_ANON_KEY!,
  {
    auth: {
      persistSession: true, // o false si prefieres no usar localStorage
      autoRefreshToken: true,
    },
    realtime: { params: { eventsPerSecond: 10 } }
  }
)

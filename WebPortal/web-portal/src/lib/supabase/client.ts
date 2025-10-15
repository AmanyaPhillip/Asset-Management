import { createClientComponentClient } from '@supabase/supabase-js'
import { createClient } from '@supabase/supabase-js'

export const supabase = createClientComponentClient()

// Server-side client with service role
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)
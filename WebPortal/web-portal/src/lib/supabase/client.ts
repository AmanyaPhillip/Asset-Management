'use client'

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { createClient } from '@supabase/supabase-js'

// ✅ Client-side Supabase client (safe for browser)
export const supabase = createClientComponentClient()

// ✅ Server-side Supabase admin client (guarded to run only on server)
export const supabaseAdmin =
  typeof window === 'undefined'
    ? createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false,
          },
        }
      )
    : null

// ✅ Debug logging for verification (won’t expose keys)
if (typeof window === 'undefined') {
  console.log('✅ Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)
  console.log(
    '✅ SUPABASE_SERVICE_ROLE_KEY exists:',
    !!process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.warn('⚠️ SUPABASE_SERVICE_ROLE_KEY is not set! Admin operations will fail.')
  }
}

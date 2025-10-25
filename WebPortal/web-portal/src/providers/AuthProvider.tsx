// src/providers/AuthProvider.tsx
'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'

interface User {
  id: string
  phone_number?: string
  email?: string
  full_name?: string
  role: string
  phone_verified?: boolean
  whatsapp_verified?: boolean
}

interface AuthContextType {
  user: User | null
  loading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signOut: async () => {},
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    validateSession()
  }, [])

  const validateSession = async () => {
    try {
      // Get session token from localStorage
      const sessionToken = localStorage.getItem('session_token')
      
      if (!sessionToken) {
        setLoading(false)
        return
      }

      // Validate session with database
      const { data: session, error } = await supabase
        .from('user_sessions')
        .select(`
          id,
          user_id,
          expires_at,
          users (*)
        `)
        .eq('token', sessionToken)
        .gte('expires_at', new Date().toISOString())
        .single()

      if (error || !session) {
        // Invalid or expired session
        console.error('Invalid session:', error)
        localStorage.removeItem('session_token')
        setUser(null)
        setLoading(false)
        return
      }

      // Update last_used_at
      await supabase
        .from('user_sessions')
        .update({ last_used_at: new Date().toISOString() })
        .eq('token', sessionToken)

      // Set user from session
      setUser(session.users as any)
      setLoading(false)
    } catch (err) {
      console.error('Session validation error:', err)
      localStorage.removeItem('session_token')
      setUser(null)
      setLoading(false)
    }
  }

  const signOut = async () => {
    try {
      const sessionToken = localStorage.getItem('session_token')
      
      if (sessionToken) {
        // Delete session from database
        await supabase
          .from('user_sessions')
          .delete()
          .eq('token', sessionToken)
      }

      // Clear local storage
      localStorage.removeItem('session_token')
      setUser(null)
      
      // Redirect to login
      window.location.href = '/login'
    } catch (err) {
      console.error('Sign out error:', err)
      // Force logout even if error
      localStorage.removeItem('session_token')
      setUser(null)
      window.location.href = '/login'
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
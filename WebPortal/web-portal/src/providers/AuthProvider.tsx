// =====================================================
// Updated Auth Provider - WhatsApp/Phone Based
// File: src/providers/AuthProvider.tsx
// =====================================================

'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'

type User = {
  id: string
  phone_number: string
  full_name: string | null
  role: string
  phone_verified: boolean
}

type AuthContextType = {
  user: User | null
  loading: boolean
  refreshUser: () => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  refreshUser: async () => {},
  signOut: async () => {},
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkUser()
  }, [])

  const checkUser = async () => {
    try {
      // Check if there's a user_id in cookies (set by magic link or OTP verification)
      const response = await fetch('/api/auth/session')
      
      if (response.ok) {
        const data = await response.json()
        if (data.user) {
          setUser(data.user)
        }
      }
    } catch (error) {
      console.error('Error checking user session:', error)
    } finally {
      setLoading(false)
    }
  }

  const refreshUser = async () => {
    await checkUser()
  }

  const signOut = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      setUser(null)
      window.location.href = '/login'
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, refreshUser, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
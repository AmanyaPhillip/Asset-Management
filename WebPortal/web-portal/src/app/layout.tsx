// =====================================================
// PART 2: Update Root Layout with Auth Provider
// File: src/app/layout.tsx (UPDATE)
// =====================================================

import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import Navbar from '@/components/layout/Navbar'
import { AuthProvider } from '@/providers/AuthProvider'
import { Toaster } from '@/components/ui/sonner'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Personal Asset Management',
  description: 'Manage rentals and fleet effortlessly',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const isDevelopment = process.env.NODE_ENV === 'development'

  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          {isDevelopment && (
            <div className="bg-yellow-500 text-black text-center py-2 font-bold">
              ⚠️ DEVELOPMENT MODE - NOT FOR PRODUCTION USE
            </div>
          )}
          <Navbar />
          <main className="min-h-screen bg-gray-50">
            {children}
          </main>
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  )
}
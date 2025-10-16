// =====================================================
// Updated Navbar - WhatsApp Auth
// File: src/components/layout/Navbar.tsx
// =====================================================

'use client'

import Link from 'next/link'
import { useAuth } from '@/providers/AuthProvider'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Home, Building2, Car, BookOpen, User, LogOut, MessageSquare, Phone } from 'lucide-react'

export default function Navbar() {
  const { user, signOut } = useAuth()

  return (
    <nav className="border-b bg-white sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <Link href="/" className="flex items-center space-x-2">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <Home className="w-6 h-6 text-white" />
            </div>
            <span className="font-semibold text-xl hidden sm:block">Davidzo's Rentals</span>
          </Link>

          <div className="hidden md:flex space-x-8">
            <Link href="/properties" className="flex items-center space-x-2 text-gray-700 hover:text-blue-600 transition">
              <Building2 className="w-5 h-5" />
              <span>Properties</span>
            </Link>
            <Link href="/vehicles" className="flex items-center space-x-2 text-gray-700 hover:text-blue-600 transition">
              <Car className="w-5 h-5" />
              <span>Vehicles</span>
            </Link>
            {user && (
              <Link href="/bookings" className="flex items-center space-x-2 text-gray-700 hover:text-blue-600 transition">
                <BookOpen className="w-5 h-5" />
                <span>My Bookings</span>
              </Link>
            )}
          </div>

          <div className="flex items-center space-x-4">
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="flex items-center space-x-2">
                    <Phone className="w-4 h-4 text-green-600" />
                    <span className="hidden sm:inline">
                      {user.full_name || user.phone_number}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="px-2 py-2 border-b">
                    <p className="text-sm font-medium">{user.full_name}</p>
                    <p className="text-xs text-gray-500 flex items-center gap-1">
                      <MessageSquare className="w-3 h-3 text-green-600" />
                      {user.phone_number}
                    </p>
                  </div>
                  <DropdownMenuItem asChild>
                    <Link href="/bookings" className="w-full cursor-pointer">
                      <BookOpen className="w-4 h-4 mr-2" />
                      My Bookings
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => signOut()}
                    className="cursor-pointer text-red-600"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Link href="/login">
                <Button className="bg-green-600 hover:bg-green-700">
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Login with WhatsApp
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}
// =====================================================
// Authentication Middleware
// File: src/middleware.ts
// =====================================================

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const userId = request.cookies.get('user_id')?.value
  const pathname = request.nextUrl.pathname

  // Protected routes that require authentication
  const protectedRoutes = ['/bookings', '/report']
  const isProtectedRoute = protectedRoutes.some(route => 
    pathname.startsWith(route)
  )

  // Redirect to login if accessing protected route without authentication
  if (isProtectedRoute && !userId) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Redirect to bookings if accessing login page while authenticated
  if (pathname === '/login' && userId) {
    return NextResponse.redirect(new URL('/bookings', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/bookings/:path*',
    '/report/:path*',
    '/login',
  ],
}
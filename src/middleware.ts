/*
 * Filename: src/middleware.ts
 * Purpose: Implements Supabase session management middleware.
 * Change History:
 * C005 - 2025-09-03 : 15:00 - Definitive version for Supabase SSR.
 */
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options })
          response = NextResponse.next({
            request: { headers: request.headers },
          })
          response.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: '', ...options })
          response = NextResponse.next({
            request: { headers: request.headers },
          })
          response.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Define all pages that are accessible to the public
  const publicPaths = [
    '/',
    '/login',
    '/signup',
    '/refer',
    '/contact',
    '/terms-of-service',
    '/privacy-policy',
    '/forgot-password',
  ];

  // Check if the current request path is for a public page or a public agent profile
  const isPublicPath = 
    publicPaths.includes(request.nextUrl.pathname) ||
    request.nextUrl.pathname.startsWith('/agents/') ||
    request.nextUrl.pathname.startsWith('/contact-agent');

  // If the user is not logged in and the path is not public, redirect to the login page.
  if (!user && !isPublicPath) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return response
}

export const config = {
  // This matcher is inspired by your Clerk configuration.
  // It runs on all request paths EXCEPT for:
  // - /api/ routes
  // - /auth/ routes (for Google sign-in, etc.)
  // - /_next/static (static files)
  // - /_next/image (image optimization files)
  // - /favicon.ico (favicon file)
  matcher: [
    '/((?!api|auth|_next/static|_next/image|favicon.ico).*)',
  ],
}
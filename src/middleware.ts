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

  // --- THIS IS THE DEFINITIVE FIX ---
  // Define all public paths that do not require a login.
  const publicPaths = ['/', '/login', '/signup', '/contact', '/terms-of-service', '/privacy-policy', '/refer']

  // Check if the current path is a public path. This also handles agent profile pages (e.g., /agents/A1-...).
  const isPublicPath = 
    publicPaths.includes(request.nextUrl.pathname) ||
    request.nextUrl.pathname.startsWith('/agents/');


  // If the user is not logged in and is trying to access a non-public path,
  // redirect them to the login page.
  if (!user && !isPublicPath) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico|api/auth).*)',
  ],
}

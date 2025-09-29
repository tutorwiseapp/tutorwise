import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Define routes that require authentication
  const protectedRoutes = [
    '/dashboard',
    '/profile',
    '/settings',
    '/payments',
    '/referral-activities',
    '/transaction-history',
    '/become-provider',
    '/agents',
    '/claim-rewards'
  ]

  // Define routes that should bypass onboarding check
  const onboardingRoutes = [
    '/onboarding',
    '/onboarding/client'
  ]

  // Define public routes that don't require authentication
  const publicRoutes = [
    '/',
    '/login',
    '/signup',
    '/forgot-password',
    '/auth/callback',
    '/api',
    '/contact',
    '/privacy-policy',
    '/terms-of-service',
    '/resources'
  ]

  // Skip middleware for public routes, static files, and API routes
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.includes('.') ||
    publicRoutes.some(route => pathname === route || pathname.startsWith(`${route}/`))
  ) {
    return NextResponse.next()
  }

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
        set(name: string, value: string, options: any) {
          request.cookies.set({
            name,
            value,
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: any) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  // Check authentication for protected routes
  if (protectedRoutes.some(route => pathname.startsWith(route))) {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    // Redirect to login if not authenticated
    if (!user) {
      return NextResponse.redirect(new URL(`/login?redirect=${pathname}`, request.url))
    }

    // For authenticated users, check onboarding status (except for onboarding routes)
    if (!onboardingRoutes.some(route => pathname.startsWith(route))) {
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('onboarding_progress')
          .eq('id', user.id)
          .single()

        // If user needs onboarding, redirect to onboarding page
        const needsOnboarding = !profile?.onboarding_progress?.onboarding_completed

        if (needsOnboarding) {
          console.log(`Middleware: Redirecting ${pathname} to onboarding - completion required`)
          return NextResponse.redirect(new URL('/onboarding', request.url))
        }
      } catch (error) {
        console.error('Middleware: Error checking onboarding status:', error)
        // On error, allow through but user will be handled by client-side protection
      }
    }
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
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
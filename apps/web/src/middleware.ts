// apps/web/src/middleware.ts

import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Redirect /my-profile to /profile for backward compatibility
  if (pathname === '/my-profile') {
    return NextResponse.redirect(new URL('/profile', request.url))
  }

  // Redirect legacy /tutor/[id]/[slug] to new /listings/[id]/[slug] (v4.1)
  const tutorRouteMatch = pathname.match(/^\/tutor\/([^/]+)(?:\/([^/]+))?$/);
  if (tutorRouteMatch) {
    const [, id, slug] = tutorRouteMatch;
    const newPath = slug ? `/listings/${id}/${slug}` : `/listings/${id}`;
    return NextResponse.redirect(new URL(newPath, request.url), 301); // Permanent redirect for SEO
  }

  // Define routes that require authentication
  const protectedRoutes = [
    '/dashboard',
    '/messages',
    '/profile',
    '/settings',
    '/payments',
    '/referral-activities',
    '/transaction-history',
    '/become-provider',
    '/agents',
    '/claim-rewards',
  ]

  // Define routes that should bypass onboarding check
  const onboardingRoutes = [
    '/onboarding',
    '/onboarding/client',
    '/onboarding/tutor',
    '/onboarding/agent'
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

        const progress = profile?.onboarding_progress
        const needsOnboarding = !progress?.onboarding_completed

        if (needsOnboarding) {
          // Auto-save feature: Resume from where user left off
          const currentStep = progress?.current_step
          let redirectUrl = '/onboarding'

          // If user has progress, append step parameter to resume from correct position
          if (currentStep && currentStep !== 'welcome') {
            redirectUrl = `/onboarding?step=${currentStep}`
            console.log(`Middleware: Resuming onboarding from step: ${currentStep}`)
          } else {
            console.log(`Middleware: Starting fresh onboarding flow`)
          }

          console.log(`Middleware: Redirecting ${pathname} to ${redirectUrl}`)
          return NextResponse.redirect(new URL(redirectUrl, request.url))
        }
      } catch (error) {
        console.error('Middleware: Error checking onboarding status:', error)
        // CRITICAL: On database error, redirect to onboarding to be safe
        // This ensures onboarding enforcement even if middleware DB calls fail
        console.log(`Middleware: Database error - redirecting ${pathname} to onboarding for safety`)
        return NextResponse.redirect(new URL('/onboarding', request.url))
      }
    }
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
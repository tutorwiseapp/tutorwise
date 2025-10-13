import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { OnboardingProgress } from './types'

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
          // Ensure cookies work across redirects with proper options
          const cookieOptions = {
            ...options,
            sameSite: 'lax' as const,
            secure: process.env.NODE_ENV === 'production',
            path: '/',
          }
          request.cookies.set({
            name,
            value,
            ...cookieOptions,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value,
            ...cookieOptions,
          })
        },
        remove(name: string, options: any) {
          const cookieOptions = {
            ...options,
            maxAge: 0,
            path: '/',
          }
          request.cookies.set({
            name,
            value: '',
            ...cookieOptions,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value: '',
            ...cookieOptions,
          })
        },
      },
    }
  )

  // Refresh session if expired - important for server-side rendering
  try {
    await supabase.auth.getSession()
  } catch (error) {
    console.error('Middleware session refresh error:', error)
  }

  // Check authentication for protected routes
  if (protectedRoutes.some(route => pathname.startsWith(route))) {
    const {
      data: { session },
    } = await supabase.auth.getSession()

    const user = session?.user

    // Redirect to login if not authenticated
    if (!user) {
      return NextResponse.redirect(new URL(`/login?redirect=${pathname}`, request.url))
    }

    // For authenticated users, check onboarding status (except for onboarding routes)
    if (!onboardingRoutes.some(route => pathname.startsWith(route))) {
      const onboardingProgress = session?.user?.user_metadata?.onboarding_progress as OnboardingProgress
      const needsOnboarding = !onboardingProgress?.onboarding_completed

      if (needsOnboarding) {
        try {
          const { data: profile } = await supabase
            .from('profiles')
            .select('onboarding_progress')
            .eq('id', user.id)
            .single()

          const progress = profile?.onboarding_progress
          const isCompleted = progress?.onboarding_completed

          if (!isCompleted) {
            const currentStep = progress?.current_step
            let redirectUrl = '/onboarding'

            if (currentStep && currentStep !== 'welcome') {
              redirectUrl = `/onboarding?step=${currentStep}`
            }

            return NextResponse.redirect(new URL(redirectUrl, request.url))
          } else {
            // Update the session with the latest onboarding status
            await supabase.auth.updateUser({
              data: {
                ...session.user.user_metadata,
                onboarding_progress: progress
              }
            })
          }
        } catch (error) {
          console.error('Middleware: Error checking onboarding status:', error)
          return NextResponse.redirect(new URL('/onboarding', request.url))
        }
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
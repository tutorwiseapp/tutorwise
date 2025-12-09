// apps/web/src/middleware.ts

import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Redirect legacy routes to new Account Hub (v4.7)
  if (pathname === '/my-profile' || pathname === '/profile') {
    return NextResponse.redirect(new URL('/account', request.url))
  }

  // Redirect legacy /settings to /account/settings (v4.8)
  if (pathname === '/settings') {
    return NextResponse.redirect(new URL('/account/settings', request.url))
  }

  // v5.7: Track wiselist referrals (/w/[slug])
  // Store wiselist owner's profile_id in cookie for booking attribution
  const wiselistMatch = pathname.match(/^\/w\/([^/]+)$/);
  if (wiselistMatch) {
    const [, slug] = wiselistMatch;

    // Create Supabase client to fetch wiselist owner
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value
          },
          set() {},
          remove() {},
        },
      }
    );

    try {
      const { data: wiselist } = await supabase
        .from('wiselists')
        .select('profile_id')
        .eq('slug', slug)
        .eq('visibility', 'public')
        .single();

      if (wiselist) {
        // Set cookie with wiselist referrer for 30 days
        const response = NextResponse.next();
        response.cookies.set('wiselist_referrer_id', wiselist.profile_id, {
          maxAge: 30 * 24 * 60 * 60, // 30 days
          path: '/',
          sameSite: 'lax',
        });
        return response;
      }
    } catch (error) {
      console.error('Wiselist tracking error:', error);
      // Continue even if tracking fails
    }
  }

  // Define routes that require authentication
  const protectedRoutes = [
    '/dashboard',
    '/messages',
    '/account',
    '/payments',
    '/referral-activities',
    '/transaction-history',
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
    '/resources',
    '/marketplace',
    '/listings',
    '/public-profile',
    '/w'
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
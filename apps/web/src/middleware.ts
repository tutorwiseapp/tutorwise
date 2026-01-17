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

  // Revenue Signal: Track distribution parameter (?d=dist_id)
  // Set signal_id cookie for journey tracking across sessions
  const distributionId = request.nextUrl.searchParams.get('d');
  if (distributionId && (pathname.startsWith('/blog') || pathname.startsWith('/tutor') || pathname.startsWith('/listings'))) {
    const response = NextResponse.next();
    const signalId = `dist_${distributionId}`;
    const expires = new Date();
    expires.setDate(expires.getDate() + 7); // 7-day attribution window

    // Set signal_id cookie (main tracking ID)
    response.cookies.set('tw_signal_id', signalId, {
      path: '/',
      expires,
      sameSite: 'lax',
      httpOnly: false, // Allow client-side JavaScript access
    });

    // Set distribution_id cookie (for metadata)
    response.cookies.set('tw_distribution_id', distributionId, {
      path: '/',
      expires,
      sameSite: 'lax',
      httpOnly: false,
    });

    return response;
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

  // Track organisation referrals (/join/[slug]?ref=CODE)
  // Store referral data in cookie for attribution during booking
  const REFERRAL_COOKIE_NAME = 'tutorwise_referral';
  const REFERRAL_COOKIE_MAX_AGE = 30 * 24 * 60 * 60; // 30 days in seconds

  if (pathname.startsWith('/join/')) {
    const orgReferralCode = request.nextUrl.searchParams.get('ref');
    const orgSlug = pathname.split('/join/')[1]?.split('/')[0];

    if (orgReferralCode && orgSlug) {
      const referralData = JSON.stringify({
        type: 'org_member',
        code: orgReferralCode,
        organisationSlug: orgSlug,
        timestamp: new Date().toISOString(),
      });

      const response = NextResponse.next();
      response.cookies.set(REFERRAL_COOKIE_NAME, referralData, {
        maxAge: REFERRAL_COOKIE_MAX_AGE,
        path: '/',
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
      });
      return response;
    }
  }

  // Track individual referrals (/a/[code])
  if (pathname.startsWith('/a/')) {
    const individualCode = pathname.split('/a/')[1]?.split('/')[0];

    if (individualCode) {
      const referralData = JSON.stringify({
        type: 'individual',
        code: individualCode,
        timestamp: new Date().toISOString(),
      });

      const response = NextResponse.next();
      response.cookies.set(REFERRAL_COOKIE_NAME, referralData, {
        maxAge: REFERRAL_COOKIE_MAX_AGE,
        path: '/',
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
      });
      return response;
    }
  }

  // Define routes that require authentication
  const protectedRoutes = [
    '/dashboard',
    '/messages',
    '/account',
    '/payments',
    '/referrals',
    '/listings',
    '/bookings',
    '/organisation',
    '/financials',
    '/network',
    '/reviews',
    '/wiselists',
    '/my-students',
    '/developer',
    '/admin', // Admin dashboard requires authentication + admin role check
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

    // Admin dashboard access control
    if (pathname.startsWith('/admin')) {
      try {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('is_admin, admin_role')
          .eq('id', user.id)
          .single()

        if (profileError) {
          console.error('Middleware: Error fetching profile:', profileError)
          return NextResponse.redirect(new URL('/dashboard?error=unauthorized', request.url))
        }

        // Check if user has admin access
        if (!profile?.is_admin) {
          console.log(`Middleware: User ${user.id} attempted to access admin dashboard without admin privileges`)
          // Redirect to dashboard with error message
          return NextResponse.redirect(new URL('/dashboard?error=unauthorized', request.url))
        }

        // Update last admin access timestamp
        await supabase
          .from('profiles')
          .update({ last_admin_access: new Date().toISOString() })
          .eq('id', user.id)

        console.log(`Middleware: Admin ${profile.admin_role} ${user.id} accessing ${pathname}`)
      } catch (error) {
        console.error('Middleware: Error checking admin access:', error)
        // On error, deny access for security
        return NextResponse.redirect(new URL('/dashboard?error=unauthorized', request.url))
      }
    }

    // For authenticated users, check onboarding status (except for onboarding routes and admin routes)
    if (!onboardingRoutes.some(route => pathname.startsWith(route)) && !pathname.startsWith('/admin')) {
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
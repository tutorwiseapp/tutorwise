/*
 * Filename: src/app/api/bookings/route.ts
 * Purpose: Provides GET and POST endpoints for booking management (SDD v3.6)
 * Created: 2025-11-02
 * Specification: SDD v3.6, Sections 8.4, 11.2
 * Change Summary: New API endpoints for the /bookings hub
 */
import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';
import { incrementListingBookings } from '@/lib/api/listings';
import { sendBookingRequestEmail, type BookingEmailData } from '@/lib/email-templates/booking';

// Mark route as dynamic (required for cookies() in Next.js 15)
export const dynamic = 'force-dynamic';

/**
 * GET /api/bookings
 * Fetches bookings for the authenticated user based on their active role
 * Query params: status (optional) - filters by booking status
 */
export async function GET(req: Request) {
  const supabase = await createClient();

  try {
    // 1. Authenticate user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // 2. Get user's profile to determine active role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, active_role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return new NextResponse("Profile not found", { status: 404 });
    }

    // 3. Parse query parameters
    const { searchParams } = new URL(req.url);
    const statusFilter = searchParams.get('status');
    const schedulingStatusFilter = searchParams.get('scheduling_status');

    // 4. Build query based on active role (migrations 049 & 051)
    let query = supabase
      .from('bookings')
      .select(`
        *,
        client:profiles!client_id(id, full_name, avatar_url),
        tutor:profiles!tutor_id(id, full_name, avatar_url),
        listing:listings!listing_id(id, title),
        agent:profiles!agent_id(id, full_name)
      `);

    // Role-based filtering (SDD v3.6, Section 8.4) (migration 049: student_id → client_id)
    const activeRole = profile.active_role;

    if (activeRole === 'client') {
      query = query.eq('client_id', user.id);
    } else if (activeRole === 'tutor') {
      query = query.eq('tutor_id', user.id);
    } else if (activeRole === 'agent') {
      // Agent sees all bookings where they are involved
      // This requires OR logic, so we'll handle it differently (migrations 049 & 051)
      const { data: agentBookings, error: agentError } = await supabase
        .from('bookings')
        .select(`
          *,
          client:profiles!client_id(id, full_name, avatar_url),
          tutor:profiles!tutor_id(id, full_name, avatar_url),
          listing:listings!listing_id(id, title),
          agent:profiles!agent_id(id, full_name)
        `)
        .or(`client_id.eq.${user.id},tutor_id.eq.${user.id},agent_id.eq.${user.id}`);

      if (agentError) throw agentError;

      // Apply filters if provided
      let filteredBookings = agentBookings || [];
      if (statusFilter) {
        filteredBookings = filteredBookings.filter(b => b.status === statusFilter);
      }
      if (schedulingStatusFilter) {
        filteredBookings = filteredBookings.filter(b => b.scheduling_status === schedulingStatusFilter);
      }

      return NextResponse.json({ bookings: filteredBookings });
    }

    // Apply filters for client/tutor
    if (statusFilter) {
      query = query.eq('status', statusFilter);
    }
    if (schedulingStatusFilter) {
      query = query.eq('scheduling_status', schedulingStatusFilter);
    }

    // 5. Execute query
    const { data: bookings, error: bookingsError } = await query.order('created_at', { ascending: false });

    if (bookingsError) throw bookingsError;

    return NextResponse.json({ bookings: bookings || [] });

  } catch (error) {
    console.error("API GET /api/bookings error:", error);
    console.error("Error details:", JSON.stringify(error, Object.getOwnPropertyNames(error)));
    return new NextResponse(JSON.stringify({ error: error instanceof Error ? error.message : 'Internal Server Error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

/**
 * POST /api/bookings
 * Creates a new booking with payment_status: 'Pending'
 * Body: { tutor_id, listing_id, service_name, session_start_time, session_duration, amount }
 */
export async function POST(req: Request) {
  const supabase = await createClient();

  try {
    // 1. Authenticate user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // 2. Get user's profile to check referred_by_profile_id for lifetime attribution (migration 028)
    // Also get referrer's active_role for referrer_role field (migration 132)
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, referred_by_profile_id, referrer:profiles!referred_by_profile_id(active_role)')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return new NextResponse("Profile not found", { status: 404 });
    }

    // 3. Parse request body
    const body = await req.json();
    const {
      tutor_id,
      listing_id,
      service_name,
      session_start_time,
      session_duration,
      amount
    } = body;

    // 4. Validate required fields (listing_id is optional for direct profile bookings)
    if (!tutor_id || !service_name || !session_start_time || !session_duration || !amount) {
      return new NextResponse("Missing required fields", { status: 400 });
    }

    // 4.5. Fetch listing to validate availability and get snapshot fields (migrations 104, 108)
    // Only fetch listing if listing_id is provided (listing bookings)
    let listing = null;
    if (listing_id) {
      const { data: listingData, error: listingError } = await supabase
        .from('listings')
        .select('availability, timezone, status, subjects, levels, delivery_mode, location_city, hourly_rate, slug, free_trial, available_free_help')
        .eq('id', listing_id)
        .single();

      if (listingError || !listingData) {
        return new NextResponse("Listing not found", { status: 404 });
      }

      // Check if listing is published
      if (listingData.status !== 'published') {
        return NextResponse.json({ error: "Listing is not available for booking" }, { status: 400 });
      }

      listing = listingData;
    }

    // Validate availability if listing has availability data
    if (listing && listing.availability && Object.keys(listing.availability).length > 0) {
      const requestedStartTime = new Date(session_start_time);
      const requestedEndTime = new Date(requestedStartTime.getTime() + session_duration * 60000);

      // Get day of week (lowercase to match availability keys)
      const dayOfWeek = requestedStartTime.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();

      // Get time in HH:MM format
      const requestedStartHHMM = requestedStartTime.toTimeString().slice(0, 5);
      const requestedEndHHMM = requestedEndTime.toTimeString().slice(0, 5);

      // Check if day has any availability
      const dayAvailability = listing.availability[dayOfWeek];

      if (!dayAvailability || dayAvailability.length === 0) {
        return new NextResponse(
          JSON.stringify({
            error: "Tutor is not available on this day",
            available_days: Object.keys(listing.availability)
          }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }

      // Check if requested time falls within any available slot
      let isAvailable = false;
      for (const slot of dayAvailability) {
        // Check if requested time overlaps with available slot
        if (requestedStartHHMM >= slot.start && requestedEndHHMM <= slot.end) {
          isAvailable = true;
          break;
        }
      }

      if (!isAvailable) {
        return new NextResponse(
          JSON.stringify({
            error: "Requested time is not within tutor's available hours",
            available_slots: dayAvailability
          }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }
    }

    // Check for conflicting bookings
    const { data: existingBookings, error: conflictError } = await supabase
      .from('bookings')
      .select('session_start_time, session_duration')
      .eq('tutor_id', tutor_id)
      .in('status', ['Pending', 'Confirmed'])
      .gte('session_start_time', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()); // Check bookings from last 24h

    if (conflictError) {
      console.error("Error checking booking conflicts:", conflictError);
    } else if (existingBookings && existingBookings.length > 0) {
      const requestedStart = new Date(session_start_time).getTime();
      const requestedEnd = requestedStart + session_duration * 60000;

      for (const booking of existingBookings) {
        const bookingStart = new Date(booking.session_start_time).getTime();
        const bookingEnd = bookingStart + booking.session_duration * 60000;

        // Check if times overlap
        if (
          (requestedStart >= bookingStart && requestedStart < bookingEnd) ||
          (requestedEnd > bookingStart && requestedEnd <= bookingEnd) ||
          (requestedStart <= bookingStart && requestedEnd >= bookingEnd)
        ) {
          return new NextResponse(
            JSON.stringify({
              error: "This time slot conflicts with an existing booking",
              conflicting_time: booking.session_start_time
            }),
            {
              status: 409,
              headers: { 'Content-Type': 'application/json' }
            }
          );
        }
      }
    }

    // 5. Create booking with agent_id from client's profile and snapshot fields
    // (SDD v3.6, Section 11.2 - Lifetime Attribution) (migrations 049 & 051, 104, 108, 132, 133)

    // Determine booking_type based on agent_id (migration 049)
    // - 'direct': No referrer (agent_id is NULL)
    // - 'referred': Client was referred by someone (agent_id is set)
    const booking_type = profile.referred_by_profile_id ? 'referred' : 'direct';

    // Get referrer's role if they exist (migration 132)
    const referrer_role = profile.referrer?.[0]?.active_role || null;

    const bookingData: any = {
      client_id: user.id,
      tutor_id,
      listing_id: listing_id || null, // null for direct profile bookings
      agent_id: profile.referred_by_profile_id, // Lifetime attribution from profiles.referred_by_profile_id (migration 028) - This drives commission split
      referrer_role, // migration 132: Role of referrer at booking time
      booking_type, // migration 049: Referral attribution status
      booking_source: listing_id ? 'listing' : 'profile', // migration 133: Track booking source
      service_name,
      session_start_time,
      session_duration,
      amount,
      status: 'Pending',
      payment_status: 'Pending',
    };

    // Add snapshot fields from listing if available (migrations 104, 108, 233)
    if (listing) {
      bookingData.subjects = listing.subjects;
      bookingData.levels = listing.levels;
      // delivery_mode: listing has array, booking needs single value - take first or from body
      bookingData.delivery_mode = body.delivery_mode || (listing.delivery_mode?.[0] as 'online' | 'in_person' | 'hybrid');
      bookingData.location_city = listing.location_city;
      bookingData.hourly_rate = listing.hourly_rate;
      bookingData.listing_slug = listing.slug;
      bookingData.free_trial = listing.free_trial || false;
      bookingData.available_free_help = listing.available_free_help || false;
    }

    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .insert(bookingData)
      .select()
      .single();

    if (bookingError) throw bookingError;

    // 6. Increment listing booking count (migration 103) - only if listing_id exists
    if (listing_id) {
      await incrementListingBookings(listing_id);
    }

    // 7. Send booking request email to tutor (async - don't block response)
    // Fetch tutor and client profile data for email
    const { data: tutorProfile } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', tutor_id)
      .single();

    const { data: clientProfile } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', user.id)
      .single();

    if (tutorProfile?.email && clientProfile?.email) {
      const emailData: BookingEmailData = {
        bookingId: booking.id,
        serviceName: service_name,
        sessionDate: new Date(session_start_time),
        sessionDuration: session_duration,
        amount: amount,
        subjects: listing?.subjects,
        deliveryMode: booking.delivery_mode,
        locationCity: listing?.location_city,
        tutorName: tutorProfile.full_name || 'Tutor',
        tutorEmail: tutorProfile.email,
        clientName: clientProfile.full_name || 'Client',
        clientEmail: clientProfile.email,
        bookingType: booking_type,
      };

      // Send email asynchronously (don't await to avoid blocking)
      sendBookingRequestEmail(emailData)
        .then(() => console.log('[Booking API] Request email sent to tutor:', tutorProfile.email))
        .catch((err) => console.error('[Booking API] Failed to send request email:', err));
    }

    return NextResponse.json({ booking }, { status: 201 });

  } catch (error) {
    console.error("API POST /api/bookings error:", error);
    console.error("Error details:", JSON.stringify(error, Object.getOwnPropertyNames(error)));
    return new NextResponse(JSON.stringify({ error: error instanceof Error ? error.message : 'Internal Server Error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

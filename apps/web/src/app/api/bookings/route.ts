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

      // Apply status filter if provided
      let filteredBookings = agentBookings || [];
      if (statusFilter) {
        filteredBookings = filteredBookings.filter(b => b.status === statusFilter);
      }

      return NextResponse.json({ bookings: filteredBookings });
    }

    // Apply status filter for client/tutor
    if (statusFilter) {
      query = query.eq('status', statusFilter);
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
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, referred_by_profile_id')
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

    // 4. Validate required fields
    if (!tutor_id || !listing_id || !service_name || !session_start_time || !session_duration || !amount) {
      return new NextResponse("Missing required fields", { status: 400 });
    }

    // 4.5. Fetch listing to validate availability and get snapshot fields (migrations 104, 108)
    const { data: listing, error: listingError } = await supabase
      .from('listings')
      .select('availability, timezone, status, subjects, levels, location_type, location_city, hourly_rate, slug, free_trial, available_free_help')
      .eq('id', listing_id)
      .single();

    if (listingError || !listing) {
      return new NextResponse("Listing not found", { status: 404 });
    }

    // Check if listing is published
    if (listing.status !== 'published') {
      return NextResponse.json({ error: "Listing is not available for booking" }, { status: 400 });
    }

    // Validate availability if listing has availability data
    if (listing.availability && Object.keys(listing.availability).length > 0) {
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
    // (SDD v3.6, Section 11.2 - Lifetime Attribution) (migrations 049 & 051, 104, 108)
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .insert({
        client_id: user.id,
        tutor_id,
        listing_id,
        agent_id: profile.referred_by_profile_id, // Lifetime attribution from profiles.referred_by_profile_id (migration 028) - This drives commission split
        service_name,
        session_start_time,
        session_duration,
        amount,
        status: 'Pending',
        payment_status: 'Pending',
        // Snapshot fields from listing (migrations 104, 108)
        subjects: listing.subjects,
        levels: listing.levels,
        location_type: listing.location_type,
        location_city: listing.location_city,
        hourly_rate: listing.hourly_rate,
        listing_slug: listing.slug,
        free_trial: listing.free_trial || false,
        available_free_help: listing.available_free_help || false,
      })
      .select()
      .single();

    if (bookingError) throw bookingError;

    // 6. Increment listing booking count (migration 103)
    await incrementListingBookings(listing_id);

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

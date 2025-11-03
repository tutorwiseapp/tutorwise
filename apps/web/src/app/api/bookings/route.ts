/*
 * Filename: src/app/api/bookings/route.ts
 * Purpose: Provides GET and POST endpoints for booking management (SDD v3.6)
 * Created: 2025-11-02
 * Specification: SDD v3.6, Sections 8.4, 11.2
 * Change Summary: New API endpoints for the /bookings hub
 */
import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

/**
 * GET /api/bookings
 * Fetches bookings for the authenticated user based on their active role
 * Query params: status (optional) - filters by booking status
 */
export async function GET(req: Request) {
  const supabase = createClient();

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

    // 4. Build query based on active role
    let query = supabase
      .from('bookings')
      .select(`
        *,
        student:student_id(id, full_name, avatar_url),
        tutor:tutor_id(id, full_name, avatar_url),
        listing:listing_id(id, title),
        referrer:referrer_profile_id(id, full_name)
      `);

    // Role-based filtering (SDD v3.6, Section 8.4)
    const activeRole = profile.active_role;

    if (activeRole === 'client') {
      query = query.eq('student_id', user.id);
    } else if (activeRole === 'tutor') {
      query = query.eq('tutor_id', user.id);
    } else if (activeRole === 'agent') {
      // Agent sees all bookings where they are involved
      // This requires OR logic, so we'll handle it differently
      const { data: agentBookings, error: agentError } = await supabase
        .from('bookings')
        .select(`
          *,
          student:student_id(id, full_name, avatar_url),
          tutor:tutor_id(id, full_name, avatar_url),
          listing:listing_id(id, title),
          referrer:referrer_profile_id(id, full_name)
        `)
        .or(`student_id.eq.${user.id},tutor_id.eq.${user.id},referrer_profile_id.eq.${user.id}`);

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
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

/**
 * POST /api/bookings
 * Creates a new booking with payment_status: 'Pending'
 * Body: { tutor_id, listing_id, service_name, session_start_time, session_duration, amount }
 */
export async function POST(req: Request) {
  const supabase = createClient();

  try {
    // 1. Authenticate user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // 2. Get user's profile to check referred_by_profile_id
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

    // 5. Create booking with referrer_profile_id from client's profile
    // (SDD v3.6, Section 11.2 - Lifetime Attribution)
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .insert({
        student_id: user.id,
        tutor_id,
        listing_id,
        referrer_profile_id: profile.referred_by_profile_id, // This drives commission split
        service_name,
        session_start_time,
        session_duration,
        amount,
        status: 'Pending',
        payment_status: 'Pending'
      })
      .select()
      .single();

    if (bookingError) throw bookingError;

    return NextResponse.json({ booking }, { status: 201 });

  } catch (error) {
    console.error("API POST /api/bookings error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

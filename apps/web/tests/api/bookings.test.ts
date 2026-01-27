/**
 * @jest-environment node
 *
 * Filename: tests/api/bookings.test.ts
 * Purpose: Smoke test for POST /api/bookings endpoint
 * Created: 2025-11-02
 * Specification: SDD v3.6, Section 8.4 - Critical write path validation
 */
import { POST } from '@/app/api/bookings/route';
import { createClient } from '@/utils/supabase/server';
import { NextRequest } from 'next/server';

// Mock Supabase
jest.mock('@/utils/supabase/server', () => ({
  createClient: jest.fn(),
}));

// Mock incrementListingBookings function (migration 103)
jest.mock('@/lib/api/listings', () => ({
  incrementListingBookings: jest.fn().mockResolvedValue(undefined),
}));

// Mock email templates to prevent actual email sending in tests
jest.mock('@/lib/email-templates/booking', () => ({
  sendBookingRequestEmail: jest.fn().mockResolvedValue({ success: true }),
}));

describe('POST /api/bookings', () => {
  let mockSupabase: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mock Supabase client
    mockSupabase = {
      auth: {
        getUser: jest.fn(),
      },
      from: jest.fn(() => mockSupabase),
      select: jest.fn(() => mockSupabase),
      eq: jest.fn(() => mockSupabase),
      in: jest.fn(() => mockSupabase),
      gte: jest.fn(() => mockSupabase),
      single: jest.fn(),
      insert: jest.fn(() => mockSupabase),
    };

    (createClient as jest.Mock).mockReturnValue(mockSupabase);
  });

  it('should create a Pending booking with correct attributes', async () => {
    const mockUserId = '11111111-1111-1111-1111-111111111111';
    const mockTutorId = '22222222-2222-2222-2222-222222222222';
    const mockListingId = '33333333-3333-3333-3333-333333333333';
    const mockReferrerId = '44444444-4444-4444-4444-444444444444';
    const mockBookingId = '55555555-5555-5555-5555-555555555555';

    // Mock authenticated user
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: mockUserId } },
      error: null,
    });

    // Mock profile fetch (with agent referral) - first .single() call (migration 051)
    mockSupabase.single.mockResolvedValueOnce({
      data: { referred_by_profile_id: mockReferrerId },
      error: null,
    });

    // Mock listing fetch - second .single() call (to validate availability + snapshot fields migrations 104, 108)
    mockSupabase.single.mockResolvedValueOnce({
      data: {
        id: mockListingId,
        status: 'published',
        availability: {},
        // Snapshot fields (migrations 104, 108)
        subjects: ['Mathematics'],
        levels: ['GCSE'],
        location_type: 'online',
        location_city: null,
        hourly_rate: 50,
        slug: 'gcse-maths-tutoring',
        free_trial: false,
        available_free_help: false,
      },
      error: null,
    });

    // Mock existing bookings check (to prevent double booking) - .gte() is the terminal call
    mockSupabase.gte.mockResolvedValueOnce({
      data: [],
      error: null,
    });

    // Mock booking creation - third .single() call (after insert().select())
    mockSupabase.single.mockResolvedValueOnce({
      data: {
        id: mockBookingId,
        client_id: mockUserId, // Updated from student_id (migration 049)
        tutor_id: mockTutorId,
        listing_id: mockListingId,
        agent_id: mockReferrerId, // Updated from referrer_profile_id (migration 051, 052)
        service_name: 'GCSE Mathematics Tutoring',
        session_start_time: '2025-12-01T10:00:00Z',
        session_duration: 60,
        amount: 50,
        status: 'Pending',
        payment_status: 'Pending',
      },
      error: null,
    });

    // Mock tutor profile fetch for email - fourth .single() call
    mockSupabase.single.mockResolvedValueOnce({
      data: { full_name: 'Test Tutor', email: 'tutor@test.com' },
      error: null,
    });

    // Mock client profile fetch for email - fifth .single() call
    mockSupabase.single.mockResolvedValueOnce({
      data: { full_name: 'Test Client', email: 'client@test.com' },
      error: null,
    });

    // Create request
    const requestBody = {
      tutor_id: mockTutorId,
      listing_id: mockListingId,
      service_name: 'GCSE Mathematics Tutoring',
      session_start_time: '2025-12-01T10:00:00Z',
      session_duration: 60,
      amount: 50,
    };

    const request = new NextRequest('http://localhost:3000/api/bookings', {
      method: 'POST',
      body: JSON.stringify(requestBody),
    });

    // Execute
    const response = await POST(request);
    const result = await response.json();

    // Assertions
    expect(response.status).toBe(201);
    expect(result.booking).toBeDefined();
    expect(result.booking.status).toBe('Pending');
    expect(result.booking.payment_status).toBe('Pending');
    expect(result.booking.agent_id).toBe(mockReferrerId);
    expect(result.booking.amount).toBe(50);

    // Verify insert was called with correct data (migrations 049 & 051, 052)
    expect(mockSupabase.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        client_id: mockUserId,
        tutor_id: mockTutorId,
        listing_id: mockListingId,
        agent_id: mockReferrerId, // Updated from referrer_profile_id (migration 051, 052)
        status: 'Pending',
        payment_status: 'Pending',
      })
    );
  });

  it('should create booking without agent_id if user was not referred', async () => {
    const mockUserId = '11111111-1111-1111-1111-111111111111';
    const mockTutorId = '22222222-2222-2222-2222-222222222222';
    const mockListingId = '33333333-3333-3333-3333-333333333333';
    const mockBookingId = '55555555-5555-5555-5555-555555555555';

    // Mock authenticated user
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: mockUserId } },
      error: null,
    });

    // Mock profile fetch (NO agent referral) - first .single() call (migration 051)
    mockSupabase.single.mockResolvedValueOnce({
      data: { referred_by_profile_id: null },
      error: null,
    });

    // Mock listing fetch - second .single() call (to validate availability + snapshot fields migrations 104, 108)
    mockSupabase.single.mockResolvedValueOnce({
      data: {
        id: mockListingId,
        status: 'published',
        availability: {},
        // Snapshot fields (migrations 104, 108)
        subjects: ['Mathematics'],
        levels: ['GCSE'],
        location_type: 'online',
        location_city: null,
        hourly_rate: 50,
        slug: 'gcse-maths-tutoring',
        free_trial: false,
        available_free_help: false,
      },
      error: null,
    });

    // Mock existing bookings check (to prevent double booking) - .gte() is the terminal call
    mockSupabase.gte.mockResolvedValueOnce({
      data: [],
      error: null,
    });

    // Mock booking creation - third .single() call (after insert().select())
    mockSupabase.single.mockResolvedValueOnce({
      data: {
        id: mockBookingId,
        client_id: mockUserId, // Updated from student_id (migration 049)
        tutor_id: mockTutorId,
        listing_id: mockListingId,
        agent_id: null, // NO AGENT REFERRAL (migration 051, 052)
        service_name: 'GCSE Mathematics Tutoring',
        session_start_time: '2025-12-01T10:00:00Z',
        session_duration: 60,
        amount: 50,
        status: 'Pending',
        payment_status: 'Pending',
      },
      error: null,
    });

    // Mock tutor profile fetch for email - fourth .single() call
    mockSupabase.single.mockResolvedValueOnce({
      data: { full_name: 'Test Tutor', email: 'tutor@test.com' },
      error: null,
    });

    // Mock client profile fetch for email - fifth .single() call
    mockSupabase.single.mockResolvedValueOnce({
      data: { full_name: 'Test Client', email: 'client@test.com' },
      error: null,
    });

    // Create request
    const requestBody = {
      tutor_id: mockTutorId,
      listing_id: mockListingId,
      service_name: 'GCSE Mathematics Tutoring',
      session_start_time: '2025-12-01T10:00:00Z',
      session_duration: 60,
      amount: 50,
    };

    const request = new NextRequest('http://localhost:3000/api/bookings', {
      method: 'POST',
      body: JSON.stringify(requestBody),
    });

    // Execute
    const response = await POST(request);
    const result = await response.json();

    // Assertions
    expect(response.status).toBe(201);
    expect(result.booking.agent_id).toBeNull();

    // Verify insert was called with null agent (migration 051, 052)
    expect(mockSupabase.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        agent_id: null,
      })
    );
  });

  it('should return 401 if user is not authenticated', async () => {
    // Mock no user
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: null,
    });

    const request = new NextRequest('http://localhost:3000/api/bookings', {
      method: 'POST',
      body: JSON.stringify({ listing_id: 'test' }),
    });

    const response = await POST(request);

    expect(response.status).toBe(401);
  });

  it('should create booking without listing_id for direct profile bookings', async () => {
    const mockUserId = '11111111-1111-1111-1111-111111111111';
    const mockBookingId = 'booking-123';

    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: mockUserId } },
      error: null,
    });

    // Mock profile fetch - first .single() call
    mockSupabase.single.mockResolvedValueOnce({
      data: { id: mockUserId, referred_by_profile_id: null },
      error: null,
    });

    // No listing fetch needed for profile bookings (listing_id is null)

    // Mock existing bookings check - .gte() is the terminal call
    mockSupabase.gte.mockResolvedValueOnce({
      data: [],
      error: null,
    });

    // Mock booking insert().select().single() chain - second .single() call
    mockSupabase.single.mockResolvedValueOnce({
      data: {
        id: mockBookingId,
        client_id: mockUserId,
        tutor_id: '22222222-2222-2222-2222-222222222222',
        listing_id: null, // Profile booking has no listing
        service_name: 'Test Service',
        session_start_time: '2025-12-01T10:00:00Z',
        session_duration: 60,
        amount: 50,
        status: 'Pending',
        payment_status: 'Pending',
      },
      error: null,
    });

    // Mock tutor profile fetch for email - third .single() call
    mockSupabase.single.mockResolvedValueOnce({
      data: { full_name: 'Test Tutor', email: 'tutor@test.com' },
      error: null,
    });

    // Mock client profile fetch for email - fourth .single() call
    mockSupabase.single.mockResolvedValueOnce({
      data: { full_name: 'Test Client', email: 'client@test.com' },
      error: null,
    });

    const request = new NextRequest('http://localhost:3000/api/bookings', {
      method: 'POST',
      body: JSON.stringify({
        tutor_id: '22222222-2222-2222-2222-222222222222',
        service_name: 'Test Service',
        session_start_time: '2025-12-01T10:00:00Z',
        session_duration: 60,
        amount: 50,
        // No listing_id for direct profile booking
      }),
    });

    const response = await POST(request);

    expect(response.status).toBe(201);
    const data = await response.json();
    expect(data.booking.listing_id).toBeNull();
  });
});

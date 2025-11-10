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

    // Mock profile fetch (with referrer) - first .single() call
    mockSupabase.single.mockResolvedValueOnce({
      data: { referred_by_profile_id: mockReferrerId },
      error: null,
    });

    // Mock booking creation - second .single() call (after insert().select())
    mockSupabase.single.mockResolvedValueOnce({
      data: {
        id: mockBookingId,
        client_id: mockUserId, // Updated from student_id (migration 049)
        tutor_id: mockTutorId,
        listing_id: mockListingId,
        referrer_profile_id: mockReferrerId,
        service_name: 'GCSE Mathematics Tutoring',
        session_start_time: '2025-12-01T10:00:00Z',
        session_duration: 60,
        amount: 50,
        status: 'Pending',
        payment_status: 'Pending',
      },
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
    expect(result.booking.referrer_profile_id).toBe(mockReferrerId);
    expect(result.booking.amount).toBe(50);

    // Verify insert was called with correct data (migration 049: student_id → client_id)
    expect(mockSupabase.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        client_id: mockUserId,
        tutor_id: mockTutorId,
        listing_id: mockListingId,
        referrer_profile_id: mockReferrerId,
        status: 'Pending',
        payment_status: 'Pending',
      })
    );
  });

  it('should create booking without referrer_profile_id if user was not referred', async () => {
    const mockUserId = '11111111-1111-1111-1111-111111111111';
    const mockTutorId = '22222222-2222-2222-2222-222222222222';
    const mockListingId = '33333333-3333-3333-3333-333333333333';
    const mockBookingId = '55555555-5555-5555-5555-555555555555';

    // Mock authenticated user
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: mockUserId } },
      error: null,
    });

    // Mock profile fetch (NO referrer) - first .single() call
    mockSupabase.single.mockResolvedValueOnce({
      data: { referred_by_profile_id: null },
      error: null,
    });

    // Mock booking creation - second .single() call (after insert().select())
    mockSupabase.single.mockResolvedValueOnce({
      data: {
        id: mockBookingId,
        client_id: mockUserId, // Updated from student_id (migration 049)
        tutor_id: mockTutorId,
        listing_id: mockListingId,
        referrer_profile_id: null, // NO REFERRER
        service_name: 'GCSE Mathematics Tutoring',
        session_start_time: '2025-12-01T10:00:00Z',
        session_duration: 60,
        amount: 50,
        status: 'Pending',
        payment_status: 'Pending',
      },
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
    expect(result.booking.referrer_profile_id).toBeNull();

    // Verify insert was called with null referrer
    expect(mockSupabase.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        referrer_profile_id: null,
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

  it('should return 400 if listing_id is missing', async () => {
    const mockUserId = '11111111-1111-1111-1111-111111111111';

    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: mockUserId } },
      error: null,
    });

    // Mock profile fetch
    mockSupabase.single.mockResolvedValueOnce({
      data: { referred_by_profile_id: null },
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
        // Missing listing_id!
      }),
    });

    const response = await POST(request);

    expect(response.status).toBe(400);
  });
});

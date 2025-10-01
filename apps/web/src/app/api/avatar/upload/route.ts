/*
 * Filename: src/app/api/avatar/upload/route.ts
 * Purpose: Provides a secure endpoint for uploading user profile pictures.
 * Change History:
 * C003 - 2025-09-02 : 19:00 - Migrated to use Supabase server client for authentication.
 * Last Modified: 2025-09-02 : 19:00
 * Requirement ID: VIN-AUTH-MIG-05
 * Change Summary: This API route has been fully migrated to Supabase Auth. It now uses the `createClient` from `@/utils/supabase/server` to securely get the user's session from their cookie.
 */
import { put } from '@vercel/blob';
import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function POST(request: Request): Promise<NextResponse> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const filename = searchParams.get('filename');

  if (!filename || !request.body) {
    return new NextResponse('Bad request: Missing filename or body', { status: 400 });
  }

  try {
    const blob = await put(filename, request.body, {
      access: 'public',
    });
    
    return NextResponse.json(blob);
  } catch (error) {
    console.error("Error uploading avatar:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
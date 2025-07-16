import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/superbaseClient'; // Correct import path

// --- THIS IS THE FIX ---
// The type for the second argument is now correctly defined.
export async function GET(
  req: NextRequest,
  { params }: { params: { agent_id: string } }
) {
  const { agent_id } = params;
  const destinationUrl = req.nextUrl.searchParams.get('u');

  if (!destinationUrl) {
    return NextResponse.redirect(new URL('/?error=missing_destination', req.url));
  }
  
  // Use the robust IP address logic you provided.
  const ipAddress = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || '';

  // Create the object to insert into the database
  const clickEventData = {
    agent_id: agent_id,
    destination_url: destinationUrl,
    ip_address: ipAddress,
    user_agent: req.headers.get('user-agent'),
    channel_origin: req.nextUrl.searchParams.get('channel_origin'),
  };

  try {
    const { error } = await supabase
      .from('ClickLog')
      .insert([clickEventData]);

    if (error) {
      throw error;
    }

    console.log(`--- Click Event INSERTED into Supabase for Agent: ${agent_id} ---`);

  } catch (error) {
    console.error('Supabase Error: Failed to log click event.', error);
  }

  // Redirect the seeker to their intended destination
  return NextResponse.redirect(destinationUrl);
}
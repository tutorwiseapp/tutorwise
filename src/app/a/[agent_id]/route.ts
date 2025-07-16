import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

// No longer need to define our own RouteContext interface

type RouteParams = {
  params: {
    agent_id: string;
  }
}

// --- THIS IS THE FIX ---
// We use the new, correct type for the second argument.
export async function GET(req: NextRequest, { params }: RouteParams) {
  const { agent_id } = params;
  const destinationUrl = req.nextUrl.searchParams.get('u');

  if (!destinationUrl) {
    return NextResponse.redirect(new URL('/?error=missing_destination', req.url));
  }
  
  const ipAddress = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || '';

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

  return NextResponse.redirect(destinationUrl);
}
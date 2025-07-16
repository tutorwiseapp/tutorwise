import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

// This is the most standard, canonical signature for an App Router dynamic route.
// We are explicitly typing the 'params' object within the function's second argument.
export async function GET(
  request: NextRequest, 
  { params }: { params: { agent_id: string } }
) {
  const { agent_id } = params;
  const destinationUrl = request.nextUrl.searchParams.get('u');

  if (!destinationUrl) {
    return NextResponse.redirect(new URL('/?error=missing_destination', request.url));
  }
  
  const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '';

  const clickEventData = {
    agent_id: agent_id,
    destination_url: destinationUrl,
    ip_address: ipAddress,
    user_agent: request.headers.get('user-agent'),
    channel_origin: request.nextUrl.searchParams.get('channel_origin'),
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
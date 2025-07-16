import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
 
interface RouteContext {
  params: {
    agent_id: string;
  }
}

export async function GET(req: NextRequest, context: RouteContext) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  const { agent_id } = context.params;
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
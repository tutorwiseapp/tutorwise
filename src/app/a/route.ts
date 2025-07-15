// app/a/[agent_id]/route.ts

import { NextRequest, NextResponse } from 'next/server';
// In a real application, your database client (e.g., pg, node-postgres, or an ORM like Kysely/Prisma)
// would be initialized in a separate utility file, like '@/lib/db'.
// For now, we will assume a placeholder 'db' object.
// import { db } from '@/lib/db'; 

export async function GET(
  req: NextRequest,
  { params }: { params: { agent_id: string } }
) {
  const { agent_id } = params;
  const destinationUrl = req.nextUrl.searchParams.get('u');

  // --- Step 1: Validate Request ---
  // As per spec 5.2, we must validate the destination.
  if (!destinationUrl) {
    // Redirect to an error page or the homepage if the destination is missing.
    return NextResponse.redirect(new URL('/?error=missing_destination', req.url));
  }
  // A basic security check. A real app would have a more robust blocklist.
  if (destinationUrl.includes('evil-site.com')) {
    return new Response('Destination is blocked for security reasons.', { status: 400 });
  }

  // --- Step 2: Log Metadata ---
  // This fulfills the "Track Event" requirement from spec 5.2.
  const clickEvent = {
    agent_id: agent_id,
    destination_url: destinationUrl,
    ip_address: req.ip, // Vercel provides the IP address
    user_agent: req.headers.get('user-agent'),
    channel_origin: req.nextUrl.searchParams.get('channel_origin'), // e.g., ?channel_origin=whatsapp
  };
  
  try {
    // This is where you would insert the event into your PostgreSQL database.
    // Example with a hypothetical ORM:
    // await db.insertInto('ClickLog').values(clickEvent).execute();
    
    // For now, we will log to the console to confirm the data is captured.
    console.log('--- Click Event Logged ---');
    console.log(clickEvent);

  } catch (error) {
    console.error('Database Error: Failed to log click event.', error);
    // Important: The redirect should still happen even if logging fails,
    // to ensure a seamless user experience for the Seeker.
  }

  // --- Step 3: Redirect ---
  // Immediately send the Seeker to their intended destination.
  return NextResponse.redirect(destinationUrl);
}
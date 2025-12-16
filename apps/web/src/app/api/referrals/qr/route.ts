/**
 * API Route: Generate QR Code for Referral Links
 * Patent Reference: Dependent Claim 4 (QR Code Generation)
 * Purpose: Enable offline partnerships (coffee shops, schools, physical flyers)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import QRCode from 'qrcode';

export async function GET(request: NextRequest) {
  const supabase = await createClient();

  // Get authenticated user
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Get user's referral code
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('referral_code')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
  }

  // Parse query parameters
  const size = parseInt(request.nextUrl.searchParams.get('size') || '300');
  const format = request.nextUrl.searchParams.get('format') || 'png'; // png, svg, dataURL
  const redirect = request.nextUrl.searchParams.get('redirect') || '/';

  // Build referral URL
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://tutorwise.io';
  const referralUrl = `${baseUrl}/a/${profile.referral_code}${redirect !== '/' ? `?redirect=${encodeURIComponent(redirect)}` : ''}`;

  try {
    if (format === 'svg') {
      const svg = await QRCode.toString(referralUrl, {
        type: 'svg',
        width: size,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      });

      return new NextResponse(svg, {
        headers: {
          'Content-Type': 'image/svg+xml',
          'Cache-Control': 'public, max-age=3600',
        },
      });
    } else if (format === 'dataURL') {
      const dataURL = await QRCode.toDataURL(referralUrl, {
        width: size,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      });

      return NextResponse.json({ dataURL, referralUrl });
    } else {
      // PNG format (default)
      const buffer = await QRCode.toBuffer(referralUrl, {
        width: size,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      });

      return new NextResponse(buffer as any, {
        headers: {
          'Content-Type': 'image/png',
          'Cache-Control': 'public, max-age=3600',
        },
      });
    }
  } catch (error) {
    console.error('QR code generation error:', error);
    return NextResponse.json({ error: 'Failed to generate QR code' }, { status: 500 });
  }
}

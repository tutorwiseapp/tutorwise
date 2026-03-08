import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  return NextResponse.redirect(
    new URL(req.url.replace('/api/process-studio/', '/api/workflow/')),
    307
  );
}



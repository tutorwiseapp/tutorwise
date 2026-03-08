import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  return NextResponse.redirect(
    new URL(req.url.replace('/api/admin/process-studio/', '/api/admin/workflow/')),
    307
  );
}



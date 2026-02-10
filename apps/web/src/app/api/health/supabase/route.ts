import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({
        status: 'error',
        message: 'Supabase configuration missing',
        timestamp: Date.now(),
        details: 'Environment variables not configured'
      }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Simple connectivity test - check if we can connect and run a basic query
    const startTime = Date.now();
    const { data: _data, error } = await supabase
      .from('profiles')
      .select('count', { count: 'exact', head: true })
      .limit(1);

    const responseTime = Date.now() - startTime;

    if (error) {
      return NextResponse.json({
        status: 'error',
        message: `Supabase connection failed: ${error.message}`,
        timestamp: Date.now(),
        responseTime,
        details: error.message
      }, { status: 503 });
    }

    return NextResponse.json({
      status: 'ok',
      message: 'Supabase database is healthy',
      timestamp: Date.now(),
      responseTime,
      details: {
        connected: true,
        queryExecuted: true,
        environment: process.env.NODE_ENV || 'development'
      }
    });

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({
      status: 'error',
      message: `Supabase health check failed: ${message}`,
      timestamp: Date.now(),
      details: message
    }, { status: 500 });
  }
}
import { NextResponse } from 'next/server';

export async function GET() {
  const startTime = Date.now();
  const healthChecks: Record<string, any> = {};
  let overallStatus = 'ok';
  const baseUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://tutorwise.io';

  try {
    // 1. Check Supabase
    try {
      const supabaseResponse = await fetch(`${baseUrl}/api/health/supabase`, {
        method: 'GET',
        headers: { 'Cache-Control': 'no-cache' }
      });
      const supabaseData = await supabaseResponse.json();
      healthChecks.supabase = supabaseData;
      if (supabaseData.status !== 'ok') overallStatus = 'degraded';
    } catch (error) {
      healthChecks.supabase = {
        status: 'error',
        message: 'Supabase health check failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      };
      overallStatus = 'error';
    }

    // 2. Check Railway Backend
    try {
      const railwayResponse = await fetch('https://tutorwise-railway-backend-production.up.railway.app/health', {
        method: 'GET',
        headers: { 'Cache-Control': 'no-cache' },
        signal: AbortSignal.timeout(5000) // 5 second timeout
      });
      const railwayData = await railwayResponse.json();
      healthChecks.railway = {
        status: railwayResponse.ok ? 'ok' : 'error',
        message: railwayResponse.ok ? 'Railway backend is healthy' : 'Railway backend error',
        details: railwayData,
        responseTime: Date.now() - startTime
      };
      if (!railwayResponse.ok) overallStatus = 'degraded';
    } catch (error) {
      healthChecks.railway = {
        status: 'error',
        message: 'Railway backend unreachable',
        details: error instanceof Error ? error.message : 'Connection failed'
      };
      overallStatus = 'error';
    }

    // 3. Check System Integration
    try {
      const systemResponse = await fetch(`${baseUrl}/api/system-test`, {
        method: 'GET',
        headers: { 'Cache-Control': 'no-cache' }
      });
      const systemData = await systemResponse.json();
      healthChecks.system = {
        status: (systemData.supabase === 'ok' && systemData.neo4j === 'ok') ? 'ok' : 'error',
        message: 'System integration test',
        details: systemData
      };
      if (healthChecks.system.status !== 'ok') overallStatus = 'degraded';
    } catch (error) {
      healthChecks.system = {
        status: 'error',
        message: 'System integration test failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      };
      overallStatus = 'error';
    }

    // 4. Basic application health
    healthChecks.application = {
      status: 'ok',
      message: 'Application is running',
      details: {
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development',
        timestamp: new Date().toISOString()
      }
    };

    const responseTime = Date.now() - startTime;

    return NextResponse.json({
      status: overallStatus,
      timestamp: Date.now(),
      responseTime,
      services: healthChecks,
      summary: {
        total: Object.keys(healthChecks).length,
        healthy: Object.values(healthChecks).filter(check => check.status === 'ok').length,
        degraded: Object.values(healthChecks).filter(check => check.status === 'degraded').length,
        failed: Object.values(healthChecks).filter(check => check.status === 'error').length
      }
    });

  } catch (error) {
    return NextResponse.json({
      status: 'error',
      timestamp: Date.now(),
      responseTime: Date.now() - startTime,
      message: 'Health check system error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function GET() {
  const start = Date.now();
  let dbStatus: 'ok' | 'error' = 'error';
  let dbLatencyMs = 0;

  try {
    const dbStart = Date.now();
    const { error } = await supabaseAdmin
      .from('vehicles')
      .select('id', { count: 'exact', head: true })
      .eq('is_visible', true)
      .limit(1);
    dbLatencyMs = Date.now() - dbStart;
    dbStatus = error ? 'error' : 'ok';
  } catch {
    dbStatus = 'error';
  }

  const status = dbStatus === 'ok' ? 'healthy' : 'degraded';
  const httpStatus = dbStatus === 'ok' ? 200 : 503;

  return NextResponse.json(
    {
      status,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      latency: {
        total: Date.now() - start,
        db: dbLatencyMs,
      },
      services: {
        database: dbStatus,
      },
    },
    { status: httpStatus }
  );
}

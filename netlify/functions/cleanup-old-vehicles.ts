import { createClient } from '@supabase/supabase-js';

/**
 * Netlify Scheduled Function for cleaning up old/stale vehicles
 * Schedule: Run weekly on Sunday at 3 AM UTC
 *
 * This function removes vehicles that haven't been updated in 30+ days
 * to keep the database size manageable and queries fast.
 */
export const config = {
  schedule: '0 3 * * 0', // Every Sunday at 3 AM UTC
};

function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables');
  }

  return createClient(supabaseUrl, supabaseServiceKey);
}

export default async function handler() {
  const startTime = Date.now();
  console.log('=== Vehicle Cleanup Started ===');

  try {
    const supabase = getSupabaseAdmin();

    // Calculate date 30 days ago
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const cutoffDate = thirtyDaysAgo.toISOString();

    // Count stale vehicles before deletion
    const { count: staleCount } = await supabase
      .from('vehicles')
      .select('*', { count: 'exact', head: true })
      .lt('updated_at', cutoffDate)
      .in('source', ['china', 'korea']); // Only clean imported vehicles, not manual ones

    console.log(`Found ${staleCount || 0} stale vehicles (not updated in 30+ days)`);

    if (!staleCount || staleCount === 0) {
      return {
        statusCode: 200,
        body: JSON.stringify({
          success: true,
          message: 'No stale vehicles to clean up',
          deleted: 0,
        }),
      };
    }

    // Delete in batches to avoid timeout
    const batchSize = 1000;
    let totalDeleted = 0;

    while (totalDeleted < staleCount) {
      // Get batch of IDs to delete
      const { data: toDelete } = await supabase
        .from('vehicles')
        .select('id')
        .lt('updated_at', cutoffDate)
        .in('source', ['china', 'korea'])
        .limit(batchSize);

      if (!toDelete || toDelete.length === 0) break;

      const ids = toDelete.map(v => v.id);

      // Check if any of these vehicles are in active orders
      const { data: orderedVehicles } = await supabase
        .from('orders')
        .select('vehicle_id')
        .in('vehicle_id', ids)
        .not('status', 'in', '(cancelled,delivered)');

      const orderedIds = new Set((orderedVehicles || []).map(o => o.vehicle_id));
      const safeToDeleteIds = ids.filter(id => !orderedIds.has(id));

      if (safeToDeleteIds.length > 0) {
        const { error } = await supabase
          .from('vehicles')
          .delete()
          .in('id', safeToDeleteIds);

        if (error) {
          console.error('Batch delete error:', error);
        } else {
          totalDeleted += safeToDeleteIds.length;
          console.log(`Deleted batch: ${safeToDeleteIds.length} vehicles`);
        }
      }

      // Safety check - don't run forever
      if (Date.now() - startTime > 50000) {
        console.log('Time limit approaching, stopping cleanup');
        break;
      }
    }

    const duration = Date.now() - startTime;

    console.log('=== Cleanup Summary ===');
    console.log(`Total deleted: ${totalDeleted}`);
    console.log(`Duration: ${(duration / 1000).toFixed(1)}s`);

    // Also run ANALYZE to update table statistics for query planner
    // This helps PostgreSQL make better decisions after large deletes
    await supabase.rpc('analyze_vehicles').catch(() => {
      // Function may not exist, that's OK
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        deleted: totalDeleted,
        duration: `${(duration / 1000).toFixed(1)}s`,
      }),
    };
  } catch (error) {
    console.error('Cleanup failed:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Cleanup failed' }),
    };
  }
}

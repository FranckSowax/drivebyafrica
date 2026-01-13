import { NextRequest, NextResponse } from 'next/server';
import {
  syncEncarVehicles,
  applyEncarChanges,
  getLastSyncedChangeId,
  setLastSyncedChangeId,
  updateSyncStatus,
  createSyncLog,
  updateSyncLog,
} from '@/lib/api/encar-sync';
import { getEncarClient } from '@/lib/api/encar';

// POST - Trigger sync
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { mode = 'changes', mark, maxPages } = body;

    // Create sync log
    const logId = await createSyncLog(mode);

    // Update status to running
    await updateSyncStatus('running');

    let result: { added: number; updated: number; removed?: number; errors: number };

    if (mode === 'full') {
      // Full sync - fetch all vehicles
      result = await syncEncarVehicles({ mark, maxPages: maxPages || 10 });
    } else {
      // Changes sync - fetch only changes
      let changeId = await getLastSyncedChangeId();

      // If no change_id, get the current one from API
      if (!changeId) {
        const encar = getEncarClient();
        const today = new Date().toISOString().split('T')[0];
        const { change_id } = await encar.getChangeId({ date: today });
        changeId = change_id;
        // Save it for next time
        await setLastSyncedChangeId(changeId);
      }

      const changesResult = await applyEncarChanges(changeId);
      result = {
        added: changesResult.added,
        updated: changesResult.updated,
        removed: changesResult.removed,
        errors: changesResult.errors,
      };

      // Update the last change_id
      await setLastSyncedChangeId(changesResult.lastChangeId);
    }

    // Update sync status
    const hasErrors = result.errors > 0;
    await updateSyncStatus(hasErrors ? 'failed' : 'success', {
      added: result.added,
      updated: result.updated,
      removed: result.removed || 0,
      error: hasErrors ? `${result.errors} errors occurred` : undefined,
    });

    // Update sync log
    if (logId) {
      await updateSyncLog(logId, hasErrors ? 'failed' : 'success', {
        added: result.added,
        updated: result.updated,
        removed: result.removed || 0,
        error: hasErrors ? `${result.errors} errors occurred` : undefined,
      });
    }

    return NextResponse.json({
      success: true,
      mode,
      ...result,
    });
  } catch (error) {
    console.error('Sync error:', error);

    // Update status to failed
    await updateSyncStatus('failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Sync failed' },
      { status: 500 }
    );
  }
}

// GET - Get sync status
export async function GET() {
  try {
    const changeId = await getLastSyncedChangeId();

    return NextResponse.json({
      lastChangeId: changeId,
    });
  } catch (error) {
    console.error('Error getting sync status:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

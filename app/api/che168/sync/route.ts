import { NextRequest, NextResponse } from 'next/server';
import {
  syncChe168Vehicles,
  applyChe168Changes,
  getLastSyncedChangeIdChe168,
  setLastSyncedChangeIdChe168,
  updateSyncStatusChe168,
  createSyncLogChe168,
  updateSyncLogChe168,
} from '@/lib/api/che168-sync';
import { getChe168Client } from '@/lib/api/che168';

/**
 * POST /api/che168/sync
 * Déclenche une synchronisation des véhicules CHE168 (Chine) vers Supabase
 *
 * Body (optionnel):
 * - mode: 'full' | 'changes' (défaut: 'changes')
 * - mark: filtre par marque
 * - model: filtre par modèle
 * - maxPages: nombre max de pages à synchroniser (défaut: 10)
 * - change_id: ID de départ pour le mode 'changes'
 * - date: date pour récupérer le change_id initial (format: yyyy-mm-dd)
 *
 * Headers requis:
 * - Authorization: Bearer <admin_token> ou x-api-key: <api_key>
 */
export async function POST(request: NextRequest) {
  try {
    // Vérifier l'authentification
    const apiKey = request.headers.get('x-api-key');
    const authHeader = request.headers.get('authorization');

    if (!apiKey && !authHeader) {
      return NextResponse.json(
        { error: 'Authentification requise' },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const mode = body.mode || 'changes';

    // Créer un log de synchronisation
    const logId = await createSyncLogChe168(mode === 'full' ? 'full' : 'changes');

    // Mettre à jour le statut
    await updateSyncStatusChe168('running');

    if (mode === 'full') {
      // Synchronisation complète avec pagination
      const result = await syncChe168Vehicles({
        mark: body.mark,
        model: body.model,
        maxPages: body.maxPages || 10,
      });

      // Mettre à jour le statut et le log
      await updateSyncStatusChe168('success', {
        added: result.added,
        updated: result.updated,
      });

      if (logId) {
        await updateSyncLogChe168(logId, 'success', {
          added: result.added,
          updated: result.updated,
          removed: 0,
        });
      }

      return NextResponse.json({
        success: true,
        mode: 'full',
        result,
      });
    } else if (mode === 'changes') {
      // Synchronisation incrémentale basée sur les changements
      let changeId = body.change_id;

      // Si pas de change_id fourni, essayer de le récupérer depuis la DB ou via la date
      if (!changeId) {
        changeId = await getLastSyncedChangeIdChe168();
      }

      if (!changeId && body.date) {
        const client = getChe168Client();
        const { change_id } = await client.getChangeId({ date: body.date });
        changeId = change_id;
      }

      if (!changeId) {
        // Si toujours pas de change_id, utiliser la date d'hier
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const dateStr = yesterday.toISOString().split('T')[0];

        try {
          const client = getChe168Client();
          const { change_id } = await client.getChangeId({ date: dateStr });
          changeId = change_id;
        } catch {
          return NextResponse.json(
            { error: 'Impossible de récupérer le change_id initial. Fournissez change_id ou date.' },
            { status: 400 }
          );
        }
      }

      const result = await applyChe168Changes(changeId);

      // Sauvegarder le dernier change_id
      if (result.lastChangeId) {
        await setLastSyncedChangeIdChe168(result.lastChangeId);
      }

      // Mettre à jour le statut et le log
      await updateSyncStatusChe168('success', {
        added: result.added,
        updated: result.updated,
        removed: result.removed,
      });

      if (logId) {
        await updateSyncLogChe168(logId, 'success', {
          added: result.added,
          updated: result.updated,
          removed: result.removed,
        });
      }

      return NextResponse.json({
        success: true,
        mode: 'changes',
        result,
      });
    } else {
      return NextResponse.json(
        { error: 'Mode invalide. Utilisez "full" ou "changes"' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Erreur lors de la synchronisation CHE168:', error);

    // Mettre à jour le statut en échec
    await updateSyncStatusChe168('failed', {
      error: error instanceof Error ? error.message : 'Erreur inconnue',
    });

    return NextResponse.json(
      { error: 'Erreur lors de la synchronisation' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/che168/sync
 * Récupère le statut de la dernière synchronisation
 */
export async function GET() {
  try {
    const lastChangeId = await getLastSyncedChangeIdChe168();

    return NextResponse.json({
      source: 'che168',
      lastChangeId,
      status: 'ready',
    });
  } catch (error) {
    console.error('Erreur lors de la récupération du statut CHE168:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération du statut' },
      { status: 500 }
    );
  }
}

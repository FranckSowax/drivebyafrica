import { NextRequest, NextResponse } from 'next/server';
import { syncEncarVehicles, applyEncarChanges } from '@/lib/api/encar-sync';
import { getEncarClient } from '@/lib/api/encar';

/**
 * POST /api/encar/sync
 * Déclenche une synchronisation des véhicules Encar vers Supabase
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
    // Vérifier l'authentification (à personnaliser selon votre système d'auth)
    const apiKey = request.headers.get('x-api-key');
    const authHeader = request.headers.get('authorization');

    // Pour le moment, on vérifie juste qu'une clé est fournie
    // TODO: Implémenter une vraie vérification admin
    if (!apiKey && !authHeader) {
      return NextResponse.json(
        { error: 'Authentification requise' },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const mode = body.mode || 'changes';

    if (mode === 'full') {
      // Synchronisation complète avec pagination
      const result = await syncEncarVehicles({
        mark: body.mark,
        model: body.model,
        maxPages: body.maxPages || 10,
      });

      return NextResponse.json({
        success: true,
        mode: 'full',
        result,
      });
    } else if (mode === 'changes') {
      // Synchronisation incrémentale basée sur les changements
      let changeId = body.change_id;

      // Si pas de change_id fourni, essayer de le récupérer via la date
      if (!changeId && body.date) {
        const client = getEncarClient();
        const { change_id } = await client.getChangeId({ date: body.date });
        changeId = change_id;
      }

      if (!changeId) {
        return NextResponse.json(
          { error: 'change_id ou date requis pour le mode changes' },
          { status: 400 }
        );
      }

      const result = await applyEncarChanges(changeId);

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
    console.error('Erreur lors de la synchronisation Encar:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la synchronisation' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/encar/sync
 * Récupère le statut de la dernière synchronisation
 */
export async function GET() {
  try {
    // TODO: Implémenter la récupération du statut de synchronisation
    return NextResponse.json({
      lastSync: null,
      lastChangeId: null,
      status: 'not_implemented',
      message: 'Le suivi du statut de synchronisation sera implémenté prochainement',
    });
  } catch (error) {
    console.error('Erreur lors de la récupération du statut:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération du statut' },
      { status: 500 }
    );
  }
}

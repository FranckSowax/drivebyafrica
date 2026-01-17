import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

// GET: Fetch a specific reassignment for customer view
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Fetch the reassignment
    const { data: reassignment, error } = await supabaseAdmin
      .from('quote_reassignments')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !reassignment) {
      console.error('Reassignment not found:', error);
      return NextResponse.json(
        { error: 'Reassignment non trouvé' },
        { status: 404 }
      );
    }

    // Fetch full vehicle details for proposed vehicles
    const proposedVehicleIds = (reassignment.proposed_vehicles as { id: string }[])?.map(v => v.id) || [];

    if (proposedVehicleIds.length > 0) {
      const { data: vehicles } = await supabaseAdmin
        .from('vehicles')
        .select('id, make, model, year, current_price_usd, mileage, images, source, source_url, fuel_type, transmission, engine_cc, color')
        .in('id', proposedVehicleIds);

      if (vehicles) {
        // Merge vehicle details with similarity scores from proposed_vehicles
        const proposedWithScores = reassignment.proposed_vehicles as { id: string; similarity_score: number }[];
        reassignment.proposed_vehicles = vehicles.map(v => {
          const proposed = proposedWithScores.find(p => p.id === v.id);
          return {
            ...v,
            similarity_score: proposed?.similarity_score || 0
          };
        }).sort((a, b) => b.similarity_score - a.similarity_score);
      }
    }

    return NextResponse.json({ reassignment });
  } catch (error) {
    console.error('Error fetching reassignment:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}

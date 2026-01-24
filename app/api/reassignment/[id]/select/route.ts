import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

// POST: Customer selects a vehicle from the proposed alternatives
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { vehicleId } = await request.json();

    if (!vehicleId) {
      return NextResponse.json(
        { error: 'Vehicle ID requis' },
        { status: 400 }
      );
    }

    // Fetch the reassignment
    const { data: reassignment, error: fetchError } = await supabaseAdmin
      .from('quote_reassignments')
      .select('*, original_quote:quotes!original_quote_id(*)')
      .eq('id', id)
      .single();

    if (fetchError || !reassignment) {
      return NextResponse.json(
        { error: 'Reassignment non trouvé' },
        { status: 404 }
      );
    }

    // Check if already accepted
    if (reassignment.status === 'accepted') {
      return NextResponse.json(
        { error: 'Une sélection a déjà été effectuée' },
        { status: 400 }
      );
    }

    // Verify the vehicle is in the proposed list
    const proposedVehicles = reassignment.proposed_vehicles as { id: string }[];
    if (!proposedVehicles?.some(v => v.id === vehicleId)) {
      return NextResponse.json(
        { error: 'Véhicule non proposé' },
        { status: 400 }
      );
    }

    // Fetch the selected vehicle details
    const { data: selectedVehicle } = await supabaseAdmin
      .from('vehicles')
      .select('*')
      .eq('id', vehicleId)
      .single();

    if (!selectedVehicle) {
      return NextResponse.json(
        { error: 'Véhicule non trouvé' },
        { status: 404 }
      );
    }

    const originalQuote = reassignment.original_quote as {
      id: string;
      user_id: string;
      destination_id: string;
      destination_name: string;
      destination_country: string;
      shipping_type: string;
      shipping_cost_xaf: number;
      insurance_cost_xaf: number;
      inspection_fee_xaf: number;
    };

    // Generate new quote number
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    const newQuoteNumber = `DBA-${timestamp}-${random}`;

    // Calculate new total (keeping original shipping costs, updating vehicle price)
    const vehiclePriceXaf = (selectedVehicle.current_price_usd || 0) * 655; // Approximate XAF rate
    const totalCostXaf = vehiclePriceXaf +
      (originalQuote.shipping_cost_xaf || 0) +
      (originalQuote.insurance_cost_xaf || 0) +
      (originalQuote.inspection_fee_xaf || 0);

    // Create new quote with the selected vehicle
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: newQuote, error: quoteError } = await (supabaseAdmin.from('quotes') as any)
      .insert({
        quote_number: newQuoteNumber,
        user_id: originalQuote.user_id,
        vehicle_id: selectedVehicle.id,
        vehicle_make: selectedVehicle.make,
        vehicle_model: selectedVehicle.model,
        vehicle_year: selectedVehicle.year,
        vehicle_price_usd: selectedVehicle.current_price_usd,
        vehicle_source: selectedVehicle.source,
        destination_id: originalQuote.destination_id,
        destination_name: originalQuote.destination_name,
        destination_country: originalQuote.destination_country,
        shipping_type: originalQuote.shipping_type,
        shipping_cost_xaf: originalQuote.shipping_cost_xaf,
        insurance_cost_xaf: originalQuote.insurance_cost_xaf,
        inspection_fee_xaf: originalQuote.inspection_fee_xaf,
        total_cost_xaf: totalCostXaf,
        status: 'accepted', // Already paid deposit
        valid_until: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      })
      .select()
      .single();

    if (quoteError) {
      console.error('Error creating new quote:', quoteError);
      return NextResponse.json(
        { error: 'Erreur lors de la création du nouveau devis' },
        { status: 500 }
      );
    }

    // Update the reassignment
    const { error: updateError } = await supabaseAdmin
      .from('quote_reassignments')
      .update({
        status: 'accepted',
        selected_vehicle_id: vehicleId,
        new_quote_id: newQuote.id,
        customer_response: 'accepted',
        customer_responded_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (updateError) {
      console.error('Error updating reassignment:', updateError);
    }

    // Update original quote status to 'reassigned'
    await supabaseAdmin
      .from('quotes')
      .update({ status: 'reassigned' })
      .eq('id', reassignment.original_quote_id);

    // Mark the selected vehicle as reserved
    await supabaseAdmin
      .from('vehicles')
      .update({ status: 'reserved' })
      .eq('id', vehicleId);

    return NextResponse.json({
      success: true,
      newQuoteId: newQuote.id,
      newQuoteNumber: newQuote.quote_number,
      message: 'Véhicule sélectionné avec succès'
    });
  } catch (error) {
    console.error('Error selecting vehicle:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}

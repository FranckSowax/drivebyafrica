import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

// POST: Customer declines all proposed vehicles, requests new options
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Fetch the reassignment
    const { data: reassignment, error: fetchError } = await supabaseAdmin
      .from('quote_reassignments')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !reassignment) {
      return NextResponse.json(
        { error: 'Reassignment non trouvé' },
        { status: 404 }
      );
    }

    // Check if already processed
    if (reassignment.status === 'accepted' || reassignment.status === 'declined') {
      return NextResponse.json(
        { error: 'Cette demande a déjà été traitée' },
        { status: 400 }
      );
    }

    // Update the reassignment to declined
    const { error: updateError } = await supabaseAdmin
      .from('quote_reassignments')
      .update({
        status: 'declined',
        customer_response: 'declined_all',
        customer_responded_at: new Date().toISOString(),
        admin_notes: `Client a refusé toutes les propositions le ${new Date().toLocaleDateString('fr-FR')}. Nouvelles propositions à envoyer sous 2-3 jours.`,
      })
      .eq('id', id);

    if (updateError) {
      console.error('Error updating reassignment:', updateError);
      return NextResponse.json(
        { error: 'Erreur lors de la mise à jour' },
        { status: 500 }
      );
    }

    // TODO: Send notification to admin to prepare new proposals
    // TODO: Send WhatsApp confirmation to customer

    return NextResponse.json({
      success: true,
      message: 'Nous vous enverrons de nouvelles propositions sous 2-3 jours.'
    });
  } catch (error) {
    console.error('Error declining vehicles:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}

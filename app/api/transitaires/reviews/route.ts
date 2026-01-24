import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET: Fetch reviews for a transitaire
export async function GET(request: Request) {
  try {
    const supabaseClient = await createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = supabaseClient as any;
    const { searchParams } = new URL(request.url);
    const transitaireId = searchParams.get('transitaire_id');

    if (!transitaireId) {
      return NextResponse.json({ error: 'ID du transitaire requis' }, { status: 400 });
    }

    const { data: reviews, error } = await supabase
      .from('transitaire_reviews')
      .select(`
        id,
        rating,
        comment,
        service_quality,
        communication,
        speed,
        price_fairness,
        would_recommend,
        is_verified,
        admin_response,
        created_at,
        profiles:user_id (
          full_name
        )
      `)
      .eq('transitaire_id', transitaireId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching reviews:', error);
      return NextResponse.json({ error: 'Erreur lors de la récupération des avis' }, { status: 500 });
    }

    // Anonymize user names (show only first name + initial)
    const anonymizedReviews = reviews?.map((review: { profiles: { full_name: string } | null; [key: string]: unknown }) => {
      const profile = review.profiles as { full_name: string } | null;
      let displayName = 'Utilisateur';
      if (profile?.full_name) {
        const parts = profile.full_name.split(' ');
        if (parts.length > 1) {
          displayName = `${parts[0]} ${parts[1][0]}.`;
        } else {
          displayName = parts[0];
        }
      }
      return {
        ...review,
        user_name: displayName,
        profiles: undefined, // Remove raw profile data
      };
    }) || [];

    return NextResponse.json({ reviews: anonymizedReviews });
  } catch (error) {
    console.error('Error in GET reviews:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// POST: Create a review for a transitaire
export async function POST(request: Request) {
  try {
    const supabaseClient = await createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = supabaseClient as any;
    const { data: { user } } = await supabaseClient.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const body = await request.json();
    const {
      transitaire_id,
      order_id,
      rating,
      comment,
      service_quality,
      communication,
      speed,
      price_fairness,
      would_recommend = true,
    } = body;

    // Validation
    if (!transitaire_id || !rating) {
      return NextResponse.json(
        { error: 'ID du transitaire et note requis' },
        { status: 400 }
      );
    }

    if (rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: 'La note doit être entre 1 et 5' },
        { status: 400 }
      );
    }

    // Check if user already reviewed this transitaire for this order
    if (order_id) {
      const { data: existing } = await supabase
        .from('transitaire_reviews')
        .select('id')
        .eq('transitaire_id', transitaire_id)
        .eq('order_id', order_id)
        .single();

      if (existing) {
        return NextResponse.json(
          { error: 'Vous avez déjà donné un avis pour ce transitaire sur cette commande' },
          { status: 400 }
        );
      }
    }

    // Create the review
    const { data: review, error } = await supabase
      .from('transitaire_reviews')
      .insert({
        transitaire_id,
        user_id: user.id,
        order_id,
        rating,
        comment,
        service_quality,
        communication,
        speed,
        price_fairness,
        would_recommend,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating review:', error);
      return NextResponse.json({ error: 'Erreur lors de la création de l\'avis' }, { status: 500 });
    }

    // Update order_transitaire_suggestions if order_id is provided
    if (order_id) {
      await supabase
        .from('order_transitaire_suggestions')
        .update({ feedback_received_at: new Date().toISOString() })
        .eq('order_id', order_id)
        .eq('transitaire_id', transitaire_id);
    }

    return NextResponse.json({ review }, { status: 201 });
  } catch (error) {
    console.error('Error in POST review:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// PUT: Update a review (user can update their own review)
export async function PUT(request: Request) {
  try {
    const supabaseClient = await createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = supabaseClient as any;
    const { data: { user } } = await supabaseClient.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID de l\'avis requis' }, { status: 400 });
    }

    // Verify ownership
    const { data: existing } = await supabase
      .from('transitaire_reviews')
      .select('user_id')
      .eq('id', id)
      .single();

    if (!existing || existing.user_id !== user.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
    }

    // Update the review
    updateData.updated_at = new Date().toISOString();

    const { data: review, error } = await supabase
      .from('transitaire_reviews')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating review:', error);
      return NextResponse.json({ error: 'Erreur lors de la mise à jour de l\'avis' }, { status: 500 });
    }

    return NextResponse.json({ review });
  } catch (error) {
    console.error('Error in PUT review:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

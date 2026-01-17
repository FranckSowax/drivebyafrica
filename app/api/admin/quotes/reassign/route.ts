import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import type { Database } from '@/types/database';

async function createSupabaseClient() {
  const cookieStore = await cookies();
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        },
      },
    }
  );
}

// Reasons for reassignment
const REASSIGNMENT_REASONS = {
  sold: 'Véhicule vendu sur une autre marketplace',
  unavailable: 'Véhicule non disponible',
  priority_conflict: 'Un autre client a payé en premier',
  price_change: 'Changement de prix significatif',
  other: 'Autre raison',
};

interface SimilarVehicle {
  id: string;
  make: string;
  model: string;
  year: number | null;
  current_price_usd: number | null;
  mileage: number | null;
  images: string[] | null;
  source: string;
  source_url: string | null;
  similarity_score: number;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseClientType = Awaited<ReturnType<typeof createSupabaseClient>>;

// Find similar vehicles based on make, model, year, and price range
async function findSimilarVehicles(
  supabase: SupabaseClientType,
  make: string,
  model: string,
  year: number,
  priceUsd: number,
  excludeVehicleId: string,
  limit: number = 3
): Promise<SimilarVehicle[]> {
  // Price range: +/- 30%
  const minPrice = priceUsd * 0.7;
  const maxPrice = priceUsd * 1.3;

  // Year range: +/- 3 years
  const minYear = year - 3;
  const maxYear = year + 3;

  // First try: exact make and model match
  let { data: vehicles } = await supabase
    .from('vehicles')
    .select('id, make, model, year, current_price_usd, mileage, images, source, source_url')
    .eq('is_visible', true)
    .neq('id', excludeVehicleId)
    .ilike('make', make)
    .ilike('model', `%${model}%`)
    .gte('current_price_usd', minPrice)
    .lte('current_price_usd', maxPrice)
    .gte('year', minYear)
    .lte('year', maxYear)
    .limit(limit * 2);

  // If not enough results, try same make only
  if (!vehicles || vehicles.length < limit) {
    const { data: makeSimilar } = await supabase
      .from('vehicles')
      .select('id, make, model, year, current_price_usd, mileage, images, source, source_url')
      .eq('is_visible', true)
      .neq('id', excludeVehicleId)
      .ilike('make', make)
      .gte('current_price_usd', minPrice)
      .lte('current_price_usd', maxPrice)
      .gte('year', minYear)
      .lte('year', maxYear)
      .limit(limit * 2);

    if (makeSimilar) {
      const existingIds = new Set(vehicles?.map(v => v.id) || []);
      const newVehicles = makeSimilar.filter(v => !existingIds.has(v.id));
      vehicles = [...(vehicles || []), ...newVehicles];
    }
  }

  // If still not enough, try price range only
  if (!vehicles || vehicles.length < limit) {
    const { data: priceSimilar } = await supabase
      .from('vehicles')
      .select('id, make, model, year, current_price_usd, mileage, images, source, source_url')
      .eq('is_visible', true)
      .neq('id', excludeVehicleId)
      .gte('current_price_usd', minPrice)
      .lte('current_price_usd', maxPrice)
      .limit(limit * 2);

    if (priceSimilar) {
      const existingIds = new Set(vehicles?.map(v => v.id) || []);
      const newVehicles = priceSimilar.filter(v => !existingIds.has(v.id));
      vehicles = [...(vehicles || []), ...newVehicles];
    }
  }

  if (!vehicles || vehicles.length === 0) {
    return [];
  }

  // Calculate similarity score for each vehicle
  const scoredVehicles: SimilarVehicle[] = vehicles.map(v => {
    let score = 0;

    // Make match: +40 points
    if (v.make?.toLowerCase() === make.toLowerCase()) {
      score += 40;
    }

    // Model similarity: +30 points
    if (v.model?.toLowerCase().includes(model.toLowerCase()) ||
        model.toLowerCase().includes(v.model?.toLowerCase() || '')) {
      score += 30;
    }

    // Year proximity: +20 points max (decreases by 5 for each year difference)
    const yearDiff = Math.abs((v.year || year) - year);
    score += Math.max(0, 20 - yearDiff * 5);

    // Price proximity: +10 points max (decreases based on % difference)
    const priceDiff = Math.abs((v.current_price_usd || priceUsd) - priceUsd) / priceUsd;
    score += Math.max(0, 10 - priceDiff * 20);

    return {
      ...v,
      similarity_score: Math.round(score),
    };
  });

  // Sort by score and return top results
  return scoredVehicles
    .sort((a, b) => b.similarity_score - a.similarity_score)
    .slice(0, limit);
}

// Get first image URL from vehicle images array
function getFirstImageUrl(images: string[] | null): string | null {
  if (!images || images.length === 0) return null;

  // Handle different image formats
  let imageUrl = images[0];

  // If it's a JSON string, try to parse it
  if (typeof imageUrl === 'string' && imageUrl.startsWith('[')) {
    try {
      const parsed = JSON.parse(imageUrl);
      if (Array.isArray(parsed) && parsed.length > 0) {
        imageUrl = parsed[0];
      }
    } catch {
      // Keep original if parsing fails
    }
  }

  return imageUrl || null;
}

// Send WhatsApp text message via Whapi
async function sendWhatsAppTextMessage(
  whapiToken: string,
  formattedPhone: string,
  message: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const response = await fetch('https://gate.whapi.cloud/messages/text', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${whapiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: formattedPhone,
        body: message,
      }),
    });

    const result = await response.json();
    console.log('WhatsApp text message result:', result);

    if (response.ok && result.sent) {
      return { success: true, messageId: result.message?.id };
    } else {
      return { success: false, error: result.error?.message || 'Erreur envoi WhatsApp' };
    }
  } catch (error) {
    console.error('WhatsApp text send error:', error);
    return { success: false, error: 'Erreur de connexion à Whapi' };
  }
}

// Send WhatsApp interactive message with image and button via Whapi
async function sendWhatsAppInteractiveMessage(
  whapiToken: string,
  formattedPhone: string,
  vehicle: SimilarVehicle,
  baseUrl: string,
  index: number
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const vehicleUrl = `${baseUrl}/cars/${vehicle.id}`;
  const imageUrl = getFirstImageUrl(vehicle.images);

  const bodyText = `*Option ${index + 1}: ${vehicle.make} ${vehicle.model} ${vehicle.year || ''}*

💰 Prix: *$${vehicle.current_price_usd?.toLocaleString() || 'N/A'}*
📍 Kilométrage: ${vehicle.mileage?.toLocaleString() || 'N/A'} km
🌍 Source: ${vehicle.source?.toUpperCase() || 'N/A'}`;

  try {
    // First try: Interactive message with image and quick reply button
    const response = await fetch('https://gate.whapi.cloud/messages/interactive', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${whapiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: formattedPhone,
        type: 'button',
        body: {
          text: bodyText,
        },
        footer: {
          text: 'Driveby Africa - Import de véhicules',
        },
        action: {
          buttons: [
            {
              type: 'quick_reply',
              title: `Je choisis ${index + 1}`,
              id: `select_vehicle_${vehicle.id}`,
            },
          ],
        },
        ...(imageUrl && { media: imageUrl }),
      }),
    });

    const result = await response.json();
    console.log(`WhatsApp interactive message ${index + 1} result:`, JSON.stringify(result));

    if (response.ok && result.sent) {
      return { success: true, messageId: result.message?.id };
    } else {
      // If interactive fails, try sending image with caption + text with link
      console.log('Interactive message failed, trying image + text fallback');
      return sendImageWithLinkFallback(whapiToken, formattedPhone, vehicle, vehicleUrl, imageUrl, index);
    }
  } catch (error) {
    console.error('WhatsApp interactive send error:', error);
    return { success: false, error: 'Erreur de connexion à Whapi' };
  }
}

// Fallback: Send image with caption, then text with link
async function sendImageWithLinkFallback(
  whapiToken: string,
  formattedPhone: string,
  vehicle: SimilarVehicle,
  vehicleUrl: string,
  imageUrl: string | null,
  index: number
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const caption = `*Option ${index + 1}: ${vehicle.make} ${vehicle.model} ${vehicle.year || ''}*

💰 Prix: *$${vehicle.current_price_usd?.toLocaleString() || 'N/A'}*
📍 Kilométrage: ${vehicle.mileage?.toLocaleString() || 'N/A'} km
🌍 Source: ${vehicle.source?.toUpperCase() || 'N/A'}

👉 Voir l'annonce: ${vehicleUrl}`;

  try {
    if (imageUrl) {
      // Try sending image with caption
      const imageResponse = await fetch('https://gate.whapi.cloud/messages/image', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${whapiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: formattedPhone,
          media: imageUrl,
          caption: caption,
        }),
      });

      const imageResult = await imageResponse.json();
      console.log(`WhatsApp image message ${index + 1} result:`, JSON.stringify(imageResult));

      if (imageResponse.ok && imageResult.sent) {
        return { success: true, messageId: imageResult.message?.id };
      }
    }

    // Final fallback: just text message
    return sendWhatsAppTextMessage(whapiToken, formattedPhone, caption);
  } catch (error) {
    console.error('WhatsApp image fallback error:', error);
    // Final fallback: just text message
    return sendWhatsAppTextMessage(whapiToken, formattedPhone, caption);
  }
}

// Send WhatsApp messages via Whapi - sends intro + 3 vehicle messages
async function sendWhatsAppMessage(
  phone: string,
  customerName: string,
  originalVehicle: string,
  proposedVehicles: SimilarVehicle[],
  baseUrl: string
): Promise<{ success: boolean; messageId?: string; error?: string; sentCount?: number }> {
  const whapiToken = process.env.WHAPI_TOKEN;

  if (!whapiToken) {
    return { success: false, error: 'WHAPI_TOKEN non configuré' };
  }

  // Format phone number (remove spaces, add country code if needed)
  let formattedPhone = phone.replace(/\s+/g, '').replace(/[^0-9+]/g, '');
  if (!formattedPhone.startsWith('+')) {
    // Assume Gabon country code if no prefix
    formattedPhone = '+241' + formattedPhone.replace(/^0+/, '');
  }
  // Whapi expects number without +
  formattedPhone = formattedPhone.replace('+', '') + '@s.whatsapp.net';

  // Message 1: Introduction message
  const introMessage = `Bonjour ${customerName},

Nous vous contactons concernant votre devis pour le véhicule *${originalVehicle}*.

Malheureusement, ce véhicule n'est plus disponible. 😔

Cependant, nous avons trouvé ${proposedVehicles.length} alternative${proposedVehicles.length > 1 ? 's' : ''} similaire${proposedVehicles.length > 1 ? 's' : ''} qui pourrai${proposedVehicles.length > 1 ? 'ent' : 't'} vous intéresser ! 👇

Votre acompte reste bien entendu réservé.

L'équipe Driveby Africa`;

  try {
    // Send intro message
    const introResult = await sendWhatsAppTextMessage(whapiToken, formattedPhone, introMessage);
    if (!introResult.success) {
      return introResult;
    }

    // Small delay between messages to ensure order
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Send interactive messages for each proposed vehicle
    let sentCount = 1; // Intro already sent
    const messageIds: string[] = [introResult.messageId || ''];

    for (let i = 0; i < proposedVehicles.length; i++) {
      const vehicle = proposedVehicles[i];

      // Small delay between messages
      if (i > 0) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      const result = await sendWhatsAppInteractiveMessage(
        whapiToken,
        formattedPhone,
        vehicle,
        baseUrl,
        i
      );

      if (result.success) {
        sentCount++;
        if (result.messageId) messageIds.push(result.messageId);
      } else {
        console.error(`Failed to send vehicle ${i + 1}:`, result.error);
      }
    }

    return {
      success: sentCount > 1, // At least intro + 1 vehicle
      messageId: messageIds.join(','),
      sentCount,
    };
  } catch (error) {
    console.error('WhatsApp send error:', error);
    return { success: false, error: 'Erreur de connexion à Whapi' };
  }
}

// GET: Fetch all reassignments
export async function GET(request: Request) {
  try {
    const supabase = await createSupabaseClient();
    const { searchParams } = new URL(request.url);

    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    // Use untyped query since table might not exist yet
    let query = supabase
      .from('quote_reassignments' as any)
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    query = query.range(offset, offset + limit - 1);

    const { data: reassignments, error, count } = await query;

    if (error) {
      // Table doesn't exist yet
      if (error.code === '42P01' || error.code === 'PGRST205') {
        return NextResponse.json({
          reassignments: [],
          stats: { total: 0, pending: 0, contacted: 0, accepted: 0, declined: 0 },
          pagination: { page: 1, limit, total: 0, totalPages: 0 },
        });
      }
      throw error;
    }

    // Get user profiles
    const userIds = [...new Set(reassignments?.map((r: any) => r.user_id) || [])];
    let profiles: Record<string, any> = {};

    if (userIds.length > 0) {
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, full_name, phone, whatsapp_number')
        .in('id', userIds);

      if (profilesData) {
        profiles = profilesData.reduce((acc, p) => {
          acc[p.id] = p;
          return acc;
        }, {} as Record<string, any>);
      }
    }

    // Enrich with user info
    const enrichedReassignments = reassignments?.map((r: any) => ({
      ...r,
      customer_name: profiles[r.user_id]?.full_name || 'Client',
      customer_phone: profiles[r.user_id]?.whatsapp_number || profiles[r.user_id]?.phone || '',
    })) || [];

    // Calculate stats
    const { data: statsData } = await supabase
      .from('quote_reassignments' as any)
      .select('status');

    const stats = {
      total: statsData?.length || 0,
      pending: statsData?.filter((r: any) => r.status === 'pending').length || 0,
      contacted: statsData?.filter((r: any) => r.status === 'contacted').length || 0,
      accepted: statsData?.filter((r: any) => r.status === 'accepted').length || 0,
      declined: statsData?.filter((r: any) => r.status === 'declined').length || 0,
    };

    return NextResponse.json({
      reassignments: enrichedReassignments,
      stats,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching reassignments:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des réassignations' },
      { status: 500 }
    );
  }
}

// POST: Create a new reassignment with auto-search for similar vehicles
export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseClient();
    const body = await request.json();
    const { quoteId, reason } = body;

    if (!quoteId || !reason) {
      return NextResponse.json(
        { error: 'Quote ID et raison requis' },
        { status: 400 }
      );
    }

    // Get the original quote
    const { data: quote, error: quoteError } = await supabase
      .from('quotes')
      .select('*')
      .eq('id', quoteId)
      .single();

    if (quoteError || !quote) {
      return NextResponse.json(
        { error: 'Devis non trouvé' },
        { status: 404 }
      );
    }

    // Find similar vehicles
    const similarVehicles = await findSimilarVehicles(
      supabase,
      quote.vehicle_make,
      quote.vehicle_model,
      quote.vehicle_year,
      quote.vehicle_price_usd,
      quote.vehicle_id,
      3
    );

    // Create reassignment record
    const { data: reassignment, error: createError } = await supabase
      .from('quote_reassignments' as any)
      .insert({
        original_quote_id: quoteId,
        user_id: quote.user_id,
        original_vehicle_id: quote.vehicle_id,
        original_vehicle_make: quote.vehicle_make,
        original_vehicle_model: quote.vehicle_model,
        original_vehicle_year: quote.vehicle_year,
        original_vehicle_price_usd: quote.vehicle_price_usd,
        reason: REASSIGNMENT_REASONS[reason as keyof typeof REASSIGNMENT_REASONS] || reason,
        status: 'pending',
        proposed_vehicles: similarVehicles,
      })
      .select()
      .single();

    if (createError) {
      console.error('Error creating reassignment:', createError);
      throw createError;
    }

    // Update original quote status
    await supabase
      .from('quotes')
      .update({ status: 'reassigned', updated_at: new Date().toISOString() })
      .eq('id', quoteId);

    return NextResponse.json({
      success: true,
      reassignment,
      similarVehicles,
    });
  } catch (error) {
    console.error('Error creating reassignment:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la création de la réassignation' },
      { status: 500 }
    );
  }
}

// PUT: Update reassignment (send WhatsApp, update status, etc.)
export async function PUT(request: Request) {
  try {
    const supabase = await createSupabaseClient();
    const body = await request.json();
    const { id, action, ...updateData } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'ID requis' },
        { status: 400 }
      );
    }

    // Get the reassignment
    const { data: reassignment, error: fetchError } = await supabase
      .from('quote_reassignments' as any)
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !reassignment) {
      return NextResponse.json(
        { error: 'Réassignation non trouvée' },
        { status: 404 }
      );
    }

    // Handle different actions
    if (action === 'send_whatsapp') {
      // Get user profile for WhatsApp number
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, whatsapp_number, phone')
        .eq('id', (reassignment as any).user_id)
        .single();

      const phone = profile?.whatsapp_number || profile?.phone;
      if (!phone) {
        return NextResponse.json(
          { error: 'Numéro WhatsApp non disponible pour ce client' },
          { status: 400 }
        );
      }

      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://drivebyafrica.com';
      const originalVehicle = `${(reassignment as any).original_vehicle_make} ${(reassignment as any).original_vehicle_model} ${(reassignment as any).original_vehicle_year}`;

      const whatsappResult = await sendWhatsAppMessage(
        phone,
        profile?.full_name || 'Client',
        originalVehicle,
        (reassignment as any).proposed_vehicles || [],
        baseUrl
      );

      if (whatsappResult.success) {
        await supabase
          .from('quote_reassignments' as any)
          .update({
            status: 'contacted',
            whatsapp_sent_at: new Date().toISOString(),
            whatsapp_message_id: whatsappResult.messageId,
            updated_at: new Date().toISOString(),
          })
          .eq('id', id);

        return NextResponse.json({ success: true, messageId: whatsappResult.messageId });
      } else {
        return NextResponse.json(
          { error: whatsappResult.error },
          { status: 500 }
        );
      }
    }

    // Regular update
    const { data, error } = await supabase
      .from('quote_reassignments' as any)
      .update({
        ...updateData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true, reassignment: data });
  } catch (error) {
    console.error('Error updating reassignment:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour' },
      { status: 500 }
    );
  }
}

// Refresh similar vehicles
export async function PATCH(request: Request) {
  try {
    const supabase = await createSupabaseClient();
    const { id } = await request.json();

    if (!id) {
      return NextResponse.json(
        { error: 'ID requis' },
        { status: 400 }
      );
    }

    const { data: reassignment, error: fetchError } = await supabase
      .from('quote_reassignments' as any)
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !reassignment) {
      return NextResponse.json(
        { error: 'Réassignation non trouvée' },
        { status: 404 }
      );
    }

    const r = reassignment as any;

    // Find new similar vehicles
    const similarVehicles = await findSimilarVehicles(
      supabase,
      r.original_vehicle_make,
      r.original_vehicle_model,
      r.original_vehicle_year,
      r.original_vehicle_price_usd,
      r.original_vehicle_id,
      3
    );

    // Update
    const { data, error } = await supabase
      .from('quote_reassignments' as any)
      .update({
        proposed_vehicles: similarVehicles,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true, reassignment: data, similarVehicles });
  } catch (error) {
    console.error('Error refreshing vehicles:', error);
    return NextResponse.json(
      { error: 'Erreur lors du rafraîchissement' },
      { status: 500 }
    );
  }
}

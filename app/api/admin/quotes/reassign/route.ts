import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

// Reasons for reassignment
const REASSIGNMENT_REASONS = {
  sold: 'Véhicule vendu sur une autre marketplace',
  unavailable: 'Véhicule non disponible',
  priority_conflict: 'Un autre client a payé en premier',
  price_change: 'Changement de prix significatif',
  other: 'Autre raison',
};

// USD to XAF exchange rate (fallback if not fetched from DB)
const DEFAULT_USD_TO_XAF = 630;

// Export tax for China (added silently to price)
const CHINA_EXPORT_TAX_USD = 980;

// Cache for XAF rate
let cachedXafRate: number | null = null;

// Get XAF rate from database or use default
async function getXafRate(): Promise<number> {
  if (cachedXafRate) return cachedXafRate;

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabaseAdmin as any)
      .from('currency_rates')
      .select('rate_to_usd')
      .eq('currency_code', 'XAF')
      .single();

    if (error) {
      console.error('Error fetching XAF rate from DB:', error);
      return DEFAULT_USD_TO_XAF;
    }

    if (data?.rate_to_usd) {
      cachedXafRate = Number(data.rate_to_usd);
      console.log('XAF rate fetched from database:', cachedXafRate);
      return cachedXafRate;
    }
  } catch (error) {
    console.error('Error fetching XAF rate:', error);
  }

  return DEFAULT_USD_TO_XAF;
}

// Format price with export tax included (silently) and converted to XAF
function formatPriceWithTax(priceUsd: number | null, source: string, xafRate: number): string {
  if (!priceUsd) return 'N/A';

  // Add export tax for China (silently)
  const exportTax = source === 'china' ? CHINA_EXPORT_TAX_USD : 0;
  const effectivePrice = priceUsd + exportTax;

  // Convert to XAF
  const priceXaf = Math.round(effectivePrice * xafRate);
  return priceXaf.toLocaleString('fr-FR') + ' FCFA';
}

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
type SupabaseClientType = typeof supabaseAdmin;

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

// Send WhatsApp reassignment messages via Meta Cloud API
async function sendWhatsAppMessage(
  phone: string,
  customerName: string,
  originalVehicle: string,
  proposedVehicles: SimilarVehicle[],
  reassignmentId: string,
  baseUrl: string
): Promise<{ success: boolean; messageId?: string; error?: string; sentCount?: number }> {
  const { sendTextMessage, sendImageMessage, sendInteractiveMessage, isConfigured } = await import('@/lib/whatsapp/meta-client');

  if (!isConfigured()) {
    return { success: false, error: 'Meta WhatsApp API non configuré' };
  }

  const xafRate = await getXafRate();
  const selectionUrl = `${baseUrl}/reassignment/${reassignmentId}`;

  const introMessage = `Bonjour ${customerName},

Nous vous contactons concernant votre devis pour le véhicule *${originalVehicle}*.

Malheureusement, ce véhicule n'est plus disponible. 😔

Cependant, nous avons trouvé ${proposedVehicles.length} alternative${proposedVehicles.length > 1 ? 's' : ''} similaire${proposedVehicles.length > 1 ? 's' : ''} qui pourrai${proposedVehicles.length > 1 ? 'ent' : 't'} vous intéresser ! 👇

Votre acompte de *$1,000* reste bien entendu réservé.

👉 Cliquez sur les options ci-dessous ou accédez directement à la page de sélection: ${selectionUrl}

L'équipe Driveby Africa`;

  try {
    const introResult = await sendTextMessage(phone, introMessage);
    if (!introResult.success) {
      return { success: false, error: introResult.error };
    }

    await new Promise(resolve => setTimeout(resolve, 1000));

    let sentCount = 1;
    const messageIds: string[] = [introResult.messageId || ''];

    for (let i = 0; i < proposedVehicles.length; i++) {
      const vehicle = proposedVehicles[i];

      if (i > 0) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      const imageUrl = getFirstImageUrl(vehicle.images);
      const bodyText = `*Option ${i + 1}: ${vehicle.make} ${vehicle.model} ${vehicle.year || ''}*

💰 Prix: *${formatPriceWithTax(vehicle.current_price_usd, vehicle.source, xafRate)}*
📍 Kilométrage: ${vehicle.mileage?.toLocaleString() || 'N/A'} km
🌍 Source: ${vehicle.source?.toUpperCase() || 'N/A'}`;

      // Send image first if available
      if (imageUrl) {
        await sendImageMessage(phone, imageUrl, `📷 Option ${i + 1}: ${vehicle.make} ${vehicle.model}`);
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      // Send interactive CTA button
      const result = await sendInteractiveMessage(phone, bodyText, `Option ${i + 1}`, selectionUrl);

      if (result.success) {
        sentCount++;
        if (result.messageId) messageIds.push(result.messageId);
      } else {
        console.error(`Failed to send vehicle ${i + 1}:`, result.error);
      }
    }

    return {
      success: sentCount > 1,
      messageId: messageIds.join(','),
      sentCount,
    };
  } catch (error) {
    console.error('WhatsApp send error:', error);
    return { success: false, error: 'Erreur de connexion Meta WhatsApp API' };
  }
}

// GET: Fetch all reassignments
export async function GET(request: Request) {
  try {
    const supabase = supabaseAdmin;
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
    const supabase = supabaseAdmin;
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
    const supabase = supabaseAdmin;
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
        id, // reassignment ID for selection page link
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
    const supabase = supabaseAdmin;
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

import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Corps de requête invalide' }, { status: 400 });
    }

    const { vehicles, destination, shipping_cost_40ft_usd, quote_number_base } = body;

    // Validate
    if (!Array.isArray(vehicles) || vehicles.length < 2 || vehicles.length > 3) {
      return NextResponse.json({ error: '2 ou 3 véhicules requis' }, { status: 400 });
    }

    if (!destination?.id || !destination?.name || !destination?.country) {
      return NextResponse.json({ error: 'Destination requise' }, { status: 400 });
    }

    if (!shipping_cost_40ft_usd || shipping_cost_40ft_usd <= 0) {
      return NextResponse.json({ error: 'Coût transport 40ft requis' }, { status: 400 });
    }

    // All vehicles must have same source
    const sources = [...new Set(vehicles.map((v: { vehicle_source: string }) => v.vehicle_source))];
    if (sources.length !== 1) {
      return NextResponse.json({ error: 'Tous les véhicules doivent avoir la même source' }, { status: 400 });
    }

    // Fetch XAF rate
    let xafRate = 615;
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase as any)
        .from('currency_rates')
        .select('rate_to_usd')
        .eq('currency_code', 'XAF')
        .eq('is_active', true)
        .single();
      if (data?.rate_to_usd) xafRate = Number(data.rate_to_usd);
    } catch {
      // Use default
    }

    const groupId = randomUUID();
    const vehicleCount = vehicles.length;
    const validUntil = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    // Calculate per-vehicle share of shipping (split evenly)
    const shippingPerVehicleUSD = shipping_cost_40ft_usd / vehicleCount;

    const quotesToInsert = vehicles.map((v: {
      vehicle_id: string;
      vehicle_make: string;
      vehicle_model: string;
      vehicle_year: number;
      vehicle_price_usd: number;
      vehicle_source: string;
      insurance_cost_usd: number;
      inspection_fee_usd: number;
      total_cost_usd: number;
    }, index: number) => ({
      quote_number: `${quote_number_base}-${index + 1}`,
      user_id: user.id,
      vehicle_id: v.vehicle_id,
      vehicle_make: v.vehicle_make,
      vehicle_model: v.vehicle_model,
      vehicle_year: v.vehicle_year,
      vehicle_price_usd: Math.round(v.vehicle_price_usd),
      vehicle_source: v.vehicle_source,
      destination_id: destination.id,
      destination_name: destination.name,
      destination_country: destination.country,
      shipping_type: 'container',
      shipping_cost_xaf: Math.round(shippingPerVehicleUSD * xafRate),
      insurance_cost_xaf: Math.round((v.insurance_cost_usd || 0) * xafRate),
      inspection_fee_xaf: Math.round((v.inspection_fee_usd || 0) * xafRate),
      total_cost_xaf: Math.round((v.total_cost_usd || 0) * xafRate),
      status: 'pending',
      valid_until: validUntil,
      group_id: groupId,
      group_vehicle_count: vehicleCount,
      container_type: '40ft',
    }));

    const { data, error } = await supabase
      .from('quotes')
      .insert(quotesToInsert)
      .select();

    if (error) {
      console.error('Multi-quote API error:', error);
      return NextResponse.json({
        error: 'Erreur lors de la création des devis',
        message: error.message,
        code: error.code,
      }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      quotes: data,
      group_id: groupId,
    });
  } catch (error) {
    console.error('Multi-quote API server error:', error);
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}

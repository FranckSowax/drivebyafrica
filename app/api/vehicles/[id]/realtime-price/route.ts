import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { convertToUsdRealTime, getRealTimeRate } from '@/lib/utils/realtime-exchange';

// Vehicle data type (some fields may not exist yet in DB)
interface VehicleData {
  id: string;
  current_price_usd: number;
  source: string;
  original_price?: number | null;
  original_currency?: string | null;
}

/**
 * GET /api/vehicles/[id]/realtime-price
 * Get the vehicle price converted to USD using real-time exchange rates
 *
 * This is used when creating a quote for a vehicle that has an original price
 * in a foreign currency (CNY, KRW, etc.) to ensure accurate USD pricing.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Fetch vehicle with all available columns
    // Note: original_price and original_currency may not exist in older DB schemas
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabaseAny = supabase as any;

    // Try to fetch with original price columns (if they exist)
    const { data: vehicleData, error: vehicleError } = await supabaseAny
      .from('vehicles')
      .select('id, current_price_usd, source, original_price, original_currency')
      .eq('id', id)
      .single();

    let vehicle: VehicleData | null = null;

    if (vehicleError) {
      // If error mentions column doesn't exist, try without those columns
      if (vehicleError.message?.includes('original_price') || vehicleError.message?.includes('original_currency')) {
        const { data: vehicleBasic, error: errorBasic } = await supabase
          .from('vehicles')
          .select('id, current_price_usd, source')
          .eq('id', id)
          .single();

        if (errorBasic || !vehicleBasic) {
          return NextResponse.json(
            { error: 'Vehicle not found' },
            { status: 404 }
          );
        }
        vehicle = vehicleBasic as unknown as VehicleData;
      } else {
        return NextResponse.json(
          { error: 'Vehicle not found' },
          { status: 404 }
        );
      }
    } else {
      vehicle = vehicleData as VehicleData;
    }

    if (!vehicle) {
      return NextResponse.json(
        { error: 'Vehicle not found' },
        { status: 404 }
      );
    }

    // If no original price/currency, return the stored USD price
    if (!vehicle.original_price || !vehicle.original_currency) {
      return NextResponse.json({
        vehicleId: vehicle.id,
        priceUsd: vehicle.current_price_usd,
        source: 'stored', // Using stored USD price
        originalPrice: null,
        originalCurrency: null,
        exchangeRate: null,
      });
    }

    // Convert original price to USD using real-time rate
    const realTimePriceUsd = await convertToUsdRealTime(
      vehicle.original_price,
      vehicle.original_currency
    );

    const realTimeRate = await getRealTimeRate(vehicle.original_currency);

    return NextResponse.json({
      vehicleId: vehicle.id,
      priceUsd: Math.round(realTimePriceUsd),
      storedPriceUsd: vehicle.current_price_usd,
      source: 'realtime', // Using real-time conversion
      originalPrice: vehicle.original_price,
      originalCurrency: vehicle.original_currency,
      exchangeRate: realTimeRate,
      priceDifference: Math.round(realTimePriceUsd) - vehicle.current_price_usd,
    });
  } catch (error) {
    console.error('Error fetching real-time price:', error);
    return NextResponse.json(
      { error: 'Failed to fetch real-time price' },
      { status: 500 }
    );
  }
}

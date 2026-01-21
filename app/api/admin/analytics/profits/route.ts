import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/admin-check';

// Fixed exchange rates for source price calculation (used when syncing from sources)
const FIXED_EXCHANGE_RATES: Record<string, number> = {
  CNY: 7.25, // 1 USD = 7.25 CNY (fixed rate for China)
  KRW: 1350, // 1 USD = 1350 KRW (fixed rate for Korea)
  AED: 3.67, // 1 USD = 3.67 AED (fixed rate for Dubai)
};

// Real-time exchange rate fetch (cached)
async function getRealTimeRate(currency: string): Promise<number | null> {
  try {
    const response = await fetch(
      `https://api.exchangerate-api.com/v4/latest/USD`,
      { next: { revalidate: 3600 } } // Cache for 1 hour
    );
    if (!response.ok) return null;
    const data = await response.json();
    return data.rates?.[currency] || null;
  } catch {
    return null;
  }
}

interface OrderWithVehicle {
  id: string;
  order_number: string;
  vehicle_id: string;
  vehicle_make: string;
  vehicle_model: string;
  vehicle_year: number;
  vehicle_price_usd: number; // Price shown to customer (Driveby price)
  vehicle_source: string;
  destination_country: string;
  order_status: string;
  created_at: string;
  // From vehicles table
  original_price?: number | null;
  original_currency?: string | null;
  start_price_usd?: number | null;
}

interface ProfitAnalysis {
  orderId: string;
  orderNumber: string;
  vehicleMake: string;
  vehicleModel: string;
  vehicleYear: number;
  vehicleSource: string;
  destinationCountry: string;
  orderStatus: string;
  createdAt: string;
  // Prices
  drivebyPriceUSD: number; // Price shown to customer
  sourcePriceOriginal: number | null; // Original price in source currency
  sourceCurrency: string | null;
  sourcePriceUSDFixed: number | null; // Source price converted to USD at fixed rate
  sourcePriceUSDRealtime: number | null; // Source price converted to USD at real-time rate
  // Profits
  profitUSDFixed: number | null; // Driveby price - source price (fixed rate)
  profitUSDRealtime: number | null; // Driveby price - source price (real-time rate)
  profitPercentageFixed: number | null;
  profitPercentageRealtime: number | null;
}

// GET: Fetch profit analysis for all orders
export async function GET() {
  try {
    // Vérification admin obligatoire
    const adminCheck = await requireAdmin();
    if (!adminCheck.isAdmin) {
      return adminCheck.response;
    }

    const supabase = adminCheck.supabase;

    // Fetch all orders with their associated vehicles
    const { data: ordersRaw, error: ordersError } = await supabase
      .from('orders')
      .select(`
        id,
        order_number,
        vehicle_id,
        vehicle_price_usd,
        destination_country,
        status,
        created_at
      `)
      .order('created_at', { ascending: false });

    if (ordersError) {
      console.error('Error fetching orders:', ordersError);
      return NextResponse.json({ error: 'Erreur lors de la récupération des commandes' }, { status: 500 });
    }

    // Get vehicle IDs from orders
    const orderVehicleIds = [...new Set((ordersRaw || []).map(o => o.vehicle_id).filter(Boolean))];

    // Fetch vehicle details (make, model, year, source, original prices)
    // Note: original_price and original_currency may not exist in all deployments
    let vehicleDetails: Record<string, {
      make: string | null;
      model: string | null;
      year: number | null;
      source: string | null;
      original_price: number | null;
      original_currency: string | null;
      start_price_usd: number | null;
    }> = {};

    if (orderVehicleIds.length > 0) {
      // Use raw query to handle columns that may not exist in TypeScript types
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const supabaseAny = supabase as any;
      const { data: vehiclesData } = await supabaseAny
        .from('vehicles')
        .select('id, make, model, year, source, original_price, original_currency, start_price_usd')
        .in('id', orderVehicleIds);

      if (vehiclesData && Array.isArray(vehiclesData)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        vehicleDetails = vehiclesData.reduce((acc: typeof vehicleDetails, v: any) => {
          acc[v.id] = {
            make: v.make || null,
            model: v.model || null,
            year: v.year || null,
            source: v.source || null,
            original_price: v.original_price || null,
            original_currency: v.original_currency || null,
            start_price_usd: v.start_price_usd || null,
          };
          return acc;
        }, {} as typeof vehicleDetails);
      }
    }

    // Transform orders with vehicle details
    const orders = (ordersRaw || []).map(o => {
      const vehicle = vehicleDetails[o.vehicle_id] || {};
      return {
        id: o.id,
        order_number: o.order_number || `ORD-${o.id.substring(0, 8).toUpperCase()}`,
        vehicle_id: o.vehicle_id,
        vehicle_make: vehicle.make || 'N/A',
        vehicle_model: vehicle.model || 'N/A',
        vehicle_year: vehicle.year || 0,
        vehicle_price_usd: o.vehicle_price_usd,
        vehicle_source: vehicle.source || 'china',
        destination_country: o.destination_country,
        order_status: o.status || 'processing',
        created_at: o.created_at,
        original_price: vehicle.original_price,
        original_currency: vehicle.original_currency,
        start_price_usd: vehicle.start_price_usd,
      };
    });

    // Fetch real-time exchange rates
    const realTimeRates: Record<string, number | null> = {};
    const currencies = ['CNY', 'KRW', 'AED'];
    for (const currency of currencies) {
      realTimeRates[currency] = await getRealTimeRate(currency);
    }

    // Calculate profits for each order
    const profitAnalysis: ProfitAnalysis[] = [];
    let totalDrivebyPriceUSD = 0;
    let totalSourcePriceUSDFixed = 0;
    let totalSourcePriceUSDRealtime = 0;
    let ordersWithPriceData = 0;

    for (const order of orders) {
      const originalPrice = order.original_price || null;
      const originalCurrency = order.original_currency || null;

      let sourcePriceUSDFixed: number | null = null;
      let sourcePriceUSDRealtime: number | null = null;
      let profitUSDFixed: number | null = null;
      let profitUSDRealtime: number | null = null;
      let profitPercentageFixed: number | null = null;
      let profitPercentageRealtime: number | null = null;

      const vehiclePriceUSD = order.vehicle_price_usd || 0;

      // Calculate source price in USD using fixed rate
      if (originalPrice && originalCurrency && FIXED_EXCHANGE_RATES[originalCurrency]) {
        sourcePriceUSDFixed = originalPrice / FIXED_EXCHANGE_RATES[originalCurrency];
        profitUSDFixed = vehiclePriceUSD - sourcePriceUSDFixed;
        profitPercentageFixed = sourcePriceUSDFixed > 0
          ? Math.round((profitUSDFixed / sourcePriceUSDFixed) * 100 * 10) / 10
          : null;
      }

      // Calculate source price in USD using real-time rate
      if (originalPrice && originalCurrency && realTimeRates[originalCurrency]) {
        sourcePriceUSDRealtime = originalPrice / realTimeRates[originalCurrency]!;
        profitUSDRealtime = vehiclePriceUSD - sourcePriceUSDRealtime;
        profitPercentageRealtime = sourcePriceUSDRealtime > 0
          ? Math.round((profitUSDRealtime / sourcePriceUSDRealtime) * 100 * 10) / 10
          : null;
      }

      // Accumulate totals
      totalDrivebyPriceUSD += vehiclePriceUSD;
      if (sourcePriceUSDFixed !== null) {
        totalSourcePriceUSDFixed += sourcePriceUSDFixed;
        ordersWithPriceData++;
      }
      if (sourcePriceUSDRealtime !== null) {
        totalSourcePriceUSDRealtime += sourcePriceUSDRealtime;
      }

      profitAnalysis.push({
        orderId: order.id,
        orderNumber: order.order_number,
        vehicleMake: order.vehicle_make,
        vehicleModel: order.vehicle_model,
        vehicleYear: order.vehicle_year,
        vehicleSource: order.vehicle_source,
        destinationCountry: order.destination_country || 'N/A',
        orderStatus: order.order_status,
        createdAt: order.created_at,
        drivebyPriceUSD: vehiclePriceUSD,
        sourcePriceOriginal: originalPrice,
        sourceCurrency: originalCurrency,
        sourcePriceUSDFixed,
        sourcePriceUSDRealtime,
        profitUSDFixed,
        profitUSDRealtime,
        profitPercentageFixed,
        profitPercentageRealtime,
      });
    }

    // Calculate summary stats
    const totalProfitUSDFixed = totalDrivebyPriceUSD - totalSourcePriceUSDFixed;
    const totalProfitUSDRealtime = totalDrivebyPriceUSD - totalSourcePriceUSDRealtime;
    const avgProfitPercentageFixed = totalSourcePriceUSDFixed > 0
      ? Math.round((totalProfitUSDFixed / totalSourcePriceUSDFixed) * 100 * 10) / 10
      : null;
    const avgProfitPercentageRealtime = totalSourcePriceUSDRealtime > 0
      ? Math.round((totalProfitUSDRealtime / totalSourcePriceUSDRealtime) * 100 * 10) / 10
      : null;

    // Group by source for breakdown
    const bySource: Record<string, {
      count: number;
      totalDrivebyUSD: number;
      totalSourceUSDFixed: number;
      totalSourceUSDRealtime: number;
      totalProfitUSDFixed: number;
      totalProfitUSDRealtime: number;
    }> = {};

    for (const analysis of profitAnalysis) {
      const source = analysis.vehicleSource || 'unknown';
      if (!bySource[source]) {
        bySource[source] = {
          count: 0,
          totalDrivebyUSD: 0,
          totalSourceUSDFixed: 0,
          totalSourceUSDRealtime: 0,
          totalProfitUSDFixed: 0,
          totalProfitUSDRealtime: 0,
        };
      }
      bySource[source].count++;
      bySource[source].totalDrivebyUSD += analysis.drivebyPriceUSD || 0;
      if (analysis.sourcePriceUSDFixed !== null) {
        bySource[source].totalSourceUSDFixed += analysis.sourcePriceUSDFixed;
        bySource[source].totalProfitUSDFixed += analysis.profitUSDFixed || 0;
      }
      if (analysis.sourcePriceUSDRealtime !== null) {
        bySource[source].totalSourceUSDRealtime += analysis.sourcePriceUSDRealtime;
        bySource[source].totalProfitUSDRealtime += analysis.profitUSDRealtime || 0;
      }
    }

    return NextResponse.json({
      summary: {
        totalOrders: profitAnalysis.length,
        ordersWithPriceData,
        totalDrivebyPriceUSD: Math.round(totalDrivebyPriceUSD),
        totalSourcePriceUSDFixed: Math.round(totalSourcePriceUSDFixed),
        totalSourcePriceUSDRealtime: Math.round(totalSourcePriceUSDRealtime),
        totalProfitUSDFixed: Math.round(totalProfitUSDFixed),
        totalProfitUSDRealtime: Math.round(totalProfitUSDRealtime),
        avgProfitPercentageFixed,
        avgProfitPercentageRealtime,
      },
      bySource,
      exchangeRates: {
        fixed: FIXED_EXCHANGE_RATES,
        realtime: realTimeRates,
      },
      orders: profitAnalysis,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching profit analytics:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des analytics de profit' },
      { status: 500 }
    );
  }
}

import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/admin-check';

// Note:
// - Prix Driveby = total_cost_xaf converted to USD (what customer pays)
// - Prix Source = start_price_usd from vehicles table (source auction price)
// - XAF to USD rate: ~630 XAF = 1 USD (approximate, we'll fetch real rate)

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
  drivebyPriceUSD: number; // Customer price (total_cost_xaf converted to USD)
  drivebyPriceXAF: number | null; // Customer price in XAF
  sourcePriceUSD: number | null; // Source price in USD (start_price_usd from vehicles)
  // Profits
  profitUSD: number | null; // Driveby price - source price
  profitPercentage: number | null; // Profit margin percentage
}

// Fixed XAF to USD exchange rate for profit calculations
// Using fixed rate of 600 XAF = 1 USD for consistency
const FIXED_XAF_TO_USD_RATE = 600;

// GET: Fetch profit analysis for all orders
export async function GET() {
  try {
    // Vérification admin obligatoire
    const adminCheck = await requireAdmin();
    if (!adminCheck.isAdmin) {
      return adminCheck.response;
    }

    const supabase = adminCheck.supabase;

    // Use fixed XAF to USD exchange rate
    const xafToUsdRate = FIXED_XAF_TO_USD_RATE;

    // Fetch all orders with their associated vehicles
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabaseAny = supabase as any;
    const { data: ordersRaw, error: ordersError } = await supabaseAny
      .from('orders')
      .select(`
        id,
        order_number,
        vehicle_id,
        quote_id,
        vehicle_price_usd,
        total_cost_xaf,
        destination_country,
        status,
        created_at
      `)
      .order('created_at', { ascending: false });

    if (ordersError) {
      console.error('Error fetching orders:', ordersError);
      return NextResponse.json({ error: 'Erreur lors de la récupération des commandes' }, { status: 500 });
    }

    // Get quote IDs to fetch total_cost_xaf from quotes table
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const quoteIds = [...new Set((ordersRaw || []).map((o: any) => o.quote_id).filter(Boolean))];

    // Fetch quotes with total_cost_xaf (since it's not stored in orders table)
    let quoteDetails: Record<string, { total_cost_xaf: number | null }> = {};
    if (quoteIds.length > 0) {
      const { data: quotesData } = await supabaseAny
        .from('quotes')
        .select('id, total_cost_xaf')
        .in('id', quoteIds);

      if (quotesData && Array.isArray(quotesData)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        quoteDetails = quotesData.reduce((acc: typeof quoteDetails, q: any) => {
          acc[q.id] = { total_cost_xaf: q.total_cost_xaf || null };
          return acc;
        }, {} as typeof quoteDetails);
      }
    }

    // Get vehicle IDs from orders
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const orderVehicleIds = [...new Set((ordersRaw || []).map((o: any) => o.vehicle_id).filter(Boolean))];

    // Fetch vehicle details (make, model, year, source, start_price_usd)
    let vehicleDetails: Record<string, {
      make: string | null;
      model: string | null;
      year: number | null;
      source: string | null;
      start_price_usd: number | null;
    }> = {};

    if (orderVehicleIds.length > 0) {
      const { data: vehiclesData } = await supabaseAny
        .from('vehicles')
        .select('id, make, model, year, source, start_price_usd')
        .in('id', orderVehicleIds);

      if (vehiclesData && Array.isArray(vehiclesData)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        vehicleDetails = vehiclesData.reduce((acc: typeof vehicleDetails, v: any) => {
          acc[v.id] = {
            make: v.make || null,
            model: v.model || null,
            year: v.year || null,
            source: v.source || null,
            start_price_usd: v.start_price_usd || null,
          };
          return acc;
        }, {} as typeof vehicleDetails);
      }
    }

    // Transform orders with vehicle details
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const orders = (ordersRaw || []).map((o: any) => {
      const vehicle = vehicleDetails[o.vehicle_id] || {};
      // Get total_cost_xaf from quotes table (since it's not stored in orders)
      const quoteData = o.quote_id ? quoteDetails[o.quote_id] : null;
      const totalCostXaf = quoteData?.total_cost_xaf || o.total_cost_xaf || 0;
      // Calculate customer price in USD from total_cost_xaf
      const drivebyPriceUSD = totalCostXaf > 0 ? Math.round(totalCostXaf / xafToUsdRate) : (o.vehicle_price_usd || 0);

      return {
        id: o.id,
        order_number: o.order_number || `ORD-${o.id.substring(0, 8).toUpperCase()}`,
        vehicle_id: o.vehicle_id,
        vehicle_make: vehicle.make || 'N/A',
        vehicle_model: vehicle.model || 'N/A',
        vehicle_year: vehicle.year || 0,
        driveby_price_usd: drivebyPriceUSD,
        total_cost_xaf: totalCostXaf,
        vehicle_source: vehicle.source || 'china',
        destination_country: o.destination_country,
        order_status: o.status || 'processing',
        created_at: o.created_at,
        start_price_usd: vehicle.start_price_usd,
      };
    });

    // Calculate profits for each order
    const profitAnalysis: ProfitAnalysis[] = [];
    let totalDrivebyPriceUSD = 0;
    let totalSourcePriceUSD = 0;
    let ordersWithPriceData = 0;

    for (const order of orders) {
      const drivebyPriceUSD = order.driveby_price_usd || 0; // Customer price (from total_cost_xaf)
      const totalCostXaf = order.total_cost_xaf || null;
      const sourcePriceUSD = order.start_price_usd || null; // Source price from vehicles table

      let profitUSD: number | null = null;
      let profitPercentage: number | null = null;

      // Calculate profit if we have both prices
      if (sourcePriceUSD !== null && sourcePriceUSD > 0 && drivebyPriceUSD > 0) {
        profitUSD = drivebyPriceUSD - sourcePriceUSD;
        profitPercentage = Math.round((profitUSD / sourcePriceUSD) * 100 * 10) / 10;
        totalSourcePriceUSD += sourcePriceUSD;
        ordersWithPriceData++;
      }

      // Accumulate totals
      totalDrivebyPriceUSD += drivebyPriceUSD;

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
        drivebyPriceUSD,
        drivebyPriceXAF: totalCostXaf,
        sourcePriceUSD,
        profitUSD,
        profitPercentage,
      });
    }

    // Calculate summary stats
    const totalProfitUSD = totalDrivebyPriceUSD - totalSourcePriceUSD;
    const avgProfitPercentage = totalSourcePriceUSD > 0
      ? Math.round((totalProfitUSD / totalSourcePriceUSD) * 100 * 10) / 10
      : null;

    // Group by source for breakdown
    const bySource: Record<string, {
      count: number;
      totalDrivebyUSD: number;
      totalSourceUSD: number;
      totalProfitUSD: number;
      avgProfitPercentage: number | null;
    }> = {};

    for (const analysis of profitAnalysis) {
      const source = analysis.vehicleSource || 'unknown';
      if (!bySource[source]) {
        bySource[source] = {
          count: 0,
          totalDrivebyUSD: 0,
          totalSourceUSD: 0,
          totalProfitUSD: 0,
          avgProfitPercentage: null,
        };
      }
      bySource[source].count++;
      bySource[source].totalDrivebyUSD += analysis.drivebyPriceUSD || 0;
      if (analysis.sourcePriceUSD !== null) {
        bySource[source].totalSourceUSD += analysis.sourcePriceUSD;
        bySource[source].totalProfitUSD += analysis.profitUSD || 0;
      }
    }

    // Calculate average profit percentage per source
    for (const source of Object.keys(bySource)) {
      if (bySource[source].totalSourceUSD > 0) {
        bySource[source].avgProfitPercentage = Math.round(
          (bySource[source].totalProfitUSD / bySource[source].totalSourceUSD) * 100 * 10
        ) / 10;
      }
    }

    return NextResponse.json({
      summary: {
        totalOrders: profitAnalysis.length,
        ordersWithPriceData,
        totalDrivebyPriceUSD: Math.round(totalDrivebyPriceUSD),
        totalSourcePriceUSD: Math.round(totalSourcePriceUSD),
        totalProfitUSD: Math.round(totalProfitUSD),
        avgProfitPercentage,
      },
      bySource,
      exchangeRate: {
        xafToUsd: xafToUsdRate,
        description: `1 USD = ${xafToUsdRate} XAF (taux fixe)`,
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

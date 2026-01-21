import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/admin-check';

// Note: We use start_price_usd from vehicles table as the source price
// This is the price already converted to USD during sync from source APIs

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
  drivebyPriceUSD: number; // Price shown to customer (Driveby price)
  sourcePriceUSD: number | null; // Source price in USD (start_price_usd from vehicles)
  // Profits
  profitUSD: number | null; // Driveby price - source price
  profitPercentage: number | null; // Profit margin percentage
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

    // Calculate profits for each order
    const profitAnalysis: ProfitAnalysis[] = [];
    let totalDrivebyPriceUSD = 0;
    let totalSourcePriceUSD = 0;
    let ordersWithPriceData = 0;

    for (const order of orders) {
      const vehiclePriceUSD = order.vehicle_price_usd || 0; // Driveby price shown to customer
      const sourcePriceUSD = order.start_price_usd || null; // Source price from vehicles table

      let profitUSD: number | null = null;
      let profitPercentage: number | null = null;

      // Calculate profit if we have source price
      if (sourcePriceUSD !== null && sourcePriceUSD > 0) {
        profitUSD = vehiclePriceUSD - sourcePriceUSD;
        profitPercentage = Math.round((profitUSD / sourcePriceUSD) * 100 * 10) / 10;
        totalSourcePriceUSD += sourcePriceUSD;
        ordersWithPriceData++;
      }

      // Accumulate totals
      totalDrivebyPriceUSD += vehiclePriceUSD;

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

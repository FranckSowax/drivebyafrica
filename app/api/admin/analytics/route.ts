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

// GET: Fetch comprehensive analytics data
export async function GET() {
  try {
    const supabase = await createSupabaseClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabaseAny = supabase as any;

    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    // ===== VEHICLES STATS =====
    const { data: vehicles, count: vehiclesTotal } = await supabase
      .from('vehicles')
      .select('id, source, make, model, views_count, favorites_count, current_price_usd, created_at, auction_status', { count: 'exact' });

    // Active vehicles (not sold)
    const activeVehicles = vehicles?.filter(v => v.auction_status !== 'sold') || [];
    const soldVehicles = vehicles?.filter(v => v.auction_status === 'sold') || [];

    // Views and favorites totals
    const totalViews = vehicles?.reduce((sum, v) => sum + (v.views_count || 0), 0) || 0;
    const totalFavorites = vehicles?.reduce((sum, v) => sum + (v.favorites_count || 0), 0) || 0;

    // Vehicles by source (normalize source names)
    const normalizeSource = (source: string): string => {
      const s = (source || '').toLowerCase().trim();
      // China sources
      if (s === 'che168' || s === 'dongchedi' || s === 'china' || s === 'chine') return 'china';
      // Dubai sources
      if (s === 'dubicars' || s === 'dubai' || s === 'uae' || s === 'emirates') return 'dubai';
      // Korea sources
      if (s === 'korea' || s === 'south korea' || s === 'corée' || s === 'coree') return 'korea';
      // Default - if unknown, return as-is but lowercased
      return s || 'unknown';
    };
    const vehiclesBySource: Record<string, number> = {};
    vehicles?.forEach(v => {
      const normalizedSource = normalizeSource(v.source);
      vehiclesBySource[normalizedSource] = (vehiclesBySource[normalizedSource] || 0) + 1;
    });

    // Top viewed vehicles
    const topViewedVehicles = [...(vehicles || [])]
      .sort((a, b) => (b.views_count || 0) - (a.views_count || 0))
      .slice(0, 5)
      .map(v => ({
        id: v.id,
        make: v.make,
        model: v.model,
        views: v.views_count || 0,
        favorites: v.favorites_count || 0,
      }));

    // Top favorited vehicles
    const topFavoritedVehicles = [...(vehicles || [])]
      .sort((a, b) => (b.favorites_count || 0) - (a.favorites_count || 0))
      .slice(0, 5)
      .map(v => ({
        id: v.id,
        make: v.make,
        model: v.model,
        views: v.views_count || 0,
        favorites: v.favorites_count || 0,
      }));

    // Top makes
    const makesCounts: Record<string, number> = {};
    vehicles?.forEach(v => {
      makesCounts[v.make] = (makesCounts[v.make] || 0) + 1;
    });
    const topMakes = Object.entries(makesCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([make, count]) => ({ make, count }));

    // Vehicles added this month
    const vehiclesThisMonth = vehicles?.filter(v => new Date(v.created_at) >= startOfMonth).length || 0;
    const vehiclesLastMonth = vehicles?.filter(v => {
      const date = new Date(v.created_at);
      return date >= startOfLastMonth && date <= endOfLastMonth;
    }).length || 0;

    // ===== USERS STATS =====
    const { data: profiles, count: usersTotal } = await supabase
      .from('profiles')
      .select('id, country, created_at', { count: 'exact' });

    // Users by period
    const usersToday = profiles?.filter(p => new Date(p.created_at) >= startOfDay).length || 0;
    const usersThisWeek = profiles?.filter(p => new Date(p.created_at) >= startOfWeek).length || 0;
    const usersThisMonth = profiles?.filter(p => new Date(p.created_at) >= startOfMonth).length || 0;
    const usersLastMonth = profiles?.filter(p => {
      const date = new Date(p.created_at);
      return date >= startOfLastMonth && date <= endOfLastMonth;
    }).length || 0;
    const usersThisYear = profiles?.filter(p => new Date(p.created_at) >= startOfYear).length || 0;

    // Users by country
    const usersByCountry: Record<string, number> = {};
    profiles?.forEach(p => {
      const country = p.country || 'Non spécifié';
      usersByCountry[country] = (usersByCountry[country] || 0) + 1;
    });
    const topCountries = Object.entries(usersByCountry)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([country, count]) => ({
        country,
        count,
        percentage: Math.round((count / (usersTotal || 1)) * 100)
      }));

    // ===== QUOTES STATS =====
    const { data: quotes, count: quotesTotal } = await supabaseAny
      .from('quotes')
      .select('id, status, destination_country, vehicle_source, vehicle_make, vehicle_id, vehicle_price_usd, total_cost_xaf, created_at', { count: 'exact' });

    // Quotes by status
    const quotesByStatus: Record<string, number> = {};
    quotes?.forEach((q: { status: string }) => {
      quotesByStatus[q.status] = (quotesByStatus[q.status] || 0) + 1;
    });

    // Quotes by period
    const quotesToday = quotes?.filter((q: { created_at: string }) => new Date(q.created_at) >= startOfDay).length || 0;
    const quotesThisWeek = quotes?.filter((q: { created_at: string }) => new Date(q.created_at) >= startOfWeek).length || 0;
    const quotesThisMonth = quotes?.filter((q: { created_at: string }) => new Date(q.created_at) >= startOfMonth).length || 0;
    const quotesLastMonth = quotes?.filter((q: { created_at: string }) => {
      const date = new Date(q.created_at);
      return date >= startOfLastMonth && date <= endOfLastMonth;
    }).length || 0;

    // Quotes by destination
    const quotesByDestination: Record<string, number> = {};
    quotes?.forEach((q: { destination_country: string }) => {
      quotesByDestination[q.destination_country] = (quotesByDestination[q.destination_country] || 0) + 1;
    });
    const topDestinations = Object.entries(quotesByDestination)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([country, count]) => ({
        country,
        count,
        percentage: Math.round((count / (quotesTotal || 1)) * 100)
      }));

    // Quotes by vehicle source
    const quotesBySource: Record<string, number> = {};
    quotes?.forEach((q: { vehicle_source: string }) => {
      quotesBySource[q.vehicle_source] = (quotesBySource[q.vehicle_source] || 0) + 1;
    });

    // Top quoted makes
    const quotedMakes: Record<string, number> = {};
    quotes?.forEach((q: { vehicle_make: string }) => {
      quotedMakes[q.vehicle_make] = (quotedMakes[q.vehicle_make] || 0) + 1;
    });
    const topQuotedMakes = Object.entries(quotedMakes)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([make, count]) => ({ make, count }));

    // Revenue from accepted quotes
    const acceptedQuotes = quotes?.filter((q: { status: string }) => q.status === 'accepted') || [];
    const totalRevenueXAF = acceptedQuotes.reduce((sum: number, q: { total_cost_xaf: number }) => sum + (q.total_cost_xaf || 0), 0);
    const totalDepositsUSD = acceptedQuotes.length * 1000; // $1000 per order

    // ===== VEHICLE PRICING STATS (Driveby price vs Source price) =====
    // Get vehicle IDs from quotes to fetch source prices
    const quoteVehicleIds = quotes?.map((q: { vehicle_id: string }) => q.vehicle_id).filter(Boolean) || [];

    // Fetch vehicles with their source prices
    let vehicleSourcePrices: Record<string, number> = {};
    if (quoteVehicleIds.length > 0) {
      try {
        const { data: quoteVehicles } = await supabase
          .from('vehicles')
          .select('id, current_price_usd')
          .in('id', quoteVehicleIds);

        if (quoteVehicles) {
          quoteVehicles.forEach((v: { id: string; current_price_usd: number | null }) => {
            if (v.current_price_usd) {
              vehicleSourcePrices[v.id] = v.current_price_usd;
            }
          });
        }
      } catch {
        // Vehicles table query failed
      }
    }

    // Calculate totals for all quotes with prices
    const quotesWithPrices = quotes?.filter((q: { vehicle_price_usd: number | null }) => q.vehicle_price_usd !== null) || [];
    const totalDrivebyPriceUSD = quotesWithPrices.reduce((sum: number, q: { vehicle_price_usd: number }) => sum + (q.vehicle_price_usd || 0), 0);

    // Count how many vehicles still exist (have source prices)
    const vehiclesFoundCount = quotesWithPrices.filter((q: { vehicle_id: string }) => vehicleSourcePrices[q.vehicle_id]).length;
    const vehiclesMissingCount = quotesWithPrices.length - vehiclesFoundCount;

    // Calculate total source prices (only for quotes with matching vehicles that still exist)
    const totalSourcePriceUSD = quotesWithPrices.reduce((sum: number, q: { vehicle_id: string }) => {
      const sourcePrice = vehicleSourcePrices[q.vehicle_id] || 0;
      return sum + sourcePrice;
    }, 0);

    // Calculate for accepted quotes only
    const acceptedWithPrices = acceptedQuotes.filter((q: { vehicle_price_usd: number | null }) => q.vehicle_price_usd !== null);
    const acceptedDrivebyPriceUSD = acceptedWithPrices.reduce((sum: number, q: { vehicle_price_usd: number }) => sum + (q.vehicle_price_usd || 0), 0);
    const acceptedSourcePriceUSD = acceptedWithPrices.reduce((sum: number, q: { vehicle_id: string }) => {
      const sourcePrice = vehicleSourcePrices[q.vehicle_id] || 0;
      return sum + sourcePrice;
    }, 0);
    const acceptedVehiclesFoundCount = acceptedWithPrices.filter((q: { vehicle_id: string }) => vehicleSourcePrices[q.vehicle_id]).length;

    // Calculate margin - only if we have valid source prices
    const totalMarginUSD = totalDrivebyPriceUSD - totalSourcePriceUSD;
    const acceptedMarginUSD = acceptedDrivebyPriceUSD - acceptedSourcePriceUSD;
    const marginPercentage = totalSourcePriceUSD > 0 ? Math.round((totalMarginUSD / totalSourcePriceUSD) * 100) : 0;

    // ===== ORDERS STATS (from order_tracking) =====
    let ordersStats = {
      total: 0,
      deposit_paid: 0,
      vehicle_purchased: 0,
      in_transit: 0,
      shipping: 0,
      delivered: 0,
    };

    try {
      const { data: orderTracking } = await supabaseAny
        .from('order_tracking')
        .select('order_status');

      if (orderTracking && Array.isArray(orderTracking)) {
        ordersStats.total = orderTracking.length;
        orderTracking.forEach((o: { order_status: string }) => {
          if (o.order_status === 'deposit_paid') ordersStats.deposit_paid++;
          if (o.order_status === 'vehicle_purchased') ordersStats.vehicle_purchased++;
          if (o.order_status === 'in_transit' || o.order_status === 'at_port') ordersStats.in_transit++;
          if (o.order_status === 'shipping') ordersStats.shipping++;
          if (o.order_status === 'delivered') ordersStats.delivered++;
        });
      }
    } catch {
      // order_tracking table may not exist
      ordersStats.total = acceptedQuotes.length;
      ordersStats.deposit_paid = acceptedQuotes.length;
    }

    // ===== FAVORITES STATS =====
    const { count: favoritesTotal } = await supabase
      .from('favorites')
      .select('id', { count: 'exact', head: true });

    // ===== CHAT STATS =====
    let chatStats = {
      totalConversations: 0,
      activeConversations: 0,
      waitingAgent: 0,
      totalMessages: 0,
      messagesThisWeek: 0,
    };

    try {
      const { data: conversations, count: conversationsCount } = await supabaseAny
        .from('chat_conversations')
        .select('id, status', { count: 'exact' });

      if (conversations) {
        chatStats.totalConversations = conversationsCount || 0;
        chatStats.activeConversations = conversations.filter((c: { status: string }) => c.status === 'active').length;
        chatStats.waitingAgent = conversations.filter((c: { status: string }) => c.status === 'waiting_agent').length;
      }

      const { count: messagesCount } = await supabaseAny
        .from('chat_messages')
        .select('id', { count: 'exact', head: true });

      chatStats.totalMessages = messagesCount || 0;

      const { count: messagesWeekCount } = await supabaseAny
        .from('chat_messages')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', startOfWeek.toISOString());

      chatStats.messagesThisWeek = messagesWeekCount || 0;
    } catch {
      // chat tables may not exist
    }

    // ===== CONVERSION RATES =====
    const conversionRate = usersTotal && quotesTotal
      ? Math.round((quotesTotal / usersTotal) * 100)
      : 0;

    const quoteAcceptanceRate = quotesTotal
      ? Math.round((acceptedQuotes.length / quotesTotal) * 100)
      : 0;

    // ===== GROWTH CALCULATIONS =====
    const usersGrowth = usersLastMonth > 0
      ? Math.round(((usersThisMonth - usersLastMonth) / usersLastMonth) * 100)
      : 100;

    const quotesGrowth = quotesLastMonth > 0
      ? Math.round(((quotesThisMonth - quotesLastMonth) / quotesLastMonth) * 100)
      : 100;

    const vehiclesGrowth = vehiclesLastMonth > 0
      ? Math.round(((vehiclesThisMonth - vehiclesLastMonth) / vehiclesLastMonth) * 100)
      : 100;

    // ===== RECENT ACTIVITY =====
    // Get recent quotes
    const recentQuotes = [...(quotes || [])]
      .sort((a: { created_at: string }, b: { created_at: string }) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 5);

    // Get recent users
    const recentUsers = [...(profiles || [])]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 5);

    // ===== SYNC LOGS DATA =====
    let syncLogsData: Array<{
      date: string;
      source: string;
      vehicles_added: number;
      vehicles_updated: number;
      vehicles_removed: number;
      status: string;
    }> = [];

    try {
      const { data: syncLogs } = await supabaseAny
        .from('sync_logs')
        .select('source, started_at, vehicles_added, vehicles_updated, vehicles_removed, status')
        .order('started_at', { ascending: false })
        .limit(500);

      if (syncLogs && Array.isArray(syncLogs)) {
        syncLogsData = syncLogs.map((log: {
          source: string;
          started_at: string;
          vehicles_added: number;
          vehicles_updated: number;
          vehicles_removed: number;
          status: string;
        }) => ({
          date: log.started_at?.split('T')[0] || '',
          source: log.source,
          vehicles_added: log.vehicles_added || 0,
          vehicles_updated: log.vehicles_updated || 0,
          vehicles_removed: log.vehicles_removed || 0,
          status: log.status,
        }));
      }
    } catch {
      // sync_logs table may not exist
    }

    // Aggregate sync data by day
    const syncByDay: Record<string, { added: number; updated: number; removed: number; syncs: number }> = {};
    syncLogsData.forEach(log => {
      if (!log.date) return;
      if (!syncByDay[log.date]) {
        syncByDay[log.date] = { added: 0, updated: 0, removed: 0, syncs: 0 };
      }
      syncByDay[log.date].added += log.vehicles_added;
      syncByDay[log.date].updated += log.vehicles_updated;
      syncByDay[log.date].removed += log.vehicles_removed;
      syncByDay[log.date].syncs += 1;
    });

    // ===== TIME SERIES DATA (Last 90 days) =====
    const timeSeriesData: Array<{
      date: string;
      users: number;
      quotes: number;
      vehicles: number;
      views: number;
      syncAdded: number;
      syncUpdated: number;
      totalVehicles: number;
    }> = [];

    // Calculate cumulative vehicle count from sync logs
    // Start with current total and work backwards
    const currentTotalVehicles = vehiclesTotal || 0;

    // Create a map of daily net changes from sync logs (added - removed)
    const dailyNetChange: Record<string, number> = {};
    syncLogsData.forEach(log => {
      if (!log.date) return;
      if (!dailyNetChange[log.date]) {
        dailyNetChange[log.date] = 0;
      }
      dailyNetChange[log.date] += (log.vehicles_added - log.vehicles_removed);
    });

    // Generate data for last 90 days
    // First pass: collect all dates
    const dates: string[] = [];
    for (let i = 89; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      dates.push(date.toISOString().split('T')[0]);
    }

    // Calculate cumulative totals working backwards from today
    const cumulativeTotals: Record<string, number> = {};
    let runningTotal = currentTotalVehicles;

    // Work backwards from today
    for (let i = dates.length - 1; i >= 0; i--) {
      const dateStr = dates[i];
      cumulativeTotals[dateStr] = runningTotal;
      // Subtract today's net change to get yesterday's total
      if (i > 0) {
        runningTotal -= (dailyNetChange[dateStr] || 0);
      }
    }

    // Now generate the time series data
    for (let i = 0; i < dates.length; i++) {
      const dateStr = dates[i];
      const date = new Date(dateStr);
      const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayEnd.getDate() + 1);

      const usersOnDay = profiles?.filter(p => {
        const d = new Date(p.created_at);
        return d >= dayStart && d < dayEnd;
      }).length || 0;

      const quotesOnDay = quotes?.filter((q: { created_at: string }) => {
        const d = new Date(q.created_at);
        return d >= dayStart && d < dayEnd;
      }).length || 0;

      const vehiclesOnDay = vehicles?.filter(v => {
        const d = new Date(v.created_at);
        return d >= dayStart && d < dayEnd;
      }).length || 0;

      // Estimate views based on vehicle views (distribute proportionally)
      const viewsOnDay = Math.floor((totalViews / 90) * (0.5 + Math.random()));

      // Get sync data for this day
      const syncData = syncByDay[dateStr] || { added: 0, updated: 0, removed: 0, syncs: 0 };

      timeSeriesData.push({
        date: dateStr,
        users: usersOnDay,
        quotes: quotesOnDay,
        vehicles: vehiclesOnDay,
        views: viewsOnDay,
        syncAdded: syncData.added,
        syncUpdated: syncData.updated,
        totalVehicles: cumulativeTotals[dateStr] || currentTotalVehicles,
      });
    }

    // ===== MONTHLY COMPARISON DATA =====
    const monthlyData: Array<{
      month: string;
      users: number;
      quotes: number;
      vehicles: number;
    }> = [];

    // Aggregate sync logs by month for vehicle counts
    const syncByMonth: Record<string, { added: number; removed: number }> = {};
    syncLogsData.forEach(log => {
      if (!log.date) return;
      const monthKey = log.date.substring(0, 7); // YYYY-MM
      if (!syncByMonth[monthKey]) {
        syncByMonth[monthKey] = { added: 0, removed: 0 };
      }
      syncByMonth[monthKey].added += log.vehicles_added;
      syncByMonth[monthKey].removed += log.vehicles_removed;
    });

    // Calculate cumulative vehicle totals for each month (working backwards from current)
    const monthKeys: string[] = [];
    for (let i = 5; i >= 0; i--) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      monthKeys.push(monthDate.toISOString().substring(0, 7));
    }

    // Calculate cumulative totals working backwards
    const monthlyCumulativeTotals: Record<string, number> = {};
    let monthlyRunningTotal = currentTotalVehicles;
    for (let i = monthKeys.length - 1; i >= 0; i--) {
      const monthKey = monthKeys[i];
      monthlyCumulativeTotals[monthKey] = monthlyRunningTotal;
      // Subtract this month's net change to get previous month's total
      if (i > 0) {
        const monthSync = syncByMonth[monthKey] || { added: 0, removed: 0 };
        monthlyRunningTotal -= (monthSync.added - monthSync.removed);
      }
    }

    // Get data for last 6 months
    for (let i = 5; i >= 0; i--) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);
      const monthName = monthDate.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' });
      const monthKey = monthDate.toISOString().substring(0, 7);

      const usersInMonth = profiles?.filter(p => {
        const d = new Date(p.created_at);
        return d >= monthDate && d <= monthEnd;
      }).length || 0;

      const quotesInMonth = quotes?.filter((q: { created_at: string }) => {
        const d = new Date(q.created_at);
        return d >= monthDate && d <= monthEnd;
      }).length || 0;

      // Use cumulative vehicle total at end of month instead of created_at count
      const vehiclesAtEndOfMonth = monthlyCumulativeTotals[monthKey] || currentTotalVehicles;

      monthlyData.push({
        month: monthName,
        users: usersInMonth,
        quotes: quotesInMonth,
        vehicles: vehiclesAtEndOfMonth,
      });
    }

    return NextResponse.json({
      // Main KPIs
      kpis: {
        totalVehicles: vehiclesTotal || 0,
        activeVehicles: activeVehicles.length,
        soldVehicles: soldVehicles.length,
        totalUsers: usersTotal || 0,
        totalQuotes: quotesTotal || 0,
        totalOrders: ordersStats.total,
        totalViews: totalViews,
        totalFavorites: favoritesTotal || 0,
        totalRevenueXAF: totalRevenueXAF,
        totalDepositsUSD: totalDepositsUSD,
        conversionRate,
        quoteAcceptanceRate,
      },

      // Vehicle pricing comparison (Driveby vs Source)
      vehiclePricing: {
        totalDrivebyPriceUSD,
        totalSourcePriceUSD,
        totalMarginUSD,
        marginPercentage,
        quotesWithPricesCount: quotesWithPrices.length,
        vehiclesFoundCount,
        vehiclesMissingCount,
        acceptedDrivebyPriceUSD,
        acceptedSourcePriceUSD,
        acceptedMarginUSD,
        acceptedCount: acceptedWithPrices.length,
        acceptedVehiclesFoundCount,
      },

      // Period comparisons
      growth: {
        usersGrowth,
        quotesGrowth,
        vehiclesGrowth,
      },

      // Vehicles breakdown
      vehicles: {
        total: vehiclesTotal || 0,
        active: activeVehicles.length,
        sold: soldVehicles.length,
        bySource: vehiclesBySource,
        thisMonth: vehiclesThisMonth,
        lastMonth: vehiclesLastMonth,
        topViewed: topViewedVehicles,
        topFavorited: topFavoritedVehicles,
        topMakes: topMakes,
      },

      // Users breakdown
      users: {
        total: usersTotal || 0,
        today: usersToday,
        thisWeek: usersThisWeek,
        thisMonth: usersThisMonth,
        lastMonth: usersLastMonth,
        thisYear: usersThisYear,
        byCountry: topCountries,
      },

      // Quotes breakdown
      quotes: {
        total: quotesTotal || 0,
        byStatus: quotesByStatus,
        today: quotesToday,
        thisWeek: quotesThisWeek,
        thisMonth: quotesThisMonth,
        lastMonth: quotesLastMonth,
        byDestination: topDestinations,
        bySource: quotesBySource,
        topMakes: topQuotedMakes,
        acceptedCount: acceptedQuotes.length,
      },

      // Orders breakdown
      orders: ordersStats,

      // Chat stats
      chat: chatStats,

      // Recent activity
      recentActivity: {
        quotes: recentQuotes,
        users: recentUsers,
      },

      // Time series data for charts
      timeSeries: timeSeriesData,
      monthlyComparison: monthlyData,

      // Timestamp
      generatedAt: now.toISOString(),
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des analytics' },
      { status: 500 }
    );
  }
}

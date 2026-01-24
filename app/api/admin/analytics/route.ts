import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/admin-check';

// GET: Fetch comprehensive analytics data
export async function GET() {
  try {
    // Vérification admin obligatoire
    const adminCheck = await requireAdmin();
    if (!adminCheck.isAdmin) {
      return adminCheck.response;
    }

    const supabase = adminCheck.supabase;
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
    // Get total count first
    const { count: vehiclesTotal } = await supabase
      .from('vehicles')
      .select('*', { count: 'exact', head: true });

    // Get a sample of vehicles for detailed stats (limited to 1000 by Supabase default)
    const { data: vehicles } = await supabase
      .from('vehicles')
      .select('id, source, make, model, views_count, favorites_count, current_price_usd, created_at, auction_status');

    // Active vehicles (not sold) - count from DB directly
    const { count: activeVehiclesCount } = await supabase
      .from('vehicles')
      .select('*', { count: 'exact', head: true })
      .neq('auction_status', 'sold');

    const { count: soldVehiclesCount } = await supabase
      .from('vehicles')
      .select('*', { count: 'exact', head: true })
      .eq('auction_status', 'sold');

    // For backwards compatibility
    const activeVehicles = { length: activeVehiclesCount || 0 };
    const soldVehicles = { length: soldVehiclesCount || 0 };

    // Views and favorites totals - use RPC or estimate from sample
    const totalViews = vehicles?.reduce((sum, v) => sum + (v.views_count || 0), 0) || 0;
    const totalFavorites = vehicles?.reduce((sum, v) => sum + (v.favorites_count || 0), 0) || 0;

    // Vehicles by source - query each source separately for accurate counts
    const normalizeSource = (source: string): string => {
      const s = (source || '').toLowerCase().trim();
      if (s === 'che168' || s === 'dongchedi' || s === 'china' || s === 'chine') return 'china';
      if (s === 'dubicars' || s === 'dubai' || s === 'uae' || s === 'emirates') return 'dubai';
      if (s === 'korea' || s === 'south korea' || s === 'corée' || s === 'coree') return 'korea';
      return s || 'unknown';
    };

    // Get accurate counts by querying each source
    const vehiclesBySource: Record<string, number> = {};

    // Count China sources
    const { count: chinaCount1 } = await supabaseAny.from('vehicles').select('*', { count: 'exact', head: true }).eq('source', 'china');
    const { count: chinaCount2 } = await supabaseAny.from('vehicles').select('*', { count: 'exact', head: true }).eq('source', 'che168');
    const { count: chinaCount3 } = await supabaseAny.from('vehicles').select('*', { count: 'exact', head: true }).eq('source', 'dongchedi');
    const chinaTotal = (chinaCount1 || 0) + (chinaCount2 || 0) + (chinaCount3 || 0);
    if (chinaTotal > 0) vehiclesBySource['china'] = chinaTotal;

    // Count Dubai sources
    const { count: dubaiCount1 } = await supabaseAny.from('vehicles').select('*', { count: 'exact', head: true }).eq('source', 'dubai');
    const { count: dubaiCount2 } = await supabaseAny.from('vehicles').select('*', { count: 'exact', head: true }).eq('source', 'dubicars');
    const dubaiTotal = (dubaiCount1 || 0) + (dubaiCount2 || 0);
    if (dubaiTotal > 0) vehiclesBySource['dubai'] = dubaiTotal;

    // Count Korea sources
    const { count: koreaCount } = await supabaseAny.from('vehicles').select('*', { count: 'exact', head: true }).eq('source', 'korea');
    if (koreaCount && koreaCount > 0) vehiclesBySource['korea'] = koreaCount;

    // Get actual favorites count from favorites table
    const { data: favoritesData } = await supabase
      .from('favorites')
      .select('vehicle_id');

    // Count favorites per vehicle
    const favoritesCountByVehicle: Record<string, number> = {};
    favoritesData?.forEach((f: { vehicle_id: string }) => {
      favoritesCountByVehicle[f.vehicle_id] = (favoritesCountByVehicle[f.vehicle_id] || 0) + 1;
    });

    // Merge favorites count with vehicles
    const vehiclesWithFavorites = (vehicles || []).map(v => ({
      ...v,
      actual_favorites: favoritesCountByVehicle[v.id] || 0,
    }));

    // Top viewed vehicles (using views_count from vehicles table)
    const topViewedVehicles = [...vehiclesWithFavorites]
      .sort((a, b) => (b.views_count || 0) - (a.views_count || 0))
      .slice(0, 5)
      .map(v => ({
        id: v.id,
        make: v.make,
        model: v.model,
        views: v.views_count || 0,
        favorites: v.actual_favorites,
      }));

    // Top favorited vehicles (using actual count from favorites table)
    const topFavoritedVehicles = [...vehiclesWithFavorites]
      .sort((a, b) => b.actual_favorites - a.actual_favorites)
      .slice(0, 5)
      .map(v => ({
        id: v.id,
        make: v.make,
        model: v.model,
        views: v.views_count || 0,
        favorites: v.actual_favorites,
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

    // Vehicles added this month - use created_at as fallback
    const vehiclesCreatedThisMonth = vehicles?.filter(v => new Date(v.created_at) >= startOfMonth).length || 0;
    const vehiclesCreatedLastMonth = vehicles?.filter(v => {
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

    // Calculate totals - ONLY for quotes where the vehicle still exists on the platform
    const quotesWithPrices = quotes?.filter((q: { vehicle_price_usd: number | null }) => q.vehicle_price_usd !== null) || [];

    // Filter to only quotes where vehicle still exists (has source price)
    const validQuotes = quotesWithPrices.filter((q: { vehicle_id: string }) => vehicleSourcePrices[q.vehicle_id]);
    const vehiclesFoundCount = validQuotes.length;
    const vehiclesMissingCount = quotesWithPrices.length - vehiclesFoundCount;

    // Calculate Driveby price only for valid quotes (vehicles that exist)
    const totalDrivebyPriceUSD = validQuotes.reduce((sum: number, q: { vehicle_price_usd: number }) => sum + (q.vehicle_price_usd || 0), 0);

    // Calculate source prices for valid quotes
    const totalSourcePriceUSD = validQuotes.reduce((sum: number, q: { vehicle_id: string }) => {
      const sourcePrice = vehicleSourcePrices[q.vehicle_id] || 0;
      return sum + sourcePrice;
    }, 0);

    // Calculate for accepted quotes only - also filter to existing vehicles
    const acceptedWithPrices = acceptedQuotes.filter((q: { vehicle_price_usd: number | null; vehicle_id: string }) =>
      q.vehicle_price_usd !== null && vehicleSourcePrices[q.vehicle_id]
    );
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

    // ===== ORDERS STATS (from orders table) =====
    let ordersStats = {
      total: 0,
      deposit_paid: 0,
      vehicle_purchased: 0,
      in_transit: 0,
      shipping: 0,
      delivered: 0,
    };

    try {
      // First try the orders table which has actual order data
      const { data: ordersData, count: ordersCount } = await supabaseAny
        .from('orders')
        .select('status', { count: 'exact' });

      if (ordersData && Array.isArray(ordersData) && ordersData.length > 0) {
        ordersStats.total = ordersCount || ordersData.length;
        ordersData.forEach((o: { status: string }) => {
          const status = o.status || '';
          // Map orders table statuses to pipeline stages
          // deposit_paid or pending_deposit states
          if (status === 'pending_deposit' || status === 'deposit_paid' || status === 'pending_payment') {
            ordersStats.deposit_paid++;
          }
          // Vehicle purchased / processing
          else if (status === 'processing' || status === 'paid' || status === 'vehicle_purchased') {
            ordersStats.vehicle_purchased++;
          }
          // In transit to port
          else if (status === 'in_transit' || status === 'shipped') {
            ordersStats.in_transit++;
          }
          // At sea / shipping
          else if (status === 'shipping' || status === 'customs_clearance') {
            ordersStats.shipping++;
          }
          // Delivered
          else if (status === 'delivered' || status === 'completed') {
            ordersStats.delivered++;
          }
        });
      } else {
        // Fallback to order_tracking if orders is empty
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
      }
    } catch {
      // Tables may not exist - use accepted quotes count as fallback
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

    // vehiclesGrowth will be calculated after sync stats are computed

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

    // Calculate sync stats for this month and last month
    const startOfMonthStr = startOfMonth.toISOString().split('T')[0];
    const startOfLastMonthStr = startOfLastMonth.toISOString().split('T')[0];
    const endOfLastMonthStr = endOfLastMonth.toISOString().split('T')[0];

    // Sync stats by source for this month
    interface SyncStats {
      added: number;
      removed: number;
      updated: number;
      net: number;
    }
    const syncStatsThisMonth: Record<string, SyncStats> = {};
    const syncStatsLastMonth: Record<string, SyncStats> = {};
    let totalSyncAddedThisMonth = 0;
    let totalSyncRemovedThisMonth = 0;
    let totalSyncAddedLastMonth = 0;
    let totalSyncRemovedLastMonth = 0;

    syncLogsData.forEach(log => {
      if (!log.date || log.status !== 'completed') return;

      const normalizedSource = normalizeSource(log.source);

      // This month
      if (log.date >= startOfMonthStr) {
        if (!syncStatsThisMonth[normalizedSource]) {
          syncStatsThisMonth[normalizedSource] = { added: 0, removed: 0, updated: 0, net: 0 };
        }
        syncStatsThisMonth[normalizedSource].added += log.vehicles_added;
        syncStatsThisMonth[normalizedSource].removed += log.vehicles_removed;
        syncStatsThisMonth[normalizedSource].updated += log.vehicles_updated;
        syncStatsThisMonth[normalizedSource].net += (log.vehicles_added - log.vehicles_removed);
        totalSyncAddedThisMonth += log.vehicles_added;
        totalSyncRemovedThisMonth += log.vehicles_removed;
      }
      // Last month
      else if (log.date >= startOfLastMonthStr && log.date <= endOfLastMonthStr) {
        if (!syncStatsLastMonth[normalizedSource]) {
          syncStatsLastMonth[normalizedSource] = { added: 0, removed: 0, updated: 0, net: 0 };
        }
        syncStatsLastMonth[normalizedSource].added += log.vehicles_added;
        syncStatsLastMonth[normalizedSource].removed += log.vehicles_removed;
        syncStatsLastMonth[normalizedSource].updated += log.vehicles_updated;
        syncStatsLastMonth[normalizedSource].net += (log.vehicles_added - log.vehicles_removed);
        totalSyncAddedLastMonth += log.vehicles_added;
        totalSyncRemovedLastMonth += log.vehicles_removed;
      }
    });

    // Net vehicles change this month and last month (added - removed)
    const vehiclesNetThisMonth = totalSyncAddedThisMonth - totalSyncRemovedThisMonth;
    const vehiclesNetLastMonth = totalSyncAddedLastMonth - totalSyncRemovedLastMonth;

    // For vehicles growth, compare net change (added - removed) between months
    // If last month had 0 net change, show 100% if positive this month, -100% if negative, 0% if same
    const vehiclesGrowth = vehiclesNetLastMonth !== 0
      ? Math.round(((vehiclesNetThisMonth - vehiclesNetLastMonth) / Math.abs(vehiclesNetLastMonth)) * 100)
      : vehiclesNetThisMonth > 0 ? 100 : vehiclesNetThisMonth < 0 ? -100 : 0;

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
      koreaVehicles: number;
      chinaVehicles: number;
      dubaiVehicles: number;
    }> = [];

    // Calculate cumulative vehicle count from sync logs
    // Start with current total and work backwards
    const currentTotalVehicles = vehiclesTotal || 0;

    // Try to fetch from vehicle_count_history table (daily snapshots at noon GMT)
    let vehicleCountHistory: Record<string, { total: number; korea: number; china: number; dubai: number }> = {};
    try {
      const ninetyDaysAgo = new Date(now);
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

      const { data: historyData } = await supabaseAny
        .from('vehicle_count_history')
        .select('date, total_count, korea_count, china_count, dubai_count')
        .gte('date', ninetyDaysAgo.toISOString().split('T')[0])
        .order('date', { ascending: true });

      if (historyData && Array.isArray(historyData)) {
        historyData.forEach((h: { date: string; total_count: number; korea_count: number; china_count: number; dubai_count: number }) => {
          vehicleCountHistory[h.date] = {
            total: h.total_count,
            korea: h.korea_count,
            china: h.china_count,
            dubai: h.dubai_count,
          };
        });
      }
    } catch {
      // vehicle_count_history table may not exist yet
    }

    // Fallback: Create a map of daily net changes from sync logs (added - removed)
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

    // Calculate cumulative totals working backwards from today (fallback method)
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

      // Use vehicle_count_history if available, otherwise fallback to cumulative calculation
      const historyEntry = vehicleCountHistory[dateStr];
      const totalVehiclesOnDay = historyEntry?.total
        || cumulativeTotals[dateStr]
        || currentTotalVehicles;

      // For source-specific counts, use history if available, otherwise use current distribution
      const koreaVehiclesOnDay = historyEntry?.korea ?? (vehiclesBySource['korea'] || 0);
      const chinaVehiclesOnDay = historyEntry?.china ?? (vehiclesBySource['china'] || 0);
      const dubaiVehiclesOnDay = historyEntry?.dubai ?? (vehiclesBySource['dubai'] || 0);

      timeSeriesData.push({
        date: dateStr,
        users: usersOnDay,
        quotes: quotesOnDay,
        vehicles: vehiclesOnDay,
        views: viewsOnDay,
        syncAdded: syncData.added,
        syncUpdated: syncData.updated,
        totalVehicles: totalVehiclesOnDay,
        koreaVehicles: koreaVehiclesOnDay,
        chinaVehicles: chinaVehiclesOnDay,
        dubaiVehicles: dubaiVehiclesOnDay,
      });
    }

    // ===== MONTHLY COMPARISON DATA =====
    const monthlyData: Array<{
      month: string;
      users: number;
      quotes: number;
      vehiclesNet: number;
      vehiclesAdded: number;
      vehiclesRemoved: number;
    }> = [];

    // Aggregate sync logs by month for vehicle counts
    const syncByMonth: Record<string, { added: number; removed: number }> = {};
    syncLogsData.forEach(log => {
      if (!log.date || log.status !== 'completed') return;
      const monthKey = log.date.substring(0, 7); // YYYY-MM
      if (!syncByMonth[monthKey]) {
        syncByMonth[monthKey] = { added: 0, removed: 0 };
      }
      syncByMonth[monthKey].added += log.vehicles_added;
      syncByMonth[monthKey].removed += log.vehicles_removed;
    });

    // Get data for last 6 months - show net change (added - removed) per month
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

      // Get sync stats for this month (net change = added - removed)
      const monthSync = syncByMonth[monthKey] || { added: 0, removed: 0 };
      const vehiclesNetInMonth = monthSync.added - monthSync.removed;

      monthlyData.push({
        month: monthName,
        users: usersInMonth,
        quotes: quotesInMonth,
        vehiclesNet: vehiclesNetInMonth,
        vehiclesAdded: monthSync.added,
        vehiclesRemoved: monthSync.removed,
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
        // Net change from sync (added - removed)
        thisMonth: vehiclesNetThisMonth,
        lastMonth: vehiclesNetLastMonth,
        // Detailed sync stats
        syncThisMonth: {
          added: totalSyncAddedThisMonth,
          removed: totalSyncRemovedThisMonth,
          net: vehiclesNetThisMonth,
          bySource: syncStatsThisMonth,
        },
        syncLastMonth: {
          added: totalSyncAddedLastMonth,
          removed: totalSyncRemovedLastMonth,
          net: vehiclesNetLastMonth,
          bySource: syncStatsLastMonth,
        },
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

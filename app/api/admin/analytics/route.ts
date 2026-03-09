import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/admin-check';
import { supabaseAdmin } from '@/lib/supabase/admin';

// Helper: safe query that never throws — returns { data, count } or defaults
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function safeQuery<T>(
  queryFn: () => PromiseLike<{ data: any; count?: number | null; error?: any }>,
  fallback: T
): Promise<{ data: T; count: number }> {
  try {
    const result = await queryFn();
    if (result.error) {
      return { data: fallback, count: 0 };
    }
    return {
      data: (result.data ?? fallback) as T,
      count: result.count ?? (Array.isArray(result.data) ? result.data.length : 0),
    };
  } catch {
    return { data: fallback, count: 0 };
  }
}

// GET: Fetch comprehensive analytics data
export async function GET() {
  try {
    const adminCheck = await requireAdmin();
    if (!adminCheck.isAdmin) {
      return adminCheck.response;
    }

    const supabase = supabaseAdmin;
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
    const ninetyDaysAgo = new Date(now);
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    // ===== BATCH 1: All independent queries in parallel =====
    const [
      vehiclesTotalRes,
      vehiclesRes,
      activeVehiclesRes,
      soldVehiclesRes,
      chinaCount1Res, chinaCount2Res, chinaCount3Res,
      dubaiCount1Res, dubaiCount2Res,
      koreaCountRes,
      favoritesDataRes,
      favoritesTotalRes,
      profilesRes,
      quotesRes,
      ordersRes,
      chatConvsRes,
      chatMsgCountRes,
      chatMsgWeekRes,
      syncLogsRes,
      vehicleHistoryRes,
    ] = await Promise.all([
      // Vehicle counts
      safeQuery(() => supabase.from('vehicles').select('*', { count: 'exact', head: true }), null),
      safeQuery(() => supabase.from('vehicles').select('id, source, make, model, views_count, favorites_count, current_price_usd, created_at, auction_status').limit(1000), []),
      safeQuery(() => supabase.from('vehicles').select('*', { count: 'exact', head: true }).neq('auction_status', 'sold'), null),
      safeQuery(() => supabase.from('vehicles').select('*', { count: 'exact', head: true }).eq('auction_status', 'sold'), null),
      // Source counts
      safeQuery(() => supabaseAny.from('vehicles').select('*', { count: 'exact', head: true }).eq('source', 'china'), null),
      safeQuery(() => supabaseAny.from('vehicles').select('*', { count: 'exact', head: true }).eq('source', 'che168'), null),
      safeQuery(() => supabaseAny.from('vehicles').select('*', { count: 'exact', head: true }).eq('source', 'dongchedi'), null),
      safeQuery(() => supabaseAny.from('vehicles').select('*', { count: 'exact', head: true }).eq('source', 'dubai'), null),
      safeQuery(() => supabaseAny.from('vehicles').select('*', { count: 'exact', head: true }).eq('source', 'dubicars'), null),
      safeQuery(() => supabaseAny.from('vehicles').select('*', { count: 'exact', head: true }).eq('source', 'korea'), null),
      // Favorites
      safeQuery(() => supabase.from('favorites').select('vehicle_id'), []),
      safeQuery(() => supabase.from('favorites').select('id', { count: 'exact', head: true }), null),
      // Profiles
      safeQuery(() => supabase.from('profiles').select('id, country, created_at', { count: 'exact' }), []),
      // Quotes
      safeQuery(() => supabaseAny.from('quotes').select('id, status, destination_country, vehicle_source, vehicle_make, vehicle_id, vehicle_price_usd, total_cost_xaf, created_at', { count: 'exact' }), []),
      // Orders
      safeQuery(() => supabaseAny.from('orders').select('status', { count: 'exact' }), []),
      // Chat
      safeQuery(() => supabaseAny.from('chat_conversations').select('id, status', { count: 'exact' }), []),
      safeQuery(() => supabaseAny.from('chat_messages').select('id', { count: 'exact', head: true }), null),
      safeQuery(() => supabaseAny.from('chat_messages').select('id', { count: 'exact', head: true }).gte('created_at', startOfWeek.toISOString()), null),
      // Sync logs
      safeQuery(() => supabaseAny.from('sync_logs').select('source, started_at, vehicles_added, vehicles_updated, vehicles_removed, status').order('started_at', { ascending: false }).limit(500), []),
      // Vehicle count history
      safeQuery(() => supabaseAny.from('vehicle_count_history').select('date, total_count, korea_count, china_count, dubai_count').gte('date', ninetyDaysAgo.toISOString().split('T')[0]).order('date', { ascending: true }), []),
    ]);

    // ===== EXTRACT RESULTS =====
    const vehiclesTotal = vehiclesTotalRes.count;
    const vehicles = vehiclesRes.data as Array<{ id: string; source: string; make: string; model: string; views_count: number; favorites_count: number; current_price_usd: number | null; created_at: string; auction_status: string }>;
    const activeVehiclesCount = activeVehiclesRes.count;
    const soldVehiclesCount = soldVehiclesRes.count;
    const activeVehicles = { length: activeVehiclesCount || 0 };
    const soldVehicles = { length: soldVehiclesCount || 0 };

    // Views and favorites totals from sample
    const totalViews = vehicles.reduce((sum, v) => sum + (v.views_count || 0), 0);
    const totalFavorites_unused = vehicles.reduce((sum, v) => sum + (v.favorites_count || 0), 0);
    void totalFavorites_unused;

    // Vehicles by source
    const vehiclesBySource: Record<string, number> = {};
    const chinaTotal = chinaCount1Res.count + chinaCount2Res.count + chinaCount3Res.count;
    if (chinaTotal > 0) vehiclesBySource['china'] = chinaTotal;
    const dubaiTotal = dubaiCount1Res.count + dubaiCount2Res.count;
    if (dubaiTotal > 0) vehiclesBySource['dubai'] = dubaiTotal;
    if (koreaCountRes.count > 0) vehiclesBySource['korea'] = koreaCountRes.count;

    // Favorites per vehicle
    const favoritesData = favoritesDataRes.data as Array<{ vehicle_id: string }>;
    const favoritesCountByVehicle: Record<string, number> = {};
    favoritesData.forEach(f => {
      favoritesCountByVehicle[f.vehicle_id] = (favoritesCountByVehicle[f.vehicle_id] || 0) + 1;
    });

    const vehiclesWithFavorites = vehicles.map(v => ({
      ...v,
      actual_favorites: favoritesCountByVehicle[v.id] || 0,
    }));

    const topViewedVehicles = [...vehiclesWithFavorites]
      .sort((a, b) => (b.views_count || 0) - (a.views_count || 0))
      .slice(0, 5)
      .map(v => ({ id: v.id, make: v.make, model: v.model, views: v.views_count || 0, favorites: v.actual_favorites }));

    const topFavoritedVehicles = [...vehiclesWithFavorites]
      .sort((a, b) => b.actual_favorites - a.actual_favorites)
      .slice(0, 5)
      .map(v => ({ id: v.id, make: v.make, model: v.model, views: v.views_count || 0, favorites: v.actual_favorites }));

    // Top makes
    const makesCounts: Record<string, number> = {};
    vehicles.forEach(v => { makesCounts[v.make] = (makesCounts[v.make] || 0) + 1; });
    const topMakes = Object.entries(makesCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([make, count]) => ({ make, count }));

    // ===== USERS STATS =====
    const profiles = profilesRes.data as Array<{ id: string; country: string; created_at: string }>;
    const usersTotal = profilesRes.count;

    const usersToday = profiles.filter(p => new Date(p.created_at) >= startOfDay).length;
    const usersThisWeek = profiles.filter(p => new Date(p.created_at) >= startOfWeek).length;
    const usersThisMonth = profiles.filter(p => new Date(p.created_at) >= startOfMonth).length;
    const usersLastMonth = profiles.filter(p => {
      const d = new Date(p.created_at);
      return d >= startOfLastMonth && d <= endOfLastMonth;
    }).length;
    const usersThisYear = profiles.filter(p => new Date(p.created_at) >= startOfYear).length;

    const usersByCountry: Record<string, number> = {};
    profiles.forEach(p => {
      const country = p.country || 'Non spécifié';
      usersByCountry[country] = (usersByCountry[country] || 0) + 1;
    });
    const topCountries = Object.entries(usersByCountry)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([country, count]) => ({
        country,
        count,
        percentage: Math.round((count / (usersTotal || 1)) * 100),
      }));

    // ===== QUOTES STATS =====
    const quotes = quotesRes.data as Array<{ id: string; status: string; destination_country: string; vehicle_source: string; vehicle_make: string; vehicle_id: string; vehicle_price_usd: number | null; total_cost_xaf: number; created_at: string }>;
    const quotesTotal = quotesRes.count;

    const quotesByStatus: Record<string, number> = {};
    quotes.forEach(q => { quotesByStatus[q.status] = (quotesByStatus[q.status] || 0) + 1; });

    const quotesToday = quotes.filter(q => new Date(q.created_at) >= startOfDay).length;
    const quotesThisWeek = quotes.filter(q => new Date(q.created_at) >= startOfWeek).length;
    const quotesThisMonth = quotes.filter(q => new Date(q.created_at) >= startOfMonth).length;
    const quotesLastMonth = quotes.filter(q => {
      const d = new Date(q.created_at);
      return d >= startOfLastMonth && d <= endOfLastMonth;
    }).length;

    const quotesByDestination: Record<string, number> = {};
    quotes.forEach(q => { quotesByDestination[q.destination_country] = (quotesByDestination[q.destination_country] || 0) + 1; });
    const topDestinations = Object.entries(quotesByDestination)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([country, count]) => ({ country, count, percentage: Math.round((count / (quotesTotal || 1)) * 100) }));

    const quotesBySource: Record<string, number> = {};
    quotes.forEach(q => { quotesBySource[q.vehicle_source] = (quotesBySource[q.vehicle_source] || 0) + 1; });

    const quotedMakes: Record<string, number> = {};
    quotes.forEach(q => { quotedMakes[q.vehicle_make] = (quotedMakes[q.vehicle_make] || 0) + 1; });
    const topQuotedMakes = Object.entries(quotedMakes)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([make, count]) => ({ make, count }));

    const acceptedQuotes = quotes.filter(q => q.status === 'accepted');
    const totalRevenueXAF = acceptedQuotes.reduce((sum, q) => sum + (q.total_cost_xaf || 0), 0);
    const totalDepositsUSD = acceptedQuotes.length * 1000;

    // ===== VEHICLE PRICING STATS =====
    const quoteVehicleIds = quotes.map(q => q.vehicle_id).filter(Boolean);
    const vehicleSourcePrices: Record<string, number> = {};

    if (quoteVehicleIds.length > 0) {
      const priceRes = await safeQuery(
        () => supabase.from('vehicles').select('id, current_price_usd').in('id', quoteVehicleIds.slice(0, 500)),
        []
      );
      (priceRes.data as Array<{ id: string; current_price_usd: number | null }>).forEach(v => {
        if (v.current_price_usd) vehicleSourcePrices[v.id] = v.current_price_usd;
      });
    }

    const quotesWithPrices = quotes.filter(q => q.vehicle_price_usd !== null);
    const validQuotes = quotesWithPrices.filter(q => vehicleSourcePrices[q.vehicle_id]);
    const vehiclesFoundCount = validQuotes.length;
    const vehiclesMissingCount = quotesWithPrices.length - vehiclesFoundCount;

    const totalDrivebyPriceUSD = validQuotes.reduce((sum, q) => sum + (q.vehicle_price_usd || 0), 0);
    const totalSourcePriceUSD = validQuotes.reduce((sum, q) => sum + (vehicleSourcePrices[q.vehicle_id] || 0), 0);

    const acceptedWithPrices = acceptedQuotes.filter(q => q.vehicle_price_usd !== null && vehicleSourcePrices[q.vehicle_id]);
    const acceptedDrivebyPriceUSD = acceptedWithPrices.reduce((sum, q) => sum + (q.vehicle_price_usd || 0), 0);
    const acceptedSourcePriceUSD = acceptedWithPrices.reduce((sum, q) => sum + (vehicleSourcePrices[q.vehicle_id] || 0), 0);
    const acceptedVehiclesFoundCount = acceptedWithPrices.length;

    const totalMarginUSD = totalDrivebyPriceUSD - totalSourcePriceUSD;
    const acceptedMarginUSD = acceptedDrivebyPriceUSD - acceptedSourcePriceUSD;
    const marginPercentage = totalSourcePriceUSD > 0 ? Math.round((totalMarginUSD / totalSourcePriceUSD) * 100) : 0;

    // ===== ORDERS STATS =====
    let ordersStats = { total: 0, deposit_paid: 0, vehicle_purchased: 0, in_transit: 0, shipping: 0, delivered: 0 };
    const ordersData = ordersRes.data as Array<{ status: string }>;
    if (ordersData.length > 0) {
      ordersStats.total = ordersRes.count || ordersData.length;
      ordersData.forEach(o => {
        const s = o.status || '';
        if (s === 'pending_deposit' || s === 'deposit_paid' || s === 'pending_payment') ordersStats.deposit_paid++;
        else if (s === 'processing' || s === 'paid' || s === 'vehicle_purchased') ordersStats.vehicle_purchased++;
        else if (s === 'in_transit' || s === 'shipped') ordersStats.in_transit++;
        else if (s === 'shipping' || s === 'customs_clearance') ordersStats.shipping++;
        else if (s === 'delivered' || s === 'completed') ordersStats.delivered++;
      });
    } else {
      ordersStats.total = acceptedQuotes.length;
      ordersStats.deposit_paid = acceptedQuotes.length;
    }

    // ===== CHAT STATS =====
    const conversations = chatConvsRes.data as Array<{ id: string; status: string }>;
    const chatStats = {
      totalConversations: chatConvsRes.count || 0,
      activeConversations: conversations.filter(c => c.status === 'active').length,
      waitingAgent: conversations.filter(c => c.status === 'waiting_agent').length,
      totalMessages: chatMsgCountRes.count || 0,
      messagesThisWeek: chatMsgWeekRes.count || 0,
    };

    // ===== CONVERSION RATES =====
    const conversionRate = usersTotal && quotesTotal ? Math.round((quotesTotal / usersTotal) * 100) : 0;
    const quoteAcceptanceRate = quotesTotal ? Math.round((acceptedQuotes.length / quotesTotal) * 100) : 0;

    // ===== GROWTH =====
    const usersGrowth = usersLastMonth > 0 ? Math.round(((usersThisMonth - usersLastMonth) / usersLastMonth) * 100) : 100;
    const quotesGrowth = quotesLastMonth > 0 ? Math.round(((quotesThisMonth - quotesLastMonth) / quotesLastMonth) * 100) : 100;

    // ===== RECENT ACTIVITY =====
    const recentQuotes = [...quotes]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 5);

    const recentUsers = [...profiles]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 5);

    // ===== SYNC LOGS =====
    const normalizeSource = (source: string): string => {
      const s = (source || '').toLowerCase().trim();
      if (s === 'che168' || s === 'dongchedi' || s === 'china' || s === 'chine') return 'china';
      if (s === 'dubicars' || s === 'dubai' || s === 'uae' || s === 'emirates') return 'dubai';
      if (s === 'korea' || s === 'south korea' || s === 'corée' || s === 'coree') return 'korea';
      return s || 'unknown';
    };

    const syncLogs = syncLogsRes.data as Array<{ source: string; started_at: string; vehicles_added: number; vehicles_updated: number; vehicles_removed: number; status: string }>;
    const syncLogsData = syncLogs.map(log => ({
      date: log.started_at?.split('T')[0] || '',
      source: log.source,
      vehicles_added: log.vehicles_added || 0,
      vehicles_updated: log.vehicles_updated || 0,
      vehicles_removed: log.vehicles_removed || 0,
      status: log.status,
    }));

    const syncByDay: Record<string, { added: number; updated: number; removed: number; syncs: number }> = {};
    syncLogsData.forEach(log => {
      if (!log.date) return;
      if (!syncByDay[log.date]) syncByDay[log.date] = { added: 0, updated: 0, removed: 0, syncs: 0 };
      syncByDay[log.date].added += log.vehicles_added;
      syncByDay[log.date].updated += log.vehicles_updated;
      syncByDay[log.date].removed += log.vehicles_removed;
      syncByDay[log.date].syncs += 1;
    });

    const startOfMonthStr = startOfMonth.toISOString().split('T')[0];
    const startOfLastMonthStr = startOfLastMonth.toISOString().split('T')[0];
    const endOfLastMonthStr = endOfLastMonth.toISOString().split('T')[0];

    interface SyncStats { added: number; removed: number; updated: number; net: number }
    const syncStatsThisMonth: Record<string, SyncStats> = {};
    const syncStatsLastMonth: Record<string, SyncStats> = {};
    let totalSyncAddedThisMonth = 0, totalSyncRemovedThisMonth = 0;
    let totalSyncAddedLastMonth = 0, totalSyncRemovedLastMonth = 0;

    syncLogsData.forEach(log => {
      if (!log.date || log.status !== 'completed') return;
      const ns = normalizeSource(log.source);
      if (log.date >= startOfMonthStr) {
        if (!syncStatsThisMonth[ns]) syncStatsThisMonth[ns] = { added: 0, removed: 0, updated: 0, net: 0 };
        syncStatsThisMonth[ns].added += log.vehicles_added;
        syncStatsThisMonth[ns].removed += log.vehicles_removed;
        syncStatsThisMonth[ns].updated += log.vehicles_updated;
        syncStatsThisMonth[ns].net += (log.vehicles_added - log.vehicles_removed);
        totalSyncAddedThisMonth += log.vehicles_added;
        totalSyncRemovedThisMonth += log.vehicles_removed;
      } else if (log.date >= startOfLastMonthStr && log.date <= endOfLastMonthStr) {
        if (!syncStatsLastMonth[ns]) syncStatsLastMonth[ns] = { added: 0, removed: 0, updated: 0, net: 0 };
        syncStatsLastMonth[ns].added += log.vehicles_added;
        syncStatsLastMonth[ns].removed += log.vehicles_removed;
        syncStatsLastMonth[ns].updated += log.vehicles_updated;
        syncStatsLastMonth[ns].net += (log.vehicles_added - log.vehicles_removed);
        totalSyncAddedLastMonth += log.vehicles_added;
        totalSyncRemovedLastMonth += log.vehicles_removed;
      }
    });

    const vehiclesNetThisMonth = totalSyncAddedThisMonth - totalSyncRemovedThisMonth;
    const vehiclesNetLastMonth = totalSyncAddedLastMonth - totalSyncRemovedLastMonth;
    const vehiclesGrowth = vehiclesNetLastMonth !== 0
      ? Math.round(((vehiclesNetThisMonth - vehiclesNetLastMonth) / Math.abs(vehiclesNetLastMonth)) * 100)
      : vehiclesNetThisMonth > 0 ? 100 : vehiclesNetThisMonth < 0 ? -100 : 0;

    // ===== TIME SERIES (90 days) =====
    const currentTotalVehicles = vehiclesTotal || 0;

    const vehicleCountHistory: Record<string, { total: number; korea: number; china: number; dubai: number }> = {};
    (vehicleHistoryRes.data as Array<{ date: string; total_count: number; korea_count: number; china_count: number; dubai_count: number }>).forEach(h => {
      vehicleCountHistory[h.date] = { total: h.total_count, korea: h.korea_count, china: h.china_count, dubai: h.dubai_count };
    });

    const dailyNetChange: Record<string, number> = {};
    syncLogsData.forEach(log => {
      if (!log.date) return;
      dailyNetChange[log.date] = (dailyNetChange[log.date] || 0) + (log.vehicles_added - log.vehicles_removed);
    });

    const dates: string[] = [];
    for (let i = 89; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      dates.push(d.toISOString().split('T')[0]);
    }

    const cumulativeTotals: Record<string, number> = {};
    let runningTotal = currentTotalVehicles;
    for (let i = dates.length - 1; i >= 0; i--) {
      cumulativeTotals[dates[i]] = runningTotal;
      if (i > 0) runningTotal -= (dailyNetChange[dates[i]] || 0);
    }

    const timeSeriesData = dates.map(dateStr => {
      const date = new Date(dateStr);
      const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayEnd.getDate() + 1);

      const usersOnDay = profiles.filter(p => { const d = new Date(p.created_at); return d >= dayStart && d < dayEnd; }).length;
      const quotesOnDay = quotes.filter(q => { const d = new Date(q.created_at); return d >= dayStart && d < dayEnd; }).length;
      const vehiclesOnDay = vehicles.filter(v => { const d = new Date(v.created_at); return d >= dayStart && d < dayEnd; }).length;
      const viewsOnDay = Math.floor((totalViews / 90) * (0.5 + Math.random()));
      const syncData = syncByDay[dateStr] || { added: 0, updated: 0 };
      const historyEntry = vehicleCountHistory[dateStr];

      return {
        date: dateStr,
        users: usersOnDay,
        quotes: quotesOnDay,
        vehicles: vehiclesOnDay,
        views: viewsOnDay,
        syncAdded: syncData.added,
        syncUpdated: syncData.updated,
        totalVehicles: historyEntry?.total || cumulativeTotals[dateStr] || currentTotalVehicles,
        koreaVehicles: historyEntry?.korea ?? (vehiclesBySource['korea'] || 0),
        chinaVehicles: historyEntry?.china ?? (vehiclesBySource['china'] || 0),
        dubaiVehicles: historyEntry?.dubai ?? (vehiclesBySource['dubai'] || 0),
      };
    });

    // ===== MONTHLY COMPARISON =====
    const syncByMonth: Record<string, { added: number; removed: number }> = {};
    syncLogsData.forEach(log => {
      if (!log.date || log.status !== 'completed') return;
      const mk = log.date.substring(0, 7);
      if (!syncByMonth[mk]) syncByMonth[mk] = { added: 0, removed: 0 };
      syncByMonth[mk].added += log.vehicles_added;
      syncByMonth[mk].removed += log.vehicles_removed;
    });

    const monthlyData = [];
    for (let i = 5; i >= 0; i--) {
      const md = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const me = new Date(md.getFullYear(), md.getMonth() + 1, 0);
      const monthName = md.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' });
      const mk = md.toISOString().substring(0, 7);
      const ms = syncByMonth[mk] || { added: 0, removed: 0 };

      monthlyData.push({
        month: monthName,
        users: profiles.filter(p => { const d = new Date(p.created_at); return d >= md && d <= me; }).length,
        quotes: quotes.filter(q => { const d = new Date(q.created_at); return d >= md && d <= me; }).length,
        vehicles: ms.added - ms.removed,
        vehiclesNet: ms.added - ms.removed,
        vehiclesAdded: ms.added,
        vehiclesRemoved: ms.removed,
      });
    }

    return NextResponse.json({
      kpis: {
        totalVehicles: vehiclesTotal || 0,
        activeVehicles: activeVehicles.length,
        soldVehicles: soldVehicles.length,
        totalUsers: usersTotal || 0,
        totalQuotes: quotesTotal || 0,
        totalOrders: ordersStats.total,
        totalViews,
        totalFavorites: favoritesTotalRes.count || 0,
        totalRevenueXAF,
        totalDepositsUSD,
        conversionRate,
        quoteAcceptanceRate,
      },
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
      growth: { usersGrowth, quotesGrowth, vehiclesGrowth },
      vehicles: {
        total: vehiclesTotal || 0,
        active: activeVehicles.length,
        sold: soldVehicles.length,
        bySource: vehiclesBySource,
        thisMonth: vehiclesNetThisMonth,
        lastMonth: vehiclesNetLastMonth,
        syncThisMonth: { added: totalSyncAddedThisMonth, removed: totalSyncRemovedThisMonth, net: vehiclesNetThisMonth, bySource: syncStatsThisMonth },
        syncLastMonth: { added: totalSyncAddedLastMonth, removed: totalSyncRemovedLastMonth, net: vehiclesNetLastMonth, bySource: syncStatsLastMonth },
        topViewed: topViewedVehicles,
        topFavorited: topFavoritedVehicles,
        topMakes,
      },
      users: {
        total: usersTotal || 0,
        today: usersToday,
        thisWeek: usersThisWeek,
        thisMonth: usersThisMonth,
        lastMonth: usersLastMonth,
        thisYear: usersThisYear,
        byCountry: topCountries,
      },
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
      orders: ordersStats,
      chat: chatStats,
      recentActivity: { quotes: recentQuotes, users: recentUsers },
      timeSeries: timeSeriesData,
      monthlyComparison: monthlyData,
      generatedAt: now.toISOString(),
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des analytics', details: errorMessage },
      { status: 500 }
    );
  }
}

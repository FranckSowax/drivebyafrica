import { NextResponse } from 'next/server';
import { convertToUsdRealTime, getRealTimeRate, getAllRealTimeRates } from '@/lib/utils/realtime-exchange';

/**
 * GET /api/exchange-rate
 * Get real-time exchange rates
 *
 * Query params:
 * - from: source currency code (e.g., 'NGN')
 * - amount: amount to convert (optional, returns rate if not provided)
 * - all: if 'true', returns all available rates
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const from = searchParams.get('from');
    const amount = searchParams.get('amount');
    const all = searchParams.get('all');

    // Return all rates
    if (all === 'true') {
      const rates = await getAllRealTimeRates();
      return NextResponse.json({
        success: true,
        base: 'USD',
        rates,
        timestamp: new Date().toISOString(),
      });
    }

    // Get rate for specific currency
    if (from) {
      const rate = await getRealTimeRate(from.toUpperCase());

      // If amount is provided, convert it
      if (amount) {
        const amountNum = parseFloat(amount);
        if (isNaN(amountNum)) {
          return NextResponse.json(
            { error: 'Invalid amount' },
            { status: 400 }
          );
        }

        const usdAmount = await convertToUsdRealTime(amountNum, from.toUpperCase());

        return NextResponse.json({
          success: true,
          from: from.toUpperCase(),
          to: 'USD',
          amount: amountNum,
          rate,
          convertedAmount: Math.round(usdAmount * 100) / 100, // Round to 2 decimals
          timestamp: new Date().toISOString(),
        });
      }

      // Just return the rate
      return NextResponse.json({
        success: true,
        currency: from.toUpperCase(),
        rateToUsd: rate,
        timestamp: new Date().toISOString(),
      });
    }

    return NextResponse.json(
      { error: 'Missing required parameter: from or all' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Exchange rate API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch exchange rate' },
      { status: 500 }
    );
  }
}

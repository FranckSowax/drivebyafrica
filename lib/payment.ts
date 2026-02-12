/**
 * Payment Service — E-Billing Integration
 * Server-side only: handles E-Billing API calls and payment status checks.
 */

// ─── CONFIGURATION (from env vars) ───
const EBILLING = {
  URL: process.env.EBILLING_API_URL || 'https://stg.billing-easy.com/api/v1/merchant/e_bills',
  PORTAL: process.env.EBILLING_PORTAL_URL || 'https://staging.billing-easy.net',
  USER: process.env.EBILLING_USER || '',
  KEY: process.env.EBILLING_API_KEY || '',
};

const BACKEND_URL = process.env.PAYMENT_BACKEND_URL || '';

// ─── TYPES ───
export type PaymentStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled' | 'expired';

export interface PaymentResult {
  billId: string;
  externalReference: string;
  portalUrl: string;
}

export interface PaymentStatusResult {
  completed: boolean;
  status: PaymentStatus;
  walletCredited?: boolean;
}

// ─── UTILITIES ───

function base64Encode(str: string): string {
  return Buffer.from(str).toString('base64');
}

export function generateExternalReference(): string {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `DBA_${timestamp}_${random}`;
}

export function formatPhoneNumber(phone?: string): string {
  if (!phone) return '24174000000';
  let cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('00')) cleaned = cleaned.substring(2);
  if (cleaned.startsWith('241')) return cleaned;
  if (cleaned.startsWith('0')) return '241' + cleaned.substring(1);
  return '241' + cleaned;
}

// ─── MAIN FUNCTIONS ───

/**
 * Initialize payment: register on PHP backend + create E-Billing invoice.
 * Returns the portal URL for the user to complete payment.
 */
export async function createPayment(
  userId: string,
  amount: number,
  description: string,
  userEmail?: string,
  phoneNumber?: string,
): Promise<PaymentResult> {
  const formattedPhone = formatPhoneNumber(phoneNumber);
  const externalReference = generateExternalReference();

  // Step 1: Register transaction on PHP backend
  const initResponse = await fetch(`${BACKEND_URL}/init.php`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      user_id: userId,
      amount: Math.round(amount),
      phone_number: formattedPhone,
      payment_system: 'ebilling',
      transaction_type: 'deposit',
      currency: 'XAF',
      description: description.substring(0, 100),
      external_reference: externalReference,
    }),
  });

  const initData = await initResponse.json();
  if (!initData.success) {
    throw new Error(initData.message || "Erreur lors de l'initialisation de la transaction");
  }

  // Step 2: Create E-Billing invoice
  const auth = `Basic ${base64Encode(`${EBILLING.USER}:${EBILLING.KEY}`)}`;

  const ebillingResponse = await fetch(EBILLING.URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': auth,
    },
    body: JSON.stringify({
      payer_email: userEmail || `user_${userId}@drivebyafrica.com`,
      payer_msisdn: formattedPhone,
      amount: Math.round(amount),
      short_description: description.substring(0, 100),
      external_reference: externalReference,
      payer_name: 'Client Driveby Africa',
      expiry_period: 60,
      currency: 'XAF',
    }),
  });

  const ebillingData = await ebillingResponse.json();
  if (!ebillingResponse.ok) {
    throw new Error(ebillingData.message || `E-Billing API error: ${ebillingResponse.status}`);
  }

  const billId = ebillingData.e_bill?.bill_id;
  if (!billId) {
    throw new Error('No bill_id returned from E-Billing');
  }

  return {
    billId,
    externalReference,
    portalUrl: `${EBILLING.PORTAL}/?invoice=${billId}`,
  };
}

/**
 * Check payment status via PHP backend.
 */
export async function checkPaymentStatus(externalReference: string): Promise<PaymentStatusResult> {
  try {
    const url = `${BACKEND_URL}/check_status.php?external_reference=${encodeURIComponent(externalReference)}`;
    const response = await fetch(url);
    const data = await response.json();

    if (!data.success) {
      return { completed: false, status: 'pending' };
    }

    const status = (data.data?.status || 'pending') as PaymentStatus;
    return {
      completed: status === 'completed',
      status,
      walletCredited: data.data?.wallet_credited,
    };
  } catch {
    return { completed: false, status: 'pending' };
  }
}

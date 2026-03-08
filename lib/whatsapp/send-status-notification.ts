/**
 * WhatsApp notification sender for order status updates via Meta Cloud API
 *
 * Supports:
 * - Interactive messages with URL button (single document/image)
 * - Image messages with caption (multiple images)
 * - Document messages (multiple PDFs)
 * - Text messages (fallback)
 */

import { getStatusMessage, getStatusMessageConfig, type MessageParams } from './status-messages';
import {
  sendTextMessage,
  sendImageMessage,
  sendDocumentMessage,
  sendInteractiveMessage,
  isConfigured,
} from './meta-client';
import type { MetaSendResult } from './meta-client';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://driveby-africa.com';

interface SendResult {
  success: boolean;
  messageId?: string;
  error?: string;
  messagesCount?: number;
}

interface Document {
  name: string;
  url: string;
  type: string;
  visible_to_client?: boolean;
}

/**
 * Convert MetaSendResult to local SendResult
 */
function toSendResult(r: MetaSendResult): SendResult {
  return { success: r.success, messageId: r.messageId, error: r.error };
}

/**
 * Determine the best message type based on documents
 */
function categorizeDocuments(documents: Document[]): {
  images: Document[];
  pdfs: Document[];
  links: Document[];
} {
  const images: Document[] = [];
  const pdfs: Document[] = [];
  const links: Document[] = [];

  for (const doc of documents) {
    if (doc.visible_to_client === false) continue;

    const type = doc.type?.toLowerCase() || '';
    const url = doc.url?.toLowerCase() || '';

    if (type.startsWith('image') || /\.(jpg|jpeg|png|gif|webp)$/i.test(url)) {
      images.push(doc);
    } else if (type === 'application/pdf' || url.endsWith('.pdf')) {
      pdfs.push(doc);
    } else if (type === 'url' || doc.type === 'url') {
      links.push(doc);
    } else {
      pdfs.push(doc);
    }
  }

  return { images, pdfs, links };
}

/**
 * Main function: Send WhatsApp notification for status change
 */
export async function sendStatusChangeNotification(params: {
  phone: string;
  customerName: string;
  orderNumber: string;
  orderId: string;
  vehicleName: string;
  newStatus: string;
  documents?: Document[];
  eta?: string;
  language?: 'fr' | 'en';
}): Promise<SendResult> {
  const {
    phone,
    customerName,
    orderNumber,
    orderId,
    vehicleName,
    newStatus,
    documents = [],
    eta,
    language = 'fr',
  } = params;

  if (!isConfigured()) {
    console.log('Meta WhatsApp API not configured, skipping notification');
    return { success: false, error: 'Meta WhatsApp API non configuré' };
  }

  if (!phone) {
    return { success: false, error: 'Numéro WhatsApp non fourni' };
  }

  const dashboardUrl = `${SITE_URL}/dashboard/orders/${orderId}`;

  // Filter client-visible documents
  const visibleDocs = documents.filter(d => d.visible_to_client !== false);
  const { images, pdfs, links } = categorizeDocuments(visibleDocs);

  // Get message content
  const messageParams: MessageParams = {
    customerName,
    orderNumber,
    vehicleName,
    documentNames: visibleDocs.map(d => d.name),
    documentUrls: visibleDocs.map(d => d.url),
    dashboardUrl,
    eta,
  };

  const messageContent = getStatusMessage(newStatus, messageParams, language);

  if (!messageContent) {
    console.log(`No message config for status: ${newStatus}`);
    return { success: false, error: `Pas de message configuré pour le statut ${newStatus}` };
  }

  const config = getStatusMessageConfig(newStatus);
  const { emoji, message, buttonText } = messageContent;

  let result: SendResult;
  let messagesCount = 0;

  // Strategy 1: No documents or links - send interactive message with dashboard button
  if (visibleDocs.length === 0 || !config?.includeDocuments) {
    const fullMessage = `${emoji} *${messageContent.title}*\n\n${message}`;
    result = toSendResult(await sendInteractiveMessage(phone, fullMessage, buttonText, dashboardUrl));
    messagesCount = 1;
  }
  // Strategy 2: Single image - send image then interactive button
  else if (images.length === 1 && pdfs.length === 0) {
    const fullMessage = `${emoji} *${messageContent.title}*\n\n${message}`;
    await sendImageMessage(phone, images[0].url, `📷 ${images[0].name}`);
    await new Promise(resolve => setTimeout(resolve, 500));
    result = toSendResult(await sendInteractiveMessage(phone, fullMessage, buttonText, dashboardUrl));
    messagesCount = 2;
  }
  // Strategy 3: Single PDF - send document with caption
  else if (pdfs.length === 1 && images.length === 0) {
    const caption = `${emoji} *${messageContent.title}*\n\n${message}\n\n👉 ${dashboardUrl}`;
    result = toSendResult(await sendDocumentMessage(phone, pdfs[0].url, pdfs[0].name, caption));
    messagesCount = 1;
  }
  // Strategy 4: Single link - send interactive with button to that link
  else if (links.length === 1 && images.length === 0 && pdfs.length === 0) {
    const fullMessage = `${emoji} *${messageContent.title}*\n\n${message}`;
    result = toSendResult(await sendInteractiveMessage(phone, fullMessage, links[0].name || buttonText, links[0].url));
    messagesCount = 1;
  }
  // Strategy 5: Multiple images - send intro message + each image separately
  else if (images.length > 1) {
    const introMessage = `${emoji} *${messageContent.title}*\n\n${message}`;
    result = toSendResult(await sendInteractiveMessage(phone, introMessage, buttonText, dashboardUrl));
    messagesCount = 1;

    for (let i = 0; i < Math.min(images.length, 5); i++) {
      await new Promise(resolve => setTimeout(resolve, 500));
      const imageResult = await sendImageMessage(phone, images[i].url, `📷 ${i + 1}/${images.length}: ${images[i].name}`);
      if (imageResult.success) messagesCount++;
    }

    for (const pdf of pdfs.slice(0, 3)) {
      await new Promise(resolve => setTimeout(resolve, 500));
      const pdfResult = await sendDocumentMessage(phone, pdf.url, pdf.name);
      if (pdfResult.success) messagesCount++;
    }
  }
  // Strategy 6: Multiple PDFs - send intro message + each PDF
  else if (pdfs.length > 1) {
    const introMessage = `${emoji} *${messageContent.title}*\n\n${message}`;
    result = toSendResult(await sendInteractiveMessage(phone, introMessage, buttonText, dashboardUrl));
    messagesCount = 1;

    for (const pdf of pdfs.slice(0, 5)) {
      await new Promise(resolve => setTimeout(resolve, 500));
      const pdfResult = await sendDocumentMessage(phone, pdf.url, pdf.name);
      if (pdfResult.success) messagesCount++;
    }
  }
  // Strategy 7: Mixed content - send intro + media
  else {
    const introMessage = `${emoji} *${messageContent.title}*\n\n${message}`;
    result = toSendResult(await sendInteractiveMessage(phone, introMessage, buttonText, dashboardUrl));
    messagesCount = 1;

    for (const img of images.slice(0, 4)) {
      await new Promise(resolve => setTimeout(resolve, 500));
      const imgResult = await sendImageMessage(phone, img.url, `📷 ${img.name}`);
      if (imgResult.success) messagesCount++;
    }

    for (const pdf of pdfs.slice(0, 3)) {
      await new Promise(resolve => setTimeout(resolve, 500));
      const pdfResult = await sendDocumentMessage(phone, pdf.url, pdf.name);
      if (pdfResult.success) messagesCount++;
    }
  }

  return {
    ...result,
    messagesCount,
  };
}

/**
 * Send document-only notification (when documents are uploaded separately)
 */
export async function sendDocumentNotification(params: {
  phone: string;
  customerName: string;
  orderNumber: string;
  orderId: string;
  documents: Document[];
  language?: 'fr' | 'en';
}): Promise<SendResult> {
  const {
    phone,
    customerName,
    orderNumber,
    orderId,
    documents,
    language = 'fr',
  } = params;

  if (!isConfigured()) {
    return { success: false, error: 'Meta WhatsApp API non configuré' };
  }

  if (!phone) {
    return { success: false, error: 'Numéro WhatsApp non fourni' };
  }

  const dashboardUrl = `${SITE_URL}/dashboard/orders/${orderId}`;

  const visibleDocs = documents.filter(d => d.visible_to_client !== false);
  if (visibleDocs.length === 0) {
    return { success: false, error: 'Aucun document visible pour le client' };
  }

  const { images, pdfs } = categorizeDocuments(visibleDocs);

  const greeting = language === 'fr'
    ? `Bonjour ${customerName},`
    : `Hello ${customerName},`;

  const docIntro = language === 'fr'
    ? `De nouveaux documents sont disponibles pour votre commande *${orderNumber}*:`
    : `New documents are available for your order *${orderNumber}*:`;

  const docList = visibleDocs.map(d => `• ${d.name}`).join('\n');

  const footer = language === 'fr'
    ? 'Téléchargez-les depuis votre espace client.'
    : 'Download them from your dashboard.';

  const buttonText = language === 'fr' ? 'Voir les documents' : 'View documents';

  const message = `📄 *Documents disponibles*\n\n${greeting}\n\n${docIntro}\n\n${docList}\n\n${footer}`;

  let result: SendResult;
  let messagesCount = 0;

  if (images.length === 1 && pdfs.length === 0) {
    await sendImageMessage(phone, images[0].url, `📷 ${images[0].name}`);
    await new Promise(resolve => setTimeout(resolve, 500));
    result = toSendResult(await sendInteractiveMessage(phone, message, buttonText, dashboardUrl));
    messagesCount = 2;
  } else if (pdfs.length === 1 && images.length === 0) {
    result = toSendResult(await sendDocumentMessage(phone, pdfs[0].url, pdfs[0].name, `${message}\n\n👉 ${dashboardUrl}`));
    messagesCount = 1;
  } else {
    result = toSendResult(await sendInteractiveMessage(phone, message, buttonText, dashboardUrl));
    messagesCount = 1;

    for (const img of images.slice(0, 4)) {
      await new Promise(resolve => setTimeout(resolve, 500));
      const imgResult = await sendImageMessage(phone, img.url, `📷 ${img.name}`);
      if (imgResult.success) messagesCount++;
    }

    for (const pdf of pdfs.slice(0, 3)) {
      await new Promise(resolve => setTimeout(resolve, 500));
      const pdfResult = await sendDocumentMessage(phone, pdf.url, pdf.name);
      if (pdfResult.success) messagesCount++;
    }
  }

  return {
    ...result,
    messagesCount,
  };
}

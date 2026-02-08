/**
 * WhatsApp notification sender for order status updates via Whapi API
 *
 * Supports:
 * - Interactive messages with URL button (single document/image)
 * - Image messages with caption (multiple images)
 * - Document messages (multiple PDFs)
 * - Text messages (fallback)
 */

import { getStatusMessage, getStatusMessageConfig, type MessageParams } from './status-messages';

const WHAPI_BASE_URL = 'https://gate.whapi.cloud';
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://driveby-africa.com';

interface WhapiResponse {
  sent: boolean;
  message?: {
    id: string;
  };
  error?: {
    message: string;
  };
}

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
 * Format phone number for Whapi
 */
function formatPhoneForWhapi(phone: string): string {
  let formatted = phone.replace(/\s+/g, '').replace(/[^0-9+]/g, '');

  if (!formatted.startsWith('+')) {
    // Default to Gabon country code if no prefix
    formatted = '+241' + formatted.replace(/^0+/, '');
  }

  // Whapi expects number without + and with @s.whatsapp.net
  return formatted.replace('+', '') + '@s.whatsapp.net';
}

/**
 * Send a simple text message
 */
async function sendTextMessage(
  token: string,
  phone: string,
  message: string
): Promise<SendResult> {
  try {
    const response = await fetch(`${WHAPI_BASE_URL}/messages/text`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: phone,
        body: message,
      }),
    });

    const result: WhapiResponse = await response.json();

    if (response.ok && result.sent) {
      return { success: true, messageId: result.message?.id };
    }

    return { success: false, error: result.error?.message || 'Erreur envoi message' };
  } catch (error) {
    console.error('WhatsApp text send error:', error);
    return { success: false, error: 'Erreur de connexion à Whapi' };
  }
}

/**
 * Send an image with caption
 */
async function sendImageMessage(
  token: string,
  phone: string,
  imageUrl: string,
  caption: string
): Promise<SendResult> {
  try {
    const response = await fetch(`${WHAPI_BASE_URL}/messages/image`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: phone,
        media: imageUrl,
        caption: caption,
      }),
    });

    const result: WhapiResponse = await response.json();

    if (response.ok && result.sent) {
      return { success: true, messageId: result.message?.id };
    }

    // Fallback to text if image fails
    console.log('Image message failed, falling back to text');
    return sendTextMessage(token, phone, `${caption}\n\n📷 Image: ${imageUrl}`);
  } catch (error) {
    console.error('WhatsApp image send error:', error);
    return sendTextMessage(token, phone, `${caption}\n\n📷 Image: ${imageUrl}`);
  }
}

/**
 * Send a document (PDF)
 */
async function sendDocumentMessage(
  token: string,
  phone: string,
  documentUrl: string,
  filename: string,
  caption?: string
): Promise<SendResult> {
  try {
    const response = await fetch(`${WHAPI_BASE_URL}/messages/document`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: phone,
        media: documentUrl,
        filename: filename,
        caption: caption || '',
      }),
    });

    const result: WhapiResponse = await response.json();

    if (response.ok && result.sent) {
      return { success: true, messageId: result.message?.id };
    }

    // Fallback to text with link if document fails
    console.log('Document message failed, falling back to text');
    return sendTextMessage(token, phone, `${caption || ''}\n\n📄 ${filename}: ${documentUrl}`);
  } catch (error) {
    console.error('WhatsApp document send error:', error);
    return sendTextMessage(token, phone, `${caption || ''}\n\n📄 ${filename}: ${documentUrl}`);
  }
}

/**
 * Send an interactive message with CTA URL button
 * Best for single document/image with call-to-action
 */
async function sendInteractiveMessage(
  token: string,
  phone: string,
  bodyText: string,
  buttonText: string,
  buttonUrl: string,
): Promise<SendResult> {
  try {
    const payload: Record<string, unknown> = {
      to: phone,
      type: 'button',
      body: {
        text: bodyText,
      },
      footer: {
        text: 'Driveby Africa - Import vehicules',
      },
      action: {
        buttons: [
          {
            type: 'url',
            title: buttonText.substring(0, 20),
            id: 'view_order',
            url: buttonUrl,
          },
        ],
      },
    };

    const response = await fetch(`${WHAPI_BASE_URL}/messages/interactive`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const result: WhapiResponse = await response.json();
    console.log('WhatsApp interactive result:', JSON.stringify(result));

    if (response.ok && result.sent) {
      return { success: true, messageId: result.message?.id };
    }

    // Fallback: if interactive fails, send plain text with link
    console.log('Interactive message failed, using fallback');
    return sendTextMessage(token, phone, `${bodyText}\n\n👉 ${buttonUrl}`);
  } catch (error) {
    console.error('WhatsApp interactive send error:', error);
    return sendTextMessage(token, phone, `${bodyText}\n\n👉 ${buttonUrl}`);
  }
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
    // Only include client-visible documents
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
      // Default to PDF for unknown types
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
    language = 'fr', // Default French for African market
  } = params;

  const whapiToken = process.env.WHAPI_TOKEN;

  if (!whapiToken) {
    console.log('WHAPI_TOKEN not configured, skipping WhatsApp notification');
    return { success: false, error: 'WHAPI_TOKEN non configuré' };
  }

  if (!phone) {
    return { success: false, error: 'Numéro WhatsApp non fourni' };
  }

  const formattedPhone = formatPhoneForWhapi(phone);
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

  // Determine best message strategy based on content
  let result: SendResult;
  let messagesCount = 0;

  // Strategy 1: No documents or links - send interactive message with dashboard button
  if (visibleDocs.length === 0 || !config?.includeDocuments) {
    const fullMessage = `${emoji} *${messageContent.title}*\n\n${message}`;
    result = await sendInteractiveMessage(
      whapiToken,
      formattedPhone,
      fullMessage,
      buttonText,
      dashboardUrl
    );
    messagesCount = 1;
  }
  // Strategy 2: Single image - send image then interactive button
  else if (images.length === 1 && pdfs.length === 0) {
    const fullMessage = `${emoji} *${messageContent.title}*\n\n${message}`;
    // Send image first
    await sendImageMessage(whapiToken, formattedPhone, images[0].url, `📷 ${images[0].name}`);
    await new Promise(resolve => setTimeout(resolve, 500));
    // Then send interactive button
    result = await sendInteractiveMessage(
      whapiToken,
      formattedPhone,
      fullMessage,
      buttonText,
      dashboardUrl
    );
    messagesCount = 2;
  }
  // Strategy 3: Single PDF - send document with caption
  else if (pdfs.length === 1 && images.length === 0) {
    const caption = `${emoji} *${messageContent.title}*\n\n${message}\n\n👉 ${dashboardUrl}`;
    result = await sendDocumentMessage(
      whapiToken,
      formattedPhone,
      pdfs[0].url,
      pdfs[0].name,
      caption
    );
    messagesCount = 1;
  }
  // Strategy 4: Single link - send interactive with button to that link
  else if (links.length === 1 && images.length === 0 && pdfs.length === 0) {
    const fullMessage = `${emoji} *${messageContent.title}*\n\n${message}`;
    result = await sendInteractiveMessage(
      whapiToken,
      formattedPhone,
      fullMessage,
      links[0].name || buttonText,
      links[0].url
    );
    messagesCount = 1;
  }
  // Strategy 5: Multiple images - send intro message + each image separately
  else if (images.length > 1) {
    // First: intro message with button to dashboard
    const introMessage = `${emoji} *${messageContent.title}*\n\n${message}`;
    result = await sendInteractiveMessage(
      whapiToken,
      formattedPhone,
      introMessage,
      buttonText,
      dashboardUrl
    );
    messagesCount = 1;

    // Then: send each image with index
    for (let i = 0; i < Math.min(images.length, 5); i++) { // Max 5 images
      await new Promise(resolve => setTimeout(resolve, 500)); // Rate limiting
      const imageResult = await sendImageMessage(
        whapiToken,
        formattedPhone,
        images[i].url,
        `📷 ${i + 1}/${images.length}: ${images[i].name}`
      );
      if (imageResult.success) messagesCount++;
    }

    // Send PDFs if any
    for (const pdf of pdfs.slice(0, 3)) { // Max 3 PDFs
      await new Promise(resolve => setTimeout(resolve, 500));
      const pdfResult = await sendDocumentMessage(
        whapiToken,
        formattedPhone,
        pdf.url,
        pdf.name
      );
      if (pdfResult.success) messagesCount++;
    }
  }
  // Strategy 6: Multiple PDFs - send intro message + each PDF
  else if (pdfs.length > 1) {
    // First: intro message
    const introMessage = `${emoji} *${messageContent.title}*\n\n${message}`;
    result = await sendInteractiveMessage(
      whapiToken,
      formattedPhone,
      introMessage,
      buttonText,
      dashboardUrl
    );
    messagesCount = 1;

    // Then: send each PDF
    for (const pdf of pdfs.slice(0, 5)) { // Max 5 PDFs
      await new Promise(resolve => setTimeout(resolve, 500));
      const pdfResult = await sendDocumentMessage(
        whapiToken,
        formattedPhone,
        pdf.url,
        pdf.name
      );
      if (pdfResult.success) messagesCount++;
    }
  }
  // Strategy 7: Mixed content - send intro + media
  else {
    // Send intro with button
    const introMessage = `${emoji} *${messageContent.title}*\n\n${message}`;
    result = await sendInteractiveMessage(
      whapiToken,
      formattedPhone,
      introMessage,
      buttonText,
      dashboardUrl
    );
    messagesCount = 1;

    // Send all images separately
    const remainingImages = images.slice(0, 4);
    for (const img of remainingImages) {
      await new Promise(resolve => setTimeout(resolve, 500));
      const imgResult = await sendImageMessage(
        whapiToken,
        formattedPhone,
        img.url,
        `📷 ${img.name}`
      );
      if (imgResult.success) messagesCount++;
    }

    // Send PDFs
    for (const pdf of pdfs.slice(0, 3)) {
      await new Promise(resolve => setTimeout(resolve, 500));
      const pdfResult = await sendDocumentMessage(
        whapiToken,
        formattedPhone,
        pdf.url,
        pdf.name
      );
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

  const whapiToken = process.env.WHAPI_TOKEN;

  if (!whapiToken) {
    return { success: false, error: 'WHAPI_TOKEN non configuré' };
  }

  if (!phone) {
    return { success: false, error: 'Numéro WhatsApp non fourni' };
  }

  const formattedPhone = formatPhoneForWhapi(phone);
  const dashboardUrl = `${SITE_URL}/dashboard/orders/${orderId}`;

  // Filter visible documents
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

  // Single image: interactive with image
  if (images.length === 1 && pdfs.length === 0) {
    // Send image first, then interactive button
    await sendImageMessage(whapiToken, formattedPhone, images[0].url, `📷 ${images[0].name}`);
    await new Promise(resolve => setTimeout(resolve, 500));
    result = await sendInteractiveMessage(
      whapiToken,
      formattedPhone,
      message,
      buttonText,
      dashboardUrl
    );
    messagesCount = 2;
  }
  // Single PDF: send as document
  else if (pdfs.length === 1 && images.length === 0) {
    result = await sendDocumentMessage(
      whapiToken,
      formattedPhone,
      pdfs[0].url,
      pdfs[0].name,
      `${message}\n\n👉 ${dashboardUrl}`
    );
    messagesCount = 1;
  }
  // Multiple: send intro + each file
  else {
    result = await sendInteractiveMessage(
      whapiToken,
      formattedPhone,
      message,
      buttonText,
      dashboardUrl
    );
    messagesCount = 1;

    // Send all images separately
    for (const img of images.slice(0, 4)) {
      await new Promise(resolve => setTimeout(resolve, 500));
      const imgResult = await sendImageMessage(
        whapiToken,
        formattedPhone,
        img.url,
        `📷 ${img.name}`
      );
      if (imgResult.success) messagesCount++;
    }

    // Send PDFs
    for (const pdf of pdfs.slice(0, 3)) {
      await new Promise(resolve => setTimeout(resolve, 500));
      const pdfResult = await sendDocumentMessage(
        whapiToken,
        formattedPhone,
        pdf.url,
        pdf.name
      );
      if (pdfResult.success) messagesCount++;
    }
  }

  return {
    ...result,
    messagesCount,
  };
}

/**
 * WhatsApp module barrel export
 * Centralizes all WhatsApp-related functionality
 */

// Meta Cloud API client
export {
  formatPhoneForMeta,
  sendTextMessage,
  sendImageMessage,
  sendDocumentMessage,
  sendInteractiveMessage,
  sendTemplateMessage,
  sendReplyButtons,
  verifyWebhookSignature,
  verifyWebhookSubscription,
  parseWebhookPayload,
  isConfigured,
} from './meta-client';

export type {
  MetaSendResult,
  MetaWebhookMessage,
  MetaWebhookStatus,
  MetaWebhookEntry,
  TemplateComponent,
} from './meta-client';

// Status notification helpers
export {
  sendStatusChangeNotification,
  sendDocumentNotification,
} from './send-status-notification';

// Status message templates
export {
  getStatusMessage,
  getStatusMessageConfig,
} from './status-messages';

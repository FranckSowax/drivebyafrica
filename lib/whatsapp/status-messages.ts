/**
 * WhatsApp message templates for order status updates
 * Messages are sent to users when their order status changes
 */

// Status message configuration for each order status
export interface StatusMessageConfig {
  status: string;
  titleFr: string;
  titleEn: string;
  messageFr: (params: MessageParams) => string;
  messageEn: (params: MessageParams) => string;
  emoji: string;
  // Should we include document links in this status message?
  includeDocuments: boolean;
  // Button text for viewing details
  buttonTextFr: string;
  buttonTextEn: string;
}

export interface MessageParams {
  customerName: string;
  orderNumber: string;
  vehicleName: string;
  documentNames?: string[];
  documentUrls?: string[];
  dashboardUrl: string;
  eta?: string;
}

// Messages configuration per status
export const STATUS_MESSAGE_CONFIGS: StatusMessageConfig[] = [
  {
    status: 'deposit_paid',
    titleFr: 'Acompte confirmé',
    titleEn: 'Deposit Confirmed',
    emoji: '✅',
    includeDocuments: false,
    buttonTextFr: 'Voir ma commande',
    buttonTextEn: 'View my order',
    messageFr: (p) => `Bonjour ${p.customerName},

Votre acompte pour le *${p.vehicleName}* a bien été reçu !

📋 Commande: *${p.orderNumber}*

Prochaine étape: Nous allons bloquer le véhicule pour vous.

Suivez votre commande en temps réel:`,
    messageEn: (p) => `Hello ${p.customerName},

Your deposit for the *${p.vehicleName}* has been received!

📋 Order: *${p.orderNumber}*

Next step: We will lock the vehicle for you.

Track your order in real-time:`,
  },
  {
    status: 'vehicle_locked',
    titleFr: 'Véhicule bloqué',
    titleEn: 'Vehicle Locked',
    emoji: '🔒',
    includeDocuments: true,
    buttonTextFr: 'Voir les photos',
    buttonTextEn: 'View photos',
    messageFr: (p) => `Bonjour ${p.customerName},

Excellente nouvelle ! Votre *${p.vehicleName}* est maintenant bloqué et réservé pour vous.

📋 Commande: *${p.orderNumber}*
${p.documentNames?.length ? `\n📸 Photos disponibles:\n${p.documentNames.map(d => `• ${d}`).join('\n')}\n` : ''}
Prochaine étape: Nous préparons l'inspection du véhicule.`,
    messageEn: (p) => `Hello ${p.customerName},

Great news! Your *${p.vehicleName}* is now locked and reserved for you.

📋 Order: *${p.orderNumber}*
${p.documentNames?.length ? `\n📸 Photos available:\n${p.documentNames.map(d => `• ${d}`).join('\n')}\n` : ''}
Next step: We are preparing the vehicle inspection.`,
  },
  {
    status: 'inspection_sent',
    titleFr: 'Rapport d\'inspection',
    titleEn: 'Inspection Report',
    emoji: '🔍',
    includeDocuments: true,
    buttonTextFr: 'Voir le rapport',
    buttonTextEn: 'View report',
    messageFr: (p) => `Bonjour ${p.customerName},

Le rapport d'inspection de votre *${p.vehicleName}* est disponible !

📋 Commande: *${p.orderNumber}*
${p.documentNames?.length ? `\n📄 Documents:\n${p.documentNames.map(d => `• ${d}`).join('\n')}\n` : ''}
Consultez le rapport et confirmez pour procéder au paiement complet.`,
    messageEn: (p) => `Hello ${p.customerName},

The inspection report for your *${p.vehicleName}* is available!

📋 Order: *${p.orderNumber}*
${p.documentNames?.length ? `\n📄 Documents:\n${p.documentNames.map(d => `• ${d}`).join('\n')}\n` : ''}
Review the report and confirm to proceed with full payment.`,
  },
  {
    status: 'full_payment_received',
    titleFr: 'Paiement complet reçu',
    titleEn: 'Full Payment Received',
    emoji: '💰',
    includeDocuments: false,
    buttonTextFr: 'Voir ma commande',
    buttonTextEn: 'View my order',
    messageFr: (p) => `Bonjour ${p.customerName},

Le paiement complet pour votre *${p.vehicleName}* a été confirmé !

📋 Commande: *${p.orderNumber}*

Prochaine étape: Achat du véhicule en votre nom.

Merci pour votre confiance !`,
    messageEn: (p) => `Hello ${p.customerName},

The full payment for your *${p.vehicleName}* has been confirmed!

📋 Order: *${p.orderNumber}*

Next step: Purchasing the vehicle on your behalf.

Thank you for your trust!`,
  },
  {
    status: 'vehicle_purchased',
    titleFr: 'Véhicule acheté',
    titleEn: 'Vehicle Purchased',
    emoji: '🎉',
    includeDocuments: true,
    buttonTextFr: 'Voir les documents',
    buttonTextEn: 'View documents',
    messageFr: (p) => `Bonjour ${p.customerName},

Félicitations ! Votre *${p.vehicleName}* a été officiellement acheté !

📋 Commande: *${p.orderNumber}*
${p.documentNames?.length ? `\n📄 Documents d'achat:\n${p.documentNames.map(d => `• ${d}`).join('\n')}\n` : ''}
Prochaine étape: Préparation des formalités douanières d'export.`,
    messageEn: (p) => `Hello ${p.customerName},

Congratulations! Your *${p.vehicleName}* has been officially purchased!

📋 Order: *${p.orderNumber}*
${p.documentNames?.length ? `\n📄 Purchase documents:\n${p.documentNames.map(d => `• ${d}`).join('\n')}\n` : ''}
Next step: Preparing export customs formalities.`,
  },
  {
    status: 'export_customs',
    titleFr: 'Douane export',
    titleEn: 'Export Customs',
    emoji: '📦',
    includeDocuments: true,
    buttonTextFr: 'Voir les documents',
    buttonTextEn: 'View documents',
    messageFr: (p) => `Bonjour ${p.customerName},

Votre *${p.vehicleName}* est en cours de dédouanement export.

📋 Commande: *${p.orderNumber}*
${p.documentNames?.length ? `\n📄 Documents douaniers:\n${p.documentNames.map(d => `• ${d}`).join('\n')}\n` : ''}
Prochaine étape: Transit vers le port d'embarquement.`,
    messageEn: (p) => `Hello ${p.customerName},

Your *${p.vehicleName}* is undergoing export customs clearance.

📋 Order: *${p.orderNumber}*
${p.documentNames?.length ? `\n📄 Customs documents:\n${p.documentNames.map(d => `• ${d}`).join('\n')}\n` : ''}
Next step: Transit to the departure port.`,
  },
  {
    status: 'in_transit',
    titleFr: 'En transit',
    titleEn: 'In Transit',
    emoji: '🚚',
    includeDocuments: false,
    buttonTextFr: 'Suivre le transit',
    buttonTextEn: 'Track transit',
    messageFr: (p) => `Bonjour ${p.customerName},

Votre *${p.vehicleName}* est en transit vers le port d'embarquement !

📋 Commande: *${p.orderNumber}*

Prochaine étape: Arrivée au port pour l'expédition maritime.`,
    messageEn: (p) => `Hello ${p.customerName},

Your *${p.vehicleName}* is in transit to the departure port!

📋 Order: *${p.orderNumber}*

Next step: Arrival at port for shipping.`,
  },
  {
    status: 'at_port',
    titleFr: 'Au port',
    titleEn: 'At Port',
    emoji: '⚓',
    includeDocuments: true,
    buttonTextFr: 'Voir les photos',
    buttonTextEn: 'View photos',
    messageFr: (p) => `Bonjour ${p.customerName},

Votre *${p.vehicleName}* est arrivé au port et prêt pour l'embarquement !

📋 Commande: *${p.orderNumber}*
${p.documentNames?.length ? `\n📸 Photos au port:\n${p.documentNames.map(d => `• ${d}`).join('\n')}\n` : ''}
Prochaine étape: Chargement sur le navire.`,
    messageEn: (p) => `Hello ${p.customerName},

Your *${p.vehicleName}* has arrived at the port and is ready for shipping!

📋 Order: *${p.orderNumber}*
${p.documentNames?.length ? `\n📸 Port photos:\n${p.documentNames.map(d => `• ${d}`).join('\n')}\n` : ''}
Next step: Loading onto the ship.`,
  },
  {
    status: 'shipping',
    titleFr: 'En mer',
    titleEn: 'Shipping',
    emoji: '🚢',
    includeDocuments: true,
    buttonTextFr: 'Voir le B/L',
    buttonTextEn: 'View B/L',
    messageFr: (p) => `Bonjour ${p.customerName},

Votre *${p.vehicleName}* navigue vers sa destination !

📋 Commande: *${p.orderNumber}*
${p.eta ? `📅 Arrivée estimée: *${p.eta}*\n` : ''}${p.documentNames?.length ? `\n📄 Connaissement (B/L):\n${p.documentNames.map(d => `• ${d}`).join('\n')}\n` : ''}
Vous recevrez des mises à jour pendant le voyage.`,
    messageEn: (p) => `Hello ${p.customerName},

Your *${p.vehicleName}* is sailing to its destination!

📋 Order: *${p.orderNumber}*
${p.eta ? `📅 Estimated arrival: *${p.eta}*\n` : ''}${p.documentNames?.length ? `\n📄 Bill of Lading (B/L):\n${p.documentNames.map(d => `• ${d}`).join('\n')}\n` : ''}
You will receive updates during the voyage.`,
  },
  {
    status: 'documents_ready',
    titleFr: 'Documents disponibles',
    titleEn: 'Documents Ready',
    emoji: '📄',
    includeDocuments: true,
    buttonTextFr: 'Télécharger',
    buttonTextEn: 'Download',
    messageFr: (p) => `Bonjour ${p.customerName},

Les documents officiels de votre *${p.vehicleName}* sont prêts !

📋 Commande: *${p.orderNumber}*
${p.documentNames?.length ? `\n📄 Documents:\n${p.documentNames.map(d => `• ${d}`).join('\n')}\n` : ''}
Ces documents seront nécessaires pour le dédouanement à l'arrivée.`,
    messageEn: (p) => `Hello ${p.customerName},

The official documents for your *${p.vehicleName}* are ready!

📋 Order: *${p.orderNumber}*
${p.documentNames?.length ? `\n📄 Documents:\n${p.documentNames.map(d => `• ${d}`).join('\n')}\n` : ''}
These documents will be needed for customs clearance upon arrival.`,
  },
  {
    status: 'customs',
    titleFr: 'En douane',
    titleEn: 'In Customs',
    emoji: '🛃',
    includeDocuments: false,
    buttonTextFr: 'Voir le statut',
    buttonTextEn: 'View status',
    messageFr: (p) => `Bonjour ${p.customerName},

Votre *${p.vehicleName}* est arrivé et en cours de dédouanement !

📋 Commande: *${p.orderNumber}*

Nous vous tiendrons informé de l'avancement des formalités.`,
    messageEn: (p) => `Hello ${p.customerName},

Your *${p.vehicleName}* has arrived and is being cleared through customs!

📋 Order: *${p.orderNumber}*

We will keep you informed of the clearance progress.`,
  },
  {
    status: 'ready_pickup',
    titleFr: 'Prêt pour retrait',
    titleEn: 'Ready for Pickup',
    emoji: '🎊',
    includeDocuments: true,
    buttonTextFr: 'Voir les détails',
    buttonTextEn: 'View details',
    messageFr: (p) => `Bonjour ${p.customerName},

EXCELLENTE NOUVELLE ! Votre *${p.vehicleName}* est prêt pour le retrait !

📋 Commande: *${p.orderNumber}*
${p.documentNames?.length ? `\n📄 Documents finaux:\n${p.documentNames.map(d => `• ${d}`).join('\n')}\n` : ''}
Contactez-nous pour organiser la livraison ou le retrait.

📞 Nous sommes disponibles pour vous accompagner.`,
    messageEn: (p) => `Hello ${p.customerName},

GREAT NEWS! Your *${p.vehicleName}* is ready for pickup!

📋 Order: *${p.orderNumber}*
${p.documentNames?.length ? `\n📄 Final documents:\n${p.documentNames.map(d => `• ${d}`).join('\n')}\n` : ''}
Contact us to arrange delivery or pickup.

📞 We are available to assist you.`,
  },
  {
    status: 'delivered',
    titleFr: 'Véhicule livré',
    titleEn: 'Vehicle Delivered',
    emoji: '🚗',
    includeDocuments: false,
    buttonTextFr: 'Donner un avis',
    buttonTextEn: 'Leave feedback',
    messageFr: (p) => `Bonjour ${p.customerName},

Félicitations ! Votre *${p.vehicleName}* vous a été livré !

📋 Commande: *${p.orderNumber}*

Merci d'avoir choisi Driveby Africa ! 🙏

Nous serions ravis d'avoir votre avis sur notre service.

Bonne route ! 🚗💨`,
    messageEn: (p) => `Hello ${p.customerName},

Congratulations! Your *${p.vehicleName}* has been delivered!

📋 Order: *${p.orderNumber}*

Thank you for choosing Driveby Africa! 🙏

We would love to hear your feedback about our service.

Safe travels! 🚗💨`,
  },
];

// Get message config for a specific status
export function getStatusMessageConfig(status: string): StatusMessageConfig | undefined {
  return STATUS_MESSAGE_CONFIGS.find(c => c.status === status);
}

// Get message in user's language (default French for African market)
export function getStatusMessage(
  status: string,
  params: MessageParams,
  language: 'fr' | 'en' = 'fr'
): { title: string; message: string; buttonText: string; emoji: string } | null {
  const config = getStatusMessageConfig(status);
  if (!config) return null;

  return {
    title: language === 'fr' ? config.titleFr : config.titleEn,
    message: language === 'fr' ? config.messageFr(params) : config.messageEn(params),
    buttonText: language === 'fr' ? config.buttonTextFr : config.buttonTextEn,
    emoji: config.emoji,
  };
}

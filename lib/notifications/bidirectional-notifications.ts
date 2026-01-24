/**
 * Bidirectional Notifications System
 * Handles notifications between Admins and Collaborators
 */

import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

export type NotificationType =
  | 'order_status_updated'
  | 'document_uploaded'
  | 'new_order_assigned'
  | 'order_note_added'
  | 'payment_received'
  | 'urgent_attention_needed'
  | 'vehicle_submitted'
  | 'vehicle_approved'
  | 'vehicle_rejected'
  | 'batch_submitted'
  | 'batch_approved'
  | 'batch_rejected'
  | 'batch_order_created';

export type UserRole = 'admin' | 'super_admin' | 'collaborator';

interface NotificationData {
  orderId?: string;
  quoteId?: string;
  orderNumber?: string;
  vehicleInfo?: string;
  customerName?: string;
  oldStatus?: string;
  newStatus?: string;
  documentName?: string;
  note?: string;
  [key: string]: any;
}

interface CreateNotificationParams {
  type: NotificationType;
  title: string;
  titleZh: string;
  message: string;
  messageZh: string;
  data: NotificationData;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  actionUrl?: string;
  relatedEntityType?: 'order' | 'quote' | 'document' | 'vehicle' | 'batch' | 'batch_order';
  relatedEntityId?: string;
  targetRole?: UserRole; // If specified, only notify this role
  excludeUserId?: string; // Exclude the user who triggered the action
  targetCollaboratorId?: string; // Target specific collaborator
}

/**
 * Create notification for admins when collaborator performs action
 */
export async function notifyAdmins(
  supabase: ReturnType<typeof createClient<Database>>,
  params: Omit<CreateNotificationParams, 'targetRole'>
) {
  try {
    const notification = {
      type: params.type,
      title: params.title,
      title_zh: params.titleZh,
      message: params.message,
      message_zh: params.messageZh,
      data: params.data,
      priority: params.priority || 'medium',
      action_url: params.actionUrl,
      related_entity_type: params.relatedEntityType,
      related_entity_id: params.relatedEntityId,
      target_roles: ['admin', 'super_admin'] as UserRole[],
      created_by: params.excludeUserId,
    };

    const { error } = await supabase
      .from('admin_notifications')
      .insert([notification]);

    if (error) throw error;

    console.log(`✅ Admin notification created: ${params.title}`);
    return { success: true };
  } catch (error) {
    console.error('❌ Failed to notify admins:', error);
    return { success: false, error };
  }
}

/**
 * Create notification for collaborators when admin performs action
 */
export async function notifyCollaborators(
  supabase: ReturnType<typeof createClient<Database>>,
  params: Omit<CreateNotificationParams, 'targetRole'>
) {
  try {
    // Store targetCollaboratorId in data for filtering
    const notificationData = params.targetCollaboratorId
      ? { ...params.data, targetCollaboratorId: params.targetCollaboratorId }
      : params.data;

    const notification = {
      type: params.type,
      title: params.title,
      title_zh: params.titleZh,
      message: params.message,
      message_zh: params.messageZh,
      data: notificationData,
      priority: params.priority || 'medium',
      action_url: params.actionUrl,
      related_entity_type: params.relatedEntityType,
      related_entity_id: params.relatedEntityId,
      read_by: [],
      dismissed_by: [],
    };

    const { error } = await supabase
      .from('collaborator_notifications')
      .insert([notification]);

    if (error) throw error;

    console.log(`✅ Collaborator notification created: ${params.title}`);
    return { success: true };
  } catch (error) {
    console.error('❌ Failed to notify collaborators:', error);
    return { success: false, error };
  }
}

/**
 * Notify both admins and collaborators (for system-wide events)
 */
export async function notifyAll(
  supabase: ReturnType<typeof createClient<Database>>,
  params: Omit<CreateNotificationParams, 'targetRole' | 'excludeUserId'>
) {
  const [adminResult, collaboratorResult] = await Promise.all([
    notifyAdmins(supabase, params),
    notifyCollaborators(supabase, params),
  ]);

  return {
    success: adminResult.success && collaboratorResult.success,
    adminResult,
    collaboratorResult,
  };
}

/**
 * Notify when order status is updated
 */
export async function notifyOrderStatusUpdate(
  supabase: ReturnType<typeof createClient<Database>>,
  {
    orderId,
    orderNumber,
    oldStatus,
    newStatus,
    updatedByRole,
    updatedById,
    vehicleInfo,
    customerName,
  }: {
    orderId: string;
    orderNumber: string;
    oldStatus: string;
    newStatus: string;
    updatedByRole: UserRole;
    updatedById: string;
    vehicleInfo?: string;
    customerName?: string;
  }
) {
  const statusLabels: Record<string, { en: string; zh: string }> = {
    deposit_paid: { en: 'Deposit Paid', zh: '已付定金' },
    vehicle_locked: { en: 'Vehicle Locked', zh: '车辆已锁定' },
    inspection_sent: { en: 'Inspection Sent', zh: '已发送检验报告' },
    full_payment_received: { en: 'Full Payment Received', zh: '已收全款' },
    vehicle_purchased: { en: 'Vehicle Purchased', zh: '车辆已购买' },
    export_customs: { en: 'Export Customs', zh: '出口清关' },
    in_transit: { en: 'In Transit', zh: '运输中' },
    at_port: { en: 'At Port', zh: '已到港口' },
    shipping: { en: 'Shipping', zh: '海运中' },
    documents_ready: { en: 'Documents Ready', zh: '文件准备就绪' },
    customs: { en: 'Customs Clearance', zh: '进口清关' },
    ready_pickup: { en: 'Ready for Pickup', zh: '准备提车' },
    delivered: { en: 'Delivered', zh: '已交付' },
  };

  const oldStatusLabel = statusLabels[oldStatus] || { en: oldStatus, zh: oldStatus };
  const newStatusLabel = statusLabels[newStatus] || { en: newStatus, zh: newStatus };

  const notificationParams = {
    type: 'order_status_updated' as NotificationType,
    title: `Order ${orderNumber} status updated`,
    titleZh: `订单 ${orderNumber} 状态已更新`,
    message: `Status changed from "${oldStatusLabel.en}" to "${newStatusLabel.en}"`,
    messageZh: `状态从"${oldStatusLabel.zh}"更改为"${newStatusLabel.zh}"`,
    data: {
      orderId,
      orderNumber,
      oldStatus,
      newStatus,
      vehicleInfo,
      customerName,
      updatedByRole,
    },
    priority: 'medium' as const,
    actionUrl: `/admin/orders?orderId=${orderId}`,
    relatedEntityType: 'order' as const,
    relatedEntityId: orderId,
    excludeUserId: updatedById,
  };

  // Notify the opposite role
  if (updatedByRole === 'collaborator') {
    return await notifyAdmins(supabase, notificationParams);
  } else {
    return await notifyCollaborators(supabase, notificationParams);
  }
}

/**
 * Notify when document is uploaded
 */
export async function notifyDocumentUpload(
  supabase: ReturnType<typeof createClient<Database>>,
  {
    orderId,
    orderNumber,
    documentName,
    documentUrl,
    uploadedByRole,
    uploadedById,
    vehicleInfo,
  }: {
    orderId: string;
    orderNumber: string;
    documentName: string;
    documentUrl: string;
    uploadedByRole: UserRole;
    uploadedById: string;
    vehicleInfo?: string;
  }
) {
  const notificationParams = {
    type: 'document_uploaded' as NotificationType,
    title: `New document uploaded for Order ${orderNumber}`,
    titleZh: `订单 ${orderNumber} 已上传新文件`,
    message: `Document "${documentName}" has been uploaded`,
    messageZh: `已上传文件"${documentName}"`,
    data: {
      orderId,
      orderNumber,
      documentName,
      documentUrl,
      vehicleInfo,
      uploadedByRole,
    },
    priority: 'medium' as const,
    actionUrl: `/admin/orders?orderId=${orderId}`,
    relatedEntityType: 'document' as const,
    relatedEntityId: orderId,
    excludeUserId: uploadedById,
  };

  // Notify the opposite role
  if (uploadedByRole === 'collaborator') {
    return await notifyAdmins(supabase, notificationParams);
  } else {
    return await notifyCollaborators(supabase, notificationParams);
  }
}

/**
 * Notify when new order is created and assigned
 */
export async function notifyNewOrderAssigned(
  supabase: ReturnType<typeof createClient<Database>>,
  {
    orderId,
    orderNumber,
    vehicleInfo,
    customerName,
    destination,
  }: {
    orderId: string;
    orderNumber: string;
    vehicleInfo: string;
    customerName: string;
    destination: string;
  }
) {
  return await notifyCollaborators(supabase, {
    type: 'new_order_assigned',
    title: `New order ${orderNumber} assigned`,
    titleZh: `新订单 ${orderNumber} 已分配`,
    message: `${vehicleInfo} for ${customerName} → ${destination}`,
    messageZh: `${vehicleInfo} 客户 ${customerName} → ${destination}`,
    data: {
      orderId,
      orderNumber,
      vehicleInfo,
      customerName,
      destination,
    },
    priority: 'high',
    actionUrl: `/collaborator/orders?orderId=${orderId}`,
    relatedEntityType: 'order',
    relatedEntityId: orderId,
  });
}

/**
 * Send WhatsApp notification to customer about order update
 * This function queues a WhatsApp message via notification_queue
 */
export async function sendWhatsAppToCustomer(
  supabase: ReturnType<typeof createClient<Database>>,
  {
    userId,
    whatsappNumber,
    orderNumber,
    status,
    vehicleInfo,
    message,
    messageZh,
    documentUrl,
  }: {
    userId: string;
    whatsappNumber: string;
    orderNumber: string;
    status: string;
    vehicleInfo: string;
    message: string;
    messageZh: string;
    documentUrl?: string;
  }
) {
  try {
    // Build WhatsApp message
    const whatsappMessage = documentUrl
      ? `${message}\n\nDocument: ${documentUrl}`
      : message;

    const whatsappMessageZh = documentUrl
      ? `${messageZh}\n\n文件: ${documentUrl}`
      : messageZh;

    // Insert into notification_queue for async processing
    const { error } = await supabase
      .from('notification_queue')
      .insert([
        {
          user_id: userId,
          type: 'whatsapp',
          recipient: whatsappNumber,
          subject: `Order Update: ${orderNumber}`,
          subject_zh: `订单更新: ${orderNumber}`,
          message: whatsappMessage,
          message_zh: whatsappMessageZh,
          data: {
            orderNumber,
            status,
            vehicleInfo,
            documentUrl,
          },
          priority: 'high',
          scheduled_for: new Date().toISOString(),
        },
      ]);

    if (error) throw error;

    console.log(`✅ WhatsApp notification queued for ${whatsappNumber}`);
    return { success: true };
  } catch (error) {
    console.error('❌ Failed to queue WhatsApp notification:', error);
    return { success: false, error };
  }
}

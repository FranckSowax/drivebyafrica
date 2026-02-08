import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireCollaborator } from '@/lib/auth/collaborator-check';
import { notifyAdmins } from '@/lib/notifications/bidirectional-notifications';
import { getStatusDocumentConfig } from '@/lib/order-documents-config';
import { sendDocumentNotification } from '@/lib/whatsapp/send-status-notification';
import type { Database } from '@/types/database';

// Document type interface
interface UploadedDocument {
  id?: string;
  name: string;
  url: string;
  type: string;
  size: number;
  uploaded_at: string;
  uploaded_by: string;
  requirement_id?: string;
  status?: string;
  visible_to_client?: boolean;
}

// POST - Upload documents for an order
export async function POST(request: Request) {
  try {
    const authCheck = await requireCollaborator();
    if (!authCheck.isCollaborator) {
      return authCheck.response;
    }

    const supabase = authCheck.supabase;
    const user = authCheck.user;

    const body = await request.json();
    const { orderId, documents, sendNotification = true, sendWhatsApp = true, requirementId, status: docStatus } = body;

    if (!orderId || !documents || !Array.isArray(documents) || documents.length === 0) {
      return NextResponse.json(
        { error: 'Order ID and documents required', error_zh: '需要订单ID和文件' },
        { status: 400 }
      );
    }

    let visibleToClient = true;
    if (requirementId && docStatus) {
      const config = getStatusDocumentConfig(docStatus);
      const requirement = config?.requiredDocuments.find(r => r.id === requirementId);
      if (requirement) {
        visibleToClient = requirement.visibleToClient;
      }
    }

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      console.error('Error fetching order:', orderError);
      return NextResponse.json(
        { error: 'Order not found', error_zh: '找不到订单' },
        { status: 404 }
      );
    }

    let profile: { full_name: string | null; whatsapp_number: string | null; phone: string | null } | null = null;
    if (order.user_id) {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('full_name, whatsapp_number, phone')
        .eq('id', order.user_id)
        .single();
      profile = profileData;
    }

    let vehicle: { make: string; model: string; year: number | null } | null = null;
    if (order.vehicle_id) {
      const { data: vehicleData } = await supabase
        .from('vehicles')
        .select('make, model, year')
        .eq('id', order.vehicle_id)
        .single();
      vehicle = vehicleData;
    }

    const now = new Date().toISOString();
    const newDocuments: UploadedDocument[] = documents.map((doc: { name: string; url: string; type: string; size: number }) => ({
      id: crypto.randomUUID(),
      name: doc.name,
      url: doc.url,
      type: doc.type || 'application/pdf',
      size: doc.size || 0,
      uploaded_at: now,
      uploaded_by: user.id,
      requirement_id: requirementId || undefined,
      status: docStatus || undefined,
      visible_to_client: visibleToClient,
    }));

    const existingDocs = Array.isArray(order.uploaded_documents)
      ? (order.uploaded_documents as unknown as UploadedDocument[])
      : [];

    const allDocuments = [...existingDocs, ...newDocuments];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: updatedOrder, error: updateError } = await (supabase as any)
      .from('orders')
      .update({
        uploaded_documents: allDocuments,
        documents_sent_at: now,
      })
      .eq('id', orderId)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    const customerName = profile?.full_name || 'Customer';
    const whatsappNumber = profile?.whatsapp_number || profile?.phone;

    if (sendNotification) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any).rpc('create_user_notification', {
          p_user_id: order.user_id,
          p_type: 'documents_ready',
          p_title: 'Documents available / 文件可用',
          p_message: `Documents for your order #${order.order_number || orderId.slice(0, 8)} are now available. / 您的订单 #${order.order_number || orderId.slice(0, 8)} 的文件现已可用。`,
          p_action_url: `/dashboard/orders/${orderId}`,
          p_action_label: 'View documents / 查看文件',
          p_icon: 'file-text',
          p_priority: 'high',
          p_related_entity_type: 'order',
          p_related_entity_id: orderId,
        });
      } catch (notifError) {
        console.error('Failed to send notification:', notifError);
      }
    }

    try {
      const { createClient: createAdminClient } = await import('@supabase/supabase-js');
      const supabaseAdmin = createAdminClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );

      const vehicleInfo = vehicle
        ? `\${vehicle.make} \${vehicle.model} \${vehicle.year || ''}`
        : 'Vehicle';

      const documentNames = newDocuments.map(d => d.name).join(', ');

      await notifyAdmins(supabaseAdmin, {
        type: 'document_uploaded',
        title: `Documents uploaded by collaborator for order \${order.order_number || orderId.slice(0, 8)}`,
        titleZh: `协作员为订单 \${order.order_number || orderId.slice(0, 8)} 上传了文件`,
        message: `\${newDocuments.length} document(s) uploaded: \${documentNames}`,
        messageZh: `已上传 \${newDocuments.length} 个文件: \${documentNames}`,
        data: {
          orderId,
          orderNumber: order.order_number || orderId.slice(0, 8),
          vehicleInfo,
          customerName,
          documentNames,
          documentCount: newDocuments.length,
          status: docStatus || order.status,
        },
        priority: 'normal',
        actionUrl: `/admin/orders?orderId=\${orderId}`,
        relatedEntityType: 'document',
        relatedEntityId: orderId,
        excludeUserId: user.id,
      });

      console.log('✅ Admin notified of document upload');
    } catch (notifError) {
      console.error('❌ Failed to notify admins:', notifError);
    }

    let whatsappSent = false;
    if (sendWhatsApp && whatsappNumber) {
      try {
        const visibleNewDocs = newDocuments.filter((d: UploadedDocument) => d.visible_to_client !== false);
        if (visibleNewDocs.length > 0) {
          const result = await sendDocumentNotification({
            phone: whatsappNumber,
            customerName,
            orderNumber: order.order_number || orderId.slice(0, 8),
            orderId,
            documents: visibleNewDocs.map((d: UploadedDocument) => ({
              name: d.name,
              url: d.url,
              type: d.type,
              visible_to_client: d.visible_to_client,
            })),
            language: 'fr',
          });
          whatsappSent = result.success;
        }
      } catch (whatsappError) {
        console.error('Failed to send WhatsApp:', whatsappError);
      }
    }

    return NextResponse.json({
      success: true,
      order: updatedOrder,
      documentsCount: newDocuments.length,
      notificationSent: sendNotification,
      whatsappSent,
      adminNotified: true,
    });
  } catch (error) {
    console.error('Error uploading documents:', error);
    return NextResponse.json(
      { error: 'Error uploading documents', error_zh: '上传文件时出错' },
      { status: 500 }
    );
  }
}

// GET - Get documents for an order
export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized', error_zh: '未经授权' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get('orderId');

    if (!orderId) {
      return NextResponse.json(
        { error: 'Order ID required', error_zh: '需要订单ID' },
        { status: 400 }
      );
    }

    const { data: order, error } = await supabase
      .from('orders')
      .select('id, user_id, uploaded_documents, documents_sent_at, order_number')
      .eq('id', orderId)
      .single();

    if (error || !order) {
      return NextResponse.json(
        { error: 'Order not found', error_zh: '找不到订单' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      documents: order.uploaded_documents || [],
      sentAt: order.documents_sent_at,
      orderNumber: order.order_number,
    });
  } catch (error) {
    console.error('Error fetching documents:', error);
    return NextResponse.json(
      { error: 'Error fetching documents', error_zh: '获取文件时出错' },
      { status: 500 }
    );
  }
}

// DELETE - Remove a document from an order
export async function DELETE(request: Request) {
  try {
    const authCheck = await requireCollaborator();
    if (!authCheck.isCollaborator) {
      return authCheck.response;
    }

    const supabase = authCheck.supabase;
    const user = authCheck.user;

    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get('orderId');
    const documentUrl = searchParams.get('documentUrl');
    const documentId = searchParams.get('documentId');

    if (!orderId || (!documentUrl && !documentId)) {
      return NextResponse.json(
        { error: 'Order ID and document URL/ID required', error_zh: '需要订单ID和文件URL/ID' },
        { status: 400 }
      );
    }

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('uploaded_documents, order_number')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      return NextResponse.json(
        { error: 'Order not found', error_zh: '找不到订单' },
        { status: 404 }
      );
    }

    const currentDocs = Array.isArray(order.uploaded_documents)
      ? (order.uploaded_documents as unknown as UploadedDocument[])
      : [];

    const deletedDoc = currentDocs.find((doc) => {
      if (documentId && doc.id) {
        return doc.id === documentId;
      }
      return doc.url === documentUrl;
    });

    const updatedDocs = currentDocs.filter((doc) => {
      if (documentId && doc.id) {
        return doc.id !== documentId;
      }
      return doc.url !== documentUrl;
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: updateError } = await (supabase as any)
      .from('orders')
      .update({ uploaded_documents: updatedDocs })
      .eq('id', orderId);

    if (updateError) {
      throw updateError;
    }

    if (deletedDoc) {
      try {
        const { createClient: createAdminClient } = await import('@supabase/supabase-js');
        const supabaseAdmin = createAdminClient<Database>(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        await notifyAdmins(supabaseAdmin, {
          type: 'document_uploaded',
          title: `Document deleted by collaborator for order \${order.order_number || orderId.slice(0, 8)}`,
          titleZh: `协作员删除了订单 \${order.order_number || orderId.slice(0, 8)} 的文件`,
          message: `Document "\${deletedDoc.name}" was deleted`,
          messageZh: `文件"\${deletedDoc.name}"已被删除`,
          data: {
            orderId,
            orderNumber: order.order_number || orderId.slice(0, 8),
            documentName: deletedDoc.name,
            action: 'deleted',
          },
          priority: 'low',
          actionUrl: `/admin/orders?orderId=\${orderId}`,
          relatedEntityType: 'document',
          relatedEntityId: orderId,
          excludeUserId: user.id,
        });
      } catch (notifError) {
        console.error('❌ Failed to notify admins:', notifError);
      }
    }

    return NextResponse.json({
      success: true,
      remainingDocuments: updatedDocs.length,
      adminNotified: true,
    });
  } catch (error) {
    console.error('Error deleting document:', error);
    return NextResponse.json(
      { error: 'Error deleting document', error_zh: '删除文件时出错' },
      { status: 500 }
    );
  }
}

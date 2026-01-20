import { NextResponse } from 'next/server';
import { requireCollaborator, logCollaboratorActivity } from '@/lib/auth/collaborator-check';
import { getStatusDocumentConfig } from '@/lib/order-documents-config';

// Document type interface - Enhanced with status document support
interface UploadedDocument {
  id?: string;
  name: string;
  url: string;
  type: string;
  size: number;
  uploaded_at: string;
  uploaded_by: string;
  uploaded_by_role?: 'admin' | 'collaborator';
  // New fields for status-specific documents
  requirement_id?: string;
  status?: string;
  visible_to_client?: boolean;
}

// POST - Upload documents for an order (collaborators can upload)
export async function POST(request: Request) {
  try {
    // Verify collaborator authentication
    const authCheck = await requireCollaborator();
    if (!authCheck.isCollaborator) {
      return authCheck.response;
    }

    const supabase = authCheck.supabase;
    const body = await request.json();
    const { orderId, documents, sendNotification = true, sendWhatsApp = true, requirementId, status: docStatus } = body;

    if (!orderId || !documents || !Array.isArray(documents) || documents.length === 0) {
      return NextResponse.json(
        { error: 'Order ID and documents required', error_zh: '需要订单ID和文件' },
        { status: 400 }
      );
    }

    // Get visibility from status config if requirement is specified
    let visibleToClient = true;
    if (requirementId && docStatus) {
      const config = getStatusDocumentConfig(docStatus);
      const requirement = config?.requiredDocuments.find(r => r.id === requirementId);
      if (requirement) {
        visibleToClient = requirement.visibleToClient;
      }
    }

    // Try to get from orders table first (new system)
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*, profiles!orders_user_id_fkey(full_name, whatsapp_number, phone)')
      .eq('id', orderId)
      .single();

    if (!orderError && order) {
      // Found in orders table - use new system
      const now = new Date().toISOString();
      const newDocuments: UploadedDocument[] = documents.map((doc: { name: string; url: string; type: string; size: number }) => ({
        id: crypto.randomUUID(),
        name: doc.name,
        url: doc.url,
        type: doc.type || 'application/pdf',
        size: doc.size || 0,
        uploaded_at: now,
        uploaded_by: authCheck.user.id,
        uploaded_by_role: 'collaborator' as const,
        requirement_id: requirementId || undefined,
        status: docStatus || undefined,
        visible_to_client: visibleToClient,
      }));

      // Get existing documents
      const existingDocs = Array.isArray(order.uploaded_documents)
        ? (order.uploaded_documents as unknown as UploadedDocument[])
        : [];

      const allDocuments = [...existingDocs, ...newDocuments];

      // Update order with new documents
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: updateError } = await (supabase as any)
        .from('orders')
        .update({
          uploaded_documents: allDocuments,
          documents_sent_at: now,
        })
        .eq('id', orderId);

      if (updateError) throw updateError;

      // Get profile for notifications
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const profile = (order as any).profiles;
      const customerName = profile?.full_name || 'Customer';
      const whatsappNumber = profile?.whatsapp_number || profile?.phone;
      const orderNumber = order.order_number || `ORD-${orderId.slice(0, 8).toUpperCase()}`;

      // Send in-app notification to customer (only for client-visible docs)
      if (sendNotification && visibleToClient) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (supabase as any).rpc('create_user_notification', {
            p_user_id: order.user_id,
            p_type: 'documents_ready',
            p_title: 'Documents available / 文件已上传',
            p_message: `Documents for your order #${orderNumber} are now available for download.`,
            p_action_url: `/dashboard/orders/${orderId}`,
            p_action_label: 'View documents',
            p_icon: 'file-text',
            p_priority: 'high',
            p_related_entity_type: 'order',
            p_related_entity_id: orderId,
          });
        } catch (notifError) {
          console.error('Failed to send notification:', notifError);
        }
      }

      // Send WhatsApp notification (only for client-visible docs)
      let whatsappSent = false;
      if (sendWhatsApp && whatsappNumber && visibleToClient) {
        try {
          const documentNames = newDocuments
            .filter(d => d.visible_to_client)
            .map(d => `- ${d.name}`)
            .join('\n');

          if (documentNames) {
            const message = `🚗 *Driveby Africa*\n\nHello ${customerName},\n\nDocuments for your order are now available:\n\n${documentNames}\n\n📥 Download from your dashboard:\nhttps://drivebyafrica.netlify.app/dashboard/orders/${orderId}\n\nBest regards,\nDriveby Africa Team`;

            const whatsappApiUrl = process.env.WHATSAPP_API_URL;
            const whatsappApiKey = process.env.WHATSAPP_API_KEY;

            if (whatsappApiUrl && whatsappApiKey) {
              const response = await fetch(whatsappApiUrl, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${whatsappApiKey}`,
                },
                body: JSON.stringify({
                  phone: whatsappNumber.replace(/[^0-9+]/g, ''),
                  message,
                }),
              });

              if (response.ok) {
                whatsappSent = true;
              }
            }
          }
        } catch (whatsappError) {
          console.error('Failed to send WhatsApp:', whatsappError);
        }
      }

      // Log activity
      await logCollaboratorActivity(
        supabase,
        authCheck.user.id,
        'document_upload',
        {
          orderId,
          documentNames: newDocuments.map(d => d.name),
          documentCount: newDocuments.length,
          requirementId,
          status: docStatus,
        },
        request
      );

      return NextResponse.json({
        success: true,
        documentsCount: newDocuments.length,
        notificationSent: sendNotification && visibleToClient,
        whatsappSent,
      });
    }

    // Fallback to legacy quotes system
    const { data: quote, error: quoteError } = await supabase
      .from('quotes')
      .select('*, profiles!quotes_user_id_fkey(full_name, whatsapp_number, phone)')
      .eq('id', orderId)
      .eq('status', 'accepted')
      .single();

    if (quoteError || !quote) {
      return NextResponse.json(
        { error: 'Order not found', error_zh: '未找到订单' },
        { status: 404 }
      );
    }

    // Legacy: Prepare documents array
    const now = new Date().toISOString();
    const newDocuments: UploadedDocument[] = documents.map((doc: { name: string; url: string; type: string; size: number }) => ({
      id: crypto.randomUUID(),
      name: doc.name,
      url: doc.url,
      type: doc.type || 'application/pdf',
      size: doc.size || 0,
      uploaded_at: now,
      uploaded_by: authCheck.user.id,
      uploaded_by_role: 'collaborator' as const,
      requirement_id: requirementId || undefined,
      status: docStatus || undefined,
      visible_to_client: visibleToClient,
    }));

    // Get existing documents from order_tracking or create new record
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabaseAny = supabase as any;

    const { data: tracking } = await supabaseAny
      .from('order_tracking')
      .select('*')
      .eq('quote_id', orderId)
      .single();

    const existingDocs = tracking?.uploaded_documents
      ? (Array.isArray(tracking.uploaded_documents) ? tracking.uploaded_documents : [])
      : [];

    // Combine documents
    const allDocuments = [...existingDocs, ...newDocuments];

    // Update or create order_tracking with documents
    if (tracking) {
      const { error: updateError } = await supabaseAny
        .from('order_tracking')
        .update({
          uploaded_documents: allDocuments,
          documents_sent_at: now,
          updated_at: now,
        })
        .eq('quote_id', orderId);

      if (updateError) throw updateError;
    } else {
      const { error: insertError } = await supabaseAny
        .from('order_tracking')
        .insert({
          quote_id: orderId,
          order_status: 'deposit_paid',
          tracking_steps: [],
          uploaded_documents: allDocuments,
          documents_sent_at: now,
        });

      if (insertError) throw insertError;
    }

    // Get profile for notifications
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const profile = (quote as any).profiles;
    const customerName = profile?.full_name || 'Customer';
    const whatsappNumber = profile?.whatsapp_number || profile?.phone;
    const orderNumber = quote.quote_number?.replace('QT-', 'ORD-') || orderId.slice(0, 8);

    // Send in-app notification to customer
    if (sendNotification && visibleToClient) {
      try {
        await supabaseAny.rpc('create_user_notification', {
          p_user_id: quote.user_id,
          p_type: 'documents_ready',
          p_title: 'Documents available / 文件已上传',
          p_message: `Documents for your order #${orderNumber} are now available for download.`,
          p_action_url: `/dashboard/orders/${orderId}`,
          p_action_label: 'View documents',
          p_icon: 'file-text',
          p_priority: 'high',
          p_related_entity_type: 'order',
          p_related_entity_id: orderId,
        });
      } catch (notifError) {
        console.error('Failed to send notification:', notifError);
      }
    }

    // Send WhatsApp notification
    let whatsappSent = false;
    if (sendWhatsApp && whatsappNumber && visibleToClient) {
      try {
        const documentNames = newDocuments
          .filter(d => d.visible_to_client)
          .map(d => `- ${d.name}`)
          .join('\n');

        if (documentNames) {
          const message = `🚗 *Driveby Africa*\n\nHello ${customerName},\n\nDocuments for your order are now available:\n\n${documentNames}\n\n📥 Download from your dashboard:\nhttps://drivebyafrica.netlify.app/dashboard/orders/${orderId}\n\nBest regards,\nDriveby Africa Team`;

          const whatsappApiUrl = process.env.WHATSAPP_API_URL;
          const whatsappApiKey = process.env.WHATSAPP_API_KEY;

          if (whatsappApiUrl && whatsappApiKey) {
            const response = await fetch(whatsappApiUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${whatsappApiKey}`,
              },
              body: JSON.stringify({
                phone: whatsappNumber.replace(/[^0-9+]/g, ''),
                message,
              }),
            });

            if (response.ok) {
              whatsappSent = true;
            }
          }
        }
      } catch (whatsappError) {
        console.error('Failed to send WhatsApp:', whatsappError);
      }
    }

    // Log activity
    await logCollaboratorActivity(
      supabase,
      authCheck.user.id,
      'document_upload',
      {
        orderId,
        documentNames: newDocuments.map(d => d.name),
        documentCount: newDocuments.length,
        requirementId,
        status: docStatus,
      },
      request
    );

    return NextResponse.json({
      success: true,
      documentsCount: newDocuments.length,
      notificationSent: sendNotification && visibleToClient,
      whatsappSent,
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
    // Verify collaborator authentication
    const authCheck = await requireCollaborator();
    if (!authCheck.isCollaborator) {
      return authCheck.response;
    }

    const supabase = authCheck.supabase;
    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get('orderId');

    if (!orderId) {
      return NextResponse.json(
        { error: 'Order ID required', error_zh: '需要订单ID' },
        { status: 400 }
      );
    }

    // Try orders table first
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('order_number, uploaded_documents, documents_sent_at')
      .eq('id', orderId)
      .single();

    if (!orderError && order) {
      return NextResponse.json({
        documents: order.uploaded_documents || [],
        sentAt: order.documents_sent_at,
        orderNumber: order.order_number || `ORD-${orderId.slice(0, 8).toUpperCase()}`,
      });
    }

    // Fallback to legacy order_tracking
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: tracking, error } = await (supabase as any)
      .from('order_tracking')
      .select('uploaded_documents, documents_sent_at')
      .eq('quote_id', orderId)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    // Get order number from quotes
    const { data: quote } = await supabase
      .from('quotes')
      .select('quote_number')
      .eq('id', orderId)
      .single();

    return NextResponse.json({
      documents: tracking?.uploaded_documents || [],
      sentAt: tracking?.documents_sent_at,
      orderNumber: quote?.quote_number?.replace('QT-', 'ORD-') || orderId.slice(0, 8),
    });
  } catch (error) {
    console.error('Error fetching documents:', error);
    return NextResponse.json(
      { error: 'Error fetching documents', error_zh: '获取文件时出错' },
      { status: 500 }
    );
  }
}

// Note: No DELETE endpoint for collaborators - they cannot delete documents

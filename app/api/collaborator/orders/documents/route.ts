import { NextResponse } from 'next/server';
import { requireCollaborator, logCollaboratorActivity } from '@/lib/auth/collaborator-check';

// Document type interface
interface UploadedDocument {
  name: string;
  url: string;
  type: string;
  size: number;
  uploaded_at: string;
  uploaded_by: string;
  uploaded_by_role?: 'admin' | 'collaborator';
}

// POST - Upload documents for an order (collaborators can upload but not delete)
export async function POST(request: Request) {
  try {
    // Verify collaborator authentication
    const authCheck = await requireCollaborator();
    if (!authCheck.isCollaborator) {
      return authCheck.response;
    }

    const supabase = authCheck.supabase;
    const body = await request.json();
    const { orderId, documents, sendNotification = true, sendWhatsApp = true } = body;

    if (!orderId || !documents || !Array.isArray(documents) || documents.length === 0) {
      return NextResponse.json(
        { error: 'Order ID and documents required', error_zh: '需要订单ID和文件' },
        { status: 400 }
      );
    }

    // Get the order (from quotes with status 'accepted')
    const { data: order, error: orderError } = await supabase
      .from('quotes')
      .select('*, profiles!quotes_user_id_fkey(full_name, whatsapp_number, phone)')
      .eq('id', orderId)
      .eq('status', 'accepted')
      .single();

    if (orderError || !order) {
      return NextResponse.json(
        { error: 'Order not found', error_zh: '未找到订单' },
        { status: 404 }
      );
    }

    // Prepare documents array
    const now = new Date().toISOString();
    const newDocuments: UploadedDocument[] = documents.map((doc: { name: string; url: string; type: string; size: number }) => ({
      name: doc.name,
      url: doc.url,
      type: doc.type || 'application/pdf',
      size: doc.size || 0,
      uploaded_at: now,
      uploaded_by: authCheck.user.id,
      uploaded_by_role: 'collaborator' as const,
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
    const profile = (order as any).profiles;
    const customerName = profile?.full_name || 'Customer';
    const whatsappNumber = profile?.whatsapp_number || profile?.phone;
    const orderNumber = order.quote_number?.replace('QT-', 'ORD-') || orderId.slice(0, 8);

    // Send in-app notification to customer
    if (sendNotification) {
      try {
        await supabaseAny.rpc('create_user_notification', {
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
        // Continue even if notification fails
      }
    }

    // Send WhatsApp notification
    let whatsappSent = false;
    if (sendWhatsApp && whatsappNumber) {
      try {
        const documentNames = newDocuments.map(d => `- ${d.name}`).join('\n');
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
        } else {
          console.log('WhatsApp message to send:', { to: whatsappNumber, message });
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
      },
      request
    );

    return NextResponse.json({
      success: true,
      documentsCount: newDocuments.length,
      notificationSent: sendNotification,
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

    // Get order tracking with documents
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: tracking, error } = await (supabase as any)
      .from('order_tracking')
      .select('uploaded_documents, documents_sent_at')
      .eq('quote_id', orderId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
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

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
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
  // New fields for status-specific documents
  requirement_id?: string;
  status?: string;
  visible_to_client?: boolean;
}

// Helper to check if user is admin
async function isUserAdmin(supabase: Awaited<ReturnType<typeof createClient>>, userId: string): Promise<boolean> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profile } = await (supabase as any)
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single();

  const role = profile?.role as string | undefined;
  return role === 'admin' || role === 'super_admin';
}

// POST - Upload documents for an order
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    if (!(await isUserAdmin(supabase, user.id))) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }

    const body = await request.json();
    const { orderId, documents, sendNotification = true, sendWhatsApp = true, requirementId, status: docStatus } = body;

    if (!orderId || !documents || !Array.isArray(documents) || documents.length === 0) {
      return NextResponse.json(
        { error: 'Order ID et documents requis' },
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

    // Get the order (without FK join to avoid schema cache issues)
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      console.error('Error fetching order:', orderError);
      return NextResponse.json(
        { error: 'Commande non trouvée' },
        { status: 404 }
      );
    }

    // Fetch profile separately for notifications
    let profile: { full_name: string | null; whatsapp_number: string | null; phone: string | null } | null = null;
    if (order.user_id) {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('full_name, whatsapp_number, phone')
        .eq('id', order.user_id)
        .single();
      profile = profileData;
    }

    // Prepare documents array
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

    // Get existing documents
    const existingDocs = Array.isArray(order.uploaded_documents)
      ? (order.uploaded_documents as unknown as UploadedDocument[])
      : [];

    // Combine documents
    const allDocuments = [...existingDocs, ...newDocuments];

    // Update order with new documents (status is managed separately by admin)
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

    // Use profile fetched earlier for notifications
    const customerName = profile?.full_name || 'Client';
    const whatsappNumber = profile?.whatsapp_number || profile?.phone;

    // Send in-app notification
    if (sendNotification) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any).rpc('create_user_notification', {
          p_user_id: order.user_id,
          p_type: 'documents_ready',
          p_title: 'Documents disponibles',
          p_message: `Les documents de votre commande #${order.order_number || orderId.slice(0, 8)} sont disponibles au téléchargement.`,
          p_action_url: `/dashboard/orders/${orderId}`,
          p_action_label: 'Voir les documents',
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
        // Format the message
        const documentNames = newDocuments.map(d => `- ${d.name}`).join('\n');
        const message = `🚗 *Driveby Africa*\n\nBonjour ${customerName},\n\nLes documents de votre commande sont maintenant disponibles :\n\n${documentNames}\n\n📥 Téléchargez-les depuis votre espace client :\nhttps://driveby-africa.com/dashboard/orders/${orderId}\n\nCordialement,\nL'équipe Driveby Africa`;

        // Send via WhatsApp API (if configured)
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
          // Log for manual sending if API not configured
          console.log('WhatsApp message to send:', {
            to: whatsappNumber,
            message,
          });
        }
      } catch (whatsappError) {
        console.error('Failed to send WhatsApp:', whatsappError);
        // Continue even if WhatsApp fails
      }
    }

    return NextResponse.json({
      success: true,
      order: updatedOrder,
      documentsCount: newDocuments.length,
      notificationSent: sendNotification,
      whatsappSent,
    });
  } catch (error) {
    console.error('Error uploading documents:', error);
    return NextResponse.json(
      { error: 'Erreur lors de l\'upload des documents' },
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
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get('orderId');

    if (!orderId) {
      return NextResponse.json({ error: 'Order ID requis' }, { status: 400 });
    }

    // Check if user is admin or order owner
    const isAdmin = await isUserAdmin(supabase, user.id);

    let query = supabase
      .from('orders')
      .select('id, user_id, uploaded_documents, documents_sent_at, order_number')
      .eq('id', orderId);

    if (!isAdmin) {
      query = query.eq('user_id', user.id);
    }

    const { data: order, error } = await query.single();

    if (error || !order) {
      return NextResponse.json(
        { error: 'Commande non trouvée' },
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
      { error: 'Erreur lors de la récupération des documents' },
      { status: 500 }
    );
  }
}

// DELETE - Remove a document from an order
export async function DELETE(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    if (!(await isUserAdmin(supabase, user.id))) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get('orderId');
    const documentUrl = searchParams.get('documentUrl');
    const documentId = searchParams.get('documentId');

    if (!orderId || (!documentUrl && !documentId)) {
      return NextResponse.json(
        { error: 'Order ID et document URL/ID requis' },
        { status: 400 }
      );
    }

    // Get current documents
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('uploaded_documents')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      return NextResponse.json(
        { error: 'Commande non trouvée' },
        { status: 404 }
      );
    }

    // Filter out the document to delete (by ID or URL)
    const currentDocs = Array.isArray(order.uploaded_documents)
      ? (order.uploaded_documents as unknown as UploadedDocument[])
      : [];

    const updatedDocs = currentDocs.filter((doc) => {
      if (documentId && doc.id) {
        return doc.id !== documentId;
      }
      return doc.url !== documentUrl;
    });

    // Update order
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: updateError } = await (supabase as any)
      .from('orders')
      .update({ uploaded_documents: updatedDocs })
      .eq('id', orderId);

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({
      success: true,
      remainingDocuments: updatedDocs.length,
    });
  } catch (error) {
    console.error('Error deleting document:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la suppression du document' },
      { status: 500 }
    );
  }
}

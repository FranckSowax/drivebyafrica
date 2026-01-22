import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { jsPDF } from 'jspdf';

const SOURCE_NAMES: Record<string, string> = {
  korea: 'Coree du Sud',
  china: 'Chine',
  dubai: 'Dubai',
};

// Format currency with spaces as thousand separators
function formatCurrency(amount: number): string {
  const formatted = Math.round(amount)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return `${formatted} FCFA`;
}

// Format date in French
function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

// Helper to convert hex to RGB
function hexToRgb(hex: string) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : { r: 0, g: 0, b: 0 };
}

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const quoteId = searchParams.get('id');

    if (!quoteId) {
      return NextResponse.json({ error: 'ID du devis requis' }, { status: 400 });
    }

    // Fetch quote (RLS ensures user can only access their own quotes)
    const { data: quote, error } = await supabase
      .from('quotes')
      .select('*')
      .eq('id', quoteId)
      .single();

    if (error || !quote) {
      return NextResponse.json({ error: 'Devis non trouvé' }, { status: 404 });
    }

    // Generate PDF
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = 210;
    const pageHeight = 297;
    const margin = 15;
    const contentWidth = pageWidth - 2 * margin;
    let y = margin;

    // Theme Colors
    const mandarin = '#F97316';
    const royalBlue = '#2563EB';
    const jewel = '#15803D';
    const darkGray = '#111827';
    const mediumGray = '#4B5563';
    const lightGray = '#9CA3AF';
    const surface = '#F3F4F6';

    // Helper function for drawing boxes
    const drawBox = (x: number, yPos: number, w: number, h: number, fillColor: string, borderColor?: string) => {
      const rgb = hexToRgb(fillColor);
      doc.setFillColor(rgb.r, rgb.g, rgb.b);
      doc.roundedRect(x, yPos, w, h, 3, 3, 'F');
      if (borderColor) {
        const borderRgb = hexToRgb(borderColor);
        doc.setDrawColor(borderRgb.r, borderRgb.g, borderRgb.b);
        doc.setLineWidth(0.3);
        doc.roundedRect(x, yPos, w, h, 3, 3, 'S');
      }
    };

    // ========== TOP ACCENT BAR ==========
    doc.setFillColor(249, 115, 22);
    doc.rect(0, 0, pageWidth, 8, 'F');

    y = 16;

    // Header text (fallback - no image loading on server for simplicity)
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(mandarin);
    doc.text('driveby', margin, y + 10);
    doc.setTextColor(darkGray);
    doc.text('AFRICA', margin + 32, y + 10);

    // Quote info box
    drawBox(pageWidth - margin - 55, y - 2, 55, 22, '#FFF7ED', mandarin);
    doc.setFontSize(8);
    doc.setTextColor(mediumGray);
    doc.setFont('helvetica', 'normal');
    doc.text('DEVIS N°', pageWidth - margin - 50, y + 5);
    doc.setFontSize(10);
    doc.setTextColor(mandarin);
    doc.setFont('helvetica', 'bold');
    doc.text(quote.quote_number, pageWidth - margin - 50, y + 12);
    doc.setFontSize(8);
    doc.setTextColor(lightGray);
    doc.setFont('helvetica', 'normal');
    doc.text(`Date: ${formatDate(quote.created_at)}`, pageWidth - margin - 50, y + 17);

    y += 28;

    // ========== TITLE ==========
    doc.setFontSize(18);
    doc.setTextColor(darkGray);
    doc.setFont('helvetica', 'bold');
    doc.text("DEVIS D'IMPORTATION VEHICULE", margin, y);
    doc.setFontSize(9);
    doc.setTextColor(lightGray);
    doc.setFont('helvetica', 'normal');
    doc.text('Valable 7 jours', margin, y + 6);

    y += 14;

    // ========== TWO COLUMNS: CLIENT & VEHICLE ==========
    const colWidth = (contentWidth - 6) / 2;
    const boxHeight = 38;

    // Client Box
    drawBox(margin, y, colWidth, boxHeight, surface);
    doc.setFontSize(9);
    doc.setTextColor(mandarin);
    doc.setFont('helvetica', 'bold');
    doc.text('CLIENT', margin + 5, y + 7);
    doc.setFontSize(8);
    doc.setTextColor(lightGray);
    doc.setFont('helvetica', 'normal');
    doc.text('Email', margin + 5, y + 14);
    doc.setTextColor(darkGray);
    doc.setFont('helvetica', 'bold');
    doc.text(user.email || '-', margin + 5, y + 20);

    // Vehicle Box
    const vehicleX = margin + colWidth + 6;
    drawBox(vehicleX, y, colWidth, boxHeight, surface);
    doc.setFontSize(9);
    doc.setTextColor(mandarin);
    doc.setFont('helvetica', 'bold');
    doc.text('VEHICULE', vehicleX + 5, y + 7);
    doc.setFontSize(8);
    doc.setTextColor(lightGray);
    doc.setFont('helvetica', 'normal');
    doc.text('Marque / Modele', vehicleX + 5, y + 14);
    doc.setTextColor(darkGray);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(`${quote.vehicle_make} ${quote.vehicle_model}`, vehicleX + 5, y + 21);
    doc.setFontSize(8);
    doc.setTextColor(lightGray);
    doc.setFont('helvetica', 'normal');
    doc.text(`Annee: ${quote.vehicle_year}`, vehicleX + 5, y + 28);
    doc.text(`Origine: ${SOURCE_NAMES[quote.vehicle_source] || quote.vehicle_source}`, vehicleX + 5, y + 33);

    y += boxHeight + 7;

    // ========== SHIPPING INFO ==========
    drawBox(margin, y, contentWidth, 22, '#EFF6FF', royalBlue);
    doc.setFontSize(9);
    doc.setTextColor(royalBlue);
    doc.setFont('helvetica', 'bold');
    doc.text('EXPEDITION', margin + 5, y + 7);
    doc.setFontSize(8);
    doc.setTextColor(darkGray);
    doc.setFont('helvetica', 'normal');
    doc.text(`Destination: ${quote.destination_name}, ${quote.destination_country}`, margin + 5, y + 14);
    const shippingTypeName = quote.shipping_type === 'groupage' ? 'Groupage maritime' : 'Container seul 20HQ';
    doc.text(`Type: ${shippingTypeName}`, margin + contentWidth / 2, y + 14);

    y += 28;

    // ========== COSTS TABLE ==========
    doc.setFontSize(10);
    doc.setTextColor(mandarin);
    doc.setFont('helvetica', 'bold');
    doc.text('DETAIL DES COUTS', margin, y);
    y += 6;

    // Table header
    doc.setFillColor(249, 115, 22);
    doc.rect(margin, y, contentWidth, 9, 'F');
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.text('DESCRIPTION', margin + 5, y + 6);
    doc.text('MONTANT (FCFA)', pageWidth - margin - 5, y + 6, { align: 'right' });
    y += 9;

    // Calculate vehicle price in XAF (total - shipping - insurance - inspection)
    const vehiclePriceXAF = quote.total_cost_xaf - quote.shipping_cost_xaf - quote.insurance_cost_xaf - quote.inspection_fee_xaf;

    // Table rows
    const costs = [
      { label: 'Prix du vehicule (FOB)', value: vehiclePriceXAF },
      { label: `Transport maritime - ${shippingTypeName}`, value: quote.shipping_cost_xaf },
      { label: 'Assurance cargo (2.5%)', value: quote.insurance_cost_xaf },
      { label: 'Inspection & Documents', value: quote.inspection_fee_xaf },
    ];

    costs.forEach((cost, index) => {
      const rowY = y + index * 10;
      doc.setFillColor(index % 2 === 0 ? 252 : 248, index % 2 === 0 ? 252 : 248, index % 2 === 0 ? 252 : 248);
      doc.rect(margin, rowY, contentWidth, 10, 'F');
      doc.setFontSize(9);
      doc.setTextColor(darkGray);
      doc.setFont('helvetica', 'normal');
      doc.text(cost.label, margin + 5, rowY + 7);
      doc.setFont('helvetica', 'bold');
      doc.text(formatCurrency(cost.value), pageWidth - margin - 5, rowY + 7, { align: 'right' });
    });
    y += costs.length * 10;

    // Total row
    doc.setFillColor(255, 247, 237);
    doc.rect(margin, y, contentWidth, 12, 'F');
    doc.setDrawColor(249, 115, 22);
    doc.setLineWidth(0.5);
    doc.rect(margin, y, contentWidth, 12, 'S');
    doc.setFontSize(10);
    doc.setTextColor(darkGray);
    doc.setFont('helvetica', 'bold');
    doc.text('TOTAL ESTIME', margin + 5, y + 8);
    doc.setTextColor(mandarin);
    doc.setFontSize(12);
    doc.text(formatCurrency(quote.total_cost_xaf), pageWidth - margin - 5, y + 8, { align: 'right' });
    y += 18;

    // ========== DEPOSIT BOX ==========
    drawBox(margin, y, contentWidth, 32, '#ECFDF5', jewel);
    doc.setFontSize(10);
    doc.setTextColor(jewel);
    doc.setFont('helvetica', 'bold');
    doc.text('ACOMPTE REQUIS POUR BLOQUER LE VEHICULE', margin + 5, y + 8);
    doc.setFontSize(16);
    doc.setTextColor(darkGray);
    doc.text('1 000 USD', margin + 5, y + 18);
    doc.setFontSize(10);
    doc.setTextColor(mediumGray);
    doc.setFont('helvetica', 'normal');
    doc.text('(600 000 FCFA)', margin + 40, y + 18);
    doc.setFontSize(8);
    doc.setTextColor(jewel);
    doc.text("Cet acompte declenche le rapport d'inspection detaille du vehicule", margin + 5, y + 26);
    y += 38;

    // ========== NEXT STEPS ==========
    doc.setFontSize(10);
    doc.setTextColor(mandarin);
    doc.setFont('helvetica', 'bold');
    doc.text('PROCHAINES ETAPES', margin, y);
    y += 6;

    const steps = [
      { num: '1', text: "Versez l'acompte de 1 000$ pour bloquer le vehicule" },
      { num: '2', text: "Recevez le rapport d'inspection detaille par WhatsApp" },
      { num: '3', text: "Validez et reglez le solde pour lancer l'expedition" },
      { num: '4', text: "Suivez votre vehicule jusqu'a la livraison" },
    ];

    steps.forEach((step, index) => {
      const stepY = y + index * 8;
      doc.setFillColor(249, 115, 22);
      doc.circle(margin + 4, stepY + 3, 3, 'F');
      doc.setFontSize(8);
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.text(step.num, margin + 2.5, stepY + 4.5);
      doc.setTextColor(darkGray);
      doc.setFont('helvetica', 'normal');
      doc.text(step.text, margin + 12, stepY + 4);
    });
    y += 38;

    // ========== NOTE ==========
    doc.setFontSize(7);
    doc.setTextColor(lightGray);
    doc.setFont('helvetica', 'italic');
    const noteText = `* Ce devis est une estimation. Les frais de dedouanement ne sont pas inclus et varient selon la reglementation de ${quote.destination_country}. Devis valable 7 jours.`;
    const noteLines = doc.splitTextToSize(noteText, contentWidth);
    doc.text(noteLines, margin, y);
    y += 12;

    // ========== FOOTER CONTACT ==========
    drawBox(margin, y, contentWidth, 24, surface);
    doc.setFontSize(9);
    doc.setTextColor(mandarin);
    doc.setFont('helvetica', 'bold');
    doc.text('CONTACTEZ-NOUS', margin + 5, y + 7);
    doc.setFontSize(8);
    doc.setTextColor(darkGray);
    doc.setFont('helvetica', 'normal');
    doc.text('Email: contact@driveby-africa.com', margin + 5, y + 14);
    doc.text('Site: www.drivebyafrica.com', margin + 5, y + 20);
    doc.text('WhatsApp: +241 77 00 00 00', margin + contentWidth / 2, y + 14);
    doc.text('Hong Kong', margin + contentWidth / 2, y + 20);

    // ========== BOTTOM ACCENT BAR ==========
    doc.setFillColor(249, 115, 22);
    doc.rect(0, pageHeight - 6, pageWidth, 6, 'F');
    doc.setFontSize(7);
    doc.setTextColor(lightGray);
    doc.text(
      "Driveby Africa - Votre partenaire d'importation automobile en Afrique",
      pageWidth / 2,
      pageHeight - 10,
      { align: 'center' }
    );

    // Output as buffer
    const pdfBuffer = Buffer.from(doc.output('arraybuffer'));

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Devis-${quote.quote_number}.pdf"`,
        'Cache-Control': 'private, max-age=3600', // Cache for 1 hour
      },
    });
  } catch (error) {
    console.error('PDF generation error:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la génération du PDF' },
      { status: 500 }
    );
  }
}

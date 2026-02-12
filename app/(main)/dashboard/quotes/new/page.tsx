'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  FileText,
  Download,
  ChevronLeft,
  Car,
  MapPin,
  User,
  Calendar,
  Loader2,
  CheckCircle,
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useAuthStore } from '@/store/useAuthStore';
import { useToast } from '@/components/ui/Toast';

interface QuoteData {
  vehicleId: string;
  vehicleMake: string;
  vehicleModel: string;
  vehicleYear: number;
  vehiclePriceUSD: number;
  vehicleSource: 'korea' | 'china' | 'dubai';
  destination: {
    id: string;
    name: string;
    country: string;
    flag: string;
    shippingCost: Record<string, number>;
  };
  shippingType?: 'container' | 'groupage';
  shippingTypeName?: string;
  calculations: {
    vehiclePrice: number;
    shippingCost: number;
    insuranceCost: number;
    inspectionFee: number;
    total: number;
    isGroupage?: boolean;
  };
  userId: string;
  userEmail: string;
  requestedAt: string;
}

const SOURCE_FLAGS: Record<string, string> = {
  korea: '🇰🇷',
  china: '🇨🇳',
  dubai: '🇦🇪',
};

const SOURCE_NAMES: Record<string, string> = {
  korea: 'Coree du Sud',
  china: 'Chine',
  dubai: 'Dubai',
};

// Logo base64 will be loaded dynamically
let logoBase64: string | null = null;

export default function NewQuotePage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const toast = useToast();

  const [quoteData, setQuoteData] = useState<QuoteData | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGenerated, setIsGenerated] = useState(false);
  const [quoteNumber, setQuoteNumber] = useState('');

  useEffect(() => {
    // Retrieve quote data from session storage
    const storedQuote = sessionStorage.getItem('pendingQuote');
    if (storedQuote) {
      const data = JSON.parse(storedQuote) as QuoteData;
      setQuoteData(data);
      // Generate a unique quote number
      const timestamp = Date.now().toString(36).toUpperCase();
      const random = Math.random().toString(36).substring(2, 6).toUpperCase();
      setQuoteNumber(`DBA-${timestamp}-${random}`);
      // Preload logo
      loadLogo();
    } else {
      // No quote data, redirect silently back to cars page
      // Don't show toast as this can be triggered by page prefetch
      router.replace('/cars');
    }
  }, [router]);

  const loadLogo = async () => {
    try {
      const response = await fetch('/logo-driveby-africa-dark.png');
      const blob = await response.blob();
      const reader = new FileReader();
      reader.onloadend = () => {
        logoBase64 = reader.result as string;
      };
      reader.readAsDataURL(blob);
    } catch (error) {
      console.error('Error loading logo:', error);
    }
  };

  const formatCurrency = (amount: number) => {
    // Format with regular spaces as thousand separators
    const formatted = Math.round(amount)
      .toString()
      .replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    return `${formatted} FCFA`;
  };

  const formatCurrencyPDF = (amount: number) => {
    // Format with regular spaces as thousand separators
    const formatted = Math.round(amount)
      .toString()
      .replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    return `${formatted} FCFA`;
  };

  const generatePDF = async () => {
    if (!quoteData || !user) return;

    setIsGenerating(true);

    try {
      // Create A4 PDF (210 x 297 mm)
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

      // Helper: Draw rounded rectangle with border
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

      // Helper: hex to RGB
      function hexToRgb(hex: string) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16)
        } : { r: 0, g: 0, b: 0 };
      }

      // ========== HEADER WITH MANDARIN ACCENT BAR ==========
      // Top accent bar
      doc.setFillColor(249, 115, 22); // mandarin
      doc.rect(0, 0, pageWidth, 8, 'F');

      y = 16;

      // Logo or text
      if (logoBase64) {
        doc.addImage(logoBase64, 'PNG', margin, y, 45, 18);
      } else {
        doc.setFontSize(22);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(mandarin);
        doc.text('driveby', margin, y + 10);
        doc.setTextColor(darkGray);
        doc.text('AFRICA', margin + 32, y + 10);
      }

      // Quote info box on right
      drawBox(pageWidth - margin - 55, y - 2, 55, 22, '#FFF7ED', mandarin);
      doc.setFontSize(8);
      doc.setTextColor(mediumGray);
      doc.setFont('helvetica', 'normal');
      doc.text('DEVIS N°', pageWidth - margin - 50, y + 5);
      doc.setFontSize(10);
      doc.setTextColor(mandarin);
      doc.setFont('helvetica', 'bold');
      doc.text(quoteNumber, pageWidth - margin - 50, y + 12);
      doc.setFontSize(8);
      doc.setTextColor(lightGray);
      doc.setFont('helvetica', 'normal');
      const dateStr = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
      doc.text(`Date: ${dateStr}`, pageWidth - margin - 50, y + 17);

      y += 28;

      // ========== TITLE ==========
      doc.setFontSize(18);
      doc.setTextColor(darkGray);
      doc.setFont('helvetica', 'bold');
      doc.text("DEVIS D'IMPORTATION VEHICULE", margin, y);

      // Subtitle with validity
      doc.setFontSize(9);
      doc.setTextColor(lightGray);
      doc.setFont('helvetica', 'normal');
      doc.text('Valable 7 jours', margin, y + 6);

      y += 14;

      // ========== TWO COLUMN LAYOUT: CLIENT & VEHICLE ==========
      const colWidth = (contentWidth - 6) / 2;

      // Client Box
      drawBox(margin, y, colWidth, 38, surface);
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

      doc.setTextColor(lightGray);
      doc.setFont('helvetica', 'normal');
      doc.text('Date de demande', margin + 5, y + 27);
      doc.setTextColor(darkGray);
      doc.setFont('helvetica', 'bold');
      doc.text(new Date(quoteData.requestedAt).toLocaleDateString('fr-FR'), margin + 5, y + 33);

      // Vehicle Box
      const vehicleX = margin + colWidth + 6;
      drawBox(vehicleX, y, colWidth, 38, surface);
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
      doc.text(`${quoteData.vehicleMake} ${quoteData.vehicleModel}`, vehicleX + 5, y + 21);

      doc.setFontSize(8);
      doc.setTextColor(lightGray);
      doc.setFont('helvetica', 'normal');
      doc.text(`Annee: ${quoteData.vehicleYear}`, vehicleX + 5, y + 28);
      doc.text(`Origine: ${SOURCE_NAMES[quoteData.vehicleSource]}`, vehicleX + 5, y + 33);

      y += 45;

      // ========== SHIPPING INFO ==========
      const shippingTypeName = quoteData.shippingTypeName || 'Container seul 20HQ';
      const isGroupage = quoteData.shippingType === 'groupage';

      drawBox(margin, y, contentWidth, 22, '#EFF6FF', royalBlue);
      doc.setFontSize(9);
      doc.setTextColor(royalBlue);
      doc.setFont('helvetica', 'bold');
      doc.text('EXPEDITION', margin + 5, y + 7);

      doc.setFontSize(8);
      doc.setTextColor(darkGray);
      doc.setFont('helvetica', 'normal');
      doc.text(`Destination: ${quoteData.destination.name}, ${quoteData.destination.country}`, margin + 5, y + 14);
      doc.text(`Type: ${shippingTypeName}`, margin + contentWidth / 2, y + 14);

      if (isGroupage) {
        doc.setFontSize(7);
        doc.setTextColor(royalBlue);
        doc.text('* Date de depart soumise au chargement du container', margin + 5, y + 19);
      }

      y += 28;

      // ========== COSTS TABLE ==========
      doc.setFontSize(10);
      doc.setTextColor(mandarin);
      doc.setFont('helvetica', 'bold');
      doc.text('DETAIL DES COUTS', margin, y);

      y += 6;

      // Table header
      doc.setFillColor(249, 115, 22); // mandarin
      doc.rect(margin, y, contentWidth, 9, 'F');
      doc.setFontSize(8);
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.text('DESCRIPTION', margin + 5, y + 6);
      doc.text('MONTANT (FCFA)', pageWidth - margin - 5, y + 6, { align: 'right' });

      y += 9;

      // Table rows
      const costs = [
        { label: 'Prix du vehicule (FOB)', value: quoteData.calculations.vehiclePrice },
        { label: `Transport maritime - ${shippingTypeName}`, value: quoteData.calculations.shippingCost },
        { label: 'Assurance cargo (2.5%)', value: quoteData.calculations.insuranceCost },
        { label: 'Inspection & Documents', value: quoteData.calculations.inspectionFee },
      ];

      costs.forEach((cost, index) => {
        const rowY = y + index * 10;
        // Alternate background
        if (index % 2 === 0) {
          doc.setFillColor(252, 252, 252);
        } else {
          doc.setFillColor(248, 248, 248);
        }
        doc.rect(margin, rowY, contentWidth, 10, 'F');

        doc.setFontSize(9);
        doc.setTextColor(darkGray);
        doc.setFont('helvetica', 'normal');
        doc.text(cost.label, margin + 5, rowY + 7);
        doc.setFont('helvetica', 'bold');
        doc.text(formatCurrencyPDF(cost.value), pageWidth - margin - 5, rowY + 7, { align: 'right' });
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
      doc.text(formatCurrencyPDF(quoteData.calculations.total), pageWidth - margin - 5, y + 8, { align: 'right' });

      y += 18;

      // ========== DEPOSIT / ACOMPTE BOX ==========
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
      doc.text('soit environ 640 000 FCFA', margin + 45, y + 18);

      doc.setFontSize(8);
      doc.setTextColor(jewel);
      doc.setFont('helvetica', 'normal');
      doc.text('Cet acompte declenche le rapport d\'inspection detaille du vehicule', margin + 5, y + 26);

      y += 38;

      // ========== NEXT STEPS ==========
      doc.setFontSize(10);
      doc.setTextColor(mandarin);
      doc.setFont('helvetica', 'bold');
      doc.text('PROCHAINES ETAPES', margin, y);

      y += 6;

      const steps = [
        { num: '1', text: 'Versez l\'acompte de 1 000$ pour bloquer le vehicule' },
        { num: '2', text: 'Recevez le rapport d\'inspection detaille par WhatsApp' },
        { num: '3', text: 'Validez et reglez le solde pour lancer l\'expedition' },
        { num: '4', text: 'Suivez votre vehicule jusqu\'a la livraison' },
      ];

      steps.forEach((step, index) => {
        const stepY = y + index * 8;
        // Circle with number
        doc.setFillColor(249, 115, 22);
        doc.circle(margin + 4, stepY + 3, 3, 'F');
        doc.setFontSize(8);
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.text(step.num, margin + 2.5, stepY + 4.5);

        // Step text
        doc.setTextColor(darkGray);
        doc.setFont('helvetica', 'normal');
        doc.text(step.text, margin + 12, stepY + 4);
      });

      y += 38;

      // ========== NOTE ==========
      doc.setFontSize(7);
      doc.setTextColor(lightGray);
      doc.setFont('helvetica', 'italic');
      const noteText = `* Ce devis est une estimation. Les frais de dedouanement ne sont pas inclus et varient selon la reglementation de ${quoteData.destination.country}. Devis valable 7 jours.`;
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

      // Left column
      doc.text('Email: contact@driveby-africa.com', margin + 5, y + 14);
      doc.text('Site: www.drivebyafrica.com', margin + 5, y + 20);

      // Right column
      doc.text('WhatsApp: +241 77 00 00 00', margin + contentWidth / 2, y + 14);
      doc.text('Hong Kong', margin + contentWidth / 2, y + 20);

      // ========== BOTTOM ACCENT BAR ==========
      doc.setFillColor(249, 115, 22);
      doc.rect(0, pageHeight - 6, pageWidth, 6, 'F');

      // Footer text
      doc.setFontSize(7);
      doc.setTextColor(lightGray);
      doc.text(
        'Driveby Africa - Votre partenaire d\'importation automobile en Afrique',
        pageWidth / 2,
        pageHeight - 10,
        { align: 'center' }
      );

      // Save the PDF
      doc.save(`Devis-${quoteNumber}.pdf`);

      // Save quote to database
      const response = await fetch('/api/quotes', {
        method: 'POST',
        body: JSON.stringify({
          quote_number: quoteNumber,
          user_id: user.id,
          vehicle_id: quoteData.vehicleId,
          vehicle_make: quoteData.vehicleMake,
          vehicle_model: quoteData.vehicleModel,
          vehicle_year: quoteData.vehicleYear,
          vehicle_price_usd: quoteData.vehiclePriceUSD,
          vehicle_source: quoteData.vehicleSource,
          destination_id: quoteData.destination.id,
          destination_name: quoteData.destination.name,
          destination_country: quoteData.destination.country,
          shipping_type: quoteData.shippingType || 'container',
          shipping_cost_xaf: quoteData.calculations.shippingCost,
          insurance_cost_xaf: quoteData.calculations.insuranceCost,
          inspection_fee_xaf: quoteData.calculations.inspectionFee,
          total_cost_xaf: quoteData.calculations.total,
        }),
      });

      if (!response.ok) {
        console.warn('Failed to save quote to database');
      }

      setIsGenerated(true);
      sessionStorage.removeItem('pendingQuote');
      toast.success('Devis genere avec succes!');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Erreur lors de la generation du PDF');
    } finally {
      setIsGenerating(false);
    }
  };

  if (!quoteData) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-mandarin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href={`/cars/${quoteData.vehicleId}`}
          className="p-2 rounded-lg bg-[var(--surface)] hover:bg-[var(--card-border)] transition-colors"
        >
          <ChevronLeft className="w-5 h-5 text-[var(--text-muted)]" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">
            Votre devis
          </h1>
          <p className="text-[var(--text-muted)]">
            Devis N° {quoteNumber}
          </p>
        </div>
      </div>

      {/* Success State */}
      {isGenerated && (
        <Card className="bg-jewel/10 border-jewel/20">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-6 h-6 text-jewel" />
            <div>
              <p className="font-medium text-[var(--text-primary)]">
                Devis genere avec succes!
              </p>
              <p className="text-sm text-[var(--text-muted)]">
                Votre devis a ete sauvegarde dans votre espace client.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Quote Preview */}
      <div id="quote-content">
      <Card>
        {/* Vehicle Info */}
        <div className="flex items-start gap-4 pb-4 border-b border-[var(--card-border)]">
          <div className="p-3 bg-[var(--surface)] rounded-lg">
            <Car className="w-6 h-6 text-mandarin" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-xl">{SOURCE_FLAGS[quoteData.vehicleSource]}</span>
              <h2 className="text-lg font-bold text-[var(--text-primary)]">
                {quoteData.vehicleMake} {quoteData.vehicleModel}
              </h2>
            </div>
            <p className="text-[var(--text-muted)]">
              {quoteData.vehicleYear} • {SOURCE_NAMES[quoteData.vehicleSource]}
            </p>
          </div>
        </div>

        {/* Destination */}
        <div className="flex items-center gap-3 py-4 border-b border-[var(--card-border)]">
          <MapPin className="w-5 h-5 text-royal-blue" />
          <div>
            <p className="text-sm text-[var(--text-muted)]">Destination</p>
            <p className="font-medium text-[var(--text-primary)]">
              {quoteData.destination.flag} {quoteData.destination.name}, {quoteData.destination.country}
            </p>
          </div>
        </div>

        {/* Cost Breakdown */}
        <div className="py-4 space-y-3">
          <div className="flex justify-between">
            <span className="text-[var(--text-muted)]">Prix du vehicule (FOB)</span>
            <span className="text-[var(--text-primary)] font-medium">
              {formatCurrency(quoteData.calculations.vehiclePrice)}
            </span>
          </div>
          <div className="flex justify-between">
            <div>
              <span className="text-[var(--text-muted)]">Transport maritime</span>
              <span className="text-xs text-royal-blue block">
                {quoteData.shippingTypeName || 'Container seul 20HQ'}
              </span>
            </div>
            <span className="text-[var(--text-primary)] font-medium">
              {formatCurrency(quoteData.calculations.shippingCost)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--text-muted)]">Assurance (2.5%)</span>
            <span className="text-[var(--text-primary)] font-medium">
              {formatCurrency(quoteData.calculations.insuranceCost)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--text-muted)]">Inspection & Documents</span>
            <span className="text-[var(--text-primary)] font-medium">
              {formatCurrency(quoteData.calculations.inspectionFee)}
            </span>
          </div>
          <div className="flex justify-between pt-3 mt-3 border-t border-[var(--card-border)]">
            <span className="font-bold text-[var(--text-primary)]">Total estime</span>
            <span className="text-xl font-bold text-mandarin">
              {formatCurrency(quoteData.calculations.total)}
            </span>
          </div>
        </div>

        {/* Disclaimer */}
        <p className="text-xs text-[var(--text-muted)] pt-4 border-t border-[var(--card-border)]">
          * Cette estimation n&apos;inclut pas les frais de dedouanement qui varient selon la reglementation locale.
          Ce devis est valable 7 jours.
        </p>
      </Card>
      </div>

      {/* Client Info */}
      <Card>
        <div className="flex items-center gap-3">
          <User className="w-5 h-5 text-[var(--text-muted)]" />
          <div>
            <p className="text-sm text-[var(--text-muted)]">Client</p>
            <p className="font-medium text-[var(--text-primary)]">{user?.email}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 mt-3">
          <Calendar className="w-5 h-5 text-[var(--text-muted)]" />
          <div>
            <p className="text-sm text-[var(--text-muted)]">Date de demande</p>
            <p className="font-medium text-[var(--text-primary)]">
              {new Date(quoteData.requestedAt).toLocaleDateString('fr-FR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>
          </div>
        </div>
      </Card>

      {/* Actions */}
      <div className="flex gap-3">
        <Button
          variant="primary"
          className="flex-1"
          onClick={generatePDF}
          disabled={isGenerating}
          leftIcon={
            isGenerating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )
          }
        >
          {isGenerating ? 'Generation...' : 'Telecharger le PDF'}
        </Button>
      </div>

      {/* Deposit Info */}
      <Card className="bg-jewel/5 border-jewel/20">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-jewel/10 rounded-xl">
            <CheckCircle className="w-6 h-6 text-jewel" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-[var(--text-primary)]">
              Acompte requis pour bloquer le vehicule
            </h3>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-2xl font-bold text-jewel">1 000 USD</span>
              <span className="text-[var(--text-muted)]">soit environ</span>
              <span className="text-lg font-semibold text-[var(--text-primary)]">640 000 FCFA</span>
            </div>
            <p className="text-sm text-[var(--text-muted)] mt-2">
              Cet acompte declenche le rapport d&apos;inspection detaille du vehicule
              avec photos qui vous sera envoye par WhatsApp.
            </p>
          </div>
        </div>
      </Card>

      {/* Next Steps */}
      <Card>
        <h3 className="font-bold text-[var(--text-primary)] mb-4">
          Prochaines etapes
        </h3>
        <ol className="space-y-3">
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 bg-mandarin text-white rounded-full flex items-center justify-center text-sm font-medium">
              1
            </span>
            <div>
              <p className="font-medium text-[var(--text-primary)]">Telechargez votre devis</p>
              <p className="text-sm text-[var(--text-muted)]">
                Conservez ce document pour vos demarches
              </p>
            </div>
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 bg-jewel text-white rounded-full flex items-center justify-center text-sm font-medium">
              2
            </span>
            <div>
              <p className="font-medium text-[var(--text-primary)]">Versez l&apos;acompte de 1 000$ (640 000 FCFA)</p>
              <p className="text-sm text-[var(--text-muted)]">
                Bloquez le vehicule et declenchez le rapport d&apos;inspection
              </p>
            </div>
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 bg-[var(--surface)] text-[var(--text-muted)] rounded-full flex items-center justify-center text-sm font-medium">
              3
            </span>
            <div>
              <p className="font-medium text-[var(--text-primary)]">Recevez le rapport d&apos;inspection</p>
              <p className="text-sm text-[var(--text-muted)]">
                Un rapport professionnel avec photos vous sera envoye par WhatsApp
              </p>
            </div>
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 bg-[var(--surface)] text-[var(--text-muted)] rounded-full flex items-center justify-center text-sm font-medium">
              4
            </span>
            <div>
              <p className="font-medium text-[var(--text-primary)]">Reglez le solde</p>
              <p className="text-sm text-[var(--text-muted)]">
                Le paiement integral declenche le processus de livraison
              </p>
            </div>
          </li>
        </ol>

        <div className="mt-6 pt-4 border-t border-[var(--card-border)]">
          <Button
            variant="secondary"
            className="w-full"
            leftIcon={<FileText className="w-4 h-4" />}
            onClick={() => window.open('https://wa.me/24177000000?text=Bonjour, je souhaite des informations sur le devis ' + quoteNumber, '_blank')}
          >
            Nous contacter par WhatsApp
          </Button>
        </div>
      </Card>
    </div>
  );
}

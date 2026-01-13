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
  calculations: {
    vehiclePrice: number;
    shippingCost: number;
    insuranceCost: number;
    inspectionFee: number;
    total: number;
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
    return new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount) + ' FCFA';
  };

  const formatCurrencyPDF = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount) + ' FCFA';
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
      const margin = 20;
      const contentWidth = pageWidth - 2 * margin;
      let y = margin;

      // Colors
      const mandarin = '#F97316';
      const darkGray = '#1a1a1a';
      const mediumGray = '#666666';
      const lightGray = '#999999';
      const bgOrange = '#FFF7ED';

      // ========== HEADER ==========
      // Logo
      if (logoBase64) {
        doc.addImage(logoBase64, 'PNG', margin, y, 50, 20);
      } else {
        // Fallback text logo
        doc.setFontSize(24);
        doc.setTextColor(mandarin);
        doc.setFont('helvetica', 'bold');
        doc.text('driveby', margin, y + 12);
        doc.setTextColor(darkGray);
        doc.text('AFRICA', margin + 35, y + 12);
      }

      // Quote info on right
      doc.setFontSize(10);
      doc.setTextColor(mediumGray);
      doc.setFont('helvetica', 'normal');
      doc.text(`Devis N° ${quoteNumber}`, pageWidth - margin, y + 5, { align: 'right' });
      doc.setFontSize(9);
      doc.setTextColor(lightGray);
      const dateStr = new Date().toLocaleDateString('fr-FR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
      doc.text(dateStr, pageWidth - margin, y + 10, { align: 'right' });

      y += 28;

      // Orange line separator
      doc.setDrawColor(mandarin);
      doc.setLineWidth(0.8);
      doc.line(margin, y, pageWidth - margin, y);

      y += 12;

      // ========== TITLE ==========
      doc.setFontSize(20);
      doc.setTextColor(darkGray);
      doc.setFont('helvetica', 'bold');
      doc.text("DEVIS D'IMPORTATION VEHICULE", margin, y);

      y += 15;

      // ========== CLIENT SECTION ==========
      doc.setFontSize(11);
      doc.setTextColor(mandarin);
      doc.setFont('helvetica', 'bold');
      doc.text('INFORMATIONS CLIENT', margin, y);

      y += 8;

      // Client info box
      doc.setFillColor(248, 248, 248);
      doc.roundedRect(margin, y, contentWidth, 20, 2, 2, 'F');

      doc.setFontSize(9);
      doc.setTextColor(mediumGray);
      doc.setFont('helvetica', 'normal');
      doc.text('Email', margin + 5, y + 6);
      doc.setTextColor(darkGray);
      doc.setFont('helvetica', 'bold');
      doc.text(user.email || '', margin + 5, y + 12);

      doc.setTextColor(mediumGray);
      doc.setFont('helvetica', 'normal');
      doc.text('Date de demande', margin + contentWidth / 2, y + 6);
      doc.setTextColor(darkGray);
      doc.setFont('helvetica', 'bold');
      doc.text(new Date(quoteData.requestedAt).toLocaleDateString('fr-FR'), margin + contentWidth / 2, y + 12);

      y += 28;

      // ========== VEHICLE SECTION ==========
      doc.setFontSize(11);
      doc.setTextColor(mandarin);
      doc.setFont('helvetica', 'bold');
      doc.text('VEHICULE', margin, y);

      y += 8;

      // Vehicle info box
      doc.setFillColor(248, 248, 248);
      doc.roundedRect(margin, y, contentWidth, 35, 2, 2, 'F');

      // Row 1
      doc.setFontSize(9);
      doc.setTextColor(mediumGray);
      doc.setFont('helvetica', 'normal');
      doc.text('Marque / Modele', margin + 5, y + 6);
      doc.setTextColor(darkGray);
      doc.setFont('helvetica', 'bold');
      doc.text(`${quoteData.vehicleMake} ${quoteData.vehicleModel}`, margin + 5, y + 12);

      doc.setTextColor(mediumGray);
      doc.setFont('helvetica', 'normal');
      doc.text('Annee', margin + contentWidth / 2, y + 6);
      doc.setTextColor(darkGray);
      doc.setFont('helvetica', 'bold');
      doc.text(quoteData.vehicleYear.toString(), margin + contentWidth / 2, y + 12);

      // Row 2
      doc.setTextColor(mediumGray);
      doc.setFont('helvetica', 'normal');
      doc.text('Origine', margin + 5, y + 21);
      doc.setTextColor(darkGray);
      doc.setFont('helvetica', 'bold');
      doc.text(`${SOURCE_NAMES[quoteData.vehicleSource]}`, margin + 5, y + 27);

      doc.setTextColor(mediumGray);
      doc.setFont('helvetica', 'normal');
      doc.text('Destination', margin + contentWidth / 2, y + 21);
      doc.setTextColor(darkGray);
      doc.setFont('helvetica', 'bold');
      doc.text(`${quoteData.destination.name}, ${quoteData.destination.country}`, margin + contentWidth / 2, y + 27);

      y += 43;

      // ========== COSTS TABLE ==========
      doc.setFontSize(11);
      doc.setTextColor(mandarin);
      doc.setFont('helvetica', 'bold');
      doc.text('DETAIL DES COUTS', margin, y);

      y += 8;

      // Table header
      doc.setFillColor(240, 240, 240);
      doc.rect(margin, y, contentWidth, 10, 'F');

      doc.setFontSize(9);
      doc.setTextColor(mediumGray);
      doc.setFont('helvetica', 'bold');
      doc.text('Description', margin + 5, y + 7);
      doc.text('Montant', pageWidth - margin - 5, y + 7, { align: 'right' });

      y += 10;

      // Table rows
      const costs = [
        { label: 'Prix du vehicule (FOB)', value: quoteData.calculations.vehiclePrice },
        { label: `Transport maritime (${SOURCE_NAMES[quoteData.vehicleSource]} -> ${quoteData.destination.name})`, value: quoteData.calculations.shippingCost },
        { label: 'Assurance cargo (2.5%)', value: quoteData.calculations.insuranceCost },
        { label: 'Inspection & Documents', value: quoteData.calculations.inspectionFee },
      ];

      doc.setFont('helvetica', 'normal');
      costs.forEach((cost, index) => {
        // Alternate row background
        if (index % 2 === 0) {
          doc.setFillColor(252, 252, 252);
          doc.rect(margin, y, contentWidth, 12, 'F');
        }

        doc.setTextColor(darkGray);
        doc.setFontSize(10);
        doc.text(cost.label, margin + 5, y + 8);
        doc.setFont('helvetica', 'bold');
        doc.text(formatCurrencyPDF(cost.value), pageWidth - margin - 5, y + 8, { align: 'right' });
        doc.setFont('helvetica', 'normal');

        // Row border
        doc.setDrawColor(230, 230, 230);
        doc.setLineWidth(0.2);
        doc.line(margin, y + 12, pageWidth - margin, y + 12);

        y += 12;
      });

      // Total row
      doc.setFillColor(255, 247, 237); // Orange tint
      doc.rect(margin, y, contentWidth, 14, 'F');

      doc.setFontSize(11);
      doc.setTextColor(darkGray);
      doc.setFont('helvetica', 'bold');
      doc.text('TOTAL ESTIME', margin + 5, y + 10);
      doc.setTextColor(mandarin);
      doc.setFontSize(12);
      doc.text(formatCurrencyPDF(quoteData.calculations.total), pageWidth - margin - 5, y + 10, { align: 'right' });

      y += 22;

      // ========== NOTES ==========
      doc.setDrawColor(230, 230, 230);
      doc.setLineWidth(0.5);
      doc.line(margin, y, pageWidth - margin, y);

      y += 8;

      doc.setFontSize(9);
      doc.setTextColor(mediumGray);
      doc.setFont('helvetica', 'bold');
      doc.text('Note importante:', margin, y);

      y += 5;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      const noteText = `Ce devis est une estimation et n'inclut pas les frais de dedouanement qui varient selon la reglementation locale de ${quoteData.destination.country}. Ce devis est valable 7 jours a compter de sa date d'emission.`;
      const noteLines = doc.splitTextToSize(noteText, contentWidth);
      doc.text(noteLines, margin, y);

      y += noteLines.length * 4 + 10;

      // ========== FOOTER CONTACT ==========
      doc.setFillColor(248, 248, 248);
      doc.roundedRect(margin, y, contentWidth, 28, 2, 2, 'F');

      doc.setFontSize(10);
      doc.setTextColor(mandarin);
      doc.setFont('helvetica', 'bold');
      doc.text('Contact', margin + 5, y + 7);

      doc.setFontSize(9);
      doc.setTextColor(darkGray);
      doc.setFont('helvetica', 'normal');
      doc.text('Driveby Africa', margin + 5, y + 14);
      doc.text('Email: contact@drivebyafrica.com', margin + 5, y + 20);
      doc.text('WhatsApp: +241 77 00 00 00', margin + contentWidth / 2, y + 14);
      doc.text('Site: www.drivebyafrica.com', margin + contentWidth / 2, y + 20);

      // ========== PAGE FOOTER ==========
      doc.setFontSize(8);
      doc.setTextColor(lightGray);
      doc.text(
        `Driveby Africa - Votre partenaire d'importation automobile en Afrique`,
        pageWidth / 2,
        pageHeight - 10,
        { align: 'center' }
      );

      // Save the PDF
      doc.save(`Devis-${quoteNumber}.pdf`);

      // Save quote to database
      const response = await fetch('/api/quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
            <span className="text-[var(--text-muted)]">Transport maritime</span>
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
            <span className="flex-shrink-0 w-6 h-6 bg-[var(--surface)] text-[var(--text-muted)] rounded-full flex items-center justify-center text-sm font-medium">
              2
            </span>
            <div>
              <p className="font-medium text-[var(--text-primary)]">Contactez-nous</p>
              <p className="text-sm text-[var(--text-muted)]">
                Notre equipe vous accompagnera dans votre achat
              </p>
            </div>
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 bg-[var(--surface)] text-[var(--text-muted)] rounded-full flex items-center justify-center text-sm font-medium">
              3
            </span>
            <div>
              <p className="font-medium text-[var(--text-primary)]">Validez votre commande</p>
              <p className="text-sm text-[var(--text-muted)]">
                Effectuez un acompte pour reserver le vehicule
              </p>
            </div>
          </li>
        </ol>

        <div className="mt-6 pt-4 border-t border-[var(--card-border)]">
          <Button
            variant="secondary"
            className="w-full"
            leftIcon={<FileText className="w-4 h-4" />}
            onClick={() => window.open('https://wa.me/241XXXXXXXX?text=Bonjour, je souhaite des informations sur le devis ' + quoteNumber, '_blank')}
          >
            Nous contacter par WhatsApp
          </Button>
        </div>
      </Card>
    </div>
  );
}

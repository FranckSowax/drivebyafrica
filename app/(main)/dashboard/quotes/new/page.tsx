'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
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
  korea: 'Corée du Sud',
  china: 'Chine',
  dubai: 'Dubaï',
};

export default function NewQuotePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
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
    } else {
      // No quote data, redirect back
      toast.error('Aucune donnée de devis trouvée');
      router.push('/cars');
    }
  }, [router, toast]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount) + ' FCFA';
  };

  const generatePDF = async () => {
    if (!quoteData || !user) return;

    setIsGenerating(true);

    try {
      // Create PDF using browser's print functionality or a PDF library
      const quoteContent = document.getElementById('quote-content');
      if (!quoteContent) throw new Error('Quote content not found');

      // For now, use browser print as PDF
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        throw new Error('Popup blocked');
      }

      const styles = `
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
            padding: 40px;
            color: #1a1a1a;
            line-height: 1.5;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 40px;
            padding-bottom: 20px;
            border-bottom: 2px solid #F97316;
          }
          .logo { font-size: 28px; font-weight: bold; color: #F97316; }
          .logo span { color: #1a1a1a; }
          .quote-info { text-align: right; }
          .quote-number { font-size: 14px; color: #666; }
          .quote-date { font-size: 12px; color: #999; margin-top: 4px; }
          h1 { font-size: 24px; margin-bottom: 30px; color: #1a1a1a; }
          .section { margin-bottom: 30px; }
          .section-title {
            font-size: 14px;
            font-weight: 600;
            color: #F97316;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 15px;
          }
          .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
          }
          .info-item { }
          .info-label { font-size: 12px; color: #666; margin-bottom: 2px; }
          .info-value { font-size: 14px; font-weight: 500; }
          .costs-table { width: 100%; border-collapse: collapse; }
          .costs-table th, .costs-table td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #eee;
          }
          .costs-table th {
            font-size: 12px;
            color: #666;
            font-weight: 500;
          }
          .costs-table td { font-size: 14px; }
          .costs-table td:last-child { text-align: right; font-weight: 500; }
          .total-row {
            background: #FFF7ED;
            font-weight: bold;
          }
          .total-row td {
            color: #F97316;
            font-size: 16px;
          }
          .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #eee;
            font-size: 11px;
            color: #666;
          }
          .footer p { margin-bottom: 8px; }
          .contact { margin-top: 20px; }
          @media print {
            body { padding: 20px; }
            @page { margin: 1cm; }
          }
        </style>
      `;

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Devis ${quoteNumber}</title>
          ${styles}
        </head>
        <body>
          <div class="header">
            <div class="logo">Driveby <span>Africa</span></div>
            <div class="quote-info">
              <div class="quote-number">Devis N° ${quoteNumber}</div>
              <div class="quote-date">${new Date().toLocaleDateString('fr-FR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}</div>
            </div>
          </div>

          <h1>Devis d'importation véhicule</h1>

          <div class="section">
            <div class="section-title">Informations client</div>
            <div class="info-grid">
              <div class="info-item">
                <div class="info-label">Email</div>
                <div class="info-value">${user.email}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Date de demande</div>
                <div class="info-value">${new Date(quoteData.requestedAt).toLocaleDateString('fr-FR')}</div>
              </div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">Véhicule</div>
            <div class="info-grid">
              <div class="info-item">
                <div class="info-label">Marque / Modèle</div>
                <div class="info-value">${quoteData.vehicleMake} ${quoteData.vehicleModel}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Année</div>
                <div class="info-value">${quoteData.vehicleYear}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Origine</div>
                <div class="info-value">${SOURCE_FLAGS[quoteData.vehicleSource]} ${SOURCE_NAMES[quoteData.vehicleSource]}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Destination</div>
                <div class="info-value">${quoteData.destination.flag} ${quoteData.destination.name}, ${quoteData.destination.country}</div>
              </div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">Détail des coûts</div>
            <table class="costs-table">
              <thead>
                <tr>
                  <th>Description</th>
                  <th style="text-align: right;">Montant</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Prix du véhicule (FOB)</td>
                  <td>${formatCurrency(quoteData.calculations.vehiclePrice)}</td>
                </tr>
                <tr>
                  <td>Transport maritime (${SOURCE_NAMES[quoteData.vehicleSource]} → ${quoteData.destination.name})</td>
                  <td>${formatCurrency(quoteData.calculations.shippingCost)}</td>
                </tr>
                <tr>
                  <td>Assurance cargo (2.5%)</td>
                  <td>${formatCurrency(quoteData.calculations.insuranceCost)}</td>
                </tr>
                <tr>
                  <td>Inspection & Documents</td>
                  <td>${formatCurrency(quoteData.calculations.inspectionFee)}</td>
                </tr>
                <tr class="total-row">
                  <td>TOTAL ESTIMÉ</td>
                  <td>${formatCurrency(quoteData.calculations.total)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="footer">
            <p><strong>Note importante:</strong> Ce devis est une estimation et n'inclut pas les frais de dédouanement qui varient selon la réglementation locale de ${quoteData.destination.country}.</p>
            <p>Ce devis est valable 7 jours à compter de sa date d'émission.</p>
            <div class="contact">
              <strong>Contact:</strong><br>
              Driveby Africa<br>
              Email: contact@drivebyafrica.com<br>
              WhatsApp: +241 XX XX XX XX
            </div>
          </div>
        </body>
        </html>
      `;

      printWindow.document.write(htmlContent);
      printWindow.document.close();

      // Wait for content to load then print
      printWindow.onload = () => {
        printWindow.print();
      };

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
      toast.success('Devis généré avec succès!');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Erreur lors de la génération du PDF');
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
                Devis généré avec succès!
              </p>
              <p className="text-sm text-[var(--text-muted)]">
                Votre devis a été sauvegardé dans votre espace client.
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
            <span className="text-[var(--text-muted)]">Prix du véhicule (FOB)</span>
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
            <span className="font-bold text-[var(--text-primary)]">Total estimé</span>
            <span className="text-xl font-bold text-mandarin">
              {formatCurrency(quoteData.calculations.total)}
            </span>
          </div>
        </div>

        {/* Disclaimer */}
        <p className="text-xs text-[var(--text-muted)] pt-4 border-t border-[var(--card-border)]">
          * Cette estimation n'inclut pas les frais de dédouanement qui varient selon la réglementation locale.
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
          {isGenerating ? 'Génération...' : 'Télécharger le PDF'}
        </Button>
      </div>

      {/* Next Steps */}
      <Card>
        <h3 className="font-bold text-[var(--text-primary)] mb-4">
          Prochaines étapes
        </h3>
        <ol className="space-y-3">
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 bg-mandarin text-white rounded-full flex items-center justify-center text-sm font-medium">
              1
            </span>
            <div>
              <p className="font-medium text-[var(--text-primary)]">Téléchargez votre devis</p>
              <p className="text-sm text-[var(--text-muted)]">
                Conservez ce document pour vos démarches
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
                Notre équipe vous accompagnera dans votre achat
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
                Effectuez un acompte pour réserver le véhicule
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

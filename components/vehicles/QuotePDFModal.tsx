'use client';

import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Download,
  Share2,
  Printer,
  Save,
  Loader2,
  CheckCircle,
  Car,
  MapPin,
  Ship,
  Shield,
  FileCheck,
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { cn } from '@/lib/utils';

// Types
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
  };
  shippingType: 'container' | 'groupage';
  shippingTypeName: string;
  calculations: {
    vehiclePrice: number;
    shippingCost: number;
    insuranceCost: number;
    inspectionFee: number;
    total: number;
  };
  userId: string;
  userEmail: string;
}

interface QuotePDFModalProps {
  isOpen: boolean;
  onClose: () => void;
  quoteData: QuoteData | null;
  user: { id: string; email?: string | null } | null;
}

const SOURCE_NAMES: Record<string, string> = {
  korea: 'Coree du Sud',
  china: 'Chine',
  dubai: 'Dubai',
};

const SOURCE_FLAGS: Record<string, string> = {
  korea: '🇰🇷',
  china: '🇨🇳',
  dubai: '🇦🇪',
};

export function QuotePDFModal({ isOpen, onClose, quoteData, user }: QuotePDFModalProps) {
  const toast = useToast();
  const [quoteNumber, setQuoteNumber] = useState('');
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Generate quote number
  useEffect(() => {
    if (isOpen && quoteData) {
      const timestamp = Date.now().toString(36).toUpperCase();
      const random = Math.random().toString(36).substring(2, 6).toUpperCase();
      setQuoteNumber(`DBA-${timestamp}-${random}`);
      setIsSaved(false);
    }
  }, [isOpen, quoteData]);

  // Generate PDF when modal opens
  useEffect(() => {
    if (isOpen && quoteData && quoteNumber && !pdfBlob) {
      generatePDF();
    }
  }, [isOpen, quoteData, quoteNumber]);

  // Cleanup URL on close
  useEffect(() => {
    return () => {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [pdfUrl]);

  const formatCurrency = (amount: number) => {
    const formatted = new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
    return formatted.replace(/[\u202F\u00A0]/g, ' ') + ' FCFA';
  };

  const generatePDF = useCallback(async () => {
    if (!quoteData || !user || !quoteNumber) return;

    setIsGenerating(true);

    try {
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

      // Helper functions
      const hexToRgb = (hex: string) => {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16)
        } : { r: 0, g: 0, b: 0 };
      };

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

      // Logo text
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
      doc.setFontSize(9);
      doc.setTextColor(lightGray);
      doc.setFont('helvetica', 'normal');
      doc.text('Valable 7 jours', margin, y + 6);

      y += 14;

      // ========== TWO COLUMNS: CLIENT & VEHICLE ==========
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
      doc.text(new Date().toLocaleDateString('fr-FR'), margin + 5, y + 33);

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
      doc.text(`Type: ${quoteData.shippingTypeName}`, margin + contentWidth / 2, y + 14);
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
      doc.setFillColor(249, 115, 22);
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
        { label: `Transport maritime - ${quoteData.shippingTypeName}`, value: quoteData.calculations.shippingCost },
        { label: 'Assurance cargo (2.5%)', value: quoteData.calculations.insuranceCost },
        { label: 'Inspection & Documents', value: quoteData.calculations.inspectionFee },
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
      doc.text(formatCurrency(quoteData.calculations.total), pageWidth - margin - 5, y + 8, { align: 'right' });
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
      doc.text('soit environ 640 000 FCFA', margin + 45, y + 18);
      doc.setFontSize(8);
      doc.setTextColor(jewel);
      doc.setFont('helvetica', 'normal');
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
      doc.text('Email: contact@drivebyafrica.com', margin + 5, y + 14);
      doc.text('Site: www.drivebyafrica.com', margin + 5, y + 20);
      doc.text('WhatsApp: +241 77 00 00 00', margin + contentWidth / 2, y + 14);
      doc.text('Gabon - Cameroun - Senegal', margin + contentWidth / 2, y + 20);

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

      // Get blob
      const blob = doc.output('blob');
      setPdfBlob(blob);
      setPdfUrl(URL.createObjectURL(blob));
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Erreur lors de la generation du PDF');
    } finally {
      setIsGenerating(false);
    }
  }, [quoteData, user, quoteNumber, toast]);

  const handleDownload = () => {
    if (pdfBlob) {
      const link = document.createElement('a');
      link.href = URL.createObjectURL(pdfBlob);
      link.download = `Devis-${quoteNumber}.pdf`;
      link.click();
      toast.success('PDF telecharge');
    }
  };

  const handlePrint = () => {
    if (pdfUrl) {
      const printWindow = window.open(pdfUrl, '_blank');
      if (printWindow) {
        printWindow.onload = () => {
          printWindow.print();
        };
      }
    }
  };

  const handleShare = async () => {
    if (pdfBlob) {
      try {
        const file = new File([pdfBlob], `Devis-${quoteNumber}.pdf`, { type: 'application/pdf' });

        if (navigator.share && navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: `Devis ${quoteNumber}`,
            text: `Devis d'importation vehicule - ${quoteData?.vehicleMake} ${quoteData?.vehicleModel}`,
            files: [file],
          });
        } else {
          // Fallback: copy link or download
          handleDownload();
          toast.info('Telechargez le PDF pour le partager');
        }
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          toast.error('Erreur lors du partage');
        }
      }
    }
  };

  const handleSave = async () => {
    if (!quoteData || !user || isSaved) return;

    setIsSaving(true);
    try {
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
          shipping_type: quoteData.shippingType,
          shipping_cost_xaf: quoteData.calculations.shippingCost,
          insurance_cost_xaf: quoteData.calculations.insuranceCost,
          inspection_fee_xaf: quoteData.calculations.inspectionFee,
          total_cost_xaf: quoteData.calculations.total,
        }),
      });

      if (response.ok) {
        setIsSaved(true);
        toast.success('Devis enregistre dans votre profil');
      } else {
        throw new Error('Failed to save');
      }
    } catch (error) {
      toast.error('Erreur lors de l\'enregistrement');
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    setPdfBlob(null);
    if (pdfUrl) {
      URL.revokeObjectURL(pdfUrl);
      setPdfUrl(null);
    }
    onClose();
  };

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          onClick={handleClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ type: 'spring', duration: 0.3 }}
            className="relative w-full max-w-4xl max-h-[95vh] bg-[var(--card-bg)] rounded-2xl shadow-2xl overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--card-border)] bg-[var(--surface)]">
              <div>
                <h2 className="text-lg font-bold text-[var(--text-primary)]">
                  Votre devis
                </h2>
                <p className="text-sm text-[var(--text-muted)]">
                  N° {quoteNumber}
                </p>
              </div>
              <button
                onClick={handleClose}
                className="p-2 rounded-lg hover:bg-[var(--card-border)] transition-colors"
              >
                <X className="w-5 h-5 text-[var(--text-muted)]" />
              </button>
            </div>

            {/* PDF Preview */}
            <div className="flex-1 overflow-auto bg-gray-100 dark:bg-gray-900">
              {isGenerating ? (
                <div className="flex flex-col items-center justify-center h-full min-h-[500px]">
                  <Loader2 className="w-10 h-10 animate-spin text-mandarin mb-4" />
                  <p className="text-[var(--text-muted)]">Generation du devis...</p>
                </div>
              ) : pdfUrl ? (
                <iframe
                  src={pdfUrl}
                  className="w-full h-full min-h-[600px]"
                  title="Apercu du devis"
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-full min-h-[500px]">
                  <p className="text-[var(--text-muted)]">Erreur de chargement</p>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="px-6 py-4 border-t border-[var(--card-border)] bg-[var(--surface)]">
              {/* Deposit reminder */}
              <div className="mb-4 p-3 bg-jewel/10 border border-jewel/30 rounded-lg">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-jewel flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-[var(--text-primary)]">
                      Acompte: <span className="text-jewel">1 000 USD</span> (640 000 FCFA)
                    </p>
                    <p className="text-xs text-[var(--text-muted)]">
                      Pour bloquer le vehicule et recevoir le rapport d'inspection
                    </p>
                  </div>
                </div>
              </div>

              {/* Buttons */}
              <div className="flex flex-wrap gap-3">
                <Button
                  variant="primary"
                  onClick={handleSave}
                  disabled={isSaving || isSaved || isGenerating}
                  leftIcon={
                    isSaving ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : isSaved ? (
                      <CheckCircle className="w-4 h-4" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )
                  }
                  className="flex-1 min-w-[140px]"
                >
                  {isSaved ? 'Enregistre' : 'Enregistrer'}
                </Button>

                <Button
                  variant="secondary"
                  onClick={handleDownload}
                  disabled={isGenerating || !pdfBlob}
                  leftIcon={<Download className="w-4 h-4" />}
                  className="flex-1 min-w-[140px]"
                >
                  Telecharger
                </Button>

                <Button
                  variant="secondary"
                  onClick={handlePrint}
                  disabled={isGenerating || !pdfUrl}
                  leftIcon={<Printer className="w-4 h-4" />}
                  className="flex-1 min-w-[120px]"
                >
                  Imprimer
                </Button>

                <Button
                  variant="secondary"
                  onClick={handleShare}
                  disabled={isGenerating || !pdfBlob}
                  leftIcon={<Share2 className="w-4 h-4" />}
                  className="flex-1 min-w-[120px]"
                >
                  Partager
                </Button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}

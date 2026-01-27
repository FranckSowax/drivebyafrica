'use client';

import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import {
  X,
  Share2,
  Loader2,
  Ship,
  Calendar,
  Clock,
  Save,
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { cn } from '@/lib/utils';
import { authFetch } from '@/lib/supabase/auth-helpers';

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
    // USD values for database storage
    vehiclePriceUSD?: number;
    shippingCostUSD?: number;
    insuranceCostUSD?: number;
    inspectionFeeUSD?: number;
    totalUSD?: number;
    hasExportTax?: boolean;
    quoteCurrencyCode?: string;
  };
  userId: string;
  userEmail: string;
  validUntil?: string;
}

interface QuotePDFModalProps {
  isOpen: boolean;
  onClose: () => void;
  quoteData: QuoteData | null;
  user: { id: string; email?: string | null; user_metadata?: { full_name?: string; country?: string } } | null;
  profile?: { full_name?: string | null; country?: string | null } | null;
  defaultQuoteNumber?: string;
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

export function QuotePDFModal({ isOpen, onClose, quoteData, user, profile, defaultQuoteNumber }: QuotePDFModalProps) {
  // Derive client name and country from profile (preferred) or user_metadata (fallback)
  const clientName = profile?.full_name || user?.user_metadata?.full_name || null;
  const clientCountry = profile?.country || user?.user_metadata?.country || null;
  const router = useRouter();
  const toast = useToast();
  const [quoteNumber, setQuoteNumber] = useState('');
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [quoteSaved, setQuoteSaved] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // 1. Lifecycle: Mounted check for SSR and Mobile detection
  useEffect(() => {
    setMounted(true);
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent));
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => {
      setMounted(false);
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  // 2. Lifecycle: Generate quote number when modal opens
  useEffect(() => {
    if (isOpen && quoteData) {
      if (defaultQuoteNumber) {
        setQuoteNumber(defaultQuoteNumber);
        setQuoteSaved(true); // Prevent re-saving existing quotes
      } else {
        const timestamp = Date.now().toString(36).toUpperCase();
        const random = Math.random().toString(36).substring(2, 6).toUpperCase();
        setQuoteNumber(`DBA-${timestamp}-${random}`);
        setQuoteSaved(false);
      }
      // Reset PDF state when opening for a new quote
      setPdfBlob(null);
      setPdfUrl(null);
    }
  }, [isOpen, quoteData, defaultQuoteNumber]);

  // 3. Lifecycle: Cleanup blob URL
  useEffect(() => {
    return () => {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [pdfUrl]);

  // 4. Helper: Format currency based on quote currency code
  const formatCurrency = useCallback((amount: number) => {
    // Format with regular spaces as thousand separators
    const formatted = Math.round(amount)
      .toString()
      .replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

    const currencyCode = quoteData?.calculations?.quoteCurrencyCode || 'XAF';

    if (currencyCode === 'XAF') {
      return `${formatted} FCFA`;
    } else if (currencyCode === 'EUR') {
      return `${formatted} €`;
    } else {
      return `$${formatted}`;
    }
  }, [quoteData?.calculations?.quoteCurrencyCode]);

  // 5. Action: Save to DB (always save in USD for consistency)
  const saveQuoteToDatabase = useCallback(async (qNumber: string) => {
    if (!quoteData || !user || quoteSaved) return;

    // Use USD values if available, otherwise use the converted values
    const calc = quoteData.calculations;

    try {
      // Use authFetch to include Authorization header for localStorage-based auth
      const response = await authFetch('/api/quotes', {
        method: 'POST',
        body: JSON.stringify({
          quote_number: qNumber,
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
          // Save USD values for database consistency
          shipping_cost_usd: calc.shippingCostUSD || calc.shippingCost,
          insurance_cost_usd: calc.insuranceCostUSD || calc.insuranceCost,
          inspection_fee_usd: calc.inspectionFeeUSD || calc.inspectionFee,
          total_cost_usd: calc.totalUSD || calc.total,
          // Also save the display currency for reference
          quote_currency: calc.quoteCurrencyCode || 'USD',
        }),
      });

      if (response.ok) {
        setQuoteSaved(true);
      }
    } catch (error) {
      console.error('Error saving quote:', error);
    }
  }, [quoteData, user, quoteSaved]);

  const isExpired = useCallback(() => {
    if (!quoteData) return false;
    const validUntil = quoteData.validUntil || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    return new Date(validUntil) < new Date();
  }, [quoteData]);

  // 6. Action: Generate PDF logic (for download only)
  const generatePDF = useCallback(async () => {
    if (!quoteData || !user || !quoteNumber || isGenerating) return;

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

      // Load and add logo image
      try {
        const logoImg = new Image();
        logoImg.crossOrigin = 'anonymous';
        await new Promise<void>((resolve, reject) => {
          logoImg.onload = () => resolve();
          logoImg.onerror = () => reject(new Error('Failed to load logo'));
          logoImg.src = '/logo-driveby-africa-dark.png';
        });

        // Calculate logo dimensions (height 12mm, maintain aspect ratio)
        const logoHeight = 12;
        const logoWidth = (logoImg.width / logoImg.height) * logoHeight;
        doc.addImage(logoImg, 'PNG', margin, y, logoWidth, logoHeight);
      } catch {
        // Fallback to text if logo fails to load
        doc.setFontSize(22);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(mandarin);
        doc.text('driveby', margin, y + 10);
        doc.setTextColor(darkGray);
        doc.text('AFRICA', margin + 32, y + 10);
      }

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

      // Client Box - dynamic height based on content
      const clientBoxHeight = clientName ? 48 : 38;
      drawBox(margin, y, colWidth, clientBoxHeight, surface);
      doc.setFontSize(9);
      doc.setTextColor(mandarin);
      doc.setFont('helvetica', 'bold');
      doc.text('CLIENT', margin + 5, y + 7);
      doc.setFontSize(8);

      let clientY = y + 14;

      // Name (if available)
      if (clientName) {
        doc.setTextColor(lightGray);
        doc.setFont('helvetica', 'normal');
        doc.text('Nom', margin + 5, clientY);
        doc.setTextColor(darkGray);
        doc.setFont('helvetica', 'bold');
        doc.text(clientName, margin + 5, clientY + 6);
        clientY += 13;
      }

      // Email
      doc.setTextColor(lightGray);
      doc.setFont('helvetica', 'normal');
      doc.text('Email', margin + 5, clientY);
      doc.setTextColor(darkGray);
      doc.setFont('helvetica', 'bold');
      doc.text(user.email || '-', margin + 5, clientY + 6);
      clientY += 13;

      // Country (if available) - displayed on right side
      if (clientCountry) {
        doc.setTextColor(lightGray);
        doc.setFont('helvetica', 'normal');
        doc.text('Pays', margin + colWidth / 2 + 5, y + 14);
        doc.setTextColor(darkGray);
        doc.setFont('helvetica', 'bold');
        doc.text(clientCountry, margin + colWidth / 2 + 5, y + 20);
      }

      // Vehicle Box - match client box height
      const vehicleX = margin + colWidth + 6;
      drawBox(vehicleX, y, colWidth, clientBoxHeight, surface);
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

      y += clientBoxHeight + 7;

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

      // Table header - use quote currency
      const quoteCurrencyLabel = quoteData.calculations.quoteCurrencyCode === 'EUR' ? 'EUR'
        : quoteData.calculations.quoteCurrencyCode === 'USD' ? 'USD'
        : 'FCFA';
      doc.setFillColor(249, 115, 22);
      doc.rect(margin, y, contentWidth, 9, 'F');
      doc.setFontSize(8);
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.text('DESCRIPTION', margin + 5, y + 6);
      doc.text(`MONTANT (${quoteCurrencyLabel})`, pageWidth - margin - 5, y + 6, { align: 'right' });
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

      // Get blob
      const blob = doc.output('blob');
      console.log('QuotePDFModal: PDF generated successfully, blob size:', blob.size);
      setPdfBlob(blob);
      const url = URL.createObjectURL(blob);
      setPdfUrl(url);
      console.log('QuotePDFModal: PDF URL created');

      // Auto-save quote to database
      // if (!quoteSaved) {
      //   saveQuoteToDatabase(quoteNumber);
      // }
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Erreur lors de la generation du PDF');
    } finally {
      setIsGenerating(false);
    }
  }, [quoteData, user, quoteNumber, isGenerating, saveQuoteToDatabase, toast]);

  // 7. Lifecycle: Trigger PDF generation when data is ready
  useEffect(() => {
    if (isOpen && quoteData && quoteNumber && !pdfBlob && !isGenerating) {
      generatePDF();
    }
  }, [isOpen, quoteData, quoteNumber, pdfBlob, isGenerating, generatePDF]);

  const handleSaveAndRedirect = async () => {
    if (quoteSaved) {
      router.push('/dashboard/quotes');
      return;
    }
    
    setIsGenerating(true); // Show loading state
    await saveQuoteToDatabase(quoteNumber);
    setIsGenerating(false);
    
    toast.success('Devis enregistré avec succès');
    router.push('/dashboard/quotes');
  };

  const handleShare = async () => {
    console.log('QuotePDFModal: handleShare called, blob exists:', !!pdfBlob);
    if (pdfBlob) {
      try {
        const fileName = `Devis-${quoteNumber}.pdf`;
        const file = new File([pdfBlob], fileName, { type: 'application/pdf' });

        if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
          console.log('QuotePDFModal: Using native share');
          await navigator.share({
            title: `Devis Driveby Africa ${quoteNumber}`,
            text: `Voici votre devis d'importation pour ${quoteData?.vehicleMake} ${quoteData?.vehicleModel}`,
            files: [file],
          });
        } else {
          console.log('QuotePDFModal: Share not supported, falling back to download');
          const link = document.createElement('a');
          link.href = pdfUrl || URL.createObjectURL(pdfBlob);
          link.download = fileName;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
      }
    } catch (error) {
      console.error('QuotePDFModal: Share error:', error);
      if ((error as Error).name !== 'AbortError') {
        toast.error('Erreur lors du partage. Tentative de téléchargement...');
        // Second fallback to download
        const link = document.createElement('a');
        link.href = pdfUrl || '';
        link.download = `Devis-${quoteNumber}.pdf`;
        link.click();
      }
    }
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
          className="relative w-full max-w-4xl max-h-[90vh] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50">
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                Votre devis
              </h2>
              <p className="text-sm text-gray-500">
                N° {quoteNumber}
              </p>
            </div>
            <button
              onClick={handleClose}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Modal Content - scrollable container that includes both quote and actions */}
          <div className="flex-1 overflow-auto bg-gray-100">
            <div className="p-4 md:p-8 flex justify-center">
            {isGenerating ? (
              <div className="flex flex-col items-center justify-center min-h-[400px]">
                <Loader2 className="w-10 h-10 animate-spin text-mandarin mb-4" />
                <p className="text-gray-500 font-medium">Préparation de votre devis...</p>
              </div>
            ) : quoteData ? (
              <div className="w-full max-w-[210mm] bg-white shadow-xl rounded-sm overflow-hidden flex flex-col text-gray-900 relative">
                {/* Watermark for expired quotes */}
                {isExpired() && (
                  <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none overflow-hidden">
                    <div className="rotate-[-45deg] text-red-500/10 text-9xl font-black uppercase tracking-widest border-8 border-red-500/10 p-8">
                      Expiré
                    </div>
                  </div>
                )}

                {/* Top Accent */}
                <div className="h-2 bg-mandarin w-full" />

                {/* Header */}
                <div className="p-8 md:p-12 space-y-8">
                  <div className="flex flex-col md:flex-row justify-between items-start gap-6">
                    <div>
                      <img
                        src="/logo-driveby-africa-dark.png"
                        alt="Driveby Africa"
                        className="h-12 md:h-14 w-auto mb-2"
                      />
                      <p className="text-sm text-gray-500">Votre partenaire d'importation automobile</p>
                    </div>
                    <div className="bg-orange-50 border border-orange-100 p-4 rounded-lg min-w-[200px]">
                      <p className="text-[10px] uppercase tracking-wider text-orange-600 font-bold mb-1">Devis Professionnel</p>
                      <p className="text-lg font-mono font-bold text-gray-900">{quoteNumber}</p>
                      <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                        <Calendar className="w-3 h-3" />
                        <span>Émis le: {new Date().toLocaleDateString('fr-FR')}</span>
                      </div>
                      <div className={cn("flex items-center gap-2 mt-1 text-xs font-medium", isExpired() ? "text-red-500" : "text-gray-500")}>
                        <Clock className="w-3 h-3" />
                        <span>Valable jusqu'au: {new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString('fr-FR')}</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-8 border-t border-gray-100">
                    <div className="space-y-4">
                      <h4 className="text-xs uppercase tracking-widest text-gray-400 font-bold">Informations Client</h4>
                      {clientName && (
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-gray-500">Nom</p>
                          <p className="text-base font-bold text-gray-900">{clientName}</p>
                        </div>
                      )}
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-gray-500">Email</p>
                        <p className="text-base font-bold text-gray-900">{user?.email || '-'}</p>
                      </div>
                      {clientCountry && (
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-gray-500">Pays</p>
                          <p className="text-base font-bold text-gray-900">{clientCountry}</p>
                        </div>
                      )}
                    </div>
                    <div className="space-y-4">
                      <h4 className="text-xs uppercase tracking-widest text-gray-400 font-bold">Détails Véhicule</h4>
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-gray-500">Marque & Modèle</p>
                        <p className="text-base font-bold text-gray-900">{quoteData.vehicleMake} {quoteData.vehicleModel} ({quoteData.vehicleYear})</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-sm px-2 py-0.5 bg-gray-100 rounded text-gray-600">
                            Origine: {SOURCE_NAMES[quoteData.vehicleSource]} {SOURCE_FLAGS[quoteData.vehicleSource]}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-blue-50 border border-blue-100 p-6 rounded-xl flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                        <Ship className="w-6 h-6 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-blue-900">Expédition Internationale</p>
                        <p className="text-xs text-blue-700">Destination: {quoteData.destination.name}, {quoteData.destination.country}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="px-3 py-1 bg-blue-600 text-white text-[10px] font-black uppercase tracking-tighter rounded-full">
                        {quoteData.shippingTypeName}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs uppercase tracking-widest text-gray-400 font-bold">Détail des Coûts</h4>
                      <span className="text-[10px] text-gray-400 uppercase">
                        Devis estimatif ({quoteData.calculations.quoteCurrencyCode === 'EUR' ? 'EUR' : quoteData.calculations.quoteCurrencyCode === 'USD' ? 'USD' : 'FCFA'})
                      </span>
                    </div>
                    <div className="border border-gray-100 rounded-xl overflow-hidden">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-gray-50 text-gray-500">
                            <th className="px-6 py-3 text-left font-bold">Description</th>
                            <th className="px-6 py-3 text-right font-bold">Montant</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 text-gray-700">
                          <tr>
                            <td className="px-6 py-4">
                              Prix du véhicule (FOB)
                              {quoteData.calculations.hasExportTax && (
                                <span className="ml-2 text-xs text-gray-400">(inclut taxe export)</span>
                              )}
                            </td>
                            <td className="px-6 py-4 text-right font-mono font-medium">{formatCurrency(quoteData.calculations.vehiclePrice)}</td>
                          </tr>
                          <tr>
                            <td className="px-6 py-4 flex items-center gap-2">
                              Transport maritime
                              <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 rounded text-gray-500">{quoteData.shippingTypeName}</span>
                            </td>
                            <td className="px-6 py-4 text-right font-mono font-medium">{formatCurrency(quoteData.calculations.shippingCost)}</td>
                          </tr>
                          <tr>
                            <td className="px-6 py-4">Assurance cargo (2.5%)</td>
                            <td className="px-6 py-4 text-right font-mono font-medium">{formatCurrency(quoteData.calculations.insuranceCost)}</td>
                          </tr>
                          <tr>
                            <td className="px-6 py-4">Inspection & Documents</td>
                            <td className="px-6 py-4 text-right font-mono font-medium">{formatCurrency(quoteData.calculations.inspectionFee)}</td>
                          </tr>
                          <tr className="bg-orange-50/50">
                            <td className="px-6 py-5">
                              <span className="font-black text-gray-900 uppercase tracking-tighter block">Total estimé</span>
                              {quoteData.calculations.hasExportTax && (
                                <span className="text-xs text-gray-500 font-normal">Inclut taxe et douane export</span>
                              )}
                            </td>
                            <td className="px-6 py-5 text-right">
                              <span className="text-xl font-black text-mandarin font-mono">{formatCurrency(quoteData.calculations.total)}</span>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                    <div className="bg-green-50 border border-green-100 p-5 rounded-xl">
                      <h5 className="text-[10px] font-black text-green-700 uppercase mb-2">Acompte Requis</h5>
                      <p className="text-2xl font-black text-gray-900 mb-1">1 000 USD</p>
                      <p className="text-sm font-medium text-gray-600 mb-2">≈ 600 000 FCFA</p>
                      <p className="text-[10px] text-green-600 leading-relaxed">
                        Le versement de cet acompte déclenche l'inspection physique détaillée du véhicule.
                      </p>
                    </div>
                    <div className="space-y-3">
                      <h5 className="text-[10px] font-black text-gray-400 uppercase">Prochaines Étapes</h5>
                      <div className="space-y-2">
                        {[
                          "Paiement de l'acompte de 1 000$",
                          "Rapport d'inspection complet",
                          "Règlement du solde et expédition",
                          "Suivi et livraison à destination"
                        ].map((step, i) => (
                          <div key={i} className="flex items-center gap-2 text-[10px]">
                            <div className="w-4 h-4 bg-mandarin rounded-full flex items-center justify-center text-[8px] font-bold text-white shrink-0">{i+1}</div>
                            <span className="text-gray-600 font-medium">{step}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="pt-8 border-t border-gray-100">
                    <p className="text-[9px] text-gray-400 italic leading-relaxed text-center">
                      * Ce devis est une estimation basée sur les tarifs actuels. Les frais de dédouanement ne sont pas inclus et varient selon la réglementation de {quoteData.destination.country}. Devis valable 7 jours à compter de la date d'émission.
                    </p>
                  </div>
                </div>

                {/* Footer */}
                <div className="mt-auto bg-gray-50 p-8 grid grid-cols-2 md:grid-cols-4 gap-4 text-center border-t border-gray-100">
                  <div className="space-y-1">
                    <p className="text-[8px] font-bold text-gray-400 uppercase">Email</p>
                    <p className="text-[10px] font-medium text-gray-900">contact@driveby-africa.com</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[8px] font-bold text-gray-400 uppercase">WhatsApp</p>
                    <p className="text-[10px] font-medium text-gray-900">+241 77 00 00 00</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[8px] font-bold text-gray-400 uppercase">Site Web</p>
                    <p className="text-[10px] font-medium text-gray-900">www.drivebyafrica.com</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[8px] font-bold text-gray-400 uppercase">Bureaux</p>
                    <p className="text-[10px] font-medium text-gray-900">Hong Kong</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center min-h-[400px]">
                <p className="text-gray-500">Erreur de chargement ou données manquantes</p>
              </div>
            )}
            </div>

            {/* Actions - inside scrollable area */}
            <div className="px-4 md:px-8 pb-6">
            {/* Action buttons */}
            <div className="flex flex-wrap gap-3">
              {!defaultQuoteNumber && (
                <Button
                  variant="outline"
                  onClick={handleSaveAndRedirect}
                  disabled={isGenerating}
                  leftIcon={<Save className="w-4 h-4" />}
                  className="flex-1 sm:flex-none"
                >
                  {quoteSaved ? 'Voir mes devis' : 'Enregistrer'}
                </Button>
              )}

              <Button
                variant="outline"
                onClick={handleShare}
                disabled={isGenerating || !pdfBlob}
                leftIcon={<Share2 className="w-4 h-4" />}
                className="flex-1 sm:flex-none"
              >
                Partager le PDF
              </Button>
            </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>,
    document.body
  );
}

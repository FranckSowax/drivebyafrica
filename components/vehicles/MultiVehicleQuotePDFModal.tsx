'use client';

import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Share2,
  Loader2,
  Ship,
  Save,
  CreditCard,
  Calendar,
  Clock,
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { PaymentModal } from '@/components/payment/PaymentModal';
import type { CartItem } from '@/store/useCartStore';
import type { ShippingDestination } from '@/lib/hooks/useShippingDestinations';
import type { VehicleSource } from '@/types/vehicle';
import {
  DEPOSIT_PER_VEHICLE_USD,
  INSPECTION_FEE_USD,
  INSURANCE_RATE,
} from '@/lib/utils/pricing';

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

interface MultiVehicleQuotePDFModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  destination: ShippingDestination;
  vehicleSource: VehicleSource;
  costs: {
    vehicleCount: number;
    vehiclesTotalUSD: number;
    vehiclesTotalXAF: number;
    shippingCost40ftUSD: number;
    shippingCost40ftXAF: number;
    insuranceCostXAF: number;
    inspectionFeeTotalXAF: number;
    depositTotalUSD: number;
    depositTotalXAF: number;
    totalXAF: number;
    perVehicle: Array<{
      vehiclePriceUSD: number;
      vehiclePriceXAF: number;
      inspectionFeeXAF: number;
    }>;
  };
  shippingCost40ftUSD: number;
  user: { id: string; email?: string | null; user_metadata?: { full_name?: string; country?: string } } | null;
  profile?: { full_name?: string | null; country?: string | null } | null;
  currencyCode: string;
  xafRate: number;
  onOrderSuccess: () => void;
}

export function MultiVehicleQuotePDFModal({
  isOpen,
  onClose,
  items,
  destination,
  vehicleSource,
  costs,
  shippingCost40ftUSD,
  user,
  profile,
  currencyCode,
  xafRate,
  onOrderSuccess,
}: MultiVehicleQuotePDFModalProps) {
  const toast = useToast();
  const [quoteNumber, setQuoteNumber] = useState('');
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [quoteSaved, setQuoteSaved] = useState(false);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);
  const [savedGroupId, setSavedGroupId] = useState<string | null>(null);
  const [savedQuoteIds, setSavedQuoteIds] = useState<string[]>([]);

  const clientName = profile?.full_name || user?.user_metadata?.full_name || null;
  const clientCountry = profile?.country || user?.user_metadata?.country || null;
  const isXAF = currencyCode === 'XAF';
  const quoteCurrencyLabel = currencyCode === 'EUR' ? 'EUR' : currencyCode === 'USD' ? 'USD' : 'FCFA';

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    if (isOpen) {
      const timestamp = Date.now().toString(36).toUpperCase();
      const random = Math.random().toString(36).substring(2, 6).toUpperCase();
      setQuoteNumber(`DBA-${timestamp}-${random}`);
      setQuoteSaved(false);
      setPdfBlob(null);
      setPdfUrl(null);
      setSavedGroupId(null);
      setSavedQuoteIds([]);
    }
  }, [isOpen]);

  useEffect(() => {
    return () => {
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    };
  }, [pdfUrl]);

  const formatCurrency = useCallback(
    (amount: number) => {
      const formatted = Math.round(amount)
        .toString()
        .replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
      if (isXAF) return `${formatted} FCFA`;
      if (currencyCode === 'EUR') return `${formatted} €`;
      return `$${formatted}`;
    },
    [isXAF, currencyCode]
  );

  // Save quotes to database
  const saveQuotesToDatabase = useCallback(async (): Promise<boolean> => {
    if (!user || quoteSaved) return quoteSaved;

    try {
      const vehiclePayloads = items.map((item) => {
        const shippingPerVehicleUSD = shippingCost40ftUSD / costs.vehicleCount;
        const insurancePerVehicleUSD = (item.vehiclePriceUSD + shippingPerVehicleUSD) * INSURANCE_RATE;
        const totalPerVehicleUSD = item.vehiclePriceUSD + shippingPerVehicleUSD + insurancePerVehicleUSD + INSPECTION_FEE_USD;

        return {
          vehicle_id: item.vehicleId,
          vehicle_make: item.vehicleMake,
          vehicle_model: item.vehicleModel,
          vehicle_year: item.vehicleYear,
          vehicle_price_usd: item.vehiclePriceUSD,
          vehicle_source: item.vehicleSource,
          insurance_cost_usd: insurancePerVehicleUSD,
          inspection_fee_usd: INSPECTION_FEE_USD,
          total_cost_usd: totalPerVehicleUSD,
        };
      });

      const response = await fetch('/api/quotes/multi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vehicles: vehiclePayloads,
          destination: { id: destination.id, name: destination.name, country: destination.country },
          shipping_cost_40ft_usd: shippingCost40ftUSD,
          quote_number_base: quoteNumber,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        setQuoteSaved(true);
        setSavedGroupId(result.group_id);
        setSavedQuoteIds(result.quotes?.map((q: { id: string }) => q.id) || []);
        return true;
      } else {
        const errorData = await response.json().catch(() => ({}));
        if (response.status === 401) {
          toast.error('Session expirée', 'Veuillez vous reconnecter');
        } else {
          toast.error('Erreur', errorData.error || 'Impossible d\'enregistrer les devis');
        }
        return false;
      }
    } catch {
      toast.error('Erreur réseau', 'Vérifiez votre connexion internet');
      return false;
    }
  }, [user, quoteSaved, items, costs, shippingCost40ftUSD, destination, quoteNumber, toast]);

  // Generate PDF - same style as QuotePDFModal
  const generatePDF = useCallback(async () => {
    if (!user || isGenerating) return;
    setIsGenerating(true);

    try {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageWidth = 210;
      const pageHeight = 297;
      const margin = 15;
      const contentWidth = pageWidth - 2 * margin;
      let y = margin;

      const mandarin = '#F97316';
      const royalBlue = '#2563EB';
      const jewel = '#15803D';
      const darkGray = '#111827';
      const mediumGray = '#4B5563';
      const lightGray = '#9CA3AF';
      const surface = '#F3F4F6';

      const hexToRgb = (hex: string) => {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) } : { r: 0, g: 0, b: 0 };
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

      // Logo
      try {
        const logoImg = new Image();
        logoImg.crossOrigin = 'anonymous';
        await new Promise<void>((resolve, reject) => {
          logoImg.onload = () => resolve();
          logoImg.onerror = () => reject(new Error('Logo failed'));
          logoImg.src = '/logo-driveby-africa-dark.png';
        });
        const logoHeight = 12;
        const logoWidth = (logoImg.width / logoImg.height) * logoHeight;
        doc.addImage(logoImg, 'PNG', margin, y, logoWidth, logoHeight);
      } catch {
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
      doc.text("DEVIS D'IMPORTATION VEHICULES", margin, y);
      doc.setFontSize(9);
      doc.setTextColor(lightGray);
      doc.setFont('helvetica', 'normal');
      doc.text('Valable 7 jours', margin, y + 6);
      y += 14;

      // ========== TWO COLUMNS: CLIENT & VEHICLE ==========
      const colWidth = (contentWidth - 6) / 2;
      const clientBoxHeight = clientName ? 48 : 38;

      // Client Box
      drawBox(margin, y, colWidth, clientBoxHeight, surface);
      doc.setFontSize(9);
      doc.setTextColor(mandarin);
      doc.setFont('helvetica', 'bold');
      doc.text('CLIENT', margin + 5, y + 7);
      doc.setFontSize(8);
      let clientY = y + 14;
      if (clientName) {
        doc.setTextColor(lightGray);
        doc.setFont('helvetica', 'normal');
        doc.text('Nom', margin + 5, clientY);
        doc.setTextColor(darkGray);
        doc.setFont('helvetica', 'bold');
        doc.text(clientName, margin + 5, clientY + 6);
        clientY += 13;
      }
      doc.setTextColor(lightGray);
      doc.setFont('helvetica', 'normal');
      doc.text('Email', margin + 5, clientY);
      doc.setTextColor(darkGray);
      doc.setFont('helvetica', 'bold');
      doc.text(user.email || '-', margin + 5, clientY + 6);
      if (clientCountry) {
        doc.setTextColor(lightGray);
        doc.setFont('helvetica', 'normal');
        doc.text('Pays', margin + colWidth / 2 + 5, y + 14);
        doc.setTextColor(darkGray);
        doc.setFont('helvetica', 'bold');
        doc.text(clientCountry, margin + colWidth / 2 + 5, y + 20);
      }

      // Vehicle Box
      const vehicleX = margin + colWidth + 6;
      drawBox(vehicleX, y, colWidth, clientBoxHeight, surface);
      doc.setFontSize(9);
      doc.setTextColor(mandarin);
      doc.setFont('helvetica', 'bold');
      doc.text('VEHICULES', vehicleX + 5, y + 7);
      doc.setFontSize(8);
      let vY = y + 14;
      items.forEach((item, i) => {
        doc.setTextColor(darkGray);
        doc.setFont('helvetica', 'bold');
        doc.text(`${i + 1}. ${item.vehicleMake} ${item.vehicleModel} (${item.vehicleYear})`, vehicleX + 5, vY);
        vY += 6;
      });
      doc.setTextColor(lightGray);
      doc.setFont('helvetica', 'normal');
      doc.text(`Origine: ${SOURCE_NAMES[vehicleSource]}`, vehicleX + 5, vY + 2);
      y += clientBoxHeight + 7;

      // ========== SHIPPING INFO ==========
      drawBox(margin, y, contentWidth, 22, '#EFF6FF', royalBlue);
      doc.setFontSize(9);
      doc.setTextColor(royalBlue);
      doc.setFont('helvetica', 'bold');
      doc.text('EXPEDITION', margin + 5, y + 7);
      doc.setFontSize(8);
      doc.setTextColor(darkGray);
      doc.setFont('helvetica', 'normal');
      doc.text(`Destination: ${destination.name}, ${destination.country}`, margin + 5, y + 14);
      doc.text('Type: Container 40 pieds', margin + contentWidth / 2, y + 14);
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
      doc.text(`MONTANT (${quoteCurrencyLabel})`, pageWidth - margin - 5, y + 6, { align: 'right' });
      y += 9;

      // Cost rows - same style as single vehicle
      const costRows = [
        ...items.map((item, i) => ({
          label: `Prix vehicule ${i + 1} - ${item.vehicleMake} ${item.vehicleModel} (FOB)`,
          value: isXAF ? costs.perVehicle[i].vehiclePriceXAF : costs.perVehicle[i].vehiclePriceUSD,
        })),
        {
          label: `Transport maritime - Container 40 pieds`,
          value: isXAF ? costs.shippingCost40ftXAF : costs.shippingCost40ftUSD,
        },
        {
          label: 'Assurance cargo (2.5%)',
          value: costs.insuranceCostXAF,
        },
        {
          label: `Inspection & Documents (x${costs.vehicleCount})`,
          value: costs.inspectionFeeTotalXAF,
        },
      ];

      costRows.forEach((cost, index) => {
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
      y += costRows.length * 10;

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
      doc.text(formatCurrency(costs.totalXAF), pageWidth - margin - 5, y + 8, { align: 'right' });
      y += 18;

      // ========== DEPOSIT BOX ==========
      drawBox(margin, y, contentWidth, 32, '#ECFDF5', jewel);
      doc.setFontSize(10);
      doc.setTextColor(jewel);
      doc.setFont('helvetica', 'bold');
      doc.text(`ACOMPTE REQUIS (${costs.vehicleCount} VEHICULES)`, margin + 5, y + 8);
      doc.setFontSize(16);
      doc.setTextColor(darkGray);
      doc.text(`${costs.depositTotalUSD.toLocaleString()} USD`, margin + 5, y + 18);
      doc.setFontSize(10);
      doc.setTextColor(mediumGray);
      doc.setFont('helvetica', 'normal');
      doc.text(`(${costs.depositTotalXAF.toLocaleString('fr-FR')} FCFA)`, margin + 45, y + 18);
      doc.setFontSize(8);
      doc.setTextColor(jewel);
      doc.text(`${DEPOSIT_PER_VEHICLE_USD.toLocaleString()} USD x ${costs.vehicleCount} vehicules - Declenche l'inspection de chaque vehicule`, margin + 5, y + 26);
      y += 38;

      // ========== NEXT STEPS ==========
      doc.setFontSize(10);
      doc.setTextColor(mandarin);
      doc.setFont('helvetica', 'bold');
      doc.text('PROCHAINES ETAPES', margin, y);
      y += 6;

      const steps = [
        { num: '1', text: `Versez l'acompte de ${costs.depositTotalUSD.toLocaleString()}$ pour bloquer les ${costs.vehicleCount} vehicules` },
        { num: '2', text: "Recevez les rapports d'inspection detailles par WhatsApp" },
        { num: '3', text: "Validez et reglez le solde pour lancer l'expedition" },
        { num: '4', text: "Suivez vos vehicules jusqu'a la livraison" },
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
      const noteText = `* Ce devis est une estimation. Les frais de dedouanement ne sont pas inclus et varient selon la reglementation de ${destination.country}. Devis valable 7 jours.`;
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

      const blob = doc.output('blob');
      const url = URL.createObjectURL(blob);
      setPdfBlob(blob);
      setPdfUrl(url);
    } catch (error) {
      console.error('PDF generation error:', error);
      toast.error('Erreur lors de la génération du PDF');
    } finally {
      setIsGenerating(false);
    }
  }, [user, isGenerating, items, costs, destination, quoteNumber, formatCurrency, isXAF, vehicleSource, clientName, clientCountry, quoteCurrencyLabel, shippingCost40ftUSD, toast]);

  // Handle save + generate
  const handleSaveAndGenerate = async () => {
    const saved = await saveQuotesToDatabase();
    if (saved) {
      toast.success('Devis enregistrés');
      await generatePDF();
    }
  };

  const handlePayDeposit = async () => {
    if (!quoteSaved) {
      const saved = await saveQuotesToDatabase();
      if (!saved) return;
    }
    setIsPaymentOpen(true);
  };

  const handleSaveAndRedirect = async () => {
    if (!quoteSaved) {
      const saved = await saveQuotesToDatabase();
      if (!saved) return;
      toast.success('Devis enregistrés');
    }
    window.location.href = '/dashboard/quotes';
  };

  const handlePaymentSuccess = async ({ externalReference, paymentMethod }: { externalReference: string; paymentMethod: string }) => {
    setIsPaymentOpen(false);
    setIsCreatingOrder(true);

    try {
      if (!savedGroupId || savedQuoteIds.length === 0) {
        toast.error('Erreur', 'Devis non trouvés');
        setIsCreatingOrder(false);
        return;
      }

      const orderPromises = savedQuoteIds.map((quoteId) =>
        fetch('/api/orders/from-quote', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            quoteId,
            paymentMethod,
            paymentReference: externalReference,
            groupId: savedGroupId,
          }),
        })
      );

      const results = await Promise.all(orderPromises);
      const allOk = results.every((r) => r.ok);

      if (allOk) {
        toast.success('Commandes créées !', `${costs.vehicleCount} véhicules réservés.`);
        onOrderSuccess();
      } else {
        toast.error('Erreur', 'Certaines commandes n\'ont pas pu être créées');
        setIsCreatingOrder(false);
      }
    } catch {
      toast.error('Erreur réseau', 'Vérifiez votre connexion internet');
      setIsCreatingOrder(false);
    }
  };

  const handleShare = async () => {
    if (pdfBlob) {
      try {
        const fileName = `Devis-${quoteNumber}.pdf`;
        const file = new File([pdfBlob], fileName, { type: 'application/pdf' });
        if (navigator.share && navigator.canShare?.({ files: [file] })) {
          await navigator.share({
            title: `Devis Driveby Africa ${quoteNumber}`,
            text: `Devis d'importation pour ${costs.vehicleCount} véhicules`,
            files: [file],
          });
        } else {
          const link = document.createElement('a');
          link.href = pdfUrl || URL.createObjectURL(pdfBlob);
          link.download = fileName;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
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

  // Auto-generate PDF when modal opens
  useEffect(() => {
    if (isOpen && quoteNumber && !pdfBlob && !isGenerating && user) {
      handleSaveAndGenerate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, quoteNumber, user]);

  if (!mounted) return null;

  return createPortal(
    <>
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
                  <h2 className="text-lg font-bold text-gray-900">Votre devis</h2>
                  <p className="text-sm text-gray-500">N° {quoteNumber}</p>
                </div>
                <button onClick={handleClose} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              {/* Content - scrollable */}
              <div className="flex-1 overflow-auto bg-gray-100">
                <div className="p-4 md:p-8 flex justify-center">
                  {isGenerating ? (
                    <div className="flex flex-col items-center justify-center min-h-[400px]">
                      <Loader2 className="w-10 h-10 animate-spin text-mandarin mb-4" />
                      <p className="text-gray-500 font-medium">Préparation de votre devis...</p>
                    </div>
                  ) : (
                    <div className="w-full max-w-full md:max-w-[210mm] bg-white shadow-xl rounded-sm overflow-hidden flex flex-col text-gray-900 relative">
                      {/* Top Accent */}
                      <div className="h-2 bg-mandarin w-full" />

                      {/* Content */}
                      <div className="p-4 sm:p-6 md:p-12 space-y-6 md:space-y-8">
                        {/* Header */}
                        <div className="flex flex-col md:flex-row justify-between items-start gap-4 md:gap-6">
                          <div>
                            <img src="/logo-driveby-africa-dark.png" alt="Driveby Africa" className="h-10 md:h-14 w-auto mb-2" />
                            <p className="text-xs md:text-sm text-gray-500">Votre partenaire d&apos;importation automobile</p>
                          </div>
                          <div className="bg-orange-50 border border-orange-100 p-3 md:p-4 rounded-lg w-full md:w-auto md:min-w-[200px]">
                            <p className="text-[10px] uppercase tracking-wider text-orange-600 font-bold mb-1">Devis Professionnel</p>
                            <p className="text-base md:text-lg font-mono font-bold text-gray-900">{quoteNumber}</p>
                            <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                              <Calendar className="w-3 h-3" />
                              <span>Émis le: {new Date().toLocaleDateString('fr-FR')}</span>
                            </div>
                            <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                              <Clock className="w-3 h-3" />
                              <span>Valable jusqu&apos;au: {new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString('fr-FR')}</span>
                            </div>
                          </div>
                        </div>

                        {/* Client & Vehicles */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-8 pt-5 md:pt-8 border-t border-gray-100">
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
                            <h4 className="text-xs uppercase tracking-widest text-gray-400 font-bold">Véhicules ({costs.vehicleCount})</h4>
                            {items.map((item, i) => (
                              <div key={item.vehicleId} className="space-y-1">
                                <p className="text-base font-bold text-gray-900">{i + 1}. {item.vehicleMake} {item.vehicleModel} ({item.vehicleYear})</p>
                              </div>
                            ))}
                            <span className="text-sm px-2 py-0.5 bg-gray-100 rounded text-gray-600">
                              Origine: {SOURCE_NAMES[vehicleSource]} {SOURCE_FLAGS[vehicleSource]}
                            </span>
                          </div>
                        </div>

                        {/* Shipping info */}
                        <div className="bg-blue-50 border border-blue-100 p-4 md:p-6 rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-3 md:gap-4">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                              <Ship className="w-6 h-6 text-blue-600" />
                            </div>
                            <div>
                              <p className="text-sm font-bold text-blue-900">Expédition Internationale</p>
                              <p className="text-xs text-blue-700">Destination: {destination.name}, {destination.country}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="px-3 py-1 bg-blue-600 text-white text-[10px] font-black uppercase tracking-tighter rounded-full">
                              Container 40 pieds
                            </span>
                          </div>
                        </div>

                        {/* Costs table */}
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <h4 className="text-xs uppercase tracking-widest text-gray-400 font-bold">Détail des Coûts</h4>
                            <span className="text-[10px] text-gray-400 uppercase">Devis estimatif ({quoteCurrencyLabel})</span>
                          </div>
                          <div className="border border-gray-100 rounded-xl overflow-hidden">
                            <table className="w-full text-xs md:text-sm">
                              <thead>
                                <tr className="bg-gray-50 text-gray-500">
                                  <th className="px-3 py-2.5 md:px-6 md:py-3 text-left font-bold">Description</th>
                                  <th className="px-3 py-2.5 md:px-6 md:py-3 text-right font-bold">Montant</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-100 text-gray-700">
                                {items.map((item, i) => (
                                  <tr key={item.vehicleId}>
                                    <td className="px-3 py-3 md:px-6 md:py-4">
                                      Prix véhicule {i + 1} - {item.vehicleMake} {item.vehicleModel} (FOB)
                                    </td>
                                    <td className="px-3 py-3 md:px-6 md:py-4 text-right font-mono font-medium whitespace-nowrap">
                                      {formatCurrency(isXAF ? costs.perVehicle[i].vehiclePriceXAF : costs.perVehicle[i].vehiclePriceUSD)}
                                    </td>
                                  </tr>
                                ))}
                                <tr>
                                  <td className="px-3 py-3 md:px-6 md:py-4">
                                    <span className="flex items-center gap-1 md:gap-2 flex-wrap">
                                      Transport maritime
                                      <span className="text-[9px] md:text-[10px] px-1 md:px-1.5 py-0.5 bg-gray-100 rounded text-gray-500">Container 40 pieds</span>
                                    </span>
                                  </td>
                                  <td className="px-3 py-3 md:px-6 md:py-4 text-right font-mono font-medium whitespace-nowrap">
                                    {formatCurrency(isXAF ? costs.shippingCost40ftXAF : costs.shippingCost40ftUSD)}
                                  </td>
                                </tr>
                                <tr>
                                  <td className="px-3 py-3 md:px-6 md:py-4">Assurance cargo (2.5%)</td>
                                  <td className="px-3 py-3 md:px-6 md:py-4 text-right font-mono font-medium whitespace-nowrap">
                                    {formatCurrency(costs.insuranceCostXAF)}
                                  </td>
                                </tr>
                                <tr>
                                  <td className="px-3 py-3 md:px-6 md:py-4">Inspection & Documents (x{costs.vehicleCount})</td>
                                  <td className="px-3 py-3 md:px-6 md:py-4 text-right font-mono font-medium whitespace-nowrap">
                                    {formatCurrency(costs.inspectionFeeTotalXAF)}
                                  </td>
                                </tr>
                                <tr className="bg-orange-50/50">
                                  <td className="px-3 py-3 md:px-6 md:py-5">
                                    <span className="font-black text-gray-900 uppercase tracking-tighter block text-xs md:text-sm">Total estimé</span>
                                  </td>
                                  <td className="px-3 py-3 md:px-6 md:py-5 text-right">
                                    <span className="text-base md:text-xl font-black text-mandarin font-mono">{formatCurrency(costs.totalXAF)}</span>
                                  </td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                        </div>

                        {/* Deposit + Steps */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 pt-4">
                          <div className="bg-green-50 border border-green-100 p-3 md:p-5 rounded-xl">
                            <h5 className="text-[10px] font-black text-green-700 uppercase mb-2">Acompte Requis ({costs.vehicleCount} véhicules)</h5>
                            <p className="text-xl md:text-2xl font-black text-gray-900 mb-1">{costs.depositTotalUSD.toLocaleString()} USD</p>
                            <p className="text-xs md:text-sm font-medium text-gray-600 mb-2">= {costs.depositTotalXAF.toLocaleString('fr-FR')} FCFA</p>
                            <p className="text-[10px] text-green-600 leading-relaxed">
                              {DEPOSIT_PER_VEHICLE_USD.toLocaleString()} USD x {costs.vehicleCount} véhicules. Déclenche l&apos;inspection de chaque véhicule.
                            </p>
                          </div>
                          <div className="space-y-3">
                            <h5 className="text-[10px] font-black text-gray-400 uppercase">Prochaines Étapes</h5>
                            <div className="space-y-2">
                              {[
                                `Paiement de l'acompte de ${costs.depositTotalUSD.toLocaleString()}$`,
                                "Rapports d'inspection complets",
                                "Règlement du solde et expédition",
                                "Suivi et livraison à destination"
                              ].map((step, i) => (
                                <div key={i} className="flex items-center gap-2 text-[10px]">
                                  <div className="w-4 h-4 bg-mandarin rounded-full flex items-center justify-center text-[8px] font-bold text-white shrink-0">{i + 1}</div>
                                  <span className="text-gray-600 font-medium">{step}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Note */}
                        <div className="pt-4 md:pt-8 border-t border-gray-100">
                          <p className="text-[9px] text-gray-400 italic leading-relaxed text-center">
                            * Ce devis est une estimation basée sur les tarifs actuels. Les frais de dédouanement ne sont pas inclus et varient selon la réglementation de {destination.country}. Devis valable 7 jours à compter de la date d&apos;émission.
                          </p>
                        </div>
                      </div>

                      {/* Footer */}
                      <div className="mt-auto bg-gray-50 p-4 md:p-8 grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 text-center border-t border-gray-100">
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
                  )}
                </div>

                {/* Actions */}
                <div className="px-4 md:px-8 pb-6">
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button
                      variant="primary"
                      onClick={handlePayDeposit}
                      disabled={isGenerating || isCreatingOrder}
                      leftIcon={isCreatingOrder ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
                      className="w-full py-3 text-sm font-semibold"
                    >
                      {isCreatingOrder ? 'Création des commandes...' : `Payer l'acompte — ${costs.depositTotalUSD.toLocaleString()} USD`}
                    </Button>

                    <Button
                      variant="outline"
                      onClick={handleSaveAndRedirect}
                      disabled={isGenerating || isCreatingOrder}
                      leftIcon={<Save className="w-4 h-4" />}
                      className="w-full sm:w-auto py-3 text-sm font-semibold"
                    >
                      {quoteSaved ? 'Voir mes devis' : 'Enregistrer le devis'}
                    </Button>

                    <Button
                      variant="outline"
                      onClick={handleShare}
                      disabled={isGenerating || !pdfBlob || isCreatingOrder}
                      leftIcon={<Share2 className="w-4 h-4" />}
                      className="w-full sm:w-auto py-3 text-sm font-semibold"
                    >
                      Partager le PDF
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <PaymentModal
        isOpen={isPaymentOpen}
        onClose={() => setIsPaymentOpen(false)}
        onSuccess={handlePaymentSuccess}
        amount={costs.depositTotalUSD}
        description={`Acompte container 40ft - ${costs.vehicleCount} véhicules`}
        quoteNumber={quoteNumber}
      />
    </>,
    document.body
  );
}

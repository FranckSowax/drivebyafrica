'use client';

import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import {
  X,
  Share2,
  Loader2,
  Ship,
  Save,
  CreditCard,
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
  getExportTax,
} from '@/lib/utils/pricing';

const SOURCE_NAMES: Record<string, string> = {
  korea: 'Coree du Sud',
  china: 'Chine',
  dubai: 'Dubai',
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
    exportTaxTotalUSD: number;
    exportTaxTotalXAF: number;
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
      exportTaxUSD: number;
      exportTaxXAF: number;
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
  const router = useRouter();
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
  const isXAF = currencyCode === 'XAF';

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
      return `$${formatted}`;
    },
    [isXAF]
  );

  // Save quotes to database
  const saveQuotesToDatabase = useCallback(async (): Promise<boolean> => {
    if (!user || quoteSaved) return quoteSaved;

    try {
      const vehiclePayloads = items.map((item, i) => {
        const pv = costs.perVehicle[i];
        const shippingPerVehicleUSD = shippingCost40ftUSD / costs.vehicleCount;
        const insurancePerVehicleUSD =
          ((pv.vehiclePriceUSD + pv.exportTaxUSD + shippingPerVehicleUSD) * INSURANCE_RATE);
        const totalPerVehicleUSD =
          pv.vehiclePriceUSD + pv.exportTaxUSD + shippingPerVehicleUSD + insurancePerVehicleUSD + INSPECTION_FEE_USD;

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
          destination: {
            id: destination.id,
            name: destination.name,
            country: destination.country,
          },
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

  // Generate PDF
  const generatePDF = useCallback(async () => {
    if (!user || isGenerating) return;
    setIsGenerating(true);

    try {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageWidth = 210;
      const margin = 15;
      const contentWidth = pageWidth - 2 * margin;
      let y = margin;

      const mandarin = '#F97316';
      const darkGray = '#111827';
      const mediumGray = '#4B5563';
      const lightGray = '#9CA3AF';
      const surface = '#F3F4F6';

      const hexToRgb = (hex: string) => {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result
          ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) }
          : { r: 0, g: 0, b: 0 };
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

      // Top accent bar
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

      // Title
      doc.setFontSize(16);
      doc.setTextColor(darkGray);
      doc.setFont('helvetica', 'bold');
      doc.text('DEVIS CONTAINER 40 PIEDS', margin, y);
      doc.setFontSize(9);
      doc.setTextColor(lightGray);
      doc.setFont('helvetica', 'normal');
      doc.text(`${costs.vehicleCount} vehicules - Valable 7 jours`, margin, y + 6);
      y += 14;

      // Client info
      const colWidth = (contentWidth - 6) / 2;
      const clientBoxHeight = clientName ? 38 : 28;
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

      // Destination info
      const destX = margin + colWidth + 6;
      drawBox(destX, y, colWidth, clientBoxHeight, surface);
      doc.setFontSize(9);
      doc.setTextColor(mandarin);
      doc.setFont('helvetica', 'bold');
      doc.text('EXPEDITION', destX + 5, y + 7);
      doc.setFontSize(8);
      doc.setTextColor(lightGray);
      doc.setFont('helvetica', 'normal');
      doc.text('Destination', destX + 5, y + 14);
      doc.setTextColor(darkGray);
      doc.setFont('helvetica', 'bold');
      doc.text(`${destination.name}, ${destination.country}`, destX + 5, y + 20);
      doc.setTextColor(lightGray);
      doc.setFont('helvetica', 'normal');
      doc.text('Type', destX + 5, y + 27);
      doc.setTextColor(darkGray);
      doc.setFont('helvetica', 'bold');
      doc.text('Container 40ft', destX + 5, y + 33);

      y += clientBoxHeight + 6;

      // Vehicle table header
      drawBox(margin, y, contentWidth, 10, mandarin);
      doc.setFontSize(8);
      doc.setTextColor('#FFFFFF');
      doc.setFont('helvetica', 'bold');
      doc.text('N°', margin + 3, y + 7);
      doc.text('Vehicule', margin + 12, y + 7);
      doc.text('Annee', margin + 90, y + 7);
      doc.text('Source', margin + 110, y + 7);
      doc.text('Prix FOB', margin + contentWidth - 30, y + 7);
      y += 12;

      // Vehicle rows
      items.forEach((item, i) => {
        const exportTax = getExportTax(item.vehicleSource);
        const bgColor = i % 2 === 0 ? '#FFFFFF' : surface;
        drawBox(margin, y, contentWidth, 8, bgColor);
        doc.setFontSize(8);
        doc.setTextColor(darkGray);
        doc.setFont('helvetica', 'normal');
        doc.text(`${i + 1}`, margin + 3, y + 6);
        doc.text(`${item.vehicleMake} ${item.vehicleModel}`, margin + 12, y + 6);
        doc.text(`${item.vehicleYear}`, margin + 90, y + 6);
        doc.text(SOURCE_NAMES[item.vehicleSource] || item.vehicleSource, margin + 110, y + 6);
        doc.setFont('helvetica', 'bold');
        doc.text(`$${(item.vehiclePriceUSD + exportTax).toLocaleString('fr-FR')}`, margin + contentWidth - 30, y + 6);
        y += 9;
      });

      y += 4;

      // Cost breakdown
      drawBox(margin, y, contentWidth, 8, surface);
      doc.setFontSize(8);
      doc.setTextColor(mediumGray);
      doc.setFont('helvetica', 'normal');
      doc.text('Total vehicules (FOB)', margin + 5, y + 6);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(darkGray);
      doc.text(
        formatCurrency(isXAF ? costs.vehiclesTotalXAF + costs.exportTaxTotalXAF : costs.vehiclesTotalUSD + costs.exportTaxTotalUSD),
        margin + contentWidth - 5,
        y + 6,
        { align: 'right' }
      );
      y += 10;

      drawBox(margin, y, contentWidth, 8, '#FFFFFF');
      doc.setTextColor(mediumGray);
      doc.setFont('helvetica', 'normal');
      doc.text(`Transport Container 40ft -> ${destination.name}`, margin + 5, y + 6);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(darkGray);
      doc.text(
        formatCurrency(isXAF ? costs.shippingCost40ftXAF : costs.shippingCost40ftUSD),
        margin + contentWidth - 5,
        y + 6,
        { align: 'right' }
      );
      y += 10;

      drawBox(margin, y, contentWidth, 8, surface);
      doc.setTextColor(mediumGray);
      doc.setFont('helvetica', 'normal');
      doc.text('Assurance cargo (2.5%)', margin + 5, y + 6);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(darkGray);
      doc.text(formatCurrency(costs.insuranceCostXAF), margin + contentWidth - 5, y + 6, { align: 'right' });
      y += 10;

      drawBox(margin, y, contentWidth, 8, '#FFFFFF');
      doc.setTextColor(mediumGray);
      doc.setFont('helvetica', 'normal');
      doc.text(`Inspection & documents ($${INSPECTION_FEE_USD} x ${costs.vehicleCount})`, margin + 5, y + 6);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(darkGray);
      doc.text(formatCurrency(costs.inspectionFeeTotalXAF), margin + contentWidth - 5, y + 6, { align: 'right' });
      y += 12;

      // Total
      drawBox(margin, y, contentWidth, 12, mandarin);
      doc.setFontSize(11);
      doc.setTextColor('#FFFFFF');
      doc.setFont('helvetica', 'bold');
      doc.text('TOTAL ESTIME', margin + 5, y + 9);
      doc.text(formatCurrency(costs.totalXAF), margin + contentWidth - 5, y + 9, { align: 'right' });
      y += 16;

      // Deposit
      drawBox(margin, y, contentWidth, 10, '#FFF7ED', mandarin);
      doc.setFontSize(9);
      doc.setTextColor(mandarin);
      doc.setFont('helvetica', 'bold');
      doc.text(
        `Acompte: $${DEPOSIT_PER_VEHICLE_USD.toLocaleString()} x ${costs.vehicleCount} = $${costs.depositTotalUSD.toLocaleString()}`,
        margin + 5,
        y + 7
      );
      if (isXAF) {
        doc.text(
          `(${costs.depositTotalXAF.toLocaleString('fr-FR')} FCFA)`,
          margin + contentWidth - 5,
          y + 7,
          { align: 'right' }
        );
      }
      y += 14;

      // Footer
      doc.setFontSize(7);
      doc.setTextColor(lightGray);
      doc.setFont('helvetica', 'normal');
      doc.text('Ce devis est une estimation. Les prix peuvent varier selon le taux de change au moment de la transaction.', margin, y);
      y += 4;
      doc.text('Driveby Africa - www.driveby-africa.com - contact@driveby-africa.com', margin, y);

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
  }, [user, isGenerating, items, costs, destination, quoteNumber, formatCurrency, isXAF, shippingCost40ftUSD, toast]);

  // Handle save + generate
  const handleSaveAndGenerate = async () => {
    const saved = await saveQuotesToDatabase();
    if (saved) {
      toast.success('Devis enregistrés');
      await generatePDF();
    }
  };

  // Handle payment initiation
  const handleInitiatePayment = async () => {
    if (!quoteSaved) {
      const saved = await saveQuotesToDatabase();
      if (!saved) return;
    }
    setIsPaymentOpen(true);
  };

  // Handle payment success - create grouped orders
  const handlePaymentSuccess = async ({ externalReference, paymentMethod }: { externalReference: string; paymentMethod: string }) => {
    setIsPaymentOpen(false);
    setIsCreatingOrder(true);

    try {
      if (!savedGroupId || savedQuoteIds.length === 0) {
        toast.error('Erreur', 'Devis non trouvés');
        setIsCreatingOrder(false);
        return;
      }

      // Create orders for each quote in the group
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
        const fileName = `Devis-Container40ft-${quoteNumber}.pdf`;
        const file = new File([pdfBlob], fileName, { type: 'application/pdf' });
        if (navigator.share && navigator.canShare?.({ files: [file] })) {
          await navigator.share({
            title: `Devis Container 40ft - Driveby Africa ${quoteNumber}`,
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
          link.download = `Devis-Container40ft-${quoteNumber}.pdf`;
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
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto bg-[var(--background)] rounded-2xl shadow-2xl"
            >
              {/* Header */}
              <div className="sticky top-0 z-10 flex items-center justify-between p-4 bg-[var(--background)] border-b border-[var(--card-border)] rounded-t-2xl">
                <div className="flex items-center gap-2">
                  <Ship className="w-5 h-5 text-mandarin" />
                  <h2 className="font-bold text-lg">Devis Container 40ft</h2>
                </div>
                <button onClick={handleClose} className="p-1 rounded-full hover:bg-[var(--surface)]">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Content */}
              <div className="p-4 space-y-4">
                {/* Quote number */}
                <div className="text-center py-2 px-4 bg-mandarin/10 rounded-lg">
                  <p className="text-xs text-[var(--text-muted)]">Numéro de devis</p>
                  <p className="font-mono font-bold text-mandarin">{quoteNumber}</p>
                </div>

                {/* Summary */}
                <div className="space-y-2 text-sm">
                  <div className="font-medium">{costs.vehicleCount} véhicules :</div>
                  {items.map((item, i) => (
                    <div key={item.vehicleId} className="flex justify-between pl-4 text-[var(--text-muted)]">
                      <span>{i + 1}. {item.vehicleMake} {item.vehicleModel} ({item.vehicleYear})</span>
                      <span>{formatCurrency(isXAF ? costs.perVehicle[i].vehiclePriceXAF : costs.perVehicle[i].vehiclePriceUSD)}</span>
                    </div>
                  ))}
                  <hr className="border-[var(--card-border)]" />
                  <div className="flex justify-between">
                    <span>Transport 40ft → {destination.name}</span>
                    <span>{formatCurrency(isXAF ? costs.shippingCost40ftXAF : costs.shippingCost40ftUSD)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Assurance (2.5%)</span>
                    <span>{formatCurrency(costs.insuranceCostXAF)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Inspection x{costs.vehicleCount}</span>
                    <span>{formatCurrency(costs.inspectionFeeTotalXAF)}</span>
                  </div>
                  <hr className="border-[var(--card-border)]" />
                  <div className="flex justify-between font-bold text-base">
                    <span>Total</span>
                    <span className="text-mandarin">{formatCurrency(costs.totalXAF)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-mandarin font-medium">
                    <span>Acompte ({costs.vehicleCount} x ${DEPOSIT_PER_VEHICLE_USD.toLocaleString()})</span>
                    <span>{isXAF ? `${costs.depositTotalXAF.toLocaleString('fr-FR')} FCFA` : `$${costs.depositTotalUSD.toLocaleString()}`}</span>
                  </div>
                </div>

                {/* PDF preview */}
                {pdfUrl && (
                  <div className="border border-[var(--card-border)] rounded-lg overflow-hidden">
                    <iframe src={pdfUrl} className="w-full h-64" title="Aperçu du devis" />
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="sticky bottom-0 p-4 bg-[var(--background)] border-t border-[var(--card-border)] space-y-2">
                {!pdfBlob ? (
                  <Button
                    variant="primary"
                    className="w-full"
                    onClick={handleSaveAndGenerate}
                    disabled={isGenerating}
                    leftIcon={isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  >
                    {isGenerating ? 'Génération...' : 'Enregistrer & Générer le PDF'}
                  </Button>
                ) : (
                  <>
                    <Button
                      variant="primary"
                      className="w-full"
                      onClick={handleInitiatePayment}
                      disabled={isCreatingOrder}
                      leftIcon={
                        isCreatingOrder ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <CreditCard className="w-4 h-4" />
                        )
                      }
                    >
                      {isCreatingOrder
                        ? 'Création des commandes...'
                        : `Payer l'acompte (${isXAF ? `${costs.depositTotalXAF.toLocaleString('fr-FR')} FCFA` : `$${costs.depositTotalUSD.toLocaleString()}`})`}
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={handleShare}
                      disabled={isGenerating || isCreatingOrder}
                      leftIcon={<Share2 className="w-4 h-4" />}
                    >
                      Partager le PDF
                    </Button>
                  </>
                )}
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

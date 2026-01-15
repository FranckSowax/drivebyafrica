'use client';

import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Share2,
  Loader2,
  CheckCircle,
  Ship,
  Calendar,
  Clock,
  Download,
  Printer,
  Package,
  MapPin,
  CreditCard,
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { cn } from '@/lib/utils';

// Types
interface Order {
  id: string;
  order_number: string;
  invoice_number: string;
  vehicle_id: string;
  vehicle_make: string;
  vehicle_model: string;
  vehicle_year: number;
  vehicle_price_usd: number;
  vehicle_source: 'korea' | 'china' | 'dubai';
  destination_id: string;
  destination_name: string;
  destination_country: string;
  shipping_type: 'container' | 'groupage';
  shipping_cost_xaf: number;
  insurance_cost_xaf: number;
  inspection_fee_xaf: number;
  total_cost_xaf: number;
  deposit_amount_usd: number;
  deposit_amount_xaf: number;
  deposit_paid_at: string | null;
  deposit_payment_method: string | null;
  balance_amount_xaf: number;
  balance_paid_at: string | null;
  status: string;
  customer_name: string;
  customer_email: string;
  customer_whatsapp: string;
  customer_country: string;
  created_at: string;
}

interface InvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order | null;
}

const SOURCE_NAMES: Record<string, string> = {
  korea: 'Corée du Sud',
  china: 'Chine',
  dubai: 'Dubaï',
};

const SOURCE_FLAGS: Record<string, string> = {
  korea: '🇰🇷',
  china: '🇨🇳',
  dubai: '🇦🇪',
};

const STATUS_LABELS: Record<string, string> = {
  pending_deposit: 'En attente de dépôt',
  deposit_paid: 'Dépôt reçu',
  inspection_sent: 'Inspection envoyée',
  pending_balance: 'En attente du solde',
  balance_paid: 'Solde payé',
  shipped: 'Expédié',
  in_transit: 'En transit',
  arrived: 'Arrivé au port',
  customs_clearance: 'Dédouanement',
  delivered: 'Livré',
  cancelled: 'Annulé',
  refunded: 'Remboursé',
};

const STATUS_COLORS: Record<string, string> = {
  pending_deposit: 'bg-yellow-100 text-yellow-800',
  deposit_paid: 'bg-blue-100 text-blue-800',
  inspection_sent: 'bg-purple-100 text-purple-800',
  pending_balance: 'bg-orange-100 text-orange-800',
  balance_paid: 'bg-green-100 text-green-800',
  shipped: 'bg-cyan-100 text-cyan-800',
  in_transit: 'bg-indigo-100 text-indigo-800',
  arrived: 'bg-teal-100 text-teal-800',
  customs_clearance: 'bg-pink-100 text-pink-800',
  delivered: 'bg-emerald-100 text-emerald-800',
  cancelled: 'bg-red-100 text-red-800',
  refunded: 'bg-gray-100 text-gray-800',
};

export function InvoiceModal({ isOpen, onClose, order }: InvoiceModalProps) {
  const toast = useToast();
  const [mounted, setMounted] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  const formatCurrency = useCallback((amount: number) => {
    const formatted = new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
    return formatted.replace(/[\u202F\u00A0]/g, ' ') + ' FCFA';
  }, []);

  const formatDate = useCallback((dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }, []);

  const generatePDF = useCallback(async () => {
    if (!order || isGenerating) return;

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
      doc.setFillColor(21, 128, 61); // Jewel green
      doc.rect(0, 0, pageWidth, 8, 'F');

      y = 16;

      // Load and add logo
      try {
        const logoImg = new Image();
        logoImg.crossOrigin = 'anonymous';
        await new Promise<void>((resolve, reject) => {
          logoImg.onload = () => resolve();
          logoImg.onerror = () => reject(new Error('Failed to load logo'));
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

      // Invoice info box
      drawBox(pageWidth - margin - 55, y - 2, 55, 22, '#ECFDF5', jewel);
      doc.setFontSize(8);
      doc.setTextColor(mediumGray);
      doc.setFont('helvetica', 'normal');
      doc.text('FACTURE N°', pageWidth - margin - 50, y + 5);
      doc.setFontSize(10);
      doc.setTextColor(jewel);
      doc.setFont('helvetica', 'bold');
      doc.text(order.invoice_number, pageWidth - margin - 50, y + 12);
      doc.setFontSize(8);
      doc.setTextColor(lightGray);
      doc.setFont('helvetica', 'normal');
      doc.text(`Date: ${formatDate(order.created_at)}`, pageWidth - margin - 50, y + 17);

      y += 28;

      // ========== TITLE ==========
      doc.setFontSize(18);
      doc.setTextColor(darkGray);
      doc.setFont('helvetica', 'bold');
      doc.text('FACTURE', margin, y);
      doc.setFontSize(9);
      doc.setTextColor(jewel);
      doc.setFont('helvetica', 'normal');
      doc.text('Acompte vehicule', margin, y + 6);

      y += 14;

      // ========== CLIENT INFO ==========
      const colWidth = (contentWidth - 6) / 2;
      drawBox(margin, y, colWidth, 38, surface);
      doc.setFontSize(9);
      doc.setTextColor(jewel);
      doc.setFont('helvetica', 'bold');
      doc.text('CLIENT', margin + 5, y + 7);
      doc.setFontSize(8);
      doc.setTextColor(lightGray);
      doc.setFont('helvetica', 'normal');
      doc.text('Nom', margin + 5, y + 14);
      doc.setTextColor(darkGray);
      doc.setFont('helvetica', 'bold');
      doc.text(order.customer_name, margin + 5, y + 20);
      doc.setTextColor(lightGray);
      doc.setFont('helvetica', 'normal');
      doc.text('Email', margin + 5, y + 27);
      doc.setTextColor(darkGray);
      doc.setFont('helvetica', 'bold');
      doc.text(order.customer_email, margin + 5, y + 33);

      // Vehicle box
      const vehicleX = margin + colWidth + 6;
      drawBox(vehicleX, y, colWidth, 38, surface);
      doc.setFontSize(9);
      doc.setTextColor(jewel);
      doc.setFont('helvetica', 'bold');
      doc.text('VEHICULE', vehicleX + 5, y + 7);
      doc.setFontSize(8);
      doc.setTextColor(lightGray);
      doc.setFont('helvetica', 'normal');
      doc.text('Marque / Modele', vehicleX + 5, y + 14);
      doc.setTextColor(darkGray);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text(`${order.vehicle_make} ${order.vehicle_model}`, vehicleX + 5, y + 21);
      doc.setFontSize(8);
      doc.setTextColor(lightGray);
      doc.setFont('helvetica', 'normal');
      doc.text(`Annee: ${order.vehicle_year}`, vehicleX + 5, y + 28);
      doc.text(`Origine: ${SOURCE_NAMES[order.vehicle_source]}`, vehicleX + 5, y + 33);

      y += 45;

      // ========== DEPOSIT DETAILS ==========
      doc.setFontSize(10);
      doc.setTextColor(jewel);
      doc.setFont('helvetica', 'bold');
      doc.text('DETAIL DE L\'ACOMPTE', margin, y);
      y += 6;

      // Table header
      doc.setFillColor(21, 128, 61);
      doc.rect(margin, y, contentWidth, 9, 'F');
      doc.setFontSize(8);
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.text('DESCRIPTION', margin + 5, y + 6);
      doc.text('MONTANT', pageWidth - margin - 5, y + 6, { align: 'right' });
      y += 9;

      // Deposit row
      doc.setFillColor(252, 252, 252);
      doc.rect(margin, y, contentWidth, 10, 'F');
      doc.setFontSize(9);
      doc.setTextColor(darkGray);
      doc.setFont('helvetica', 'normal');
      doc.text('Acompte pour reservation du vehicule', margin + 5, y + 7);
      doc.setFont('helvetica', 'bold');
      doc.text(`${order.deposit_amount_usd} USD`, pageWidth - margin - 5, y + 7, { align: 'right' });
      y += 10;

      // Total row
      doc.setFillColor(236, 253, 245);
      doc.rect(margin, y, contentWidth, 12, 'F');
      doc.setDrawColor(21, 128, 61);
      doc.setLineWidth(0.5);
      doc.rect(margin, y, contentWidth, 12, 'S');
      doc.setFontSize(10);
      doc.setTextColor(darkGray);
      doc.setFont('helvetica', 'bold');
      doc.text('TOTAL PAYE', margin + 5, y + 8);
      doc.setTextColor(jewel);
      doc.setFontSize(12);
      doc.text(formatCurrency(order.deposit_amount_xaf), pageWidth - margin - 5, y + 8, { align: 'right' });
      y += 18;

      // ========== ORDER SUMMARY ==========
      drawBox(margin, y, contentWidth, 35, '#F3F4F6');
      doc.setFontSize(9);
      doc.setTextColor(mediumGray);
      doc.setFont('helvetica', 'bold');
      doc.text('RECAPITULATIF DE LA COMMANDE', margin + 5, y + 7);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text(`Commande N°: ${order.order_number}`, margin + 5, y + 15);
      doc.text(`Destination: ${order.destination_name}, ${order.destination_country}`, margin + 5, y + 21);
      doc.text(`Expedition: ${order.shipping_type === 'container' ? 'Container seul 20HQ' : 'Groupage maritime'}`, margin + 5, y + 27);
      doc.setTextColor(darkGray);
      doc.setFont('helvetica', 'bold');
      doc.text(`Solde restant: ${formatCurrency(order.balance_amount_xaf)}`, margin + contentWidth / 2, y + 15);

      y += 42;

      // ========== PAYMENT INFO ==========
      if (order.deposit_paid_at) {
        drawBox(margin, y, contentWidth, 20, '#ECFDF5', jewel);
        doc.setFontSize(9);
        doc.setTextColor(jewel);
        doc.setFont('helvetica', 'bold');
        doc.text('PAIEMENT RECU', margin + 5, y + 8);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(mediumGray);
        doc.text(`Date: ${formatDate(order.deposit_paid_at)}`, margin + 5, y + 15);
        if (order.deposit_payment_method) {
          const methodLabels: Record<string, string> = {
            stripe: 'Carte bancaire',
            mobile_money: 'Mobile Money',
            cash: 'Especes en agence',
          };
          doc.text(`Methode: ${methodLabels[order.deposit_payment_method] || order.deposit_payment_method}`, margin + 60, y + 15);
        }
        y += 26;
      }

      // ========== NOTE ==========
      doc.setFontSize(7);
      doc.setTextColor(lightGray);
      doc.setFont('helvetica', 'italic');
      doc.text('Cette facture fait foi du paiement de l\'acompte. Le solde sera a regler apres validation du rapport d\'inspection.', margin, y);
      y += 10;

      // ========== FOOTER ==========
      drawBox(margin, y, contentWidth, 24, surface);
      doc.setFontSize(9);
      doc.setTextColor(jewel);
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
      doc.setFillColor(21, 128, 61);
      doc.rect(0, pageHeight - 6, pageWidth, 6, 'F');

      // Download
      doc.save(`Facture-${order.invoice_number}.pdf`);
      toast.success('PDF téléchargé');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Erreur lors de la génération du PDF');
    } finally {
      setIsGenerating(false);
    }
  }, [order, isGenerating, formatCurrency, formatDate, toast]);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && order && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ type: 'spring', duration: 0.3 }}
            className="relative w-full max-w-4xl max-h-[95vh] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-emerald-50">
              <div>
                <h2 className="text-lg font-bold text-gray-900">
                  Facture
                </h2>
                <p className="text-sm text-gray-500">
                  N° {order.invoice_number}
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Modal Content - Invoice Preview */}
            <div className="flex-1 overflow-auto bg-gray-100 p-4 md:p-8 flex justify-center">
              <div className="w-full max-w-[210mm] bg-white shadow-xl rounded-sm overflow-hidden flex flex-col min-h-[297mm] text-gray-900 relative">
                {/* Top Accent - Green for Invoice */}
                <div className="h-2 bg-jewel w-full" />

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
                    <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-lg min-w-[200px]">
                      <p className="text-[10px] uppercase tracking-wider text-emerald-600 font-bold mb-1">Facture</p>
                      <p className="text-lg font-mono font-bold text-gray-900">{order.invoice_number}</p>
                      <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                        <Calendar className="w-3 h-3" />
                        <span>Émise le: {formatDate(order.created_at)}</span>
                      </div>
                      <div className="mt-2">
                        <span className={cn(
                          'text-[10px] px-2 py-1 rounded-full font-bold',
                          STATUS_COLORS[order.status] || 'bg-gray-100 text-gray-800'
                        )}>
                          {STATUS_LABELS[order.status] || order.status}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-8 border-t border-gray-100">
                    <div className="space-y-4">
                      <h4 className="text-xs uppercase tracking-widest text-gray-400 font-bold">Client</h4>
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-gray-500">Nom</p>
                        <p className="text-base font-bold text-gray-900">{order.customer_name}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-gray-500">Email</p>
                        <p className="text-base font-bold text-gray-900">{order.customer_email}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-gray-500">WhatsApp</p>
                        <p className="text-base font-bold text-gray-900">{order.customer_whatsapp}</p>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <h4 className="text-xs uppercase tracking-widest text-gray-400 font-bold">Véhicule</h4>
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-gray-500">Marque & Modèle</p>
                        <p className="text-base font-bold text-gray-900">{order.vehicle_make} {order.vehicle_model} ({order.vehicle_year})</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-sm px-2 py-0.5 bg-gray-100 rounded text-gray-600">
                            Origine: {SOURCE_NAMES[order.vehicle_source]} {SOURCE_FLAGS[order.vehicle_source]}
                          </span>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-gray-500">Destination</p>
                        <p className="text-base font-bold text-gray-900">{order.destination_name}, {order.destination_country}</p>
                      </div>
                    </div>
                  </div>

                  {/* Invoice Details */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs uppercase tracking-widest text-gray-400 font-bold">Détail de la facture</h4>
                    </div>
                    <div className="border border-gray-100 rounded-xl overflow-hidden">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-emerald-50 text-emerald-800">
                            <th className="px-6 py-3 text-left font-bold">Description</th>
                            <th className="px-6 py-3 text-right font-bold">Montant</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 text-gray-700">
                          <tr>
                            <td className="px-6 py-4">
                              <div>
                                <p className="font-medium">Acompte pour réservation du véhicule</p>
                                <p className="text-xs text-gray-500">{order.vehicle_make} {order.vehicle_model} {order.vehicle_year}</p>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-right font-mono font-medium">{order.deposit_amount_usd} USD</td>
                          </tr>
                          <tr className="bg-emerald-50/50">
                            <td className="px-6 py-5 font-black text-gray-900 uppercase tracking-tighter">Total payé</td>
                            <td className="px-6 py-5 text-right">
                              <span className="text-xl font-black text-jewel font-mono">{formatCurrency(order.deposit_amount_xaf)}</span>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Order Summary */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                    <div className="bg-gray-50 border border-gray-100 p-5 rounded-xl">
                      <h5 className="text-[10px] font-black text-gray-400 uppercase mb-3">Récapitulatif commande</h5>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-500">N° Commande</span>
                          <span className="font-mono font-bold">{order.order_number}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Coût total estimé</span>
                          <span className="font-mono font-bold">{formatCurrency(order.total_cost_xaf)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Acompte versé</span>
                          <span className="font-mono font-bold text-jewel">- {formatCurrency(order.deposit_amount_xaf)}</span>
                        </div>
                        <div className="flex justify-between pt-2 border-t border-gray-200">
                          <span className="text-gray-900 font-bold">Solde restant</span>
                          <span className="font-mono font-black text-mandarin">{formatCurrency(order.balance_amount_xaf)}</span>
                        </div>
                      </div>
                    </div>

                    {order.deposit_paid_at && (
                      <div className="bg-emerald-50 border border-emerald-100 p-5 rounded-xl">
                        <h5 className="text-[10px] font-black text-emerald-700 uppercase mb-3">Paiement reçu</h5>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
                            <CheckCircle className="w-5 h-5 text-emerald-600" />
                          </div>
                          <div>
                            <p className="font-bold text-gray-900">Confirmé</p>
                            <p className="text-xs text-gray-500">Le {formatDate(order.deposit_paid_at)}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="pt-8 border-t border-gray-100">
                    <p className="text-[9px] text-gray-400 italic leading-relaxed text-center">
                      Cette facture fait foi du paiement de l'acompte. Le solde sera à régler après validation du rapport d'inspection. Merci de votre confiance.
                    </p>
                  </div>
                </div>

                {/* Footer */}
                <div className="mt-auto bg-gray-50 p-8 grid grid-cols-2 md:grid-cols-4 gap-4 text-center border-t border-gray-100">
                  <div className="space-y-1">
                    <p className="text-[8px] font-bold text-gray-400 uppercase">Email</p>
                    <p className="text-[10px] font-medium text-gray-900">contact@drivebyafrica.com</p>
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
                    <p className="text-[10px] font-medium text-gray-900">Gabon - Cameroun</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
              <div className="flex flex-wrap gap-3">
                <Button
                  variant="primary"
                  onClick={generatePDF}
                  disabled={isGenerating}
                  leftIcon={<Download className="w-4 h-4" />}
                  className="flex-1 sm:flex-none bg-jewel hover:bg-jewel/90"
                >
                  Télécharger le PDF
                </Button>

                <Button
                  variant="outline"
                  onClick={() => window.print()}
                  leftIcon={<Printer className="w-4 h-4" />}
                  className="flex-1 sm:flex-none"
                >
                  Imprimer
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

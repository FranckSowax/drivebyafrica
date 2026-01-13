'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import {
  MessageSquare,
  Send,
  Phone,
  Mail,
  Clock,
  CheckCircle,
  User,
} from 'lucide-react';

export default function MessagesPage() {
  const [message, setMessage] = useState('');

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    // Open WhatsApp with the message
    const whatsappUrl = `https://wa.me/24177000000?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
    setMessage('');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Messages</h1>
        <p className="text-[var(--text-muted)]">
          Contactez notre equipe pour toute question
        </p>
      </div>

      {/* Contact Options */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="text-center p-6">
          <div className="w-12 h-12 bg-jewel/10 rounded-full flex items-center justify-center mx-auto mb-3">
            <MessageSquare className="w-6 h-6 text-jewel" />
          </div>
          <h3 className="font-medium text-[var(--text-primary)] mb-1">WhatsApp</h3>
          <p className="text-sm text-[var(--text-muted)] mb-3">Reponse rapide</p>
          <a
            href="https://wa.me/24177000000"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button variant="primary" size="sm" className="w-full">
              Ouvrir WhatsApp
            </Button>
          </a>
        </Card>

        <Card className="text-center p-6">
          <div className="w-12 h-12 bg-royal-blue/10 rounded-full flex items-center justify-center mx-auto mb-3">
            <Mail className="w-6 h-6 text-royal-blue" />
          </div>
          <h3 className="font-medium text-[var(--text-primary)] mb-1">Email</h3>
          <p className="text-sm text-[var(--text-muted)] mb-3">Support detaille</p>
          <a href="mailto:contact@drivebyafrica.com">
            <Button variant="outline" size="sm" className="w-full">
              Envoyer un email
            </Button>
          </a>
        </Card>

        <Card className="text-center p-6">
          <div className="w-12 h-12 bg-mandarin/10 rounded-full flex items-center justify-center mx-auto mb-3">
            <Phone className="w-6 h-6 text-mandarin" />
          </div>
          <h3 className="font-medium text-[var(--text-primary)] mb-1">Telephone</h3>
          <p className="text-sm text-[var(--text-muted)] mb-3">Appel direct</p>
          <a href="tel:+24177000000">
            <Button variant="outline" size="sm" className="w-full">
              +241 77 00 00 00
            </Button>
          </a>
        </Card>
      </div>

      {/* Quick Message Form */}
      <Card>
        <h2 className="font-bold text-[var(--text-primary)] mb-4">
          Envoyer un message rapide
        </h2>
        <form onSubmit={handleSendMessage} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
              Votre message
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Ecrivez votre message ici..."
              rows={4}
              className="w-full px-4 py-3 bg-[var(--surface)] border border-[var(--card-border)] rounded-xl text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-mandarin focus:outline-none resize-none"
            />
          </div>
          <Button
            type="submit"
            variant="primary"
            disabled={!message.trim()}
            leftIcon={<Send className="w-4 h-4" />}
          >
            Envoyer via WhatsApp
          </Button>
        </form>
      </Card>

      {/* FAQ Section */}
      <Card>
        <h2 className="font-bold text-[var(--text-primary)] mb-4">
          Questions frequentes
        </h2>
        <div className="space-y-4">
          <div className="p-4 bg-[var(--surface)] rounded-lg">
            <h3 className="font-medium text-[var(--text-primary)] mb-1">
              Comment obtenir un devis?
            </h3>
            <p className="text-sm text-[var(--text-muted)]">
              Selectionnez un vehicule dans notre catalogue, choisissez votre destination
              et cliquez sur "Demander un devis" pour recevoir une estimation complete.
            </p>
          </div>
          <div className="p-4 bg-[var(--surface)] rounded-lg">
            <h3 className="font-medium text-[var(--text-primary)] mb-1">
              Quels sont les delais de livraison?
            </h3>
            <p className="text-sm text-[var(--text-muted)]">
              Les delais varient selon l'origine du vehicule: 4-6 semaines depuis la Coree,
              6-8 semaines depuis la Chine, et 3-5 semaines depuis Dubai.
            </p>
          </div>
          <div className="p-4 bg-[var(--surface)] rounded-lg">
            <h3 className="font-medium text-[var(--text-primary)] mb-1">
              Quels modes de paiement acceptez-vous?
            </h3>
            <p className="text-sm text-[var(--text-muted)]">
              Nous acceptons les virements bancaires, Mobile Money, et les paiements
              par carte via notre plateforme securisee.
            </p>
          </div>
        </div>
      </Card>

      {/* Business Hours */}
      <Card className="bg-[var(--surface)]/50">
        <div className="flex items-start gap-3">
          <Clock className="w-5 h-5 text-mandarin flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-medium text-[var(--text-primary)] mb-1">
              Horaires d'ouverture
            </h3>
            <p className="text-sm text-[var(--text-muted)]">
              Lundi - Vendredi: 8h00 - 18h00<br />
              Samedi: 9h00 - 14h00<br />
              Dimanche: Ferme
            </p>
            <p className="text-sm text-[var(--text-muted)] mt-2">
              Temps de reponse moyen: moins de 2 heures pendant les horaires d'ouverture
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}

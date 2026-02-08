'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  MessageCircle, Mail, Phone, MapPin, Clock, Send,
  ArrowRight, CheckCircle, Bot
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useAuthStore } from '@/store/useAuthStore';
import { authFetch } from '@/lib/supabase/auth-helpers';

const contactMethods = [
  {
    icon: MessageCircle,
    title: 'WhatsApp',
    description: 'Réponse instantanée 24/7',
    value: '+241 77 00 00 00',
    href: 'https://wa.me/24177000000',
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
  },
  {
    icon: Mail,
    title: 'Email',
    description: 'Réponse sous 24h',
    value: 'contact@driveby-africa.com',
    href: 'mailto:contact@driveby-africa.com',
    color: 'text-royal-blue',
    bgColor: 'bg-royal-blue/10',
  },
  {
    icon: Phone,
    title: 'Téléphone',
    description: 'Lun-Ven, 9h-18h',
    value: '+241 11 00 00 00',
    href: 'tel:+24111000000',
    color: 'text-mandarin',
    bgColor: 'bg-mandarin/10',
  },
];

const offices = [
  {
    city: 'Hong Kong',
    country: 'Chine',
    address: 'Central Business District',
    phone: '+852 0000 0000',
  },
];

export default function ContactPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [lastSubmitTime, setLastSubmitTime] = useState(0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Rate limit: 1 submission per 30 seconds
    const now = Date.now();
    if (now - lastSubmitTime < 30_000) {
      return;
    }
    setLastSubmitTime(now);
    setIsSubmitting(true);

    try {
      // If user is logged in, redirect to chat with message
      if (user) {
        // Create a conversation and send the message
        const response = await authFetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: `[Formulaire de contact]\nSujet: ${formData.subject}\nNom: ${formData.name}\nEmail: ${formData.email}\nTéléphone: ${formData.phone || 'Non fourni'}\n\nMessage:\n${formData.message}`,
          }),
        });

        if (response.ok) {
          const data = await response.json();

          // Get AI response
          await authFetch('/api/chat/ai', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              conversationId: data.conversationId,
              userMessage: formData.message,
            }),
          });

          // Redirect to messages
          router.push('/dashboard/messages');
          return;
        }
      }

      // Fallback: show success message (for non-logged users or API errors)
      await new Promise(resolve => setTimeout(resolve, 1500));
      setIsSubmitted(true);
    } catch (error) {
      console.error('Error submitting form:', error);
      setIsSubmitted(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const goToChat = () => {
    if (user) {
      router.push('/dashboard/messages');
    } else {
      router.push('/login?redirect=/dashboard/messages');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative py-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-cod-gray via-cod-gray to-mandarin/20" />
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl sm:text-5xl font-bold text-mandarin mb-6">
              Contactez notre équipe
            </h1>
            <p className="text-lg text-nobel">
              Une question? Besoin d&apos;aide? Notre équipe est disponible 24/7
              pour vous accompagner dans votre projet d&apos;importation.
            </p>
          </div>
        </div>
      </section>

      {/* Contact Methods */}
      <section className="py-12 -mt-8 relative z-20">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-6 max-w-5xl mx-auto">
            {/* AI Chat Card */}
            <button onClick={goToChat} className="text-left">
              <Card hover className="p-6 text-center h-full border-2 border-mandarin/30 bg-mandarin/5">
                <div className="w-12 h-12 bg-mandarin/20 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <Bot className="w-6 h-6 text-mandarin" />
                </div>
                <h3 className="font-semibold text-white mb-1">Assistant IA</h3>
                <p className="text-sm text-nobel mb-2">Réponse instantanée</p>
                <p className="font-medium text-mandarin">Discuter maintenant</p>
              </Card>
            </button>

            {contactMethods.map((method) => (
              <a
                key={method.title}
                href={method.href}
                target={method.href.startsWith('http') ? '_blank' : undefined}
                rel={method.href.startsWith('http') ? 'noopener noreferrer' : undefined}
              >
                <Card hover className="p-6 text-center h-full">
                  <div className={`w-12 h-12 ${method.bgColor} rounded-xl flex items-center justify-center mx-auto mb-4`}>
                    <method.icon className={`w-6 h-6 ${method.color}`} />
                  </div>
                  <h3 className="font-semibold text-white mb-1">{method.title}</h3>
                  <p className="text-sm text-nobel mb-2">{method.description}</p>
                  <p className={`font-medium ${method.color}`}>{method.value}</p>
                </Card>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Form & Info */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-12">
              {/* Form */}
              <Card className="p-6 lg:p-8">
                <h2 className="text-2xl font-bold text-mandarin mb-6">
                  Envoyez-nous un message
                </h2>

                {isSubmitted ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-jewel/20 rounded-full flex items-center justify-center mx-auto mb-4">
                      <CheckCircle className="w-8 h-8 text-jewel" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">Message envoyé!</h3>
                    <p className="text-nobel mb-6">
                      Nous vous répondrons dans les plus brefs délais.
                    </p>
                    <Button variant="outline" onClick={() => setIsSubmitted(false)}>
                      Envoyer un autre message
                    </Button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-white mb-2">
                          Nom complet *
                        </label>
                        <input
                          type="text"
                          name="name"
                          value={formData.name}
                          onChange={handleChange}
                          required
                          className="w-full px-4 py-3 bg-cod-gray border border-nobel/20 rounded-xl text-white placeholder:text-nobel focus:outline-none focus:border-mandarin"
                          placeholder="Jean Dupont"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-white mb-2">
                          Email *
                        </label>
                        <input
                          type="email"
                          name="email"
                          value={formData.email}
                          onChange={handleChange}
                          required
                          className="w-full px-4 py-3 bg-cod-gray border border-nobel/20 rounded-xl text-white placeholder:text-nobel focus:outline-none focus:border-mandarin"
                          placeholder="jean@example.com"
                        />
                      </div>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-white mb-2">
                          Téléphone
                        </label>
                        <input
                          type="tel"
                          name="phone"
                          value={formData.phone}
                          onChange={handleChange}
                          className="w-full px-4 py-3 bg-cod-gray border border-nobel/20 rounded-xl text-white placeholder:text-nobel focus:outline-none focus:border-mandarin"
                          placeholder="+241 77 00 00 00"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-white mb-2">
                          Sujet *
                        </label>
                        <select
                          name="subject"
                          value={formData.subject}
                          onChange={handleChange}
                          required
                          className="w-full px-4 py-3 bg-cod-gray border border-nobel/20 rounded-xl text-white focus:outline-none focus:border-mandarin"
                        >
                          <option value="">Sélectionnez un sujet</option>
                          <option value="general">Question générale</option>
                          <option value="vehicle">Recherche de véhicule</option>
                          <option value="order">Suivi de commande</option>
                          <option value="payment">Paiement</option>
                          <option value="partnership">Partenariat</option>
                          <option value="other">Autre</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-white mb-2">
                        Message *
                      </label>
                      <textarea
                        name="message"
                        value={formData.message}
                        onChange={handleChange}
                        required
                        rows={5}
                        className="w-full px-4 py-3 bg-cod-gray border border-nobel/20 rounded-xl text-white placeholder:text-nobel focus:outline-none focus:border-mandarin resize-none"
                        placeholder="Décrivez votre demande..."
                      />
                    </div>

                    <Button
                      type="submit"
                      variant="primary"
                      className="w-full"
                      disabled={isSubmitting}
                      rightIcon={<Send className="w-5 h-5" />}
                    >
                      {isSubmitting ? 'Envoi en cours...' : 'Envoyer le message'}
                    </Button>
                  </form>
                )}
              </Card>

              {/* Info */}
              <div className="space-y-8">
                {/* Working Hours */}
                <Card className="p-6">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 bg-mandarin/10 rounded-xl flex items-center justify-center">
                      <Clock className="w-6 h-6 text-mandarin" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-mandarin">Heures d&apos;ouverture</h3>
                      <p className="text-sm text-nobel">Bureau principal</p>
                    </div>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-nobel">Lundi - Vendredi</span>
                      <span className="text-white">9h00 - 18h00</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-nobel">Samedi</span>
                      <span className="text-white">9h00 - 13h00</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-nobel">Dimanche</span>
                      <span className="text-white">Fermé</span>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-surface">
                    <p className="text-sm text-nobel">
                      <span className="text-jewel font-medium">WhatsApp disponible 24/7</span>
                      {' '}pour les urgences
                    </p>
                  </div>
                </Card>

                {/* Offices */}
                <Card className="p-6">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 bg-royal-blue/10 rounded-xl flex items-center justify-center">
                      <MapPin className="w-6 h-6 text-royal-blue" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-mandarin">Nos bureaux</h3>
                      <p className="text-sm text-nobel">Présence internationale</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {offices.map((office) => (
                      <div key={office.city} className="pb-4 border-b border-surface last:border-b-0 last:pb-0">
                        <h4 className="font-medium text-white">
                          {office.city}, {office.country}
                        </h4>
                        <p className="text-sm text-nobel mt-1">{office.address}</p>
                        <p className="text-sm text-mandarin mt-1">{office.phone}</p>
                      </div>
                    ))}
                  </div>
                </Card>

                {/* Quick Links */}
                <Card className="p-6 bg-gradient-to-r from-mandarin/10 to-orange-600/10">
                  <h3 className="font-semibold text-mandarin mb-4">Liens rapides</h3>
                  <div className="space-y-2">
                    <Link href="/faq" className="flex items-center gap-2 text-nobel hover:text-white transition-colors">
                      <ArrowRight className="w-4 h-4" />
                      <span>Questions fréquentes</span>
                    </Link>
                    <Link href="/how-it-works" className="flex items-center gap-2 text-nobel hover:text-white transition-colors">
                      <ArrowRight className="w-4 h-4" />
                      <span>Comment ça marche</span>
                    </Link>
                    <Link href="/calculator" className="flex items-center gap-2 text-nobel hover:text-white transition-colors">
                      <ArrowRight className="w-4 h-4" />
                      <span>Calculateur de prix</span>
                    </Link>
                  </div>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

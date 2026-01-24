'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { useAuthStore } from '@/store/useAuthStore';
import { createBrowserClient } from '@supabase/ssr';
import {
  Settings,
  User,
  Bell,
  Shield,
  Globe,
  Save,
  LogOut,
  Mail,
  Phone,
  MapPin,
  Loader2,
} from 'lucide-react';

export default function SettingsPage() {
  const toast = useToast();
  const { user, signOut } = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [profile, setProfile] = useState({
    full_name: '',
    phone: '',
    whatsapp_number: '',
    country: 'Gabon',
    city: '',
    preferred_language: 'fr',
  });

  const [notifications, setNotifications] = useState({
    email_notifications: true,
    whatsapp_notifications: true,
    quote_updates: true,
    order_updates: true,
    new_vehicles: false,
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    if (!user) return;

    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (data) {
      setProfile({
        full_name: data.full_name || '',
        phone: data.phone || '',
        whatsapp_number: data.whatsapp_number || '',
        country: data.country || 'Gabon',
        city: data.city || '',
        preferred_language: 'fr', // Note: preferred_language is stored locally only for now
      });
    }

    setIsLoading(false);
  };

  const handleSaveProfile = async () => {
    if (!user) return;

    setIsSaving(true);

    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { error } = await supabase
      .from('profiles')
      .upsert({
        id: user.id,
        full_name: profile.full_name,
        phone: profile.phone,
        whatsapp_number: profile.whatsapp_number,
        country: profile.country,
        city: profile.city,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'id' });

    if (error) {
      console.error('Profile save error:', error);
      toast.error('Erreur lors de la sauvegarde');
    } else {
      toast.success('Profil mis a jour!');
    }

    setIsSaving(false);
  };

  const handleSignOut = async () => {
    await signOut();
    window.location.href = '/';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-mandarin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Parametres</h1>
          <p className="text-[var(--text-muted)]">
            Gerez votre compte et vos preferences
          </p>
        </div>
        <Button
          variant="primary"
          onClick={handleSaveProfile}
          disabled={isSaving}
          leftIcon={isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        >
          {isSaving ? 'Sauvegarde...' : 'Sauvegarder'}
        </Button>
      </div>

      {/* Profile Section */}
      <Card>
        <div className="flex items-center gap-2 mb-6">
          <User className="w-5 h-5 text-mandarin" />
          <h2 className="font-bold text-[var(--text-primary)]">Informations personnelles</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
              Nom complet
            </label>
            <input
              type="text"
              value={profile.full_name}
              onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
              className="w-full px-4 py-3 bg-[var(--surface)] border border-[var(--card-border)] rounded-xl text-[var(--text-primary)] focus:border-mandarin focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
              Email
            </label>
            <input
              type="email"
              value={user?.email || ''}
              disabled
              className="w-full px-4 py-3 bg-[var(--surface)] border border-[var(--card-border)] rounded-xl text-[var(--text-muted)] cursor-not-allowed"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
              Telephone
            </label>
            <input
              type="tel"
              value={profile.phone}
              onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
              placeholder="+241 XX XX XX XX"
              className="w-full px-4 py-3 bg-[var(--surface)] border border-[var(--card-border)] rounded-xl text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-mandarin focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
              WhatsApp
            </label>
            <input
              type="tel"
              value={profile.whatsapp_number}
              onChange={(e) => setProfile({ ...profile, whatsapp_number: e.target.value })}
              placeholder="+241 XX XX XX XX"
              className="w-full px-4 py-3 bg-[var(--surface)] border border-[var(--card-border)] rounded-xl text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-mandarin focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
              Pays
            </label>
            <select
              value={profile.country}
              onChange={(e) => setProfile({ ...profile, country: e.target.value })}
              className="w-full px-4 py-3 bg-[var(--surface)] border border-[var(--card-border)] rounded-xl text-[var(--text-primary)] focus:border-mandarin focus:outline-none"
            >
              <option value="Gabon">Gabon</option>
              <option value="Cameroun">Cameroun</option>
              <option value="Congo">Congo</option>
              <option value="Cote d'Ivoire">Cote d'Ivoire</option>
              <option value="Senegal">Senegal</option>
              <option value="Autre">Autre</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
              Ville
            </label>
            <input
              type="text"
              value={profile.city}
              onChange={(e) => setProfile({ ...profile, city: e.target.value })}
              placeholder="Libreville"
              className="w-full px-4 py-3 bg-[var(--surface)] border border-[var(--card-border)] rounded-xl text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-mandarin focus:outline-none"
            />
          </div>
        </div>
      </Card>

      {/* Notifications Section */}
      <Card>
        <div className="flex items-center gap-2 mb-6">
          <Bell className="w-5 h-5 text-mandarin" />
          <h2 className="font-bold text-[var(--text-primary)]">Notifications</h2>
        </div>
        <div className="space-y-4">
          <NotificationToggle
            label="Notifications par email"
            description="Recevoir des mises a jour par email"
            checked={notifications.email_notifications}
            onChange={(checked) => setNotifications({ ...notifications, email_notifications: checked })}
          />
          <NotificationToggle
            label="Notifications WhatsApp"
            description="Recevoir des mises a jour par WhatsApp"
            checked={notifications.whatsapp_notifications}
            onChange={(checked) => setNotifications({ ...notifications, whatsapp_notifications: checked })}
          />
          <NotificationToggle
            label="Mises a jour des devis"
            description="Etre notifie quand un devis est mis a jour"
            checked={notifications.quote_updates}
            onChange={(checked) => setNotifications({ ...notifications, quote_updates: checked })}
          />
          <NotificationToggle
            label="Suivi des commandes"
            description="Recevoir les mises a jour de livraison"
            checked={notifications.order_updates}
            onChange={(checked) => setNotifications({ ...notifications, order_updates: checked })}
          />
          <NotificationToggle
            label="Nouveaux vehicules"
            description="Etre informe des nouveaux vehicules disponibles"
            checked={notifications.new_vehicles}
            onChange={(checked) => setNotifications({ ...notifications, new_vehicles: checked })}
          />
        </div>
      </Card>

      {/* Language Section */}
      <Card>
        <div className="flex items-center gap-2 mb-6">
          <Globe className="w-5 h-5 text-mandarin" />
          <h2 className="font-bold text-[var(--text-primary)]">Langue</h2>
        </div>
        <div>
          <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
            Langue preferee
          </label>
          <select
            value={profile.preferred_language}
            onChange={(e) => setProfile({ ...profile, preferred_language: e.target.value })}
            className="w-full max-w-xs px-4 py-3 bg-[var(--surface)] border border-[var(--card-border)] rounded-xl text-[var(--text-primary)] focus:border-mandarin focus:outline-none"
          >
            <option value="fr">Francais</option>
            <option value="en">English</option>
          </select>
        </div>
      </Card>

      {/* Danger Zone */}
      <Card className="border-red-500/20">
        <div className="flex items-center gap-2 mb-6">
          <Shield className="w-5 h-5 text-red-500" />
          <h2 className="font-bold text-[var(--text-primary)]">Zone de danger</h2>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="font-medium text-[var(--text-primary)]">Deconnexion</p>
            <p className="text-sm text-[var(--text-muted)]">
              Se deconnecter de votre compte sur cet appareil
            </p>
          </div>
          <Button
            variant="outline"
            onClick={handleSignOut}
            leftIcon={<LogOut className="w-4 h-4" />}
            className="border-red-500/50 text-red-500 hover:bg-red-500/10"
          >
            Se deconnecter
          </Button>
        </div>
      </Card>
    </div>
  );
}

function NotificationToggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-[var(--text-primary)]">{label}</p>
        <p className="text-xs text-[var(--text-muted)]">{description}</p>
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={`relative w-12 h-6 rounded-full transition-colors ${
          checked ? 'bg-mandarin' : 'bg-[var(--surface)]'
        }`}
      >
        <span
          className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
            checked ? 'left-7' : 'left-1'
          }`}
        />
      </button>
    </div>
  );
}

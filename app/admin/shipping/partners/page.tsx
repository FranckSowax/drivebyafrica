'use client';

import { useState, useEffect } from 'react';
import { Plus, Copy, Loader2, Trash2, CheckCircle, Users, Link2, ToggleLeft, ToggleRight } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { authFetch } from '@/lib/supabase/auth-helpers';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Partner {
  id: string;
  token: string;
  company_name: string;
  contact_person: string;
  email: string;
  phone: string;
  country: string;
  is_active: boolean;
  created_at: string;
  last_quote_at: string | null;
}

export default function AdminPartnersPage() {
  const toast = useToast();
  const [partners, setPartners] = useState<Partner[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);

  // Create form state
  const [form, setForm] = useState({
    company_name: '',
    contact_person: '',
    email: '',
    phone: '',
    country: '',
  });

  const fetchPartners = async () => {
    try {
      const res = await authFetch('/api/admin/shipping/partners');
      const data = await res.json();
      setPartners(data.partners || []);
    } catch (error) {
      console.error('Error fetching partners:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPartners();
  }, []);

  const getShareUrl = (token: string) => {
    return `${window.location.origin}/partner/shipping/${token}`;
  };

  const copyLink = (token: string) => {
    navigator.clipboard.writeText(getShareUrl(token));
    toast.success('Lien copié !');
  };

  const handleCreate = async () => {
    if (!form.company_name || !form.contact_person || !form.email || !form.phone) {
      toast.error('Remplissez tous les champs obligatoires');
      return;
    }
    setCreating(true);
    try {
      const res = await authFetch('/api/admin/shipping/partners', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      toast.success('Partenaire créé !');
      copyLink(data.partner.token);
      setShowCreateModal(false);
      setForm({ company_name: '', contact_person: '', email: '', phone: '', country: '' });
      fetchPartners();
    } catch {
      toast.error('Erreur lors de la création');
    } finally {
      setCreating(false);
    }
  };

  const toggleActive = async (partner: Partner) => {
    try {
      await authFetch('/api/admin/shipping/partners', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: partner.id, is_active: !partner.is_active }),
      });
      setPartners((prev) =>
        prev.map((p) => (p.id === partner.id ? { ...p, is_active: !p.is_active } : p))
      );
      toast.success(partner.is_active ? 'Partenaire désactivé' : 'Partenaire activé');
    } catch {
      toast.error('Erreur');
    }
  };

  const deletePartner = async (id: string) => {
    try {
      await authFetch(`/api/admin/shipping/partners?id=${id}`, { method: 'DELETE' });
      setPartners((prev) => prev.filter((p) => p.id !== id));
      toast.success('Partenaire supprimé');
    } catch {
      toast.error('Erreur');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--background)] py-8">
        <div className="container mx-auto px-4 flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-mandarin" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--background)] py-8">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-[var(--text-primary)]">
              <Users className="inline-block w-8 h-8 text-mandarin mr-2 -mt-1" />
              <span className="text-mandarin">Partenaires</span> Transport
            </h1>
            <p className="text-[var(--text-muted)] mt-1">
              Gérez les transitaires et partagez les liens de devis
            </p>
          </div>
          <Button variant="primary" onClick={() => setShowCreateModal(true)} leftIcon={<Plus className="w-4 h-4" />}>
            Ajouter un partenaire
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <p className="text-sm text-[var(--text-muted)]">Total partenaires</p>
            <p className="text-2xl font-bold text-[var(--text-primary)]">{partners.length}</p>
          </Card>
          <Card>
            <p className="text-sm text-[var(--text-muted)]">Actifs</p>
            <p className="text-2xl font-bold text-jewel">{partners.filter((p) => p.is_active).length}</p>
          </Card>
          <Card>
            <p className="text-sm text-[var(--text-muted)]">Devis reçus</p>
            <p className="text-2xl font-bold text-mandarin">
              {partners.filter((p) => p.last_quote_at).length}
            </p>
          </Card>
        </div>

        {/* Partners Table */}
        <Card>
          {partners.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-[var(--text-muted)] mx-auto mb-4" />
              <p className="text-[var(--text-muted)]">Aucun partenaire pour le moment</p>
              <Button
                variant="primary"
                className="mt-4"
                onClick={() => setShowCreateModal(true)}
                leftIcon={<Plus className="w-4 h-4" />}
              >
                Créer le premier partenaire
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[var(--card-border)]">
                    <th className="text-left py-3 px-4 text-sm font-medium text-[var(--text-muted)]">Société</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-[var(--text-muted)]">Contact</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-[var(--text-muted)]">Pays</th>
                    <th className="text-center py-3 px-4 text-sm font-medium text-[var(--text-muted)]">Dernier devis</th>
                    <th className="text-center py-3 px-4 text-sm font-medium text-[var(--text-muted)]">Statut</th>
                    <th className="text-center py-3 px-4 text-sm font-medium text-[var(--text-muted)]">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {partners.map((p) => (
                    <tr key={p.id} className="border-b border-[var(--card-border)]/50 hover:bg-[var(--surface)]/50">
                      <td className="py-4 px-4">
                        <p className="font-medium text-[var(--text-primary)]">{p.company_name}</p>
                        <p className="text-sm text-[var(--text-muted)]">{p.email}</p>
                      </td>
                      <td className="py-4 px-4">
                        <p className="text-[var(--text-primary)]">{p.contact_person}</p>
                        <p className="text-sm text-[var(--text-muted)]">{p.phone}</p>
                      </td>
                      <td className="py-4 px-4 text-[var(--text-primary)]">{p.country}</td>
                      <td className="py-4 px-4 text-center">
                        {p.last_quote_at ? (
                          <span className="text-sm text-jewel">
                            {formatDistanceToNow(new Date(p.last_quote_at), { addSuffix: true, locale: fr })}
                          </span>
                        ) : (
                          <span className="text-sm text-[var(--text-muted)]">—</span>
                        )}
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center justify-center">
                          <button onClick={() => toggleActive(p)}>
                            {p.is_active ? (
                              <ToggleRight className="w-6 h-6 text-jewel" />
                            ) : (
                              <ToggleLeft className="w-6 h-6 text-[var(--text-muted)]" />
                            )}
                          </button>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => copyLink(p.token)}
                            className="p-2 rounded-lg hover:bg-[var(--surface)] transition-colors text-mandarin"
                            title="Copier le lien"
                          >
                            <Link2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => deletePartner(p.id)}
                            className="p-2 rounded-lg hover:bg-red-500/10 transition-colors text-red-500"
                            title="Supprimer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowCreateModal(false)} />
          <div className="relative bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl p-6 w-full max-w-lg shadow-xl">
            <h2 className="text-xl font-bold text-[var(--text-primary)] mb-4">
              Nouveau partenaire
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">
                  Nom de la société *
                </label>
                <input
                  type="text"
                  value={form.company_name}
                  onChange={(e) => setForm((f) => ({ ...f, company_name: e.target.value }))}
                  className="w-full px-4 py-3 bg-[var(--surface)] border border-[var(--card-border)] rounded-xl text-[var(--text-primary)] focus:border-mandarin focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">
                  Personne de contact *
                </label>
                <input
                  type="text"
                  value={form.contact_person}
                  onChange={(e) => setForm((f) => ({ ...f, contact_person: e.target.value }))}
                  className="w-full px-4 py-3 bg-[var(--surface)] border border-[var(--card-border)] rounded-xl text-[var(--text-primary)] focus:border-mandarin focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">Email *</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                    className="w-full px-4 py-3 bg-[var(--surface)] border border-[var(--card-border)] rounded-xl text-[var(--text-primary)] focus:border-mandarin focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">Téléphone *</label>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                    className="w-full px-4 py-3 bg-[var(--surface)] border border-[var(--card-border)] rounded-xl text-[var(--text-primary)] focus:border-mandarin focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">Pays</label>
                <input
                  type="text"
                  value={form.country}
                  onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))}
                  className="w-full px-4 py-3 bg-[var(--surface)] border border-[var(--card-border)] rounded-xl text-[var(--text-primary)] focus:border-mandarin focus:outline-none"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <Button variant="outline" onClick={() => setShowCreateModal(false)}>
                Annuler
              </Button>
              <Button
                variant="primary"
                onClick={handleCreate}
                disabled={creating}
                leftIcon={creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              >
                {creating ? 'Création...' : 'Créer & copier le lien'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

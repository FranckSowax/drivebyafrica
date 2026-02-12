'use client';

import { useState, useEffect, useMemo } from 'react';
import { Plus, Copy, Loader2, Trash2, CheckCircle, Users, Link2, ToggleLeft, ToggleRight, ArrowLeft, Search, MapPin, Pencil, X, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
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
  covered_countries: string[];
  is_active: boolean;
  created_at: string;
  last_quote_at: string | null;
}

// Destination countries grouped by region (matching shipping_routes)
const DESTINATION_COUNTRIES: { region: string; countries: { name: string; flag: string }[] }[] = [
  {
    region: 'Afrique de l\'Ouest',
    countries: [
      { name: 'Sénégal', flag: '🇸🇳' },
      { name: 'Côte d\'Ivoire', flag: '🇨🇮' },
      { name: 'Ghana', flag: '🇬🇭' },
      { name: 'Nigeria', flag: '🇳🇬' },
      { name: 'Togo', flag: '🇹🇬' },
      { name: 'Bénin', flag: '🇧🇯' },
      { name: 'Guinée', flag: '🇬🇳' },
      { name: 'Sierra Leone', flag: '🇸🇱' },
      { name: 'Liberia', flag: '🇱🇷' },
      { name: 'Gambie', flag: '🇬🇲' },
      { name: 'Guinée-Bissau', flag: '🇬🇼' },
      { name: 'Mauritanie', flag: '🇲🇷' },
      { name: 'Cap-Vert', flag: '🇨🇻' },
    ],
  },
  {
    region: 'Afrique Centrale',
    countries: [
      { name: 'Cameroun', flag: '🇨🇲' },
      { name: 'Gabon', flag: '🇬🇦' },
      { name: 'Congo', flag: '🇨🇬' },
      { name: 'RD Congo', flag: '🇨🇩' },
      { name: 'Angola', flag: '🇦🇴' },
      { name: 'Guinée équatoriale', flag: '🇬🇶' },
      { name: 'São Tomé-et-Príncipe', flag: '🇸🇹' },
    ],
  },
  {
    region: 'Afrique de l\'Est',
    countries: [
      { name: 'Kenya', flag: '🇰🇪' },
      { name: 'Tanzanie', flag: '🇹🇿' },
      { name: 'Mozambique', flag: '🇲🇿' },
      { name: 'Djibouti', flag: '🇩🇯' },
      { name: 'Soudan', flag: '🇸🇩' },
      { name: 'Érythrée', flag: '🇪🇷' },
      { name: 'Somalie', flag: '🇸🇴' },
      { name: 'Maurice', flag: '🇲🇺' },
      { name: 'Madagascar', flag: '🇲🇬' },
      { name: 'Comores', flag: '🇰🇲' },
      { name: 'Seychelles', flag: '🇸🇨' },
    ],
  },
  {
    region: 'Afrique Australe',
    countries: [
      { name: 'Afrique du Sud', flag: '🇿🇦' },
      { name: 'Namibie', flag: '🇳🇦' },
      { name: 'Botswana', flag: '🇧🇼' },
      { name: 'Zimbabwe', flag: '🇿🇼' },
      { name: 'Zambie', flag: '🇿🇲' },
      { name: 'Malawi', flag: '🇲🇼' },
      { name: 'Eswatini', flag: '🇸🇿' },
      { name: 'Lesotho', flag: '🇱🇸' },
    ],
  },
  {
    region: 'Afrique du Nord',
    countries: [
      { name: 'Égypte', flag: '🇪🇬' },
      { name: 'Libye', flag: '🇱🇾' },
      { name: 'Tunisie', flag: '🇹🇳' },
      { name: 'Algérie', flag: '🇩🇿' },
      { name: 'Maroc', flag: '🇲🇦' },
    ],
  },
];

export default function AdminPartnersPage() {
  const toast = useToast();
  const [partners, setPartners] = useState<Partner[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [saving, setSaving] = useState(false);
  const [editingPartnerId, setEditingPartnerId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Partner | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Form state (shared between create and edit)
  const [form, setForm] = useState({
    company_name: '',
    contact_person: '',
    email: '',
    phone: '',
    country: '',
  });
  const [coveredCountries, setCoveredCountries] = useState<string[]>([]);
  const [countrySearch, setCountrySearch] = useState('');

  const resetForm = () => {
    setForm({ company_name: '', contact_person: '', email: '', phone: '', country: '' });
    setCoveredCountries([]);
    setCountrySearch('');
    setEditingPartnerId(null);
  };

  const openCreateModal = () => {
    resetForm();
    setModalMode('create');
    setShowModal(true);
  };

  const openEditModal = (partner: Partner) => {
    setForm({
      company_name: partner.company_name,
      contact_person: partner.contact_person,
      email: partner.email,
      phone: partner.phone,
      country: partner.country,
    });
    setCoveredCountries(partner.covered_countries || []);
    setCountrySearch('');
    setEditingPartnerId(partner.id);
    setModalMode('edit');
    setShowModal(true);
  };

  const fetchPartners = async () => {
    try {
      const res = await fetch('/api/admin/shipping/partners');
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

  const handleSave = async () => {
    if (!form.company_name || !form.contact_person || !form.email || !form.phone) {
      toast.error('Remplissez tous les champs obligatoires');
      return;
    }
    setSaving(true);
    try {
      if (modalMode === 'create') {
        const res = await fetch('/api/admin/shipping/partners', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...form, covered_countries: coveredCountries }),
        });
        if (!res.ok) throw new Error('Failed');
        const data = await res.json();
        toast.success('Partenaire créé !');
        copyLink(data.partner.token);
      } else {
        const res = await fetch('/api/admin/shipping/partners', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editingPartnerId, ...form, covered_countries: coveredCountries }),
        });
        if (!res.ok) throw new Error('Failed');
        toast.success('Partenaire mis à jour !');
      }
      setShowModal(false);
      resetForm();
      fetchPartners();
    } catch {
      toast.error(modalMode === 'create' ? 'Erreur lors de la création' : 'Erreur lors de la mise à jour');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (partner: Partner) => {
    try {
      await fetch('/api/admin/shipping/partners', {
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

  const confirmDelete = async () => {
    if (!deleteConfirm) return;
    setDeleting(true);
    try {
      await fetch(`/api/admin/shipping/partners?id=${deleteConfirm.id}`, { method: 'DELETE' });
      setPartners((prev) => prev.filter((p) => p.id !== deleteConfirm.id));
      toast.success('Partenaire supprimé');
      setDeleteConfirm(null);
    } catch {
      toast.error('Erreur lors de la suppression');
    } finally {
      setDeleting(false);
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
            <Link
              href="/admin/shipping"
              className="inline-flex items-center gap-1.5 text-sm text-[var(--text-muted)] hover:text-mandarin transition-colors mb-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Retour au transport
            </Link>
            <h1 className="text-3xl font-bold text-[var(--text-primary)]">
              <Users className="inline-block w-8 h-8 text-mandarin mr-2 -mt-1" />
              <span className="text-mandarin">Partenaires</span> Transport
            </h1>
            <p className="text-[var(--text-muted)] mt-1">
              Gérez les transitaires et partagez les liens de devis
            </p>
          </div>
          <Button variant="primary" onClick={openCreateModal} leftIcon={<Plus className="w-4 h-4" />}>
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
                onClick={openCreateModal}
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
                      <td className="py-4 px-4">
                        <p className="text-[var(--text-primary)]">{p.country}</p>
                        {p.covered_countries && p.covered_countries.length > 0 && (
                          <p className="text-xs text-[var(--text-muted)]">
                            {p.covered_countries.length} pays desservis
                          </p>
                        )}
                      </td>
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
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => copyLink(p.token)}
                            className="p-2 rounded-lg hover:bg-[var(--surface)] transition-colors text-mandarin"
                            title="Copier le lien"
                          >
                            <Link2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => openEditModal(p)}
                            className="p-2 rounded-lg hover:bg-[var(--surface)] transition-colors text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                            title="Modifier"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(p)}
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

      {/* Create / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowModal(false)} />
          <div className="relative bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl p-6 w-full max-w-2xl shadow-xl max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 p-1 rounded-lg hover:bg-[var(--surface)] text-[var(--text-muted)]"
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-bold text-[var(--text-primary)] mb-4">
              {modalMode === 'create' ? 'Nouveau partenaire' : 'Modifier le partenaire'}
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
                <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">Pays du partenaire</label>
                <input
                  type="text"
                  value={form.country}
                  onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))}
                  className="w-full px-4 py-3 bg-[var(--surface)] border border-[var(--card-border)] rounded-xl text-[var(--text-primary)] focus:border-mandarin focus:outline-none"
                />
              </div>

              {/* Covered countries multi-select */}
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-[var(--text-muted)] mb-2">
                  <MapPin className="w-4 h-4" />
                  Pays desservis ({coveredCountries.length} sélectionnés)
                </label>
                <p className="text-xs text-[var(--text-muted)] mb-3">
                  Sélectionnez les pays où ce partenaire a des lignes de transport. Ces destinations seront actives par défaut dans le formulaire du partenaire.
                </p>

                {/* Search + Select All / Deselect All */}
                <div className="flex items-center gap-2 mb-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                    <input
                      type="text"
                      placeholder="Rechercher un pays..."
                      value={countrySearch}
                      onChange={(e) => setCountrySearch(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 bg-[var(--surface)] border border-[var(--card-border)] rounded-lg text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-mandarin focus:outline-none"
                    />
                  </div>
                  <button
                    onClick={() => {
                      const allCountries = DESTINATION_COUNTRIES.flatMap((r) => r.countries.map((c) => c.name));
                      setCoveredCountries(coveredCountries.length === allCountries.length ? [] : allCountries);
                    }}
                    className="text-xs px-3 py-2 rounded-lg bg-[var(--surface)] text-mandarin hover:bg-mandarin/10 transition-colors whitespace-nowrap"
                  >
                    {coveredCountries.length === DESTINATION_COUNTRIES.flatMap((r) => r.countries).length
                      ? 'Tout désélectionner'
                      : 'Tout sélectionner'}
                  </button>
                </div>

                {/* Selected countries chips */}
                {coveredCountries.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {coveredCountries.map((name) => {
                      const country = DESTINATION_COUNTRIES.flatMap((r) => r.countries).find((c) => c.name === name);
                      return (
                        <span
                          key={name}
                          className="inline-flex items-center gap-1 px-2 py-1 bg-mandarin/10 text-mandarin text-xs rounded-lg"
                        >
                          {country?.flag} {name}
                          <button
                            onClick={() => setCoveredCountries((prev) => prev.filter((c) => c !== name))}
                            className="ml-0.5 hover:text-red-500"
                          >
                            ×
                          </button>
                        </span>
                      );
                    })}
                  </div>
                )}

                {/* Country list by region */}
                <div className="max-h-60 overflow-y-auto border border-[var(--card-border)] rounded-xl p-3 space-y-4">
                  {DESTINATION_COUNTRIES.map((region) => {
                    const filteredCountries = countrySearch
                      ? region.countries.filter((c) =>
                          c.name.toLowerCase().includes(countrySearch.toLowerCase())
                        )
                      : region.countries;

                    if (filteredCountries.length === 0) return null;

                    const regionCountryNames = region.countries.map((c) => c.name);
                    const allSelected = regionCountryNames.every((n) => coveredCountries.includes(n));

                    return (
                      <div key={region.region}>
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                            {region.region}
                          </h4>
                          <button
                            onClick={() => {
                              if (allSelected) {
                                setCoveredCountries((prev) => prev.filter((c) => !regionCountryNames.includes(c)));
                              } else {
                                setCoveredCountries((prev) => [...new Set([...prev, ...regionCountryNames])]);
                              }
                            }}
                            className="text-xs text-mandarin hover:underline"
                          >
                            {allSelected ? 'Désélectionner' : 'Sélectionner'}
                          </button>
                        </div>
                        <div className="grid grid-cols-2 gap-1">
                          {filteredCountries.map((c) => {
                            const isSelected = coveredCountries.includes(c.name);
                            return (
                              <label
                                key={c.name}
                                className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors text-sm ${
                                  isSelected
                                    ? 'bg-mandarin/10 text-mandarin'
                                    : 'hover:bg-[var(--surface)] text-[var(--text-primary)]'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => {
                                    setCoveredCountries((prev) =>
                                      isSelected ? prev.filter((n) => n !== c.name) : [...prev, c.name]
                                    );
                                  }}
                                  className="accent-mandarin rounded"
                                />
                                <span>{c.flag}</span>
                                <span className="truncate">{c.name}</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <Button variant="outline" onClick={() => setShowModal(false)}>
                Annuler
              </Button>
              <Button
                variant="primary"
                onClick={handleSave}
                disabled={saving}
                leftIcon={saving ? <Loader2 className="w-4 h-4 animate-spin" /> : modalMode === 'create' ? <Plus className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
              >
                {saving
                  ? (modalMode === 'create' ? 'Création...' : 'Enregistrement...')
                  : (modalMode === 'create' ? 'Créer & copier le lien' : 'Enregistrer')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setDeleteConfirm(null)} />
          <div className="relative bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl p-6 w-full max-w-md shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-500/10 rounded-xl">
                <AlertTriangle className="w-6 h-6 text-red-500" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-[var(--text-primary)]">Supprimer le partenaire</h2>
                <p className="text-sm text-[var(--text-muted)]">{deleteConfirm.company_name}</p>
              </div>
            </div>
            <p className="text-[var(--text-muted)] mb-6">
              Cette action désactivera le partenaire et son lien de devis ne fonctionnera plus. Les devis existants seront conservés.
            </p>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
                Annuler
              </Button>
              <Button
                variant="primary"
                onClick={confirmDelete}
                disabled={deleting}
                className="!bg-red-500 hover:!bg-red-600"
                leftIcon={deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              >
                {deleting ? 'Suppression...' : 'Supprimer'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

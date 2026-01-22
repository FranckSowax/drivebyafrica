'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  Phone,
  Mail,
  MapPin,
  Star,
  CheckCircle,
  XCircle,
  MessageCircle,
  Globe,
  Filter,
  RefreshCw,
} from 'lucide-react';

interface Transitaire {
  id: string;
  name: string;
  company_name: string | null;
  country: string;
  port: string | null;
  phone: string;
  whatsapp: string | null;
  email: string | null;
  address: string | null;
  description: string | null;
  specialties: string[] | null;
  languages: string[] | null;
  is_active: boolean;
  is_verified: boolean;
  average_rating: number;
  total_reviews: number;
  created_at: string;
  updated_at: string;
}

// Complete list of African countries and ports (synced with shipping routes)
const SHIPPING_DESTINATIONS = [
  // Afrique de l'Ouest
  { country: 'Sénégal', port: 'Dakar', flag: '🇸🇳' },
  { country: "Côte d'Ivoire", port: 'Abidjan', flag: '🇨🇮' },
  { country: 'Ghana', port: 'Tema', flag: '🇬🇭' },
  { country: 'Nigeria', port: 'Lagos', flag: '🇳🇬' },
  { country: 'Togo', port: 'Lomé', flag: '🇹🇬' },
  { country: 'Bénin', port: 'Cotonou', flag: '🇧🇯' },
  { country: 'Guinée', port: 'Conakry', flag: '🇬🇳' },
  { country: 'Sierra Leone', port: 'Freetown', flag: '🇸🇱' },
  { country: 'Liberia', port: 'Monrovia', flag: '🇱🇷' },
  { country: 'Gambie', port: 'Banjul', flag: '🇬🇲' },
  { country: 'Guinée-Bissau', port: 'Bissau', flag: '🇬🇼' },
  { country: 'Mauritanie', port: 'Nouakchott', flag: '🇲🇷' },
  { country: 'Cap-Vert', port: 'Praia', flag: '🇨🇻' },
  { country: 'Niger', port: 'Niamey', flag: '🇳🇪' },
  { country: 'Burkina Faso', port: 'Ouagadougou', flag: '🇧🇫' },
  { country: 'Mali', port: 'Bamako', flag: '🇲🇱' },
  // Afrique Centrale
  { country: 'Cameroun', port: 'Douala', flag: '🇨🇲' },
  { country: 'Gabon', port: 'Libreville', flag: '🇬🇦' },
  { country: 'Gabon', port: 'Port-Gentil', flag: '🇬🇦' },
  { country: 'Congo', port: 'Pointe-Noire', flag: '🇨🇬' },
  { country: 'Congo', port: 'Brazzaville', flag: '🇨🇬' },
  { country: 'RD Congo', port: 'Matadi', flag: '🇨🇩' },
  { country: 'RD Congo', port: 'Kinshasa', flag: '🇨🇩' },
  { country: 'RD Congo', port: 'Lubumbashi', flag: '🇨🇩' },
  { country: 'Angola', port: 'Luanda', flag: '🇦🇴' },
  { country: 'Guinée Équatoriale', port: 'Malabo', flag: '🇬🇶' },
  { country: 'São Tomé-et-Príncipe', port: 'São Tomé', flag: '🇸🇹' },
  { country: 'Centrafrique', port: 'Bangui', flag: '🇨🇫' },
  { country: 'Tchad', port: "N'Djamena", flag: '🇹🇩' },
  // Afrique de l'Est
  { country: 'Kenya', port: 'Mombasa', flag: '🇰🇪' },
  { country: 'Kenya', port: 'Nairobi', flag: '🇰🇪' },
  { country: 'Tanzanie', port: 'Dar es Salaam', flag: '🇹🇿' },
  { country: 'Ouganda', port: 'Kampala', flag: '🇺🇬' },
  { country: 'Rwanda', port: 'Kigali', flag: '🇷🇼' },
  { country: 'Burundi', port: 'Bujumbura', flag: '🇧🇮' },
  { country: 'Éthiopie', port: 'Addis-Abeba', flag: '🇪🇹' },
  { country: 'Djibouti', port: 'Djibouti', flag: '🇩🇯' },
  { country: 'Érythrée', port: 'Asmara', flag: '🇪🇷' },
  { country: 'Somalie', port: 'Mogadiscio', flag: '🇸🇴' },
  { country: 'Soudan du Sud', port: 'Juba', flag: '🇸🇸' },
  // Afrique du Nord
  { country: 'Maroc', port: 'Casablanca', flag: '🇲🇦' },
  { country: 'Maroc', port: 'Tanger', flag: '🇲🇦' },
  { country: 'Algérie', port: 'Alger', flag: '🇩🇿' },
  { country: 'Tunisie', port: 'Tunis', flag: '🇹🇳' },
  { country: 'Libye', port: 'Tripoli', flag: '🇱🇾' },
  { country: 'Égypte', port: 'Alexandrie', flag: '🇪🇬' },
  { country: 'Égypte', port: 'Port-Saïd', flag: '🇪🇬' },
  { country: 'Soudan', port: 'Port-Soudan', flag: '🇸🇩' },
  // Afrique Australe
  { country: 'Afrique du Sud', port: 'Durban', flag: '🇿🇦' },
  { country: 'Afrique du Sud', port: 'Le Cap', flag: '🇿🇦' },
  { country: 'Mozambique', port: 'Maputo', flag: '🇲🇿' },
  { country: 'Mozambique', port: 'Beira', flag: '🇲🇿' },
  { country: 'Zambie', port: 'Lusaka', flag: '🇿🇲' },
  { country: 'Zimbabwe', port: 'Harare', flag: '🇿🇼' },
  { country: 'Botswana', port: 'Gaborone', flag: '🇧🇼' },
  { country: 'Namibie', port: 'Windhoek', flag: '🇳🇦' },
  { country: 'Namibie', port: 'Walvis Bay', flag: '🇳🇦' },
  { country: 'Malawi', port: 'Lilongwe', flag: '🇲🇼' },
  { country: 'Eswatini', port: 'Mbabane', flag: '🇸🇿' },
  { country: 'Lesotho', port: 'Maseru', flag: '🇱🇸' },
  // Îles de l'Océan Indien
  { country: 'Madagascar', port: 'Antananarivo', flag: '🇲🇬' },
  { country: 'Madagascar', port: 'Toamasina', flag: '🇲🇬' },
  { country: 'Maurice', port: 'Port-Louis', flag: '🇲🇺' },
  { country: 'Seychelles', port: 'Victoria', flag: '🇸🇨' },
  { country: 'Comores', port: 'Moroni', flag: '🇰🇲' },
];

// Extract unique countries with flags
const COUNTRIES = [...new Map(SHIPPING_DESTINATIONS.map(d => [d.country, { name: d.country, flag: d.flag }])).values()];

// Group ports by country
const PORTS: Record<string, string[]> = SHIPPING_DESTINATIONS.reduce((acc, d) => {
  if (!acc[d.country]) acc[d.country] = [];
  if (!acc[d.country].includes(d.port)) acc[d.country].push(d.port);
  return acc;
}, {} as Record<string, string[]>);

const SPECIALTIES = [
  { value: 'vehicles', label: 'Véhicules' },
  { value: 'heavy_machinery', label: 'Engins lourds' },
  { value: 'containers', label: 'Conteneurs' },
  { value: 'general_cargo', label: 'Cargo général' },
];

const LANGUAGES = [
  { value: 'french', label: 'Français' },
  { value: 'english', label: 'Anglais' },
  { value: 'chinese', label: 'Chinois' },
  { value: 'arabic', label: 'Arabe' },
  { value: 'spanish', label: 'Espagnol' },
];

export default function TransitairesPage() {
  const [transitaires, setTransitaires] = useState<Transitaire[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCountry, setFilterCountry] = useState('');
  const [filterActive, setFilterActive] = useState<boolean | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTransitaire, setEditingTransitaire] = useState<Transitaire | null>(null);
  const toast = useToast();

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    company_name: '',
    country: '',
    port: '',
    phone: '',
    whatsapp: '',
    email: '',
    address: '',
    description: '',
    specialties: [] as string[],
    languages: ['french'] as string[],
    is_active: true,
    is_verified: false,
  });

  useEffect(() => {
    fetchTransitaires();
  }, [filterCountry, filterActive]);

  const fetchTransitaires = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterCountry) params.append('country', filterCountry);
      if (filterActive !== null) params.append('active', String(filterActive));

      const response = await fetch(`/api/admin/transitaires?${params}`);
      const data = await response.json();

      if (data.transitaires) {
        setTransitaires(data.transitaires);
      }
    } catch (error) {
      console.error('Error fetching transitaires:', error);
      toast.error('Erreur lors du chargement des transitaires');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const url = '/api/admin/transitaires';
      const method = editingTransitaire ? 'PUT' : 'POST';
      const body = editingTransitaire
        ? { id: editingTransitaire.id, ...formData }
        : formData;

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de la sauvegarde');
      }

      toast.success(editingTransitaire ? 'Transitaire mis à jour' : 'Transitaire créé');
      setIsModalOpen(false);
      resetForm();
      fetchTransitaires();
    } catch (error) {
      console.error('Error saving transitaire:', error);
      toast.error(error instanceof Error ? error.message : 'Erreur lors de la sauvegarde');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Voulez-vous désactiver ce transitaire ?')) return;

    try {
      const response = await fetch(`/api/admin/transitaires?id=${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la suppression');
      }

      toast.success('Transitaire désactivé');
      fetchTransitaires();
    } catch (error) {
      console.error('Error deleting transitaire:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  const handleEdit = (transitaire: Transitaire) => {
    setEditingTransitaire(transitaire);
    setFormData({
      name: transitaire.name,
      company_name: transitaire.company_name || '',
      country: transitaire.country,
      port: transitaire.port || '',
      phone: transitaire.phone,
      whatsapp: transitaire.whatsapp || '',
      email: transitaire.email || '',
      address: transitaire.address || '',
      description: transitaire.description || '',
      specialties: transitaire.specialties || [],
      languages: transitaire.languages || ['french'],
      is_active: transitaire.is_active,
      is_verified: transitaire.is_verified,
    });
    setIsModalOpen(true);
  };

  const resetForm = () => {
    setEditingTransitaire(null);
    setFormData({
      name: '',
      company_name: '',
      country: '',
      port: '',
      phone: '',
      whatsapp: '',
      email: '',
      address: '',
      description: '',
      specialties: [],
      languages: ['french'],
      is_active: true,
      is_verified: false,
    });
  };

  const toggleSpecialty = (specialty: string) => {
    setFormData(prev => ({
      ...prev,
      specialties: prev.specialties.includes(specialty)
        ? prev.specialties.filter(s => s !== specialty)
        : [...prev.specialties, specialty],
    }));
  };

  const toggleLanguage = (language: string) => {
    setFormData(prev => ({
      ...prev,
      languages: prev.languages.includes(language)
        ? prev.languages.filter(l => l !== language)
        : [...prev.languages, language],
    }));
  };

  const filteredTransitaires = transitaires.filter(t => {
    const matchesSearch =
      t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.company_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.phone.includes(searchTerm);
    return matchesSearch;
  });

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map(star => (
          <Star
            key={star}
            className={`w-4 h-4 ${
              star <= rating
                ? 'fill-yellow-400 text-yellow-400'
                : 'text-gray-300'
            }`}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-white">Transitaires</h1>
            <p className="text-gray-400 mt-1">
              Gérez les transitaires recommandés pour le dédouanement des véhicules
            </p>
          </div>
          <Button
            onClick={() => {
              resetForm();
              setIsModalOpen(true);
            }}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Ajouter un transitaire
          </Button>
        </div>

        {/* Filters */}
        <Card className="p-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Rechercher par nom, société ou téléphone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <select
              value={filterCountry}
              onChange={(e) => setFilterCountry(e.target.value)}
              className="bg-nobel/10 border border-nobel/20 rounded-lg px-4 py-2 text-white"
            >
              <option value="">Tous les pays</option>
              {COUNTRIES.map(c => (
                <option key={c.name} value={c.name}>{c.flag} {c.name}</option>
              ))}
            </select>

            <select
              value={filterActive === null ? '' : String(filterActive)}
              onChange={(e) => setFilterActive(e.target.value === '' ? null : e.target.value === 'true')}
              className="bg-nobel/10 border border-nobel/20 rounded-lg px-4 py-2 text-white"
            >
              <option value="">Tous les statuts</option>
              <option value="true">Actifs</option>
              <option value="false">Inactifs</option>
            </select>

            <Button
              variant="outline"
              onClick={fetchTransitaires}
              leftIcon={<RefreshCw className="w-4 h-4" />}
            >
              Actualiser
            </Button>
          </div>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="text-gray-400 text-sm">Total</div>
            <div className="text-2xl font-bold text-white">{transitaires.length}</div>
          </Card>
          <Card className="p-4">
            <div className="text-gray-400 text-sm">Actifs</div>
            <div className="text-2xl font-bold text-green-500">
              {transitaires.filter(t => t.is_active).length}
            </div>
          </Card>
          <Card className="p-4">
            <div className="text-gray-400 text-sm">Vérifiés</div>
            <div className="text-2xl font-bold text-blue-500">
              {transitaires.filter(t => t.is_verified).length}
            </div>
          </Card>
          <Card className="p-4">
            <div className="text-gray-400 text-sm">Note moyenne</div>
            <div className="text-2xl font-bold text-yellow-500">
              {transitaires.length > 0
                ? (transitaires.reduce((sum, t) => sum + t.average_rating, 0) / transitaires.length).toFixed(1)
                : '0'}
            </div>
          </Card>
        </div>

        {/* Table */}
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-nobel/10">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Transitaire</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Localisation</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Contact</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Note</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Statut</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-400">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-nobel/10">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                      Chargement...
                    </td>
                  </tr>
                ) : filteredTransitaires.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                      Aucun transitaire trouvé
                    </td>
                  </tr>
                ) : (
                  filteredTransitaires.map(transitaire => (
                    <tr key={transitaire.id} className="hover:bg-nobel/5">
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div>
                            <div className="font-medium text-white flex items-center gap-2">
                              {transitaire.name}
                              {transitaire.is_verified && (
                                <CheckCircle className="w-4 h-4 text-blue-500" />
                              )}
                            </div>
                            {transitaire.company_name && (
                              <div className="text-sm text-gray-400">{transitaire.company_name}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2 text-gray-300">
                          <MapPin className="w-4 h-4 text-gray-500" />
                          <span>{transitaire.country}</span>
                          {transitaire.port && (
                            <span className="text-gray-500">• {transitaire.port}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-gray-300">
                            <Phone className="w-4 h-4 text-gray-500" />
                            <span>{transitaire.phone}</span>
                          </div>
                          {transitaire.whatsapp && transitaire.whatsapp !== transitaire.phone && (
                            <div className="flex items-center gap-2 text-green-400 text-sm">
                              <MessageCircle className="w-3 h-3" />
                              <span>{transitaire.whatsapp}</span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          {renderStars(transitaire.average_rating)}
                          <span className="text-gray-400 text-sm">
                            ({transitaire.total_reviews})
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                            transitaire.is_active
                              ? 'bg-green-500/20 text-green-400'
                              : 'bg-red-500/20 text-red-400'
                          }`}
                        >
                          {transitaire.is_active ? (
                            <>
                              <CheckCircle className="w-3 h-3" />
                              Actif
                            </>
                          ) : (
                            <>
                              <XCircle className="w-3 h-3" />
                              Inactif
                            </>
                          )}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(transitaire)}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(transitaire.id)}
                            className="text-red-400 hover:text-red-300"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-cod-gray border border-nobel/20 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-nobel/20">
                <h2 className="text-xl font-bold text-white">
                  {editingTransitaire ? 'Modifier le transitaire' : 'Ajouter un transitaire'}
                </h2>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-6">
                {/* Basic Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Nom *"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Nom du contact"
                    required
                  />
                  <Input
                    label="Société"
                    value={formData.company_name}
                    onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                    placeholder="Nom de la société"
                  />
                </div>

                {/* Location */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Pays *
                    </label>
                    <select
                      value={formData.country}
                      onChange={(e) => setFormData({ ...formData, country: e.target.value, port: '' })}
                      className="w-full bg-nobel/10 border border-nobel/20 rounded-lg px-4 py-2 text-white"
                      required
                    >
                      <option value="">Sélectionner un pays</option>
                      {COUNTRIES.map(c => (
                        <option key={c.name} value={c.name}>{c.flag} {c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Port
                    </label>
                    <select
                      value={formData.port}
                      onChange={(e) => setFormData({ ...formData, port: e.target.value })}
                      className="w-full bg-nobel/10 border border-nobel/20 rounded-lg px-4 py-2 text-white"
                      disabled={!formData.country}
                    >
                      <option value="">Tous les ports du pays</option>
                      {formData.country && PORTS[formData.country as keyof typeof PORTS]?.map(port => (
                        <option key={port} value={port}>{port}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Contact */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Téléphone *"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+241 00 00 00 00"
                    required
                  />
                  <Input
                    label="WhatsApp"
                    value={formData.whatsapp}
                    onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                    placeholder="Si différent du téléphone"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="email@example.com"
                  />
                  <Input
                    label="Adresse"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="Adresse du bureau"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full bg-nobel/10 border border-nobel/20 rounded-lg px-4 py-2 text-white resize-none"
                    rows={3}
                    placeholder="Brève description des services..."
                  />
                </div>

                {/* Specialties */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Spécialités
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {SPECIALTIES.map(specialty => (
                      <button
                        key={specialty.value}
                        type="button"
                        onClick={() => toggleSpecialty(specialty.value)}
                        className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                          formData.specialties.includes(specialty.value)
                            ? 'bg-mandarin text-white'
                            : 'bg-nobel/20 text-gray-400 hover:bg-nobel/30'
                        }`}
                      >
                        {specialty.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Languages */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Langues parlées
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {LANGUAGES.map(language => (
                      <button
                        key={language.value}
                        type="button"
                        onClick={() => toggleLanguage(language.value)}
                        className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                          formData.languages.includes(language.value)
                            ? 'bg-royal-blue text-white'
                            : 'bg-nobel/20 text-gray-400 hover:bg-nobel/30'
                        }`}
                      >
                        {language.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Status */}
                <div className="flex items-center gap-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.is_active}
                      onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                      className="w-4 h-4 rounded border-nobel/20 bg-nobel/10 text-mandarin focus:ring-mandarin"
                    />
                    <span className="text-gray-300">Actif</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.is_verified}
                      onChange={(e) => setFormData({ ...formData, is_verified: e.target.checked })}
                      className="w-4 h-4 rounded border-nobel/20 bg-nobel/10 text-blue-500 focus:ring-blue-500"
                    />
                    <span className="text-gray-300">Vérifié par Driveby</span>
                  </label>
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-4 border-t border-nobel/20">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsModalOpen(false);
                      resetForm();
                    }}
                  >
                    Annuler
                  </Button>
                  <Button type="submit">
                    {editingTransitaire ? 'Mettre à jour' : 'Créer'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
    </div>
  );
}

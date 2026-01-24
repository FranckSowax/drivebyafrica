'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import { Search, SlidersHorizontal, Package, ShoppingCart, MapPin, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { Pagination } from '@/components/ui/Pagination';
import type { VehicleBatch } from '@/types/vehicle-batch';

const ITEMS_PER_PAGE = 12;

const SORT_OPTIONS = [
  { value: 'newest', label: 'Plus récents' },
  { value: 'price_asc', label: 'Prix croissant' },
  { value: 'price_desc', label: 'Prix décroissant' },
  { value: 'year_desc', label: 'Année (récent)' },
  { value: 'quantity_desc', label: 'Quantité (haute)' },
];

export default function BatchesPage() {
  const router = useRouter();
  const [batches, setBatches] = useState<VehicleBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [countryFilter, setCountryFilter] = useState<'all' | 'china' | 'korea' | 'dubai'>('all');
  const [sortBy, setSortBy] = useState('newest');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [user, setUser] = useState<any>(null);
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  // Order modal state
  const [selectedBatch, setSelectedBatch] = useState<VehicleBatch | null>(null);
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [orderQuantity, setOrderQuantity] = useState('');
  const [destinationCountry, setDestinationCountry] = useState('');
  const [destinationPort, setDestinationPort] = useState('');
  const [customerNotes, setCustomerNotes] = useState('');
  const [submittingOrder, setSubmittingOrder] = useState(false);
  const [orderError, setOrderError] = useState('');

  useEffect(() => {
    checkUser();
  }, []);

  useEffect(() => {
    fetchBatches();
  }, [currentPage, countryFilter, sortBy, searchQuery]);

  const checkUser = async () => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
  };

  const fetchBatches = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: ITEMS_PER_PAGE.toString(),
        public: 'true',
      });

      const response = await fetch(`/api/admin/batches?${params}`);
      const data = await response.json();

      if (response.ok) {
        let filteredBatches = data.batches || [];

        // Apply country filter
        if (countryFilter !== 'all') {
          filteredBatches = filteredBatches.filter((b: VehicleBatch) => b.source_country === countryFilter);
        }

        // Apply search filter
        if (searchQuery) {
          const query = searchQuery.toLowerCase();
          filteredBatches = filteredBatches.filter((b: VehicleBatch) =>
            b.make.toLowerCase().includes(query) ||
            b.model.toLowerCase().includes(query) ||
            b.title.toLowerCase().includes(query)
          );
        }

        // Apply sorting
        filteredBatches.sort((a: VehicleBatch, b: VehicleBatch) => {
          switch (sortBy) {
            case 'price_asc':
              return a.price_per_unit_usd - b.price_per_unit_usd;
            case 'price_desc':
              return b.price_per_unit_usd - a.price_per_unit_usd;
            case 'year_desc':
              return b.year - a.year;
            case 'quantity_desc':
              return b.available_quantity - a.available_quantity;
            case 'newest':
            default:
              return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
          }
        });

        setBatches(filteredBatches);
        setTotalCount(filteredBatches.length);
      }
    } catch (error) {
      console.error('Error fetching batches:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOrderClick = (batch: VehicleBatch) => {
    if (!user) {
      router.push('/login');
      return;
    }

    setSelectedBatch(batch);
    setOrderQuantity(batch.minimum_order_quantity.toString());
    setDestinationCountry('');
    setDestinationPort('');
    setCustomerNotes('');
    setOrderError('');
    setIsOrderModalOpen(true);
  };

  const handleSubmitOrder = async () => {
    if (!selectedBatch) return;

    const qty = parseInt(orderQuantity);

    if (qty < selectedBatch.minimum_order_quantity) {
      setOrderError(`Quantité minimale : ${selectedBatch.minimum_order_quantity}`);
      return;
    }

    if (qty > selectedBatch.available_quantity) {
      setOrderError(`Seulement ${selectedBatch.available_quantity} unités disponibles`);
      return;
    }

    if (!destinationCountry) {
      setOrderError('Veuillez sélectionner un pays de destination');
      return;
    }

    setSubmittingOrder(true);
    setOrderError('');

    try {
      const response = await fetch('/api/admin/batches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          batchId: selectedBatch.id,
          quantityOrdered: qty,
          destinationCountry,
          destinationPort: destinationPort || undefined,
          customerNotes: customerNotes || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Échec de création de la commande');
      }

      setIsOrderModalOpen(false);
      alert('Commande soumise avec succès ! Notre équipe vous contactera sous peu.');
      fetchBatches();
    } catch (error) {
      console.error('Error submitting order:', error);
      setOrderError(error instanceof Error ? error.message : 'Échec de soumission de la commande');
    } finally {
      setSubmittingOrder(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchBatches();
  };

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    window.scrollTo({ top: 200, behavior: 'smooth' });
  };

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  return (
    <div className="min-h-screen bg-cod-gray">
      {/* Header */}
      <div className="bg-surface border-b border-nobel/20">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center gap-3 mb-2">
            <Package className="w-8 h-8 text-alto-orange" />
            <h1 className="text-3xl font-bold text-cod-gray">
              Lots de Véhicules
            </h1>
          </div>
          <p className="text-cod-gray/70">
            Importez des véhicules en gros depuis la Chine, la Corée et Dubaï
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        {/* Search and Filters */}
        <div className="mb-6 space-y-4">
          {/* Search Bar */}
          <form onSubmit={handleSearch} className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-nobel" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher par marque, modèle..."
              className="w-full pl-12 pr-4 py-3 bg-white border border-nobel/20 rounded-lg text-cod-gray placeholder-nobel focus:outline-none focus:border-alto-orange"
            />
          </form>

          {/* Filters Bar */}
          <div className="flex flex-col sm:flex-row gap-3">
            <select
              value={countryFilter}
              onChange={(e) => {
                setCountryFilter(e.target.value as typeof countryFilter);
                setCurrentPage(1);
              }}
              className="px-4 py-2.5 bg-white border border-nobel/20 rounded-lg text-cod-gray focus:outline-none focus:border-alto-orange"
            >
              <option value="all">Tous les pays</option>
              <option value="china">🇨🇳 Chine</option>
              <option value="korea">🇰🇷 Corée</option>
              <option value="dubai">🇦🇪 Dubaï</option>
            </select>

            <select
              value={sortBy}
              onChange={(e) => {
                setSortBy(e.target.value);
                setCurrentPage(1);
              }}
              className="px-4 py-2.5 bg-white border border-nobel/20 rounded-lg text-cod-gray focus:outline-none focus:border-alto-orange"
            >
              {SORT_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            <Button
              variant="outline"
              className="sm:hidden"
              onClick={() => setShowMobileFilters(!showMobileFilters)}
            >
              <SlidersHorizontal className="w-4 h-4 mr-2" />
              Filtres
            </Button>
          </div>

          {/* Results Count */}
          <div className="flex items-center justify-between text-sm text-cod-gray/70">
            <span>
              {totalCount} lot{totalCount > 1 ? 's' : ''} disponible{totalCount > 1 ? 's' : ''}
            </span>
          </div>
        </div>

        {/* Batches Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-alto-orange animate-spin" />
          </div>
        ) : batches.length === 0 ? (
          <Card className="p-12 text-center">
            <Package className="w-16 h-16 text-nobel mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-cod-gray mb-2">
              Aucun lot disponible
            </h3>
            <p className="text-cod-gray/70">
              Aucun lot ne correspond à vos critères de recherche
            </p>
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {batches.map((batch) => (
                <Card key={batch.id} className="overflow-hidden hover:border-alto-orange/50 transition-all duration-200 group">
                  {/* Image */}
                  <div className="relative h-56 bg-surface overflow-hidden">
                    {batch.thumbnail_url || batch.images[0] ? (
                      <img
                        src={batch.thumbnail_url || batch.images[0]}
                        alt={batch.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="w-16 h-16 text-nobel" />
                      </div>
                    )}
                    <div className="absolute top-3 right-3 px-3 py-1.5 bg-alto-orange text-white text-xs font-bold rounded-full shadow-lg">
                      {batch.source_country.toUpperCase()}
                    </div>
                    {batch.available_quantity <= 10 && batch.available_quantity > 0 && (
                      <div className="absolute top-3 left-3 px-3 py-1.5 bg-red-500 text-white text-xs font-bold rounded-full shadow-lg">
                        Stock limité
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="p-5">
                    <h3 className="font-bold text-cod-gray text-lg mb-2 line-clamp-2 group-hover:text-alto-orange transition-colors">
                      {batch.title}
                    </h3>
                    <p className="text-sm text-cod-gray/70 mb-4">
                      {batch.year} • {batch.make} {batch.model}
                    </p>

                    {/* Pricing Grid */}
                    <div className="grid grid-cols-2 gap-3 mb-4 p-3 bg-surface/50 rounded-lg">
                      <div>
                        <div className="text-xs text-cod-gray/60 mb-1">Prix unitaire</div>
                        <div className="text-lg font-bold text-alto-orange">
                          ${batch.price_per_unit_usd.toLocaleString()}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-cod-gray/60 mb-1">Disponible</div>
                        <div className="text-lg font-bold text-green-600">
                          {batch.available_quantity}
                        </div>
                      </div>
                    </div>

                    {/* Min Order Info */}
                    <div className="flex items-center justify-between p-3 bg-surface/30 rounded-lg mb-4">
                      <span className="text-xs text-cod-gray/60">Commande min.</span>
                      <span className="text-sm font-semibold text-cod-gray">
                        {batch.minimum_order_quantity} unités
                      </span>
                    </div>

                    {batch.description && (
                      <p className="text-xs text-cod-gray/70 mb-4 line-clamp-2">
                        {batch.description}
                      </p>
                    )}

                    {/* Order Button */}
                    <Button
                      onClick={() => handleOrderClick(batch)}
                      className="w-full"
                      variant="primary"
                    >
                      <ShoppingCart className="w-4 h-4 mr-2" />
                      Commander
                    </Button>
                  </div>
                </Card>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-8">
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={handlePageChange}
                />
              </div>
            )}
          </>
        )}
      </div>

      {/* Order Modal */}
      {selectedBatch && (
        <Modal
          isOpen={isOrderModalOpen}
          onClose={() => setIsOrderModalOpen(false)}
          title="Commander un lot de véhicules"
          description={`${selectedBatch.year} ${selectedBatch.make} ${selectedBatch.model}`}
          size="lg"
        >
          <form onSubmit={(e) => { e.preventDefault(); handleSubmitOrder(); }} className="space-y-4">
            {orderError && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                <p className="text-sm text-red-400">{orderError}</p>
              </div>
            )}

            {/* Batch Info */}
            <div className="p-4 bg-surface/50 rounded-lg space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-cod-gray/70">Prix unitaire</span>
                <span className="text-cod-gray font-semibold">${selectedBatch.price_per_unit_usd.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-cod-gray/70">Disponible</span>
                <span className="text-green-600 font-semibold">{selectedBatch.available_quantity} unités</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-cod-gray/70">Commande minimale</span>
                <span className="text-cod-gray font-semibold">{selectedBatch.minimum_order_quantity} unités</span>
              </div>
            </div>

            {/* Order Form */}
            <div>
              <label className="block text-sm font-medium text-cod-gray mb-2">
                Quantité <span className="text-red-400">*</span>
              </label>
              <input
                type="number"
                value={orderQuantity}
                onChange={(e) => setOrderQuantity(e.target.value)}
                required
                min={selectedBatch.minimum_order_quantity}
                max={selectedBatch.available_quantity}
                className="w-full px-4 py-2.5 bg-white border border-nobel/20 rounded-lg text-cod-gray focus:outline-none focus:border-alto-orange"
              />
              {orderQuantity && (
                <p className="text-xs text-cod-gray/70 mt-2">
                  Total : <span className="text-alto-orange font-semibold">
                    ${(parseFloat(orderQuantity || '0') * selectedBatch.price_per_unit_usd).toLocaleString()} USD
                  </span>
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-cod-gray mb-2">
                Pays de destination <span className="text-red-400">*</span>
              </label>
              <select
                value={destinationCountry}
                onChange={(e) => setDestinationCountry(e.target.value)}
                required
                className="w-full px-4 py-2.5 bg-white border border-nobel/20 rounded-lg text-cod-gray focus:outline-none focus:border-alto-orange"
              >
                <option value="">Sélectionner...</option>
                <option value="Cameroon">Cameroun</option>
                <option value="Nigeria">Nigeria</option>
                <option value="Ghana">Ghana</option>
                <option value="Kenya">Kenya</option>
                <option value="Senegal">Sénégal</option>
                <option value="Côte d'Ivoire">Côte d'Ivoire</option>
                <option value="Other">Autre</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-cod-gray mb-2">
                Port de destination (Optionnel)
              </label>
              <input
                type="text"
                value={destinationPort}
                onChange={(e) => setDestinationPort(e.target.value)}
                placeholder="ex: Port de Douala"
                className="w-full px-4 py-2.5 bg-white border border-nobel/20 rounded-lg text-cod-gray placeholder-nobel focus:outline-none focus:border-alto-orange"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-cod-gray mb-2">
                Notes (Optionnel)
              </label>
              <textarea
                value={customerNotes}
                onChange={(e) => setCustomerNotes(e.target.value)}
                rows={3}
                placeholder="Exigences spécifiques ou questions..."
                className="w-full px-4 py-2.5 bg-white border border-nobel/20 rounded-lg text-cod-gray placeholder-nobel focus:outline-none focus:border-alto-orange resize-none"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4 border-t border-nobel/20">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsOrderModalOpen(false)}
                disabled={submittingOrder}
                className="flex-1"
              >
                Annuler
              </Button>
              <Button
                type="submit"
                disabled={submittingOrder}
                className="flex-1"
              >
                {submittingOrder ? 'Envoi en cours...' : 'Soumettre la commande'}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

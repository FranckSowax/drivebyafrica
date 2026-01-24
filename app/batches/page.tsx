'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { format } from 'date-fns';
import {
  Loader2,
  Package,
  Search,
  ShoppingCart,
  MapPin,
  Check,
} from 'lucide-react';
import type { VehicleBatch } from '@/types/vehicle-batch';

export default function PublicBatchesPage() {
  const router = useRouter();
  const [batches, setBatches] = useState<VehicleBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [countryFilter, setCountryFilter] = useState<'all' | 'china' | 'korea' | 'dubai'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [user, setUser] = useState<any>(null);

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
    fetchBatches();
  }, [currentPage, countryFilter]);

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
        limit: '20',
        public: 'true',
      });

      const response = await fetch(`/api/admin/batches?${params}`);
      const data = await response.json();

      if (response.ok) {
        setBatches(data.batches || []);
        setTotalPages(data.totalPages || 1);
      }
    } catch (error) {
      console.error('Error fetching batches:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOrderClick = (batch: VehicleBatch) => {
    if (!user) {
      router.push('/auth/login');
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
      setOrderError(`Minimum order quantity is ${selectedBatch.minimum_order_quantity}`);
      return;
    }

    if (qty > selectedBatch.available_quantity) {
      setOrderError(`Only ${selectedBatch.available_quantity} units available`);
      return;
    }

    if (!destinationCountry) {
      setOrderError('Please select a destination country');
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
        throw new Error(data.error || 'Failed to create order');
      }

      setIsOrderModalOpen(false);
      alert('Order submitted successfully! Our team will contact you shortly.');
      fetchBatches();
    } catch (error) {
      console.error('Error submitting order:', error);
      setOrderError(error instanceof Error ? error.message : 'Failed to submit order');
    } finally {
      setSubmittingOrder(false);
    }
  };

  const filteredBatches = batches.filter(batch => {
    // Country filter
    if (countryFilter !== 'all' && batch.source_country !== countryFilter) {
      return false;
    }

    // Search filter
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      batch.make.toLowerCase().includes(query) ||
      batch.model.toLowerCase().includes(query) ||
      batch.title.toLowerCase().includes(query)
    );
  });

  return (
    <div className="min-h-screen bg-cod-gray">
      {/* Header */}
      <div className="border-b border-nobel/20">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Package className="w-7 h-7 text-alto-orange" />
            Vehicle Batches
          </h1>
          <p className="text-sm text-nobel mt-1">
            Wholesale vehicle lots available for import
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Filters */}
        <div className="flex gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-nobel" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search batches..."
              className="w-full pl-10 pr-4 py-2 bg-surface border border-nobel/20 rounded-lg text-white placeholder-nobel focus:outline-none focus:border-alto-orange"
            />
          </div>

          <select
            value={countryFilter}
            onChange={(e) => setCountryFilter(e.target.value as typeof countryFilter)}
            className="px-4 py-2 bg-surface border border-nobel/20 rounded-lg text-white focus:outline-none focus:border-alto-orange"
          >
            <option value="all">All Countries</option>
            <option value="china">China</option>
            <option value="korea">Korea</option>
            <option value="dubai">Dubai</option>
          </select>
        </div>

        {/* Batches Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-alto-orange animate-spin" />
          </div>
        ) : filteredBatches.length === 0 ? (
          <Card className="p-12 text-center">
            <Package className="w-12 h-12 text-nobel mx-auto mb-4" />
            <p className="text-nobel">No batches available</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredBatches.map((batch) => (
              <Card key={batch.id} className="overflow-hidden hover:border-alto-orange/50 transition-colors">
                {/* Image */}
                <div className="relative h-48 bg-surface">
                  {batch.thumbnail_url || batch.images[0] ? (
                    <img
                      src={batch.thumbnail_url || batch.images[0]}
                      alt={batch.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="w-12 h-12 text-nobel" />
                    </div>
                  )}
                  <div className="absolute top-2 right-2 px-3 py-1 bg-alto-orange text-white text-xs font-semibold rounded">
                    {batch.source_country.toUpperCase()}
                  </div>
                </div>

                {/* Content */}
                <div className="p-4">
                  <h3 className="font-semibold text-white mb-1">{batch.title}</h3>
                  <p className="text-sm text-nobel mb-3">
                    {batch.year} {batch.make} {batch.model}
                  </p>

                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div>
                      <div className="text-xs text-nobel">Price per Unit</div>
                      <div className="text-lg font-semibold text-alto-orange">
                        ${batch.price_per_unit_usd.toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-nobel">Available</div>
                      <div className="text-lg font-semibold text-green-400">
                        {batch.available_quantity}
                      </div>
                    </div>
                  </div>

                  <div className="p-3 bg-surface/50 rounded-lg mb-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-nobel">Min. Order</span>
                      <span className="text-white font-semibold">{batch.minimum_order_quantity} units</span>
                    </div>
                    <div className="flex items-center justify-between text-sm mt-1">
                      <span className="text-nobel">Total Value</span>
                      <span className="text-white font-semibold">
                        ${(batch.price_per_unit_usd * batch.minimum_order_quantity).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {batch.description && (
                    <p className="text-xs text-nobel mb-4 line-clamp-2">
                      {batch.description}
                    </p>
                  )}

                  <Button
                    onClick={() => handleOrderClick(batch)}
                    className="w-full flex items-center justify-center gap-2"
                  >
                    <ShoppingCart className="w-4 h-4" />
                    Order Now
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-6">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            <span className="text-sm text-nobel">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              Next
            </Button>
          </div>
        )}
      </div>

      {/* Order Modal */}
      {selectedBatch && (
        <Modal
          isOpen={isOrderModalOpen}
          onClose={() => setIsOrderModalOpen(false)}
          title="Order Vehicle Batch"
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
            <div className="p-3 bg-surface/50 rounded-lg">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-nobel">Price per Unit</span>
                <span className="text-white font-semibold">${selectedBatch.price_per_unit_usd.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-nobel">Available</span>
                <span className="text-green-400 font-semibold">{selectedBatch.available_quantity} units</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-nobel">Min. Order</span>
                <span className="text-white font-semibold">{selectedBatch.minimum_order_quantity} units</span>
              </div>
            </div>

            {/* Order Form */}
            <div>
              <label className="block text-sm font-medium text-nobel mb-1">
                Quantity <span className="text-red-400">*</span>
              </label>
              <input
                type="number"
                value={orderQuantity}
                onChange={(e) => setOrderQuantity(e.target.value)}
                required
                min={selectedBatch.minimum_order_quantity}
                max={selectedBatch.available_quantity}
                className="w-full px-3 py-2 bg-surface border border-nobel/20 rounded-lg text-white focus:outline-none focus:border-alto-orange"
              />
              <p className="text-xs text-nobel mt-1">
                Total: ${(parseFloat(orderQuantity || '0') * selectedBatch.price_per_unit_usd).toLocaleString()}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-nobel mb-1">
                Destination Country <span className="text-red-400">*</span>
              </label>
              <select
                value={destinationCountry}
                onChange={(e) => setDestinationCountry(e.target.value)}
                required
                className="w-full px-3 py-2 bg-surface border border-nobel/20 rounded-lg text-white focus:outline-none focus:border-alto-orange"
              >
                <option value="">Select...</option>
                <option value="Cameroon">Cameroon</option>
                <option value="Nigeria">Nigeria</option>
                <option value="Ghana">Ghana</option>
                <option value="Kenya">Kenya</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-nobel mb-1">
                Destination Port (Optional)
              </label>
              <input
                type="text"
                value={destinationPort}
                onChange={(e) => setDestinationPort(e.target.value)}
                placeholder="e.g., Douala Port"
                className="w-full px-3 py-2 bg-surface border border-nobel/20 rounded-lg text-white focus:outline-none focus:border-alto-orange"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-nobel mb-1">
                Notes (Optional)
              </label>
              <textarea
                value={customerNotes}
                onChange={(e) => setCustomerNotes(e.target.value)}
                rows={3}
                placeholder="Any specific requirements or questions..."
                className="w-full px-3 py-2 bg-surface border border-nobel/20 rounded-lg text-white focus:outline-none focus:border-alto-orange resize-none"
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
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submittingOrder}
                className="flex-1"
              >
                {submittingOrder ? 'Submitting...' : 'Submit Order'}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

'use client';

import { X, Calendar, DollarSign, Package, Truck, FileText } from 'lucide-react';
import { format } from 'date-fns';
import type { VehicleBatch } from '@/types/vehicle-batch';

interface BatchDetailsModalProps {
  batch: VehicleBatch | null;
  isOpen: boolean;
  onClose: () => void;
}

const SOURCE_FLAGS: Record<string, string> = {
  korea: '🇰🇷',
  china: '🇨🇳',
  dubai: '🇦🇪',
};

export function BatchDetailsModal({ batch, isOpen, onClose }: BatchDetailsModalProps) {
  if (!isOpen || !batch) return null;

  const getStatusBadge = () => {
    switch (batch.status) {
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-green-500/10 text-green-400 rounded-full text-sm font-medium">
            ✓ Approved
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-red-500/10 text-red-400 rounded-full text-sm font-medium">
            ✗ Rejected
          </span>
        );
      case 'sold_out':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-gray-500/10 text-gray-400 rounded-full text-sm font-medium">
            🛒 Sold Out
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-yellow-500/10 text-yellow-400 rounded-full text-sm font-medium">
            ⏱ Pending
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-cod-gray rounded-xl border border-nobel/20 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-cod-gray border-b border-nobel/20 p-6 flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-2xl font-bold text-gray-900">{batch.title}</h2>
              <span className="text-2xl">{SOURCE_FLAGS[batch.source_country] || '🇨🇳'}</span>
              {getStatusBadge()}
            </div>
            <p className="text-nobel">
              {batch.year} {batch.make} {batch.model}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-nobel/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-nobel" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Images */}
          {batch.images && batch.images.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Images</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {batch.images.map((image, index) => (
                  <div key={index} className="relative aspect-video rounded-lg overflow-hidden bg-surface">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={image}
                      alt={`${batch.title} - Image ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                    {index === 0 && (
                      <div className="absolute top-2 left-2 bg-alto-orange text-gray-900 text-xs px-2 py-1 rounded-full">
                        Main
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Description */}
          {batch.description && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Description</h3>
              <div className="bg-surface rounded-lg p-4 border border-nobel/20">
                <p className="text-nobel whitespace-pre-wrap">{batch.description}</p>
              </div>
            </div>
          )}

          {/* Pricing & Quantity */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Pricing & Quantity</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="bg-surface rounded-lg p-4 border border-nobel/20">
                <div className="flex items-center gap-2 text-nobel mb-1">
                  <DollarSign className="w-4 h-4" />
                  <span className="text-sm">Price per Unit</span>
                </div>
                <p className="text-2xl font-bold text-alto-orange">
                  ${batch.price_per_unit_usd.toLocaleString()}
                </p>
              </div>

              <div className="bg-surface rounded-lg p-4 border border-nobel/20">
                <div className="flex items-center gap-2 text-nobel mb-1">
                  <Package className="w-4 h-4" />
                  <span className="text-sm">Available Quantity</span>
                </div>
                <p className="text-2xl font-bold text-green-400">
                  {batch.available_quantity}
                </p>
                <p className="text-xs text-nobel mt-1">
                  of {batch.total_quantity} total
                </p>
              </div>

              <div className="bg-surface rounded-lg p-4 border border-nobel/20">
                <div className="flex items-center gap-2 text-nobel mb-1">
                  <Truck className="w-4 h-4" />
                  <span className="text-sm">Min. Order</span>
                </div>
                <p className="text-2xl font-bold text-gray-900">
                  {batch.minimum_order_quantity}
                </p>
              </div>
            </div>
          </div>

          {/* Vehicle Specifications */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Vehicle Specifications</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="bg-surface rounded-lg p-4 border border-nobel/20">
                <div className="text-nobel text-sm mb-1">Year</div>
                <p className="text-gray-900 font-semibold">{batch.year}</p>
              </div>

              {batch.mileage && (
                <div className="bg-surface rounded-lg p-4 border border-nobel/20">
                  <div className="text-nobel text-sm mb-1">Mileage</div>
                  <p className="text-gray-900 font-semibold">{batch.mileage.toLocaleString()} km</p>
                </div>
              )}

              {batch.fuel_type && (
                <div className="bg-surface rounded-lg p-4 border border-nobel/20">
                  <div className="text-nobel text-sm mb-1">Fuel Type</div>
                  <p className="text-gray-900 font-semibold capitalize">{batch.fuel_type}</p>
                </div>
              )}

              {batch.transmission && (
                <div className="bg-surface rounded-lg p-4 border border-nobel/20">
                  <div className="text-nobel text-sm mb-1">Transmission</div>
                  <p className="text-gray-900 font-semibold capitalize">{batch.transmission}</p>
                </div>
              )}

              {batch.drive_type && (
                <div className="bg-surface rounded-lg p-4 border border-nobel/20">
                  <div className="text-nobel text-sm mb-1">Drive Type</div>
                  <p className="text-gray-900 font-semibold">{batch.drive_type}</p>
                </div>
              )}

              {batch.engine_size && (
                <div className="bg-surface rounded-lg p-4 border border-nobel/20">
                  <div className="text-nobel text-sm mb-1">Engine Size</div>
                  <p className="text-gray-900 font-semibold">{batch.engine_size}</p>
                </div>
              )}

              {batch.body_type && (
                <div className="bg-surface rounded-lg p-4 border border-nobel/20">
                  <div className="text-nobel text-sm mb-1">Body Type</div>
                  <p className="text-gray-900 font-semibold capitalize">{batch.body_type}</p>
                </div>
              )}

              {batch.color && (
                <div className="bg-surface rounded-lg p-4 border border-nobel/20">
                  <div className="text-nobel text-sm mb-1">Color</div>
                  <p className="text-gray-900 font-semibold capitalize">{batch.color}</p>
                </div>
              )}

              {batch.condition && (
                <div className="bg-surface rounded-lg p-4 border border-nobel/20">
                  <div className="text-nobel text-sm mb-1">Condition</div>
                  <p className="text-gray-900 font-semibold capitalize">{batch.condition}</p>
                </div>
              )}
            </div>
          </div>

          {/* Status Information */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Status Information</h3>
            <div className="bg-surface rounded-lg p-4 border border-nobel/20 space-y-3">
              <div className="flex justify-between">
                <span className="text-nobel">Status</span>
                <span className="text-gray-900 font-medium capitalize">{batch.status}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-nobel">Visible</span>
                <span className={`font-medium ${batch.is_visible ? 'text-green-400' : 'text-red-400'}`}>
                  {batch.is_visible ? 'Yes' : 'No'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-nobel">Source</span>
                <span className="text-gray-900 font-medium">{batch.source || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-nobel">Created</span>
                <span className="text-gray-900 font-medium">
                  {format(new Date(batch.created_at), 'MMM dd, yyyy HH:mm')}
                </span>
              </div>
              {batch.approved_at && (
                <div className="flex justify-between">
                  <span className="text-nobel">Approved At</span>
                  <span className="text-green-400 font-medium">
                    {format(new Date(batch.approved_at), 'MMM dd, yyyy HH:mm')}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Notes */}
          {(batch.collaborator_notes || batch.admin_notes) && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Notes</h3>
              <div className="space-y-3">
                {batch.collaborator_notes && (
                  <div className="bg-surface rounded-lg p-4 border border-nobel/20">
                    <div className="flex items-center gap-2 text-nobel mb-2">
                      <FileText className="w-4 h-4" />
                      <span className="text-sm font-medium">Your Notes</span>
                    </div>
                    <p className="text-gray-900 whitespace-pre-wrap">{batch.collaborator_notes}</p>
                  </div>
                )}
                {batch.admin_notes && (
                  <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-blue-400 mb-2">
                      <FileText className="w-4 h-4" />
                      <span className="text-sm font-medium">Admin Notes</span>
                    </div>
                    <p className="text-blue-400 whitespace-pre-wrap">{batch.admin_notes}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Rejection Reason */}
          {batch.rejection_reason && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Rejection Reason</h3>
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                <p className="text-red-400">{batch.rejection_reason}</p>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-nobel/20">
            <button
              onClick={onClose}
              className="flex-1 px-6 py-2 bg-surface hover:bg-surface-hover text-gray-900 rounded-lg transition-colors border border-nobel/20"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

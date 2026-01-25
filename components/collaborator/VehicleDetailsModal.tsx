'use client';

import { X, ExternalLink, Calendar, Gauge, Fuel, Settings, Package } from 'lucide-react';
import { format } from 'date-fns';
import Link from 'next/link';
import type { CollaboratorVehicle } from '@/app/collaborator/vehicles/page';

interface VehicleDetailsModalProps {
  vehicle: CollaboratorVehicle | null;
  isOpen: boolean;
  onClose: () => void;
}

const SOURCE_FLAGS: Record<string, string> = {
  korea: '🇰🇷',
  china: '🇨🇳',
  dubai: '🇦🇪',
};

export function VehicleDetailsModal({ vehicle, isOpen, onClose }: VehicleDetailsModalProps) {
  if (!isOpen || !vehicle) return null;

  const getStatusBadge = () => {
    if (vehicle.status === 'available' && vehicle.is_visible) {
      return (
        <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-green-500/10 text-green-400 rounded-full text-sm font-medium">
          ✓ Published
        </span>
      );
    }

    if (vehicle.rejection_reason) {
      return (
        <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-red-500/10 text-red-400 rounded-full text-sm font-medium">
          ✗ Rejected
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-yellow-500/10 text-yellow-400 rounded-full text-sm font-medium">
        ⏱ Pending
      </span>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-cod-gray rounded-xl border border-nobel/20 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-cod-gray border-b border-nobel/20 p-6 flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-2xl font-bold text-gray-900">
                {vehicle.make} {vehicle.model}
              </h2>
              <span className="text-2xl">{SOURCE_FLAGS[vehicle.source || 'china'] || '🇨🇳'}</span>
              {getStatusBadge()}
            </div>
            <p className="text-gray-900">{vehicle.title}</p>
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
          {vehicle.images && vehicle.images.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Images</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {vehicle.images.map((image, index) => (
                  <div key={index} className="relative aspect-video rounded-lg overflow-hidden bg-surface">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={image}
                      alt={`${vehicle.make} ${vehicle.model} - Image ${index + 1}`}
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

          {/* Price */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Price</h3>
            <div className="bg-surface rounded-lg p-4 border border-nobel/20">
              {vehicle.price != null ? (
                <p className="text-3xl font-bold text-alto-orange">
                  ${vehicle.price.toLocaleString()}
                </p>
              ) : (
                <p className="text-2xl font-medium text-gray-900">
                  On Request
                </p>
              )}
            </div>
          </div>

          {/* Vehicle Details */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Vehicle Details</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="bg-surface rounded-lg p-4 border border-nobel/20">
                <div className="flex items-center gap-2 text-nobel mb-1">
                  <Calendar className="w-4 h-4" />
                  <span className="text-sm">Year</span>
                </div>
                <p className="text-gray-900 font-semibold">{vehicle.year}</p>
              </div>

              {vehicle.mileage && (
                <div className="bg-surface rounded-lg p-4 border border-nobel/20">
                  <div className="flex items-center gap-2 text-nobel mb-1">
                    <Gauge className="w-4 h-4" />
                    <span className="text-sm">Mileage</span>
                  </div>
                  <p className="text-gray-900 font-semibold">{vehicle.mileage.toLocaleString()} km</p>
                </div>
              )}

              {vehicle.fuel_type && (
                <div className="bg-surface rounded-lg p-4 border border-nobel/20">
                  <div className="flex items-center gap-2 text-nobel mb-1">
                    <Fuel className="w-4 h-4" />
                    <span className="text-sm">Fuel Type</span>
                  </div>
                  <p className="text-gray-900 font-semibold capitalize">{vehicle.fuel_type}</p>
                </div>
              )}

              {vehicle.transmission && (
                <div className="bg-surface rounded-lg p-4 border border-nobel/20">
                  <div className="flex items-center gap-2 text-nobel mb-1">
                    <Settings className="w-4 h-4" />
                    <span className="text-sm">Transmission</span>
                  </div>
                  <p className="text-gray-900 font-semibold capitalize">{vehicle.transmission}</p>
                </div>
              )}

              {vehicle.condition && (
                <div className="bg-surface rounded-lg p-4 border border-nobel/20">
                  <div className="flex items-center gap-2 text-nobel mb-1">
                    <Package className="w-4 h-4" />
                    <span className="text-sm">Condition</span>
                  </div>
                  <p className="text-gray-900 font-semibold capitalize">{vehicle.condition}</p>
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
                <span className="text-gray-900 font-medium capitalize">{vehicle.status || 'Pending'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-nobel">Visible</span>
                <span className={`font-medium ${vehicle.is_visible ? 'text-green-400' : 'text-red-400'}`}>
                  {vehicle.is_visible ? 'Yes' : 'No'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-nobel">Added</span>
                <span className="text-gray-900 font-medium">
                  {format(new Date(vehicle.created_at), 'MMM dd, yyyy HH:mm')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-nobel">Last Updated</span>
                <span className="text-gray-900 font-medium">
                  {format(new Date(vehicle.updated_at), 'MMM dd, yyyy HH:mm')}
                </span>
              </div>
            </div>
          </div>

          {/* Rejection Reason */}
          {vehicle.rejection_reason && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Rejection Reason</h3>
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                <p className="text-red-400">{vehicle.rejection_reason}</p>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-nobel/20">
            <Link href={`/cars/${vehicle.id}`} target="_blank" className="flex-1">
              <button className="w-full px-4 py-2 bg-royal-blue hover:bg-royal-blue/90 text-gray-900 rounded-lg transition-colors flex items-center justify-center gap-2">
                <ExternalLink className="w-4 h-4" />
                View on Website
              </button>
            </Link>
            <button
              onClick={onClose}
              className="px-6 py-2 bg-surface hover:bg-surface-hover text-gray-900 rounded-lg transition-colors border border-nobel/20"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

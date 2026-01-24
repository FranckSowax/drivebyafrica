/**
 * Types for Vehicle Batches System
 */

export interface VehicleBatch {
  id: string;
  added_by_collaborator_id: string;

  // Vehicle details
  make: string;
  model: string;
  year: number;
  title: string;
  description?: string;

  // Source
  source: string;
  source_country: 'china' | 'korea' | 'dubai';

  // Pricing
  price_per_unit_usd: number;

  // Batch specific
  total_quantity: number;
  available_quantity: number;
  minimum_order_quantity: number;

  // Images
  images: string[];
  thumbnail_url?: string;

  // Specs
  mileage?: number;
  fuel_type?: string;
  transmission?: string;
  drive_type?: string;
  engine_size?: string;
  body_type?: string;
  color?: string;
  condition?: string;

  // Features
  features?: Record<string, unknown>[];

  // Status
  status: 'pending' | 'approved' | 'rejected' | 'sold_out';
  approved_by_admin_id?: string;
  approved_at?: string;
  rejection_reason?: string;

  // Visibility
  is_visible: boolean;

  // Notes
  collaborator_notes?: string;
  admin_notes?: string;

  // Timestamps
  created_at: string;
  updated_at: string;
}

export interface BatchOrder {
  id: string;
  batch_id: string;
  user_id: string;

  // Order details
  quantity_ordered: number;
  price_per_unit_usd: number;
  total_price_usd: number;

  // Shipping
  destination_country: string;
  destination_port?: string;
  shipping_cost_estimate_usd?: number;

  // Status
  status: 'pending' | 'confirmed' | 'paid' | 'shipping' | 'delivered' | 'cancelled';

  // Payment
  deposit_paid: boolean;
  deposit_amount_usd?: number;
  full_payment_received: boolean;

  // Notes
  customer_notes?: string;
  admin_notes?: string;

  // Timestamps
  created_at: string;
  updated_at: string;
}

export interface VehicleBatchWithCollaborator extends VehicleBatch {
  collaborator_name?: string;
  collaborator_email?: string;
}

export interface BatchOrderWithDetails extends BatchOrder {
  batch?: VehicleBatch;
  customer_name?: string;
  customer_email?: string;
}

export interface CollaboratorBatchStats {
  collaborator_id: string;
  collaborator_name: string;
  total_batches: number;
  pending_batches: number;
  approved_batches: number;
  rejected_batches: number;
  total_vehicles: number;
  available_vehicles: number;
  sold_vehicles: number;
}

export interface CreateVehicleBatchInput {
  make: string;
  model: string;
  year: number;
  title: string;
  description?: string;
  source_country: 'china' | 'korea' | 'dubai';
  price_per_unit_usd: number;
  total_quantity: number;
  minimum_order_quantity: number;
  images?: string[];
  thumbnail_url?: string;
  mileage?: number;
  fuel_type?: string;
  transmission?: string;
  drive_type?: string;
  engine_size?: string;
  body_type?: string;
  color?: string;
  condition?: string;
  features?: Record<string, unknown>[];
  collaborator_notes?: string;
}

export interface CreateBatchOrderInput {
  batch_id: string;
  quantity_ordered: number;
  destination_country: string;
  destination_port?: string;
  customer_notes?: string;
}

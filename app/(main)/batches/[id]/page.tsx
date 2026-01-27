import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { BatchDetailClient } from './BatchDetailClient';
import type { VehicleBatch } from '@/types/vehicle-batch';

// ISR: Revalidate every 5 minutes for fresh data while keeping pages fast
export const revalidate = 300;

// Dynamic params for batch IDs
export const dynamicParams = true;

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function BatchDetailPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: batch, error } = await supabase
    .from('vehicle_batches')
    .select('*')
    .eq('id', id)
    .eq('status', 'approved')
    .eq('is_visible', true)
    .single();

  if (error || !batch) {
    notFound();
  }

  return <BatchDetailClient batch={batch as VehicleBatch} />;
}

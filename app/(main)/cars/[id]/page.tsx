import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { VehicleDetailClient } from './VehicleDetailClient';
import type { Vehicle } from '@/types/vehicle';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function VehicleDetailPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: vehicle, error } = await supabase
    .from('vehicles')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !vehicle) {
    notFound();
  }

  // Increment view count (non-blocking) - will be handled by a separate API call

  return <VehicleDetailClient vehicle={vehicle as Vehicle} />;
}

import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
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

const SOURCE_COUNTRY_NAMES: Record<string, string> = {
  china: 'Chine',
  korea: 'Corée du Sud',
  dubai: 'Dubaï',
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();

  const { data: batch } = await supabase
    .from('vehicle_batches')
    .select('title, make, model, year, price_per_unit_usd, available_quantity, source_country, images')
    .eq('id', id)
    .eq('status', 'approved')
    .eq('is_visible', true)
    .single();

  if (!batch) return {};

  const country = SOURCE_COUNTRY_NAMES[batch.source_country] || batch.source_country;
  const title = `${batch.title} — Lot ${batch.make} ${batch.model} depuis ${country}`;
  const description = `Lot de ${batch.available_quantity} ${batch.make} ${batch.model} ${batch.year} à $${batch.price_per_unit_usd?.toLocaleString()}/unité. Import en gros depuis ${country} vers l'Afrique. Commandez maintenant sur Driveby Africa.`;
  const image = (batch.images && batch.images[0]) || undefined;

  return {
    title,
    description,
    alternates: { canonical: `/batches/${id}` },
    openGraph: {
      title,
      description,
      ...(image ? { images: [image] } : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  };
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

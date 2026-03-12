import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';
import { VehicleDetailClient } from './VehicleDetailClient';
import { ProductJsonLd } from '@/components/seo/JsonLd';
import type { Vehicle } from '@/types/vehicle';
import { SOURCE_NAMES, type VehicleSource } from '@/types/vehicle';
import { parseImagesField } from '@/lib/utils/imageProxy';

// ISR: Revalidate every 5 minutes for fresh data while keeping pages fast
export const revalidate = 300;

// Dynamic params for vehicle IDs
export const dynamicParams = true;

interface PageProps {
  params: Promise<{ id: string }>;
}

const getVehicle = cache(async (id: string) => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('vehicles')
    .select('*')
    .eq('id', id)
    .single();
  if (error || !data) return null;
  return data as Vehicle;
});

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const vehicle = await getVehicle(id);
  if (!vehicle) return {};

  const sourceName = SOURCE_NAMES[vehicle.source as VehicleSource] || vehicle.source;
  const year = vehicle.year && vehicle.year > 0 ? vehicle.year : '';
  const title = `${vehicle.make} ${vehicle.model} ${year} — Import depuis ${sourceName}`;
  const mileage = vehicle.mileage ? `${vehicle.mileage.toLocaleString('fr-FR')} km` : '';
  const price = vehicle.fob_price_usd ? `${vehicle.fob_price_usd.toLocaleString('fr-FR')} USD` : '';
  const descParts = [
    `Achetez cette ${vehicle.make} ${vehicle.model}${year ? ` ${year}` : ''} d'occasion`,
    mileage ? `${mileage}` : '',
    price ? `à partir de ${price}` : '',
    `Importation directe depuis ${sourceName} vers l'Afrique.`,
  ].filter(Boolean);
  const description = descParts.join(', ').replace(', Importation', '. Importation');

  const images = parseImagesField(vehicle.images);
  const ogImage = images.length > 0 ? images[0] : undefined;

  return {
    title,
    description,
    alternates: { canonical: `/cars/${id}` },
    openGraph: {
      title,
      description,
      type: 'website',
      images: ogImage ? [{ url: ogImage, alt: `${vehicle.make} ${vehicle.model} ${year}` }] : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  };
}

export default async function VehicleDetailPage({ params }: PageProps) {
  const { id } = await params;
  const vehicle = await getVehicle(id);

  if (!vehicle) {
    notFound();
  }

  return (
    <>
      <ProductJsonLd vehicle={vehicle} />
      <VehicleDetailClient vehicle={vehicle} />
    </>
  );
}

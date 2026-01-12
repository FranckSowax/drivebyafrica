import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { AuctionRoomClient } from './AuctionRoomClient';
import type { Vehicle } from '@/types/vehicle';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AuctionRoomPage({ params }: PageProps) {
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

  // Fetch initial bids for SSR
  const { data: bids } = await supabase
    .from('bids')
    .select('*')
    .eq('vehicle_id', id)
    .order('created_at', { ascending: false })
    .limit(50);

  return (
    <AuctionRoomClient
      vehicle={vehicle as Vehicle}
      initialBids={bids || []}
    />
  );
}

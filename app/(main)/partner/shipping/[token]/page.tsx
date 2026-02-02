import { Metadata } from 'next';
import PartnerShippingForm from './PartnerShippingForm';

export const metadata: Metadata = {
  title: 'Partner Shipping Quote - Driveby Africa',
  robots: 'noindex, nofollow',
};

interface PageProps {
  params: Promise<{ token: string }>;
}

export default async function PartnerShippingPage({ params }: PageProps) {
  const { token } = await params;

  return <PartnerShippingForm token={token} />;
}

'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function CampaignRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/admin/campaigns');
  }, [router]);
  return null;
}

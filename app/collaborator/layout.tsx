import { Metadata } from 'next';
import { CollaboratorLocaleProvider } from '@/components/collaborator/CollaboratorLocaleProvider';

export const metadata: Metadata = {
  title: 'Collaborator Portal | Driveby Africa',
  description: 'Manage vehicle orders and tracking',
  robots: 'noindex, nofollow',
  icons: {
    icon: '/Favcon -driveby-africa-dark.png',
    shortcut: '/Favcon -driveby-africa-dark.png',
    apple: '/Favcon -driveby-africa-dark.png',
  },
};

export default function CollaboratorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <CollaboratorLocaleProvider>
      <div className="min-h-screen bg-cod-gray">
        {children}
      </div>
    </CollaboratorLocaleProvider>
  );
}

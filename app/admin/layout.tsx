import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Admin - Driveby Africa',
  description: 'Administration de la plateforme Driveby Africa',
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="pt-20">
      {children}
    </div>
  );
}

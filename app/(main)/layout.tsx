import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { MobileNav } from '@/components/layout/MobileNav';
import { ChatWidget } from '@/components/chat';

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 pt-16 pb-20 lg:pb-0">{children}</main>
      <Footer />
      <MobileNav />
      <ChatWidget />
    </div>
  );
}

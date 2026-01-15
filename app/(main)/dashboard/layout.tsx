import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Sidebar } from '@/components/layout/Sidebar';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login?redirect=/dashboard');
  }

  return (
    <div className="flex min-h-[calc(100vh-4rem)]">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-64 flex-shrink-0 border-r border-nobel/20">
        <div className="sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto">
          <Sidebar />
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 lg:p-8">
        <div className="max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}

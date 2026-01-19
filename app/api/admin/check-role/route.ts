import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ isAdmin: false, role: null }, { status: 200 });
    }

    // Vérifier le rôle dans profiles
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ isAdmin: false, role: null }, { status: 200 });
    }

    const role = profile.role as string;
    const isAdmin = role === 'admin' || role === 'super_admin';

    return NextResponse.json({
      isAdmin,
      role: isAdmin ? role : null,
      userId: user.id
    });
  } catch (error) {
    console.error('Check role error:', error);
    return NextResponse.json({ isAdmin: false, role: null }, { status: 200 });
  }
}

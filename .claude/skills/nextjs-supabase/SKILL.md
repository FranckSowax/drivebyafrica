---
name: nextjs-supabase
description: Best practices for building Next.js 14 applications with Supabase. Use this skill when implementing authentication, database operations, realtime subscriptions, storage, or edge functions with Supabase in a Next.js App Router project.
---

# Next.js 14 + Supabase Integration Guide

This skill provides patterns and best practices for integrating Supabase with Next.js 14 App Router.

## Setup

### Dependencies
```bash
npm install @supabase/supabase-js @supabase/ssr
```

### Environment Variables
```env
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key  # Server-only
```

## Client Configuration

### Browser Client (lib/supabase/client.ts)
```typescript
import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/types/database';

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

### Server Client (lib/supabase/server.ts)
```typescript
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from '@/types/database';

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from Server Component
          }
        },
      },
    }
  );
}
```

### Admin Client (lib/supabase/admin.ts)
```typescript
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

export const supabaseAdmin = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);
```

## Middleware (middleware.ts)
```typescript
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Protect dashboard routes
  if (!user && request.nextUrl.pathname.startsWith('/dashboard')) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
```

## Authentication Patterns

### Sign Up
```typescript
const { data, error } = await supabase.auth.signUp({
  email,
  password,
  options: {
    data: {
      full_name: name,
    },
  },
});
```

### Sign In with Email
```typescript
const { data, error } = await supabase.auth.signInWithPassword({
  email,
  password,
});
```

### Sign In with OAuth
```typescript
const { data, error } = await supabase.auth.signInWithOAuth({
  provider: 'google',
  options: {
    redirectTo: `${origin}/auth/callback`,
  },
});
```

### Sign In with Phone OTP
```typescript
// Send OTP
const { data, error } = await supabase.auth.signInWithOtp({
  phone: '+241XXXXXXXX',
});

// Verify OTP
const { data, error } = await supabase.auth.verifyOtp({
  phone: '+241XXXXXXXX',
  token: '123456',
  type: 'sms',
});
```

### Auth Callback Route (app/auth/callback/route.ts)
```typescript
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/dashboard';

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/auth/error`);
}
```

## Database Operations

### Server Component Data Fetching
```typescript
// app/cars/page.tsx
import { createClient } from '@/lib/supabase/server';

export default async function CarsPage() {
  const supabase = await createClient();

  const { data: vehicles, error } = await supabase
    .from('vehicles')
    .select('*')
    .eq('auction_status', 'upcoming')
    .order('auction_date', { ascending: true });

  if (error) throw error;

  return <VehicleGrid vehicles={vehicles} />;
}
```

### Client Component with Hooks
```typescript
'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Vehicle } from '@/types/vehicle';

export function useVehicles(filters?: VehicleFilters) {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function fetchVehicles() {
      let query = supabase.from('vehicles').select('*');

      if (filters?.source) {
        query = query.eq('source', filters.source);
      }
      if (filters?.make) {
        query = query.ilike('make', `%${filters.make}%`);
      }

      const { data, error } = await query;
      if (!error && data) {
        setVehicles(data);
      }
      setLoading(false);
    }

    fetchVehicles();
  }, [filters]);

  return { vehicles, loading };
}
```

## Realtime Subscriptions

### Subscribe to Table Changes
```typescript
'use client';

import { useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

export function useBidSubscription(vehicleId: string, onNewBid: (bid: Bid) => void) {
  const supabase = createClient();

  useEffect(() => {
    const channel = supabase
      .channel(`bids:${vehicleId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'bids',
          filter: `vehicle_id=eq.${vehicleId}`,
        },
        (payload) => {
          onNewBid(payload.new as Bid);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [vehicleId, onNewBid]);
}
```

### Broadcast Messages
```typescript
// Send
const channel = supabase.channel('auction-room');
channel.send({
  type: 'broadcast',
  event: 'bid',
  payload: { amount: 5000, user_id: userId },
});

// Receive
channel.on('broadcast', { event: 'bid' }, (payload) => {
  console.log(payload);
});
```

## Storage

### Upload File
```typescript
const { data, error } = await supabase.storage
  .from('vehicle-images')
  .upload(`${vehicleId}/${file.name}`, file, {
    cacheControl: '3600',
    upsert: false,
  });
```

### Get Public URL
```typescript
const { data } = supabase.storage
  .from('vehicle-images')
  .getPublicUrl('path/to/image.jpg');
```

## Row Level Security (RLS) Patterns

### User can only see own data
```sql
CREATE POLICY "Users can view own profile"
ON profiles FOR SELECT
USING (auth.uid() = id);
```

### Public read, authenticated write
```sql
CREATE POLICY "Anyone can view vehicles"
ON vehicles FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can place bids"
ON bids FOR INSERT
WITH CHECK (auth.uid() = user_id);
```

## API Routes

### Protected API Route
```typescript
// app/api/bids/route.ts
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();

  const { data, error } = await supabase
    .from('bids')
    .insert({
      vehicle_id: body.vehicleId,
      user_id: user.id,
      amount_usd: body.amount,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json(data);
}
```

## Type Generation

Generate types from your Supabase schema:
```bash
npx supabase gen types typescript --project-id YOUR_PROJECT_ID > types/database.ts
```

Use generated types:
```typescript
import type { Database } from '@/types/database';

type Vehicle = Database['public']['Tables']['vehicles']['Row'];
type VehicleInsert = Database['public']['Tables']['vehicles']['Insert'];
type VehicleUpdate = Database['public']['Tables']['vehicles']['Update'];
```

## Error Handling Best Practices

```typescript
try {
  const { data, error } = await supabase
    .from('vehicles')
    .select('*');

  if (error) {
    console.error('Database error:', error.message);
    throw new Error(`Failed to fetch vehicles: ${error.message}`);
  }

  return data;
} catch (error) {
  // Handle network errors, etc.
  console.error('Unexpected error:', error);
  throw error;
}
```

## Performance Tips

1. **Select specific columns**: `.select('id, make, model, price')` instead of `.select('*')`
2. **Use pagination**: `.range(0, 9)` for first 10 items
3. **Add database indexes** for frequently queried columns
4. **Use server components** for initial data fetch
5. **Implement optimistic updates** for better UX

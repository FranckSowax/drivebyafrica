---
name: driveby-africa
description: Custom skill for developing the Driveby Africa vehicle import platform. Use this skill when working on any aspect of the Driveby Africa project including Next.js components, Supabase integration, vehicle listing, bidding system, or WhatsApp notifications. Ensures consistency with the project's design system, coding standards, and architecture.
---

# Driveby Africa Development Skill

This skill guides the development of Driveby Africa, a vehicle import platform for African buyers accessing auctions from South Korea, China, and Dubai.

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript (strict mode)
- **UI**: React 18 + Tailwind CSS
- **State**: Zustand
- **Forms**: React Hook Form + Zod
- **Animations**: Framer Motion
- **Backend**: Supabase (PostgreSQL, Auth, Storage, Realtime)
- **WhatsApp**: Whapi.cloud
- **Payments**: Stripe

## Design System

### Color Palette
Always use these CSS variables for consistency:

```css
--cod-gray: #04090C;      /* Background principal - dark theme base */
--nobel: #485257;          /* Textes secondaires, borders */
--mandarin: #F97316;       /* Accent principal - CTAs, highlights */
--royal-blue: #2563EB;     /* Accent secondaire - links, info */
--white: #FFFFFF;          /* Textes sur fond sombre */
--jewel: #15803D;          /* Succès, statuts positifs */
```

### Typography
- **Font Family**: Inter (Google Fonts)
- **Weights**: 400 (Regular), 500 (Medium), 700 (Bold)
- **Headings**: 48px (h1), 36px (h2), 24px (h3), 20px (h4)
- **Body**: 16px, 14px
- **Small**: 12px

### Design Principles
1. **Dark-first**: Primary backgrounds use cod-gray (#04090C)
2. **High contrast**: White text on dark, mandarin for emphasis
3. **African-inspired warmth**: Use mandarin orange strategically
4. **Clean, professional**: Avoid clutter, use generous spacing
5. **Mobile-first**: Design for mobile, enhance for desktop

## Project Structure

```
driveby-africa/
├── app/
│   ├── (auth)/           # Auth pages (login, register, verify)
│   ├── (main)/           # Main app pages
│   │   ├── cars/         # Vehicle listing & detail
│   │   ├── auctions/     # Live auctions
│   │   └── dashboard/    # User dashboard
│   └── api/              # API routes
├── components/
│   ├── ui/               # Base components (Button, Input, etc.)
│   ├── layout/           # Header, Footer, Sidebar
│   ├── vehicles/         # Vehicle-specific components
│   ├── auction/          # Bidding components
│   └── orders/           # Order tracking components
├── lib/
│   ├── supabase/         # Supabase clients
│   ├── api/              # Vehicle API integrations
│   ├── whapi/            # WhatsApp client
│   └── hooks/            # Custom hooks
├── store/                # Zustand stores
├── types/                # TypeScript types
└── config/               # App configuration
```

## Coding Standards

### Component Pattern
```tsx
'use client'; // Only if needed

import { useState } from 'react';
import { cn } from '@/lib/utils';

interface ComponentProps {
  className?: string;
  children?: React.ReactNode;
}

export function Component({ className, children }: ComponentProps) {
  return (
    <div className={cn('base-classes', className)}>
      {children}
    </div>
  );
}
```

### Naming Conventions
- **Components**: PascalCase (VehicleCard.tsx)
- **Hooks**: camelCase with "use" prefix (useVehicles.ts)
- **Stores**: camelCase with "use" prefix (useAuthStore.ts)
- **Types**: PascalCase (Vehicle, Bid, Order)
- **API routes**: lowercase (route.ts)
- **CSS classes**: kebab-case via Tailwind

### Supabase Patterns

**Client-side:**
```tsx
import { createBrowserClient } from '@supabase/ssr';

export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
```

**Server-side:**
```tsx
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        },
      },
    }
  );
}
```

### Realtime Subscriptions
```tsx
useEffect(() => {
  const channel = supabase
    .channel('bids')
    .on('postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'bids' },
      (payload) => handleNewBid(payload.new)
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, []);
```

## Vehicle Source Flags
- Korea: 🇰🇷
- China: 🇨🇳
- Dubai: 🇦🇪

## Status Colors
- upcoming: bg-blue-500
- ongoing: bg-orange-500 (mandarin)
- sold: bg-red-500
- ended: bg-gray-500
- success: bg-jewel (#15803D)

## Key Features to Implement

### Phase 1 - MVP
1. Auth (Email, Google, Phone OTP)
2. Vehicle listing with filters
3. Vehicle detail page
4. Favorites system
5. Price calculator (FOB + Shipping + Insurance)
6. WhatsApp notifications

### Phase 2 - Core
1. Real-time bidding
2. Order management
3. Delivery tracking
4. Chat with managers
5. Wallet & payments

## WhatsApp Templates (French)
Messages should be in French for African francophone markets:
- Bid placed: "Enchère placée avec succès!"
- Outbid: "Vous avez été surenchéri!"
- Won: "Félicitations! Vous avez remporté l'enchère!"
- Order update: "Mise à jour de votre commande"

## Currency Handling
- Default display: USD
- Support: XAF (CFA Franc), EUR
- Always show prices with formatCurrency() utility

## Shipping Routes
Primary destinations:
- Gabon (Libreville, Port-Gentil)
- Cameroon (Douala)
- Congo (Pointe-Noire)
- Côte d'Ivoire (Abidjan)

## Error Handling
Always use toast notifications for user feedback:
```tsx
import { toast } from '@/components/ui/Toast';

toast.success('Enchère placée!');
toast.error('Erreur de connexion');
```

## Testing Checklist
- [ ] Auth flows (signup, login, logout)
- [ ] Vehicle listing and filters
- [ ] Bid placement and updates
- [ ] Order creation and tracking
- [ ] WhatsApp notifications
- [ ] Payment processing
- [ ] Mobile responsiveness

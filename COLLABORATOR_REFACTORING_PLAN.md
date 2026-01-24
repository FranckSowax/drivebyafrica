# 🔄 Plan de Refactorisation Collaborateur - Production Ready

**Date:** 24 janvier 2026
**Objectif:** Synchroniser /collaborator/orders avec /admin/orders pour un workflow robuste

---

## 📋 SYSTÈME EXISTANT (À NE PAS TOUCHER)

### ✅ Déjà Fonctionnels

1. **Traductions EN/ZH**
   - ✅ `/locales/en.json` et `/locales/zh.json`
   - ✅ `CollaboratorLocaleProvider` avec hook `useCollaboratorLocale()`
   - ✅ Fonction `t()` avec interpolation
   - ✅ Détection automatique langue navigateur

2. **Notifications Collaborateur**
   - ✅ Hook `useCollaboratorNotifications`
   - ✅ Realtime PostgreSQL Changes
   - ✅ API `/api/collaborator/notifications` (GET, PATCH, DELETE)
   - ✅ Tracking read_by/dismissed_by

3. **Layout Collaborateur**
   - ✅ `CollaboratorSidebar`
   - ✅ `CollaboratorTopBar` avec notifications
   - ✅ `CollaboratorLanguageSwitcher`

---

## 🎯 CE QUI MANQUE (À AJOUTER)

### 1️⃣ Migration "Tous les Pays" ✅ CRÉÉE
**Fichier:** `supabase/migrations/20250124_collaborator_all_countries.sql`

**Changements:**
- ✅ Constraint: `assigned_country IN ('china', 'korea', 'dubai', 'all')`
- ✅ Fonction `get_sources_for_country('all')` retourne tous les sources
- ✅ RLS policies mises à jour
- ✅ Vue `collaborator_access_summary`

**À APPLIQUER:** Via Dashboard Supabase SQL Editor

---

### 2️⃣ Fonctionnalités Manquantes dans /collaborator/orders

#### A. Gestion Documents par Statut (PRIORITÉ 1 🔴)

**Actuellement:**
- Admin: `StatusDocumentsSection` + `MissingDocsBadge`
- Collaborator: Upload générique PDF uniquement

**À faire:**
1. Créer `/components/shared/StatusDocumentsSection.tsx` (partagé admin + collaborator)
2. Utiliser `/lib/order-documents-config.ts` existant
3. Ajouter à `/app/collaborator/orders/page.tsx`

**Fonctionnalités:**
- Upload par statut spécifique
- Validation par type de document
- Badge documents manquants
- Preview documents uploadés

---

#### B. Images Véhicules (PRIORITÉ 1 🔴)

**Actuellement:**
- Collaborator: Affiche `vehicle_image_url`
- Admin: N'affiche PAS les images

**À faire:**
1. Ajouter `vehicle_image_url` au fetch de `/api/admin/orders`
2. Ajouter thumbnail dans admin comme collaborator
3. Harmoniser affichage modal

---

#### C. Traçabilité "updated_by" (PRIORITÉ 1 🔴)

**Actuellement:**
- Collaborator track qui fait l'update
- Admin ne track pas

**À faire:**
1. Modifier `TrackingStep` interface pour ajouter `updated_by?`
2. Backend API `/api/admin/orders` enregistre `updated_by`
3. Backend API `/api/collaborator/orders` enregistre `updated_by`
4. Afficher dans historique

---

#### D. Conversion Devises (PRIORITÉ 2 🟡)

**Actuellement:**
- Admin: Convertit en XAF, XOF, NGN
- Collaborator: Tout en USD

**À faire:**
1. Utiliser `/lib/utils/currency.ts` existant dans collaborator
2. Afficher solde restant
3. Afficher conversion locale

---

### 3️⃣ Notifications Bidirectionnelles

**Actuellement:**
- Collaborator → Client: ✅ Fonctionne
- Collaborator → Admin: ❌ Manque
- Admin → Collaborator: ❌ Manque

**À faire:**
1. Utiliser `/lib/notifications/bidirectional-notifications.ts` ✅ CRÉÉ
2. Quand collaborator update status:
   - Notify admin via `admin_notifications`
   - Enqueue WhatsApp au client
3. Quand admin update status:
   - Notify collaborator via `collaborator_notifications`
   - Enqueue WhatsApp au client
4. Quand document uploadé:
   - Notify autre rôle
   - Enqueue WhatsApp au client

---

### 4️⃣ Synchronisation Temps Réel (PRIORITÉ 1 🔴)

**À faire:**
1. Admin subscribe aux changements `orders` table
2. Collaborator subscribe aux changements `orders` table
3. Refresh automatique quand l'autre modifie
4. Notification toast "Order updated by [user]"

**Implémentation:**
```typescript
// Dans admin/orders/page.tsx ET collaborator/orders/page.tsx
useEffect(() => {
  const channel = supabase
    .channel('orders-changes')
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'orders'
    }, payload => {
      // Refresh orders
      fetchOrders();

      // Show toast
      toast.success(
        `Order ${payload.new.order_number} updated by ${payload.new.updated_by}`
      );
    })
    .subscribe();

  return () => supabase.removeChannel(channel);
}, []);
```

---

## 🔧 MODIFICATIONS À FAIRE

### Fichier 1: `/app/api/collaborator/orders/route.ts`

**Modifications:**
```typescript
// PUT - Update status
export async function PUT(request: Request) {
  // ... existing code

  // AJOUTER: Notification à l'admin
  await notifyAdmins(supabaseAdmin, {
    type: 'order_status_updated',
    title: `Order ${order.order_number} updated`,
    titleZh: `订单 ${order.order_number} 已更新`,
    message: `Status changed to ${newStatus}`,
    messageZh: `状态已更改为 ${newStatusZh}`,
    data: { orderId, oldStatus, newStatus },
    priority: 'medium',
    actionUrl: `/admin/orders?orderId=${orderId}`,
    relatedEntityType: 'order',
    relatedEntityId: orderId,
    excludeUserId: user.id,  // Ne pas notifier soi-même
  });

  // AJOUTER: WhatsApp au client
  await sendWhatsAppToCustomer(supabaseAdmin, {
    userId: order.user_id,
    whatsappNumber: order.customer_whatsapp,
    orderNumber: order.order_number,
    status: newStatus,
    vehicleInfo: `${order.vehicle_make} ${order.vehicle_model}`,
    message: `Your order status: ${newStatus}`,
    messageZh: `您的订单状态：${newStatusZh}`,
  });
}
```

### Fichier 2: `/app/api/admin/orders/route.ts`

**Modifications:**
```typescript
// PUT - Update status
export async function PUT(request: Request) {
  // ... existing code

  // AJOUTER: Notification au collaborateur
  await notifyCollaborators(supabaseAdmin, {
    type: 'order_status_updated',
    title: `Order ${order.order_number} updated by admin`,
    titleZh: `管理员已更新订单 ${order.order_number}`,
    message: `Status changed to ${newStatus}`,
    messageZh: `状态已更改为 ${newStatusZh}`,
    data: { orderId, oldStatus, newStatus },
    priority: 'medium',
    actionUrl: `/collaborator/orders?order=${orderId}`,
    relatedEntityType: 'order',
    relatedEntityId: orderId,
    excludeUserId: user.id,
  });

  // AJOUTER: WhatsApp au client (identique)
}
```

### Fichier 3: `/components/shared/StatusDocumentsSection.tsx`

**Créer nouveau composant partagé:**
- Basé sur `/components/admin/StatusDocumentsSection.tsx` existant
- Support multilingue (utiliser `useCollaboratorLocale()` optionnel)
- Utilisable par admin ET collaborator
- Props: `orderId`, `currentStatus`, `documents`, `onUpload`, `locale?`

### Fichier 4: `/app/collaborator/orders/page.tsx`

**Modifications:**
```typescript
// AJOUTER imports
import { StatusDocumentsSection } from '@/components/shared/StatusDocumentsSection';
import { formatCurrency } from '@/lib/utils/currency';

// AJOUTER dans le modal
<StatusDocumentsSection
  orderId={selectedOrder.id}
  currentStatus={selectedOrder.order_status}
  documents={selectedOrder.uploaded_documents || []}
  onUpload={handleDocumentUpload}
  locale={locale}
/>

// AJOUTER affichage solde restant
const balanceRemaining = selectedOrder.total_cost_xaf - selectedOrder.deposit_amount_usd;
<div>
  {t('order.balanceRemaining')}: {formatCurrency(balanceRemaining, 'XAF')}
</div>

// AJOUTER subscription realtime
useEffect(() => {
  const channel = supabase
    .channel('orders-sync')
    .on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'orders'
    }, () => {
      fetchOrders();
    })
    .subscribe();

  return () => supabase.removeChannel(channel);
}, [fetchOrders]);
```

---

## 📦 FICHIERS À CRÉER/MODIFIER

### ✅ Déjà Créés
1. ✅ `supabase/migrations/20250124_collaborator_all_countries.sql`
2. ✅ `lib/notifications/bidirectional-notifications.ts`

### 🔨 À Créer
3. `components/shared/StatusDocumentsSection.tsx` (adapter de admin)
4. `components/shared/OrderCard.tsx` (optionnel, pour DRY)
5. `lib/realtime/orders-sync.ts` (helper pour subscription)

### 🔧 À Modifier
6. `app/api/collaborator/orders/route.ts` (ajouter notifications)
7. `app/api/admin/orders/route.ts` (ajouter notifications)
8. `app/collaborator/orders/page.tsx` (ajouter fonctionnalités manquantes)
9. `app/admin/orders/page.tsx` (ajouter images + realtime)
10. `types/database.ts` (ajouter `TrackingStep.updated_by?` si manquant)

---

## 🧪 TESTS À EFFECTUER

### Scénario 1: Collaborateur Update Status
1. Collaborateur change status: deposit_paid → vehicle_locked
2. ✅ Ordre mis à jour en DB
3. ✅ Admin reçoit notification "Order updated by collaborator"
4. ✅ Client reçoit WhatsApp "Votre commande est maintenant: Vehicle Locked"
5. ✅ Admin page se refresh automatiquement
6. ✅ Tracking history montre "updated_by: [collaborator email]"

### Scénario 2: Admin Update Status
1. Admin change status: vehicle_locked → inspection_sent
2. ✅ Ordre mis à jour en DB
3. ✅ Collaborator reçoit notification "Order updated by admin"
4. ✅ Client reçoit WhatsApp
5. ✅ Collaborator page se refresh automatiquement
6. ✅ Tracking history montre "updated_by: [admin email]"

### Scénario 3: Upload Document
1. Collaborator upload inspection report PDF
2. ✅ Document sauvegardé
3. ✅ Admin reçoit notification "New document uploaded"
4. ✅ Client reçoit WhatsApp avec lien document
5. ✅ Admin voit document dans StatusDocumentsSection
6. ✅ MissingDocsBadge mis à jour

### Scénario 4: Collaborateur "All Countries"
1. Créer collaborateur avec `assigned_country = 'all'`
2. ✅ Collaborateur voit TOUTES les commandes (china + korea + dubai)
3. ✅ Peut update status de n'importe quelle commande
4. ✅ Reçoit notifications pour toutes les commandes

---

## 🚀 ORDRE D'IMPLÉMENTATION

### Phase 1: Migrations & Backend (1h)
1. ✅ Appliquer migration `20250124_collaborator_all_countries.sql`
2. ✅ Créer collaborateur test avec `assigned_country = 'all'`
3. Modifier `/app/api/collaborator/orders/route.ts` (notifications)
4. Modifier `/app/api/admin/orders/route.ts` (notifications)
5. Tester API endpoints

### Phase 2: Composants Partagés (2h)
6. Créer `/components/shared/StatusDocumentsSection.tsx`
7. Créer `/lib/realtime/orders-sync.ts`
8. Tester composants en isolation

### Phase 3: Intégration Collaborator (2h)
9. Modifier `/app/collaborator/orders/page.tsx`
   - Ajouter StatusDocumentsSection
   - Ajouter conversion devises
   - Ajouter realtime sync
10. Tester page collaborator

### Phase 4: Intégration Admin (1h)
11. Modifier `/app/admin/orders/page.tsx`
   - Ajouter images véhicules
   - Ajouter realtime sync
12. Tester page admin

### Phase 5: Tests E2E (1h)
13. Tester les 4 scénarios ci-dessus
14. Vérifier notifications bidirectionnelles
15. Vérifier WhatsApp queue
16. Vérifier realtime sync

**TOTAL ESTIMÉ: 7 heures**

---

## ✅ CHECKLIST DE PRODUCTION

### Sécurité
- [ ] RLS policies testées (all countries)
- [ ] Notifications ne fuient pas entre utilisateurs
- [ ] Documents sensibles protégés
- [ ] API endpoints validés (auth, permissions)

### Performance
- [ ] Realtime channels optimisés
- [ ] Pagination fonctionnelle
- [ ] Images lazy-loaded
- [ ] Queries N+1 évitées

### UX
- [ ] Traductions EN/ZH complètes
- [ ] Loading states partout
- [ ] Error handling gracieux
- [ ] Toasts informatifs

### Fonctionnalités
- [ ] Collaborateur "all countries" fonctionne
- [ ] Notifications bidirectionnelles testées
- [ ] WhatsApp envoyés correctement
- [ ] Documents uploadés correctement
- [ ] Sync temps réel validé

---

## 📝 NOTES

- **Ne PAS** recréer le système de traductions existant
- **Ne PAS** recréer `useCollaboratorNotifications`
- **Réutiliser** au maximum les composants existants
- **Tester** chaque modification avant commit
- **Documenter** les changements dans les PRs

---

**Créé le:** 24 janvier 2026
**Statut:** PRÊT POUR IMPLÉMENTATION

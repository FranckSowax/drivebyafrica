# Rapport de Production - Driveby Africa

**Date :** 8 février 2026
**Projet :** Driveby Africa - Plateforme d'importation de véhicules
**Stack :** Next.js 14 (App Router) + Supabase + Netlify
**Domaine :** driveby-africa.com

---

## Table des matières

1. [Résumé exécutif](#1-résumé-exécutif)
2. [Architecture générale](#2-architecture-générale)
3. [Sécurité - Problèmes critiques](#3-sécurité---problèmes-critiques)
4. [API Endpoints - Inventaire complet](#4-api-endpoints---inventaire-complet)
5. [Workflows utilisateur](#5-workflows-utilisateur)
6. [Base de données & Migrations](#6-base-de-données--migrations)
7. [Variables d'environnement](#7-variables-denvironnement)
8. [Configuration Netlify](#8-configuration-netlify)
9. [Performance](#9-performance)
10. [Checklist avant production](#10-checklist-avant-production)

---

## 1. Résumé exécutif

### Score global : 8.5/10 - Prêt pour production

Le projet est fonctionnellement complet avec ~85 API routes, 30+ pages, 49 migrations SQL, et 186 RLS policies. L'architecture est solide. **Les 3 problèmes de sécurité critiques ont été corrigés**, ainsi que la majorité des problèmes élevés. Les items restants sont des optimisations de performance et des améliorations non-bloquantes.

### Statistiques clés

| Métrique | Valeur |
|---|---|
| Routes API | 85+ |
| Pages frontend | 30+ |
| Migrations SQL | 49 |
| Policies RLS | 186 |
| Variables d'env | 24 |
| Problèmes critiques | ~~3~~ → **0 (tous corrigés)** |
| Problèmes élevés | ~~8~~ → **3 restants** |
| Problèmes moyens | ~~12~~ → **8 restants** |

---

## 2. Architecture générale

### Authentification
- **Client :** Sessions Supabase stockées en `localStorage` (clé : `driveby-africa-auth`)
- **Middleware :** Cookie `dba-auth-marker` pour protection des routes (lightweight, pas d'auth réelle)
- **API Routes :** Bearer Token (JWT Supabase) via header `Authorization`
- **Admin :** Vérification du rôle `admin`/`super_admin` via `requireAdmin()` dans la table `profiles`
- **Collaborateur :** Vérification du rôle `collaborator` via `requireCollaborator()`
- **RLS :** Fonctions `is_admin()`, `is_collaborator()`, `is_admin_or_collaborator()` en `SECURITY DEFINER`

### Flux d'authentification
```
Client → authFetch() → Ajoute Bearer token → API Route → createClient(server) → Lit token → Supabase Auth
```

### Portails
1. **Public** (`/`) - Browsing véhicules, calculateur, FAQ
2. **Dashboard Client** (`/dashboard/*`) - Devis, commandes, messages
3. **Portail Collaborateur** (`/collaborator/*`) - Gestion commandes par pays
4. **Admin** (`/admin/*`) - Gestion complète

---

## 3. Sécurité - Problèmes critiques

### ~~CRITIQUE 1 : Routes devises sans authentification~~ CORRIGÉ

**Fichier :** `app/api/admin/currencies/route.ts`
**Commit :** `65018ed`

`requireAdmin()` ajouté sur tous les handlers PUT, POST, PATCH et DELETE. Seul GET reste public (lecture des taux).

---

### ~~CRITIQUE 2 : Route shipping_routes modifiable par tout utilisateur authentifié~~ CORRIGÉ

**Fichier :** `supabase/migrations/20260208_fix_shipping_routes_rls.sql`
**Commit :** `65018ed`

Policies RLS remplacées : UPDATE, INSERT et DELETE restreints à `public.is_admin()`. SELECT reste public.

---

### ~~CRITIQUE 3 : Route CRON sans protection si secret non défini~~ CORRIGÉ

**Fichier :** `app/api/cron/vehicle-count/route.ts`
**Commit :** `bd0d52f`

Le endpoint retourne maintenant 403 si `CRON_SECRET` n'est pas configuré, et 401 si le token ne correspond pas. Deux vérifications séparées et explicites.

---

### Problèmes de sécurité élevés

| # | Problème | Fichier | Status |
|---|---|---|---|
| ~~H1~~ | ~~Endpoint `login_failed` sans auth (spam vector)~~ | `api/collaborator/log-activity/route.ts` | **CORRIGÉ** - Rate limit 10/IP/5min + sanitization |
| H2 | Pas de rate limiting sur formulaire contact | `app/(main)/contact/page.tsx` | Ouvert |
| ~~H3~~ | ~~Pas de validation longueur messages chat~~ | `api/chat/route.ts` + `api/chat/ai/route.ts` | **CORRIGÉ** - Max 5000 chars |
| H4 | CSP permet `unsafe-inline` et `unsafe-eval` | `netlify.toml` | Ouvert |
| H5 | Pas de validation email en production (signup) | `app/(auth)/register/page.tsx` | Ouvert |
| ~~H6~~ | ~~Redirect `/auth/reset-password` inexistant~~ | `app/auth/reset-password/page.tsx` | **CORRIGÉ** - Page créée |
| ~~H7~~ | ~~Pas de `.env.example`~~ | `.env.example` | **CORRIGÉ** - Fichier créé |
| ~~H8~~ | ~~Multiple WhatsApp env vars (anciennes + nouvelles)~~ | Documents routes | **CORRIGÉ** - Migration vers Whapi |

---

## 4. API Endpoints - Inventaire complet

### Routes Admin (`/api/admin/*`) - 20+ endpoints

| Route | Méthodes | Auth | Description |
|---|---|---|---|
| `/api/admin/analytics` | GET | Admin | Dashboard analytics |
| `/api/admin/analytics/profits` | GET | Admin | Analyse des profits |
| `/api/admin/batches` | GET, POST, PUT | Admin | Gestion lots véhicules |
| `/api/admin/check-role` | GET | User | Vérification rôle admin |
| `/api/admin/currencies` | GET, PUT, POST, PATCH, DELETE | Admin (GET public) | Gestion devises |
| `/api/admin/messages` | GET, POST, PUT | Admin | Messages client |
| `/api/admin/notifications` | GET, POST, PATCH, DELETE | Admin | Notifications |
| `/api/admin/notifications/logs` | GET | Admin | Historique statuts |
| `/api/admin/notifications/process` | GET | CRON | Traitement file notifs |
| `/api/admin/notifications/queue` | GET, POST | Admin | File notifications |
| `/api/admin/orders` | GET, PUT | Admin | Gestion commandes |
| `/api/admin/orders/documents` | GET | Admin | Documents commandes |
| `/api/admin/quotes` | GET, POST | Admin | Gestion devis |
| `/api/admin/quotes/set-price` | PUT, POST | Admin | Tarification devis |
| `/api/admin/quotes/reassign` | PUT | Admin | Réassignation devis |
| `/api/admin/reset-sync` | GET | Admin | Reset synchro |
| `/api/admin/shipping` | GET, POST | Admin | Expédition |
| `/api/admin/shipping/comparison` | GET, POST | Admin | Comparaison tarifs |
| `/api/admin/shipping/partners` | GET, POST | Admin | Partenaires transport |
| `/api/admin/sync` | GET | Admin | État synchro |
| `/api/admin/sync/[source]` | GET, POST | Admin | Synchro par source |
| `/api/admin/transitaires` | GET | Admin | Transitaires |
| `/api/admin/users` | GET | Admin | Gestion utilisateurs |
| `/api/admin/vehicle-count` | GET | Admin | Comptage véhicules |
| `/api/admin/vehicles` | GET | Admin | Gestion véhicules |
| `/api/admin/vehicles/collaborator` | GET | Admin | Véhicules collaborateurs |
| `/api/admin/vehicles/stats` | GET | Admin | Stats véhicules |

### Routes Collaborateur (`/api/collaborator/*`) - 6 endpoints

| Route | Méthodes | Auth | Description |
|---|---|---|---|
| `/api/collaborator/batches` | GET, POST, PUT | Collaborator | Lots véhicules |
| `/api/collaborator/log-activity` | POST | Conditionnel | Logs activité |
| `/api/collaborator/notifications` | GET | Collaborator | Notifications |
| `/api/collaborator/orders` | GET | Collaborator | Commandes |
| `/api/collaborator/orders/documents` | GET | Collaborator | Documents |
| `/api/collaborator/vehicles` | GET | Collaborator | Véhicules |

### Routes Utilisateur (authentifiées)

| Route | Méthodes | Auth | Description |
|---|---|---|---|
| `/api/orders` | GET | User | Mes commandes |
| `/api/orders/from-quote` | POST | User | Créer commande depuis devis |
| `/api/orders/[id]/activity` | GET | User | Activité commande |
| `/api/quotes` | GET, POST, DELETE | User | Gestion devis |
| `/api/chat` | GET, POST | User | Chat |
| `/api/chat/ai` | POST | User | Réponse IA |
| `/api/dashboard` | GET | User | Données dashboard |
| `/api/favorites` | GET, POST | User | Favoris |
| `/api/price-request` | POST | User | Demande de prix |
| `/api/reassignment/[id]` | GET, PUT | User | Réassignation |
| `/api/reassignment/[id]/select` | POST | User | Sélection alternative |
| `/api/reassignment/[id]/decline` | POST | User | Refus alternative |

### Routes Publiques (sans auth)

| Route | Méthodes | Description |
|---|---|---|
| `/api/currencies` | GET | Liste devises |
| `/api/exchange-rate` | GET | Taux de change |
| `/api/image-proxy` | GET | Proxy images (whitelist domaines) |
| `/api/shipping` | GET | Routes expédition + tarifs |
| `/api/transitaires` | GET | Liste transitaires |
| `/api/transitaires/reviews` | GET | Avis transitaires |
| `/api/transitaires/track` | GET | Suivi colis |
| `/api/vehicles/[id]/realtime-price` | GET | Prix temps réel |
| `/api/vehicles/filters` | GET | Filtres véhicules |
| `/api/partner/shipping` | POST | Devis partenaire |

### Routes Webhook / CRON

| Route | Méthodes | Auth | Description |
|---|---|---|---|
| `/api/whapi/webhook` | GET, POST | Token query/header | Webhook WhatsApp entrant |
| `/api/cron/vehicle-count` | GET | CRON_SECRET (obligatoire) | Comptage planifié |

### Routes Sync (Admin)

| Route | Source |
|---|---|
| `/api/admin/sync/che168` | Chine (che168) |
| `/api/admin/sync/dongchedi` | Chine (dongchedi) |
| `/api/admin/sync/dubicars` | Dubai |
| `/api/admin/sync/encar` | Corée |

---

## 5. Workflows utilisateur

### Workflow 1 : Parcours public
```
/ → /cars → /cars/[id] → /calculator → /contact → /faq → /how-it-works
```
**Status :** Fonctionnel. Aucun problème bloquant.

### Workflow 2 : Inscription / Connexion
```
/register → (email + password + Google OAuth) → /verify (OTP) → /dashboard
/login → (email/password + Turnstile CAPTCHA) → /dashboard
/forgot-password → email reset → /auth/reset-password → nouveau mot de passe → /login
```
**Status :** Fonctionnel. Route `/auth/reset-password` créée avec détection auto du token Supabase, formulaire de saisie et redirection vers login.

### Workflow 3 : Devis → Commande (CORRIGÉ)
```
/cars/[id] → Bouton "Obtenir un devis" → /dashboard/quotes (devis créé)
→ Admin fixe le prix → User valide → POST /api/orders/from-quote
→ Redirect /dashboard/orders/[id] (page client)
```
**Status :** Corrigé récemment (était 404 avant). Fonctionnel maintenant.

### Workflow 4 : Suivi commande (14 étapes)
```
1. Acompte payé → 2. Véhicule bloqué → 3. Inspection envoyée
→ 4. Totalité paiement → 5. Véhicule acheté → 6. Réception véhicule
→ 7. Douane export → 8. En transit → 9. Au port → 10. En mer
→ 11. Remise documentation → 12. En douane → 13. Prêt retrait → 14. Livré
```
**Status :** Fonctionnel avec real-time updates via Supabase channels. Statuts legacy supportés.

### Workflow 5 : Réassignation véhicule
```
Véhicule vendu → Admin crée reassignment → User reçoit notification
→ /reassignment/[id] → Sélection alternative ou refus
```
**Status :** Fonctionnel.

### Workflow 6 : Chat / Messages
```
/dashboard/messages → Chat avec assistant IA → Transfert agent humain
/contact → Formulaire → Crée conversation chat → Réponse IA automatique
```
**Status :** Fonctionnel. Utilise OpenAI pour les réponses IA.

### Workflow 7 : Portail Collaborateur
```
/collaborator/login → Dashboard avec stats
→ /collaborator/orders (gestion commandes par pays)
→ Upload documents requis par statut → Changement de statut
→ Notifications WhatsApp au client (boutons interactifs via Whapi)
```
**Status :** Fonctionnel. Documents requis avant changement de statut. WhatsApp avec boutons URL.

### Workflow 8 : Administration
```
/admin → Dashboard analytics → Gestion commandes/devis/véhicules
→ Synchro véhicules (Che168, Dongchedi, DubiCars, Encar)
→ Notifications push → Gestion transitaires
```
**Status :** Fonctionnel.

---

## 6. Base de données & Migrations

### 49 migrations appliquées

#### Tables principales
| Table | RLS | Description |
|---|---|---|
| `profiles` | Complète | Profils utilisateurs avec rôles |
| `vehicles` | Complète | Catalogue véhicules |
| `orders` | Complète | Commandes (14 statuts) |
| `order_tracking` | Complète | Historique statuts commande |
| `quotes` | Complète | Devis client |
| `quote_reassignments` | Complète | Réassignations véhicules |
| `favorites` | Complète | Favoris utilisateur |
| `chat_conversations` | Complète | Conversations chat |
| `chat_messages` | Complète | Messages chat |
| `shipping_routes` | Complète | Routes expédition |
| `currency_rates` | Partielle | Taux de change |
| `vehicle_batches` | Complète | Lots véhicules collaborateurs |
| `transitaires` | Complète | Agents transitaires |
| `notification_queue` | Complète | File notifications |
| `notification_log` | Complète | Logs notifications |
| `admin_notifications` | Complète | Notifications admin |
| `collaborator_notifications` | Complète | Notifications collaborateur |
| `collaborator_activity_log` | Complète | Logs activité collaborateur |
| `vehicle_count_history` | Complète | Historique comptage |
| `sync_config` | Complète | Configuration synchro |
| `sync_logs` | Complète | Logs synchro |

### Fonctions SQL déployées
- `is_admin()` - Vérifie rôle admin/super_admin
- `is_collaborator()` - Vérifie rôle collaborator
- `is_admin_or_collaborator()` - Vérifie l'un ou l'autre
- Toutes en `SECURITY DEFINER` avec `GRANT EXECUTE TO authenticated`

### Indexes optimisés
- Véhicules : index sur `source`, `status`, `collaborator_id`, tri par prix/année
- Commandes : index sur `user_id`, `status`
- Quotes : index sur `user_id`, `vehicle_id`
- Batches : index sur `collaborator_id`, `status`, `source_country`

---

## 7. Variables d'environnement

### Requises (publiques - exposées au frontend)
| Variable | Usage |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clé anonyme Supabase |
| `NEXT_PUBLIC_SITE_URL` | URL du site (https://driveby-africa.com) |
| `NEXT_PUBLIC_APP_URL` | URL interne app |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Cloudflare Turnstile CAPTCHA |

### Requises (privées - server-side)
| Variable | Usage | Critique |
|---|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | Admin Supabase | Oui |
| `SUPABASE_URL` | URL (legacy) | Non |
| `OPENAI_API_KEY` | Chat IA | Oui |
| `CRON_SECRET` | Auth cron jobs | **Oui** |
| `NOTIFICATION_WORKER_API_KEY` | Worker notifications | Oui |

### APIs externes
| Variable | Source | Status |
|---|---|---|
| `WHAPI_TOKEN` | WhatsApp (Whapi) | A configurer |
| `WHAPI_WEBHOOK_SECRET` | Webhook Whapi | A configurer |
| `ENCAR_API_KEY` | Corée du Sud | A vérifier |
| `CHE168_API_KEY` | Chine (fallback ENCAR) | A vérifier |
| `DONGCHEDI_API_KEY` | Chine | A vérifier |
| `DUBICARS_API_KEY` | Dubai | A vérifier |

### Optionnelles (rate limiting)
| Variable | Usage |
|---|---|
| `UPSTASH_REDIS_REST_URL` | Redis pour rate limiting |
| `UPSTASH_REDIS_REST_TOKEN` | Token Redis |

### Legacy (partiellement nettoyé)
| Variable | Remplacée par | Status |
|---|---|---|
| `WHATSAPP_ACCESS_TOKEN` | `WHAPI_TOKEN` | Encore utilisée dans `quotes/set-price` |
| `WHATSAPP_API_KEY` | `WHAPI_TOKEN` | Supprimée des routes documents |
| `WHATSAPP_API_URL` | Whapi API | Supprimée des routes documents |
| `WHATSAPP_PHONE_ID` | Config Whapi | Encore utilisée dans `quotes/set-price` |

---

## 8. Configuration Netlify

### Build
```toml
command = "npm run build"
publish = ".next"
NODE_VERSION = "20"
NPM_FLAGS = "--legacy-peer-deps"
```

### Headers de sécurité (OK)
- X-Frame-Options: DENY
- X-XSS-Protection: 1; mode=block
- X-Content-Type-Options: nosniff
- HSTS: max-age=31536000; includeSubDomains; preload
- Referrer-Policy: strict-origin-when-cross-origin
- Permissions-Policy: restrictive

### CSP (à durcir)
- `unsafe-inline` et `unsafe-eval` autorisés dans `script-src`
- `img-src` autorise `https: data: blob:` (large)

---

## 9. Performance

### Problèmes identifiés

| # | Type | Endpoint | Description | Status |
|---|---|---|---|---|
| ~~P1~~ | ~~N+1 queries~~ | `api/admin/messages` | Loop sur conversations pour last message | **CORRIGÉ** — Requête batch `.in()` |
| P2 | N+1 queries | `api/admin/analytics` | Pas de N+1 réel (queries statiques par source) | Non applicable |
| P3 | N+1 queries | `api/admin/notifications/logs` | Déjà optimisé (utilise `.in()`) | Non applicable |
| P4 | Pas de pagination | `api/admin/analytics` | Fetch véhicules/profils pour agrégation | Post-lancement |
| ~~P5~~ | ~~Pas de pagination~~ | `api/orders` | Retournait toutes les commandes | **CORRIGÉ** — Pagination avec `page`/`limit` |
| ~~P6~~ | ~~Filtrage en mémoire~~ | `api/admin/orders` | Filtrait en JS après fetch complet | **CORRIGÉ** — Filtre status au niveau DB |
| P7 | Filtrage en mémoire | `api/admin/notifications` | Filtre dismissed/unread en mémoire (array contains) | Post-lancement |
| ~~P8~~ | ~~Bulk inefficace~~ | `api/admin/currencies` PATCH | Seed 40+ devises en boucle | **CORRIGÉ** — Insert batch unique |

### Valeurs hardcodées (documentées, non bloquantes)

| Valeur | Localisation | Type |
|---|---|---|
| `615 XAF = 1 USD` | `lib/utils/currency.ts`, `lib/utils/realtime-exchange.ts`, `calculator/page.tsx` | Fallback (BDD consultée en priorité) |
| `600 XAF = 1 USD` | `api/admin/analytics/profits` (`FIXED_XAF_TO_USD_RATE`) | Calcul interne profits |
| `$980 export tax` | `lib/utils/pricing.ts`, `api/admin/analytics/profits` | Config business Chine |
| `$1000 deposit` | `api/admin/orders`, `api/orders/from-quote`, `api/collaborator/orders`, `api/chat/ai`, migrations SQL | Config business (colonne `deposit_amount_usd` en BDD, default 1000) |
| `$150 documentation fee` | `orders/[id]/page.tsx` | Config business (colonne `documentation_fee_usd` en BDD, default 150) |
| `225000 FCFA inspection` | `lib/utils/pricing.ts` (`INSPECTION_FEE_XAF`) | Config business |
| `+241 77 00 00 00` | `contact/page.tsx` | Placeholder — à remplacer par vrais numéros |
| `+852 0000 0000` | `contact/page.tsx` | Placeholder — à remplacer par vrais numéros |

---

## 10. Checklist avant production

### Critiques (bloquants)

- [x] **Ajouter auth admin** sur `PUT/POST/PATCH/DELETE` de `/api/admin/currencies` *(commit 65018ed)*
- [x] **Restreindre RLS** `shipping_routes` UPDATE aux admins seulement *(commit 65018ed)*
- [x] **Rendre CRON_SECRET obligatoire** (retourner 403 si non défini) *(commit bd0d52f)*
- [x] **Créer la route** `/auth/reset-password` pour le workflow mot de passe oublié *(commit bd0d52f)*
- [ ] **Configurer WHAPI_TOKEN** et **WHAPI_WEBHOOK_SECRET** en production

### Élevés (fortement recommandés)

- [ ] Ajouter rate limiting sur le formulaire de contact
- [x] Ajouter rate limiting sur `login_failed` collaborateur *(commit bd0d52f — 10/IP/5min + sanitization)*
- [x] Ajouter validation longueur max sur messages chat *(commit bd0d52f — max 5000 chars)*
- [x] Créer un fichier `.env.example` documentant toutes les variables *(commit bd0d52f)*
- [x] Migrer les notifications documents WhatsApp vers Whapi *(commit 2e5bd0f)*
- [ ] Durcir CSP (retirer `unsafe-eval` si possible)
- [ ] Vérifier que toutes les API keys externes sont configurées en prod

### Moyens (recommandés)

- [x] Ajouter pagination sur `GET /api/orders` *(page/limit params, max 100)*
- [x] Optimiser N+1 queries sur messages admin *(batch `.in()` au lieu de loop)*
- [x] Optimiser bulk seed devises *(insert batch au lieu de 40+ requêtes séquentielles)*
- [x] Filtrer status au niveau DB dans `GET /api/admin/orders` *(`.eq('status', status)`)*
- [ ] Remplacer les numéros de téléphone placeholder sur la page contact
- [ ] Ajouter des images d'équipe réelles sur la page À propos
- [ ] Ajouter un fallback UI sur la page détail véhicule (`/cars/[id]`)
- [ ] Ajouter `Cache-Control` sur l'endpoint `/api/currencies`
- [ ] Ajouter monitoring/alertes (Sentry ou équivalent)
- [ ] Configurer Upstash Redis pour le rate limiting en production

### Post-lancement

- [ ] Régénérer les types Supabase (`supabase gen types`) pour supprimer les `as any`
- [ ] Ajouter des tests E2E pour les workflows critiques (devis → commande)
- [ ] Mettre en place un backup automatique de la base Supabase
- [ ] Configurer les alertes email pour les erreurs serveur
- [ ] Auditer les logs collaborateur périodiquement

---

## 11. Corrections récentes appliquées

### Sécurité (commits 65018ed, bd0d52f)
- Auth admin sur currencies (PUT/POST/PATCH/DELETE)
- RLS shipping_routes restreint aux admins (migration SQL)
- CRON_SECRET obligatoire avec 403 explicite
- Rate limiting login_failed (10/IP/5min) avec sanitization des inputs
- Validation longueur messages chat (max 5000 chars sur 2 routes)
- Page `/auth/reset-password` créée pour le workflow forgot-password
- Fichier `.env.example` ajouté avec toutes les variables

### Fonctionnalités (commits 2e5bd0f, 5046a1b)
- Migration WhatsApp : format `cta_url` → `button` (Whapi) sur toutes les routes
- Notifications documents migrées de l'API legacy vers `sendDocumentNotification()` (Whapi)
- Enforcement : upload de documents requis avant changement de statut (collaborateur + admin)
- Fix spinner infini sur upload de documents (authFetch au lieu de fetch)

### Performance
- P1 : N+1 queries messages admin → requête batch `.in()` (1 query au lieu de N)
- P5 : Pagination sur `GET /api/orders` (params `page`/`limit`, max 100)
- P6 : Filtre status au niveau DB dans admin orders (`.eq('status', status)`)
- P8 : Seed devises en batch (1 insert au lieu de 40+ séquentiels)

### UI (commits d4537e0, 37e3dab, 0d8f215)
- Vignettes véhicules ajoutées dans la table admin orders
- Couleurs des stats collaborateur passées en noir (dashboard, batches, vehicles)

---

## Conclusion

Le projet est **fonctionnellement complet** et couvre l'intégralité du workflow d'importation de véhicules. **Les 3 problèmes critiques de sécurité ont été corrigés**, ainsi que 5 des 8 problèmes élevés et 4 problèmes de performance.

**Items restants avant production :**
1. Configurer `WHAPI_TOKEN` et `WHAPI_WEBHOOK_SECRET` en production
2. Vérifier les API keys externes (Encar, Dongchedi, DubiCars, Che168)
3. Remplacer les numéros de téléphone placeholder sur la page contact
4. Optionnel : rate limiting formulaire contact, durcissement CSP

Les items moyens restants (analytics pagination, notifications filtering, valeurs hardcodées) sont des optimisations non-bloquantes à traiter post-lancement.

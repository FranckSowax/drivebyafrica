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

### Score global : 7/10 - Prêt avec corrections prioritaires

Le projet est fonctionnellement complet avec ~85 API routes, 30+ pages, 49 migrations SQL, et 186 RLS policies. L'architecture est solide mais **3 problèmes de sécurité critiques** et **plusieurs optimisations de performance** doivent être traités avant la mise en production.

### Statistiques clés

| Métrique | Valeur |
|---|---|
| Routes API | 85+ |
| Pages frontend | 30+ |
| Migrations SQL | 49 |
| Policies RLS | 186 |
| Variables d'env | 24 |
| Problèmes critiques | 3 |
| Problèmes élevés | 8 |
| Problèmes moyens | 12 |

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

### CRITIQUE 1 : Routes devises sans authentification

**Fichier :** `app/api/admin/currencies/route.ts`
**Méthodes :** PUT, POST, PATCH, DELETE

Les endpoints de modification des taux de change n'ont **aucune vérification d'authentification ou de rôle**. N'importe quel utilisateur authentifié peut modifier les taux de change.

**Impact :** Un utilisateur malveillant pourrait modifier les taux USD/XAF, affectant tous les prix affichés.

**Correction :** Ajouter `requireAdmin()` en début de chaque méthode PUT/POST/PATCH/DELETE.

---

### CRITIQUE 2 : Route shipping_routes modifiable par tout utilisateur authentifié

**Fichier :** `supabase/migrations/00004_shipping_routes.sql`

La policy RLS permet à **tout utilisateur authentifié** de modifier les routes d'expédition :
```sql
CREATE POLICY "Authenticated users can update shipping routes" ON shipping_routes
  FOR UPDATE USING (auth.role() = 'authenticated');
```

**Impact :** Un utilisateur pourrait modifier les coûts de livraison dans la base de données.

**Correction :** Restreindre aux admins : `USING (public.is_admin())`

---

### CRITIQUE 3 : Route CRON sans protection si secret non défini

**Fichier :** `app/api/cron/vehicle-count/route.ts`

```typescript
if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
```

Si `CRON_SECRET` n'est pas défini dans l'environnement, la vérification est **entièrement ignorée** et le endpoint est accessible publiquement.

**Impact :** Appels non autorisés au cron job, potentielle surcharge de la base.

**Correction :** Retourner 403 si `CRON_SECRET` n'est pas défini.

---

### Problèmes de sécurité élevés

| # | Problème | Fichier | Impact |
|---|---|---|---|
| H1 | Endpoint `login_failed` sans auth (spam vector) | `api/collaborator/log-activity/route.ts` | Spam de logs |
| H2 | Pas de rate limiting sur formulaire contact | `app/(main)/contact/page.tsx` | Spam |
| H3 | Pas de validation longueur messages chat | `api/chat/route.ts` | Messages géants en BDD |
| H4 | CSP permet `unsafe-inline` et `unsafe-eval` | `netlify.toml` | XSS possible |
| H5 | Pas de validation email en production (signup) | `app/(auth)/register/page.tsx` | Comptes spam |
| H6 | Redirect `/auth/reset-password` inexistant | `app/(auth)/forgot-password/page.tsx` | Reset password cassé |
| H7 | Pas de `.env.example` | Racine projet | Risque mauvaise config |
| H8 | Multiple WhatsApp env vars (anciennes + nouvelles) | `.env.local` | Confusion config |

---

## 4. API Endpoints - Inventaire complet

### Routes Admin (`/api/admin/*`) - 20+ endpoints

| Route | Méthodes | Auth | Description |
|---|---|---|---|
| `/api/admin/analytics` | GET | Admin | Dashboard analytics |
| `/api/admin/analytics/profits` | GET | Admin | Analyse des profits |
| `/api/admin/batches` | GET, POST, PUT | Admin | Gestion lots véhicules |
| `/api/admin/check-role` | GET | User | Vérification rôle admin |
| `/api/admin/currencies` | GET, PUT, POST, PATCH, DELETE | **AUCUN** | Gestion devises |
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
| `/api/cron/vehicle-count` | GET | CRON_SECRET (optionnel!) | Comptage planifié |

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
/forgot-password → email reset → /auth/reset-password (ROUTE MANQUANTE!)
```
**Problème :** La route `/auth/reset-password` n'existe pas dans le projet.

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
→ Mise à jour statuts → Notifications WhatsApp au client
```
**Status :** Fonctionnel après correction du spinner infini.

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
| `shipping_routes` | **Partielle** | Routes expédition |
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

### Legacy (à nettoyer)
| Variable | Remplacée par |
|---|---|
| `WHATSAPP_ACCESS_TOKEN` | `WHAPI_TOKEN` |
| `WHATSAPP_API_KEY` | `WHAPI_TOKEN` |
| `WHATSAPP_API_URL` | Hardcodé dans le code |
| `WHATSAPP_PHONE_ID` | Config Whapi |

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

| # | Type | Endpoint | Description |
|---|---|---|---|
| P1 | N+1 queries | `api/admin/analytics` | Loop sur conversations pour last message |
| P2 | N+1 queries | `api/admin/messages` | Loop sur conversations |
| P3 | N+1 queries | `api/admin/notifications/logs` | Loop sur log entries |
| P4 | Pas de pagination | `api/admin/analytics` | Fetch tous les véhicules/profils |
| P5 | Pas de pagination | `api/orders` | Retourne toutes les commandes |
| P6 | Filtrage en mémoire | `api/admin/orders` | Filtre en JS après fetch complet |
| P7 | Filtrage en mémoire | `api/admin/notifications` | Filtre en JS après fetch complet |
| P8 | Bulk inefficace | `api/admin/currencies` PATCH | Seed 40+ devises en boucle |

### Valeurs hardcodées à externaliser

| Valeur | Localisation | Recommandation |
|---|---|---|
| `615 XAF = 1 USD` | Multiple fichiers | Lire depuis `currency_rates` |
| `600 XAF = 1 USD` | `api/admin/analytics/profits` | Idem |
| `$980 export tax` | `api/admin/analytics/profits` | Table config |
| `$1000 deposit` | `api/admin/orders`, `api/orders/from-quote` | Table config |
| `$150 documentation fee` | `orders/[id]/page.tsx` | Table config |
| `+241 77 00 00 00` | `contact/page.tsx` | Variable d'env |
| `+852 0000 0000` | `contact/page.tsx` | Variable d'env |

---

## 10. Checklist avant production

### Critiques (bloquants)

- [ ] **Ajouter auth admin** sur `PUT/POST/PATCH/DELETE` de `/api/admin/currencies`
- [ ] **Restreindre RLS** `shipping_routes` UPDATE aux admins seulement
- [ ] **Rendre CRON_SECRET obligatoire** (retourner 403 si non défini)
- [ ] **Créer la route** `/auth/reset-password` pour le workflow mot de passe oublié
- [ ] **Configurer WHAPI_TOKEN** et **WHAPI_WEBHOOK_SECRET** en production

### Élevés (fortement recommandés)

- [ ] Ajouter rate limiting sur le formulaire de contact
- [ ] Ajouter rate limiting sur `login_failed` collaborateur
- [ ] Ajouter validation longueur max sur messages chat
- [ ] Créer un fichier `.env.example` documentant toutes les variables
- [ ] Nettoyer les variables WhatsApp legacy
- [ ] Durcir CSP (retirer `unsafe-eval` si possible)
- [ ] Vérifier que toutes les API keys externes sont configurées en prod

### Moyens (recommandés)

- [ ] Ajouter pagination sur `GET /api/orders` et `GET /api/admin/analytics`
- [ ] Optimiser N+1 queries sur les endpoints admin (utiliser `select('*, relation(*)')`)
- [ ] Externaliser les taux de change hardcodés (615/600) vers la BDD
- [ ] Externaliser le montant de l'acompte ($1000) vers une table de configuration
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

## Conclusion

Le projet est **fonctionnellement complet** et couvre l'intégralité du workflow d'importation de véhicules. Les corrections récentes (fix 404 commande, fix spinner collaborateur) ont résolu les bugs majeurs.

**Les 3 corrections critiques de sécurité** (auth currencies, RLS shipping_routes, CRON_SECRET) sont à appliquer en priorité absolue avant toute mise en production publique. Les autres items sont classés par priorité et peuvent être adressés de manière itérative.

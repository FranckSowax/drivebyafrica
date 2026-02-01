# Gestion des Lots (Batches) - DriveBy Africa

## Architecture

Les lots permettent aux collaborateurs de proposer des vehicules en gros (lots/batches). Un lot = un meme modele de vehicule disponible en plusieurs exemplaires, avec un prix unitaire et une quantite minimale de commande.

```
Collaborateur → Cree un lot → Admin approuve/rejette → Client passe commande
```

---

## 1. Schema de donnees

### Table `vehicle_batches`

| Champ | Type | Description |
|-------|------|-------------|
| `id` | UUID | Identifiant unique |
| `added_by_collaborator_id` | UUID | FK vers `profiles` |
| **Vehicule** | | |
| `make` | text | Marque |
| `model` | text | Modele |
| `year` | integer | Annee |
| `title` | text | Titre du lot (ex: "Toyota Corolla 2024 - Lot de 10") |
| `description` | text | Description detaillee |
| `source_country` | text | `'china'` / `'korea'` / `'dubai'` |
| **Prix et quantites** | | |
| `price_per_unit_usd` | decimal | Prix unitaire en USD |
| `total_quantity` | integer | Nombre total de vehicules dans le lot |
| `available_quantity` | integer | Vehicules restants disponibles |
| `minimum_order_quantity` | integer | Quantite minimale par commande |
| **Specs** | | |
| `mileage` | integer | Kilometrage |
| `fuel_type` | text | Type de carburant |
| `transmission` | text | Boite de vitesse |
| `drive_type` | text | Type de transmission |
| `engine_size` | text | Cylindree |
| `body_type` | text | Carrosserie |
| `color` | text | Couleur |
| `condition` | text | Etat du vehicule |
| `features` | JSONB | Equipements supplementaires |
| **Images** | | |
| `images` | text[] | Tableau d'URLs d'images |
| `thumbnail_url` | text | Image principale |
| **Statut** | | |
| `status` | text | `'pending'` / `'approved'` / `'rejected'` / `'sold_out'` |
| `is_visible` | boolean | Visible sur le site public |
| `approved_by_admin_id` | UUID | Admin qui a approuve |
| `approved_at` | timestamp | Date d'approbation |
| `rejection_reason` | text | Raison du refus |
| **Notes** | | |
| `collaborator_notes` | text | Notes du collaborateur |
| `admin_notes` | text | Notes de l'admin |
| **Timestamps** | | |
| `created_at` | timestamp | Date de creation |
| `updated_at` | timestamp | Derniere modification |

**Contraintes :**
- `total_quantity >= minimum_order_quantity`
- `available_quantity <= total_quantity`
- `available_quantity >= 0`

### Table `batch_orders`

| Champ | Type | Description |
|-------|------|-------------|
| `id` | UUID | Identifiant unique |
| `batch_id` | UUID | FK vers `vehicle_batches` |
| `user_id` | UUID | FK vers `profiles` (client) |
| `quantity_ordered` | integer | Nombre de vehicules commandes |
| `price_per_unit_usd` | decimal | Prix unitaire au moment de la commande |
| `total_price_usd` | decimal | Total = quantite x prix unitaire |
| `destination_country` | text | Pays de destination |
| `destination_port` | text | Port de destination |
| `shipping_cost_estimate_usd` | decimal | Estimation frais de port |
| `status` | text | `'pending'` / `'confirmed'` / `'paid'` / `'shipping'` / `'delivered'` / `'cancelled'` |
| `deposit_paid` | boolean | Acompte verse |
| `deposit_amount_usd` | decimal | Montant de l'acompte |
| `full_payment_received` | boolean | Paiement complet recu |
| `customer_notes` | text | Notes du client |
| `admin_notes` | text | Notes admin |

---

## 2. Cycle de vie d'un lot

```
                    ┌──────────────────┐
                    │   COLLABORATEUR   │
                    │   Cree le lot     │
                    └────────┬─────────┘
                             │
                             ▼
                    ┌──────────────────┐
                    │     PENDING      │
                    │  is_visible=false │
                    └────────┬─────────┘
                             │
                      Admin review
                      ┌──────┴──────┐
                      │             │
                      ▼             ▼
             ┌──────────────┐ ┌──────────────┐
             │   APPROVED   │ │   REJECTED   │
             │ is_visible=  │ │ is_visible=  │
             │    true      │ │    false     │
             └──────┬───────┘ └──────────────┘
                    │              │
                    │       Collaborateur peut
                    │       modifier et resoumettre
                    │
                    ▼
          Commandes clients
          (available_quantity diminue)
                    │
                    ▼
             ┌──────────────┐
             │   SOLD_OUT   │  (available_quantity = 0)
             │ is_visible=  │
             │    false     │
             └──────────────┘
```

### Regles de transition

| De | Vers | Condition | Qui |
|----|------|-----------|-----|
| - | `pending` | Creation du lot | Collaborateur |
| `pending` | `approved` | Admin approuve | Admin |
| `pending` | `rejected` | Admin rejette (avec raison) | Admin |
| `approved` | `sold_out` | `available_quantity` = 0 | Automatique |
| `rejected` | `pending` | Collaborateur modifie et resoumet | Collaborateur |

**Note** : Dans l'implementation actuelle, le statut par defaut a la creation est `'approved'` (auto-approbation pour les collaborateurs de confiance). Ceci est configurable dans `app/api/collaborator/batches/route.ts`.

---

## 3. Routes API

### Collaborateur (`/api/collaborator/batches`)

| Methode | Action | Description |
|---------|--------|-------------|
| `POST` | Creer un lot | Validation des champs, verification du pays assigne, notification aux admins |
| `GET` | Lister ses lots | Filtrage par statut, pagination |
| `PUT` | Modifier un lot | Uniquement `pending` ou `approved`, pas de modification du statut |
| `DELETE` | Supprimer un lot | Uniquement si `status = 'pending'` |

### Admin (`/api/admin/batches`)

| Methode | Action | Description |
|---------|--------|-------------|
| `GET` | Lister tous les lots | Filtre par statut, par collaborateur, pagination, info collaborateur |
| `PUT` | Approuver/rejeter/modifier | `action: 'approve'` ou `'reject'`, modification des champs |
| `POST` | Creer une commande | Validation quantite, calcul prix total, notification bidirectionnelle |

---

## 4. Validation des commandes

Quand un client passe commande sur un lot :

```
1. Le lot doit etre status='approved' ET is_visible=true
2. quantite_commandee >= minimum_order_quantity
3. quantite_commandee <= available_quantity
4. total_price = quantite_commandee x price_per_unit_usd
5. destination_country est requis
```

**Exemple :**

```
Lot : 20x Toyota Corolla 2024 @ $8 000/unite (min: 3)
Available : 15

Commande : 5 unites → Douala, Cameroun
  → Validation OK (5 >= 3 et 5 <= 15)
  → Total : 5 x $8 000 = $40 000
  → available_quantity passe a 10
```

---

## 5. Systeme de notifications

| Evenement | Destinataire | Type |
|-----------|-------------|------|
| Lot cree | Admins | `batch_published` |
| Lot approuve | Collaborateur | `batch_approved` |
| Lot rejete | Collaborateur | `batch_rejected` |
| Commande recue | Admins + Collaborateur | `batch_order_created` |

Les notifications incluent des traductions FR/ZH (francais et chinois) pour les collaborateurs chinois.

---

## 6. Interface collaborateur

### Dashboard (`/collaborator/batches`)

**Fichier** : `app/collaborator/batches/page.tsx`

- **Stats** : Total lots, en attente, approuves, rejetes, vehicules totaux, disponibles
- **Table** : Image, infos lot, source, prix/unite, quantite, commande min, statut, date, actions
- **Filtres** : Statut (tous/pending/approved/rejected) + recherche par marque/modele/titre
- **Actions** : Voir details, modifier, supprimer (si pending)

### Creation de lot (`AddBatchModal`)

**Fichier** : `components/collaborator/AddBatchModal.tsx`

Formulaire en sections :
1. **Vehicule** : Marque, modele, annee, titre, description
2. **Source** : Pays d'origine (limite au pays assigne du collaborateur)
3. **Lot** : Prix unitaire USD, quantite totale, commande minimum
4. **Specs** : Kilometrage, carburant, boite, transmission, cylindree, carrosserie, couleur, etat
5. **Images** : Upload vers Supabase Storage, selection de la miniature
6. **Notes** : Notes collaborateur

### Modification (`EditBatchModal`)

**Fichier** : `components/collaborator/EditBatchModal.tsx`

- Meme formulaire que la creation, pre-rempli
- Reutilisable pour admin (prop `apiEndpoint`)
- Interdit de modifier : statut, approbation, raison de rejet

### Details (`BatchDetailsModal`)

**Fichier** : `components/collaborator/BatchDetailsModal.tsx`

- Vue lecture seule avec images, specs, prix, quantites
- Informations de statut (approuve/rejete, date, notes admin)
- Raison de rejet si applicable

---

## 7. Interface admin

### Dashboard (`/admin/batches`)

**Fichier** : `app/admin/batches/page.tsx`

- Liste de tous les lots avec info collaborateur
- Filtrage par statut
- **Boutons d'action pour les lots `pending`** :
  - Approuver (vert) → `status = 'approved'`, `is_visible = true`
  - Rejeter (rouge) → Modal avec raison obligatoire

### Table admin (`AdminBatchTable`)

**Fichier** : `components/admin/AdminBatchTable.tsx`

Colonnes supplementaires par rapport au collaborateur :
- Collaborateur (nom + email)
- Notes admin
- Raison de rejet
- Boutons approuver/rejeter (uniquement pour `pending`)

### Details admin (`AdminBatchDetailsModal`)

**Fichier** : `components/admin/AdminBatchDetailsModal.tsx`

- Toutes les infos du lot
- Infos collaborateur (nom, email)
- Notes admin en surbrillance bleue

---

## 8. Interface publique

### Page lots (`/batches`)

**Fichier** : `app/(main)/batches/page.tsx`

Affiche uniquement les lots `approved` et `is_visible = true`.

- **Filtres** : Pays d'origine (Chine/Coree/Dubai), recherche
- **Tri** : Plus recents, prix croissant/decroissant, annee, quantite
- **Carte lot** : Image, titre, specs, prix unitaire, quantite disponible, commande min

### Passage de commande

Modal de commande depuis la page publique :

1. Selectionner la quantite (>= minimum, <= disponible)
2. Choisir le pays de destination
3. Selectionner le port de destination (14 ports africains)
4. Ajouter des notes (optionnel)
5. Calcul en temps reel : quantite x prix unitaire = total
6. Soumettre → Cree `batch_order` avec statut `pending`

**Ports disponibles** :
Libreville, Douala, Dakar, Abidjan, Lagos, Mombasa, Dar es Salaam, Luanda, Pointe-Noire, Lome, Cotonou, Tema, Maputo, Durban

---

## 9. Gestion des images

- Upload dans le bucket Supabase `vehicle-images`
- Chemin : `vehicle-images/<uuid>.<ext>`
- Premiere image = miniature (ou selection manuelle via `thumbnail_url`)
- Stockage en tableau d'URLs dans le champ `images`

---

## 10. Fichiers de reference

| Fichier | Role |
|---------|------|
| `types/vehicle-batch.ts` | Types TypeScript (VehicleBatch, BatchOrder, inputs) |
| `types/database.ts` | Schema base de donnees |
| `supabase/migrations/20250124_vehicle_batches.sql` | Migration SQL |
| `app/api/collaborator/batches/route.ts` | API collaborateur (CRUD lots) |
| `app/api/admin/batches/route.ts` | API admin (approbation, commandes) |
| `app/collaborator/batches/page.tsx` | Dashboard collaborateur |
| `app/admin/batches/page.tsx` | Dashboard admin |
| `app/(main)/batches/page.tsx` | Page publique lots |
| `components/collaborator/AddBatchModal.tsx` | Formulaire creation |
| `components/collaborator/EditBatchModal.tsx` | Formulaire modification |
| `components/collaborator/BatchDetailsModal.tsx` | Vue details |
| `components/collaborator/CollaboratorBatchTable.tsx` | Table collaborateur |
| `components/admin/AdminBatchTable.tsx` | Table admin |
| `components/admin/AdminBatchDetailsModal.tsx` | Details admin |

---

## 11. Configuration

### Changer le statut par defaut a la creation

Dans `app/api/collaborator/batches/route.ts`, le lot est cree avec `status: 'approved'` (auto-approbation). Pour exiger une approbation admin :

```typescript
// Changer cette ligne :
status: 'approved',
is_visible: true,

// Par :
status: 'pending',
is_visible: false,
```

### Ajouter un port de destination

Dans `app/(main)/batches/page.tsx`, modifier le tableau `DESTINATION_PORTS` pour ajouter de nouveaux ports africains.

### Modifier les regles de quantite

Les contraintes sont definies dans la migration SQL :
```sql
CONSTRAINT valid_quantities CHECK (total_quantity > 0 AND available_quantity >= 0 AND available_quantity <= total_quantity)
CONSTRAINT valid_min_quantity CHECK (minimum_order_quantity > 0 AND minimum_order_quantity <= total_quantity)
```

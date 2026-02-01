# Gestion des Images, Vehicules et Filtres - DriveBy Africa

---

## 1. Gestion des images

### Sources d'images par origine

| Source | Domaines CDN | Proxy necessaire |
|--------|-------------|-----------------|
| Coree (Encar) | `ci.encar.com` | Non |
| Chine (Dongchedi) | `*.byteimg.com`, `*.tosv.byted.org` | Non (acces direct) |
| Chine (CHE168) | `*.autoimg.cn` | **Oui** (referer requis) |
| Dubai (Dubicars) | `dubicars.com` | Non |
| Admin (upload) | `*.supabase.co` (bucket `vehicle-images`) | Non |

### Pipeline de chargement d'une image

```
Image brute (URL en base)
    │
    ▼
parseImagesField()          ← Parse le champ images (PostgreSQL array, JSON, string)
    │
    ▼
needsProxy() ?              ← Verifie si l'URL necessite un proxy
    │         │
    │ Non     │ Oui
    │         ▼
    │   getProxiedImageUrl()  ← Route via /api/image-proxy
    │         │
    ▼         ▼
isUnavailableImage() ?       ← Verifie si l'image est expiree
    │         │
    │ Non     │ Oui
    ▼         ▼
OptimizedImage            Placeholder SVG
(Next.js Image)           /images/placeholder-car.svg
```

### Formats de stockage du champ `images`

Le champ `images` en base peut contenir plusieurs formats. `parseImagesField()` les gere tous :

```
Format PostgreSQL array :  {url1,url2,url3}
Format JSON :              ["url1","url2","url3"]
Format guillemets PG :     {"url1","url2","url3"}
URL unique :               https://example.com/image.jpg
Array JS (deja parse) :    [url1, url2, url3]
```

**Fichier** : `lib/utils/imageProxy.ts`

### Detection d'images expirees

Les images du CDN chinois (Dongchedi) utilisent des URLs signees avec expiration :

```
https://p1-dcd-sign.byteimg.com/...?x-expires=1706400000&x-signature=abc123
```

La fonction `isUnavailableImage()` detecte :
- Les serveurs bloques : `p1-dcd-sign.byteimg.com`, `p3-dcd-sign.byteimg.com`, `p6-dcd-sign.byteimg.com`
- Les signatures expirees via le parametre `x-expires` compare a `Date.now()`

### Proxy d'images (`/api/image-proxy`)

Pour les images CHE168 (`autoimg.cn`), un proxy est necessaire car le CDN exige un referer specifique.

**Endpoint** : `GET /api/image-proxy?url=<encoded_url>&h=<hash>`

| Domaine | Referer envoye |
|---------|---------------|
| `autoimg.cn` (CHE168) | `https://www.che168.com/` |
| `dongchedi.com` | `https://www.dongchedi.com/` |

**Cache du proxy** :
- URLs expirees : `no-store`
- URLs signees : Cache pour la duree restante (max 24h)
- URLs non-expirantes (CHE168) : 24h
- Par defaut : 7 jours

**Fichier** : `app/api/image-proxy/route.ts`

### Composant OptimizedImage

Wrapper autour de `next/image` avec gestion d'erreurs :

- **Retry automatique** : 2 tentatives avec 1s de delai (sauf images expirees)
- **Shimmer loading** : Animation SVG pendant le chargement
- **Fallback** : Placeholder SVG si echec
- **Mode unoptimized** : Active pour les images proxiees et les SVG locaux

**Fichier** : `components/ui/OptimizedImage.tsx`

### Configuration Next.js (domaines autorises)

```typescript
// next.config.ts - remotePatterns
images: {
  remotePatterns: [
    '**.supabase.co',       // Supabase Storage
    'images.unsplash.com',  // Stock
    '**.cloudinary.com',    // CDN
    'ci.encar.com',         // Coree (HTTP + HTTPS)
    '**.byteimg.com',       // Dongchedi (Chine)
    '**.autoimg.cn',        // CHE168 (Chine)
    'dubicars.com',         // Dubai
    'www.dubicars.com',     // Dubai
  ]
}
```

### Upload d'images (admin)

Lors de la creation d'un vehicule par un admin/collaborateur :

1. L'image est uploadee dans le bucket Supabase `vehicle-images`
2. Chemin : `vehicle-images/<uuid-aleatoire>.<extension>`
3. L'URL publique est recuperee via `getPublicUrl()`
4. Le tableau d'URLs est stocke dans le champ `images` du vehicule
5. La premiere image sert de miniature sur les cartes

**Fichier** : `components/collaborator/AddVehicleModal.tsx`

---

## 2. Affichage des vehicules

### Page catalogue (`/cars`)

**Fichier** : `app/(main)/cars/page.tsx`

| Parametre | Valeur |
|-----------|--------|
| Vehicules par page | 36 |
| Grille responsive | 1 col (mobile), 2 col (sm), 3 col (lg) |
| Recherche debounce | 300ms, minimum 3 caracteres |
| Timeout hydratation | 2 secondes |

### Carte vehicule (VehicleCard)

**Fichier** : `components/vehicles/VehicleCard.tsx`

Chaque carte affiche :

```
┌─────────────────────────────┐
│  [Image principale]         │
│  Zoom au survol (scale-105) │
│                             │
│  Badge statut (coin haut G) │
│  Drapeau source (coin bas G)│
│  Bouton favori (coin haut D)│
│  Badge grade (si present)   │
│  Compteur vues (si > 0)     │
├─────────────────────────────┤
│  Marque Modele              │
│  Annee · Transmission · CC  │
│  Kilometrage · Source        │
├─────────────────────────────┤
│  Prix FOB (devise locale)   │
│  ou "Sur demande"           │
└─────────────────────────────┘
```

**Calcul du prix affiche** :
```typescript
const price = vehicle.start_price_usd ?? vehicle.buy_now_price_usd ?? vehicle.current_price_usd;
const displayPrice = price + getExportTax(vehicle.source); // +980 pour Chine
formatPrice(displayPrice); // Converti dans la devise de l'utilisateur
```

### Grille vehicules (VehicleGrid)

**Fichier** : `components/vehicles/VehicleGrid.tsx`

- Grille CSS : `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6`
- Etat de chargement : composant LoadingScreen
- Etat vide : message avec icone voiture et suggestion de modifier les filtres

### Page detail vehicule (`/cars/[id]`)

**Fichier** : `app/(main)/cars/[id]/VehicleDetailClient.tsx`

**Galerie d'images** :
- Navigation fleches gauche/droite
- Animation de transition (Framer Motion, fade)
- Compteur "N / Total"
- Miniatures cliquables en bas
- Premiere image en `priority: true` (preload)
- Taille responsive : `(max-width: 1024px) 100vw, 66vw`

**Layout** : Grille 3 colonnes
- 2 colonnes gauche : images, specifications, equipements, fiche inspection
- 1 colonne droite : prix, estimateur shipping, actions (favori, partager, question)

### Options de tri

| Cle | Tri SQL | Label |
|-----|---------|-------|
| `newest` | `id.desc` | Plus recents |
| `price_asc` | `start_price_usd.asc.nullslast` | Prix croissant |
| `price_desc` | `start_price_usd.desc.nullsfirst` | Prix decroissant |
| `year_desc` | `year.desc.nullslast` | Annee recente |
| `year_asc` | `year.asc.nullslast` | Annee ancienne |
| `mileage_asc` | `mileage.asc.nullslast` | Kilometrage bas |
| `mileage_desc` | `mileage.desc.nullsfirst` | Kilometrage haut |

Chaque tri a un tri secondaire sur `id.desc` pour un ordre stable.

---

## 3. Systeme de filtres

### Store Zustand (`useFilterStore`)

**Fichier** : `store/useFilterStore.ts`

```typescript
interface FilterState {
  source: 'korea' | 'china' | 'dubai' | 'all';  // default: 'all'
  makes: string[];                                 // Marques selectionnees
  models: string[];                                // Modeles selectionnes
  yearFrom: number | undefined;                    // Annee min
  yearTo: number | undefined;                      // Annee max
  priceFrom: number | undefined;                   // Prix min (USD)
  priceTo: number | undefined;                     // Prix max (USD)
  mileageMax: number | undefined;                  // Kilometrage max
  transmission: string | undefined;                // Type boite
  fuelType: string | undefined;                    // Type carburant
  driveType: string | undefined;                   // Type transmission
  bodyType: string | undefined;                    // Type carrosserie
  color: string | undefined;                       // Couleur
  status: string | undefined;                      // Statut vehicule
  search: string | undefined;                      // Recherche texte
  sortBy: SortOption;                              // Tri actif
}
```

**Persistance** : localStorage avec cle `filter-storage` (Zustand persist middleware).

**Methodes** :
- `setFilters(partial)` : Mise a jour partielle
- `resetFilters()` : Reinitialise tout aux valeurs par defaut
- `saveFilter(name)` : Sauvegarde un preset de filtres
- `loadFilter(id)` : Charge un preset sauvegarde
- `deleteFilter(id)` : Supprime un preset

### Filtres disponibles dans l'UI

**Fichier** : `components/vehicles/VehicleFilters.tsx`

| Filtre | Type | Options |
|--------|------|---------|
| Marque | Multi-select, recherchable | Dynamique depuis l'API |
| Modele | Multi-select (si marque selectionnee) | Filtre par marque |
| Pays d'origine | Select avec drapeaux | Coree, Chine, Dubai |
| Carrosserie | Select | SUV, Berline, Hatchback, etc. |
| Annee | Slider range | 2000 → annee courante |
| Prix | Slider range | 0 → 200 000 USD (affiche en devise locale) |
| Kilometrage | Slider | 0 → 500 000 km |
| Transmission | Select | Automatique, Manuelle |
| Carburant | Select | Essence, Diesel, Electrique, Hybride |
| Type de transmission | Select | FWD, RWD, AWD, 4x4 |
| Couleur | Select avec pastilles couleur | 20+ couleurs |

**Filtre de prix** : Les valeurs du slider sont en USD. L'affichage est converti en temps reel dans la devise de l'utilisateur avec format abrege (ex: `3.7M FCFA`, `$6K`).

### Traduction automatique des valeurs

**Fichier** : `lib/hooks/useVehicleFilters.ts`

Les valeurs provenant des differentes sources sont traduites en francais :

```
Transmissions :
  "자동" (coreen)     → "Automatique"
  "自动" (chinois)    → "Automatique"
  "automatic"          → "Automatique"
  "수동" (coreen)     → "Manuelle"
  "手动" (chinois)    → "Manuelle"

Types carburant :
  "가솔린" (coreen)   → "Essence"
  "汽油" (chinois)    → "Essence"
  "petrol" / "gasoline" → "Essence"
  "디젤" (coreen)     → "Diesel"
  "柴油" (chinois)    → "Diesel"
  "电动" (chinois)    → "Electrique"

Carrosserie :
  "紧凑型SUV" (chinois) → "SUV Compact"
  "中大型SUV"           → "SUV Grand"
  "三厢轿车"           → "Berline"
  "两厢轿车"           → "Hatchback"

Couleurs :
  "검정" (coreen)     → "Noir"
  "白色" (chinois)    → "Blanc"
  "black" / "noir"     → "Noir"
```

### Chargement des valeurs de filtres

**Fichier** : `app/api/vehicles/filters/route.ts`

L'API `/api/vehicles/filters` retourne les valeurs distinctes disponibles :

```json
{
  "makes": ["Toyota", "Hyundai", "BYD", ...],
  "transmissions": ["Automatique", "Manuelle"],
  "fuelTypes": ["Essence", "Diesel", "Electrique", "Hybride"],
  "driveTypes": ["FWD", "RWD", "AWD", "4x4"],
  "bodyTypes": ["SUV", "Berline", "Hatchback", ...],
  "colors": ["Noir", "Blanc", "Gris", ...],
  "minYear": 2010,
  "maxYear": 2025
}
```

**Cache** : 1 heure (ISR + HTTP `s-maxage=3600`).

Seuls les vehicules avec `is_visible = true` sont pris en compte.

### Construction de la requete Supabase

**Fichier** : `lib/hooks/useVehicles.ts`

Chaque filtre est traduit en parametre PostgREST :

| Filtre | Operateur PostgREST |
|--------|-------------------|
| `source` | `source=eq.korea` |
| `makes` | `make=in.(Toyota,Hyundai)` |
| `models` | `model=in.(Corolla,Tucson)` |
| `yearFrom` | `year=gte.2020` |
| `yearTo` | `year=lte.2024` |
| `priceFrom` | `current_price_usd=gte.5000` |
| `priceTo` | `current_price_usd=lte.20000` |
| `mileageMax` | `mileage=lte.100000` |
| `transmission` | `transmission=eq.automatic` |
| `fuelType` | `fuel_type=eq.petrol` |
| `driveType` | `drive_type=eq.AWD` |
| `bodyType` | `body_type=eq.SUV` |
| `color` | `color=ilike.*black*` |
| `status` | `status=eq.available` |
| `search` | `or=(make.ilike.*term*,model.ilike.*term*)` |

**Filtre permanent** : `is_visible=eq.true` (toujours applique).

### Comptage des resultats

| Contexte | Methode de comptage |
|----------|-------------------|
| Sans filtre | `count=estimated` (rapide sur 190k+ vehicules) |
| Avec filtres | `count=exact` (precis pour la pagination) |

Le comptage est lu depuis le header HTTP `Content-Range` de la reponse PostgREST.

### React Query (cache client)

**Fichier** : `lib/hooks/useVehicles.ts`

| Parametre | Valeur |
|-----------|--------|
| Stale time | 2 minutes |
| Cache time | 10 minutes |
| Retry | 3 tentatives (backoff exponentiel) |
| Prefetch | Page suivante automatique |
| Placeholder | Garde les anciennes donnees pendant le fetch |

---

## 4. Flux complet (filtre → affichage)

```
┌─────────────────────────────────────────────────────────────┐
│  UTILISATEUR                                                │
│  Selectionne des filtres dans VehicleFilters                │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  ZUSTAND STORE (useFilterStore)                             │
│  Met a jour l'etat des filtres                              │
│  Persiste dans localStorage                                 │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  REACT QUERY (useVehicles)                                  │
│  Detecte le changement de query key                         │
│  Construit les parametres PostgREST via buildQueryString()  │
│  Prefetch la page suivante                                  │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  API SUPABASE (PostgREST)                                   │
│  GET /rest/v1/vehicles?<filtres>&order=<tri>&offset=&limit= │
│  Header: Prefer: count=exact (ou estimated)                 │
│  Retourne: vehicules + Content-Range header                 │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  RENDU                                                      │
│  VehicleGrid → VehicleCard (x36)                            │
│    - parseImagesField(images) → premiere image              │
│    - formatPrice(price + exportTax) → prix devise locale    │
│  Pagination → page courante / total pages                   │
│  Compteur → "X vehicules trouves"                           │
└─────────────────────────────────────────────────────────────┘
```

---

## 5. Fichiers de reference

| Fichier | Role |
|---------|------|
| `lib/utils/imageProxy.ts` | Parse, proxy et detection d'expiration des images |
| `components/ui/OptimizedImage.tsx` | Composant image avec retry et fallback |
| `app/api/image-proxy/route.ts` | Proxy server-side pour CDN chinois |
| `next.config.ts` | Domaines d'images autorises |
| `components/vehicles/VehicleCard.tsx` | Carte vehicule (miniature, prix, specs) |
| `components/vehicles/VehicleGrid.tsx` | Grille responsive de cartes |
| `components/vehicles/VehicleFilters.tsx` | UI des filtres (dropdowns, sliders) |
| `store/useFilterStore.ts` | State management des filtres (Zustand) |
| `lib/hooks/useVehicles.ts` | Requete PostgREST + React Query |
| `lib/hooks/useVehicleFilters.ts` | Traduction des valeurs + chargement des options |
| `app/api/vehicles/filters/route.ts` | API valeurs distinctes pour les filtres |
| `app/(main)/cars/page.tsx` | Page catalogue avec pagination et recherche |
| `app/(main)/cars/[id]/VehicleDetailClient.tsx` | Page detail avec galerie |
| `components/collaborator/AddVehicleModal.tsx` | Upload d'images admin |

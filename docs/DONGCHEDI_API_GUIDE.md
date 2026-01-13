# Guide d'integration API Dongchedi

## Vue d'ensemble

Dongchedi est une plateforme leader de vente de vehicules en Chine. Cette integration permet d'importer les annonces de vehicules d'occasion depuis Dongchedi vers Driveby Africa.

## Configuration

### Variables d'environnement

Ajoutez ces variables dans votre fichier `.env.local`:

```env
# API Dongchedi
DONGCHEDI_API_KEY=iT6g1fVqqGRAHeYkPFtU
```

### Informations de connexion

| Parametre | Valeur |
|-----------|--------|
| API Key | `iT6g1fVqqGRAHeYkPFtU` |
| Base URL API | `https://api1.auto-api.com/api/v2/dongchedi` |
| Export Host | `https://autobase-perez.auto-api.com` |
| Login Export | `ewing` |
| Password Export | `iT6g1fVqqGRAHeYkPFtU` |

---

## Endpoints API internes

### 1. Lister les vehicules

```http
GET /api/dongchedi/offers?page=1
```

**Parametres de filtre:**

| Parametre | Type | Description |
|-----------|------|-------------|
| `page` | number | Numero de page (requis) |
| `mark` | string | Marque (ex: BMW, Toyota) |
| `model` | string | Modele |
| `body_type` | string | Type de carrosserie |
| `transmission_type` | string | Type de transmission |
| `engine_type` | string | Type de moteur |
| `drive_type` | string | Type de traction |
| `color` | string | Couleur |
| `year_from` | number | Annee min |
| `year_to` | number | Annee max |
| `price_from` | number | Prix min (CNY) |
| `price_to` | number | Prix max (CNY) |
| `km_age_from` | number | Kilometrage min |
| `km_age_to` | number | Kilometrage max |
| `normalize` | boolean | Normaliser les donnees (defaut: true) |

**Exemple:**

```bash
curl "http://localhost:3000/api/dongchedi/offers?page=1&mark=BMW&body_type=SUV"
```

**Reponse:**

```json
{
  "data": [
    {
      "source": "china",
      "source_id": "40307747",
      "source_url": "https://www.dongchedi.com/auto/pu-40307747",
      "make": "BMW",
      "model": "X5",
      "year": 2022,
      "mileage": 18500,
      "transmission": "automatic",
      "fuel_type": "petrol",
      "start_price_usd": 37520,
      "images": ["..."]
    }
  ],
  "meta": {
    "page": 1,
    "nextPage": 2,
    "limit": 20,
    "hasMore": true
  }
}
```

### 2. Obtenir les filtres disponibles

```http
GET /api/dongchedi/filters
```

**Reponse:**

```json
{
  "brands": ["Audi", "BMW", "BYD", ...],
  "popularBrands": ["BYD", "Toyota", "Honda", ...],
  "transmissionTypes": ["Automatic", "Manual", "CVT", ...],
  "colors": ["White", "Black", "Silver", ...],
  "bodyTypes": ["SUV", "Sedan", "Hatchback", ...],
  "engineTypes": ["Petrol", "Diesel", "Electric", ...],
  "driveTypes": ["FWD", "RWD", "AWD"]
}
```

### 3. Obtenir un vehicule specifique

```http
GET /api/dongchedi/offer/{inner_id}
```

**Exemple:**

```bash
curl "http://localhost:3000/api/dongchedi/offer/40307747"
```

### 4. Synchroniser les vehicules (Admin)

```http
POST /api/dongchedi/sync
```

**Corps de la requete:**

```json
{
  "mode": "full",      // "full" ou "changes"
  "maxPages": 10,      // Pour mode "full"
  "sinceDays": 1       // Pour mode "changes"
}
```

**Reponse:**

```json
{
  "success": true,
  "mode": "changes",
  "stats": {
    "added": 50,
    "updated": 12,
    "removed": 5,
    "errors": 0,
    "totalProcessed": 67
  },
  "syncedAt": "2025-01-13T12:00:00Z"
}
```

### 5. Synchroniser les photos

```http
POST /api/dongchedi/photos/sync
```

**Corps de la requete:**

```json
{
  "date": "2025-01-12",  // Optionnel (defaut: hier)
  "limit": 100,          // Nombre max de photos
  "dryRun": false        // true = verification sans telechargement
}
```

---

## Gestion des photos

### IMPORTANT: Expiration des liens

Les liens vers les photos sur Dongchedi **expirent apres 6 jours**. Il est donc crucial de:

1. Telecharger les photos sur notre serveur
2. Mettre a jour les liens dans notre base de donnees
3. Executer la synchronisation quotidiennement

### Fichiers d'export disponibles

Les fichiers sont disponibles a partir de **06:00 UTC** chaque jour.

| Fichier | Description |
|---------|-------------|
| `active_offer.csv` | Contient les liens photos avec `synced_at` |
| `all_active.csv` | Toutes les annonces actives |
| `new_daily.csv` | Nouvelles annonces du jour |
| `removed_daily.csv` | Annonces supprimees |

### Telecharger manuellement un fichier

```bash
curl -L -X GET 'https://autobase-perez.auto-api.com/dongchedi/2025-01-12/active_offer.csv' \
  -H 'authorization: Basic ZXdpbmc6aVQ2ZzFmVnFxR1JBSGVZa1BGdFU=' \
  -o active_offer.csv
```

---

## Workflow recommande

### Synchronisation quotidienne

1. **06:30 UTC** - Executer `/api/dongchedi/photos/sync` pour mettre a jour les photos
2. **07:00 UTC** - Executer `/api/dongchedi/sync` avec mode `changes`

### Synchronisation complete (hebdomadaire)

```bash
# Synchronisation complete de toutes les pages
curl -X POST "http://localhost:3000/api/dongchedi/sync" \
  -H "Content-Type: application/json" \
  -d '{"mode": "full", "maxPages": 50}'
```

---

## Mapping des donnees

### Transmission

| Dongchedi | Notre format |
|-----------|--------------|
| Automatic | automatic |
| Manual | manual |
| CVT, E-CVT | cvt |
| DCT, AMT, Sequential | automatic |

### Type de moteur

| Dongchedi | Notre format |
|-----------|--------------|
| Petrol | petrol |
| Diesel | diesel |
| Electric | electric |
| Hybrid, PHEV, EREV | hybrid |
| Bi-Fuel, CNG | lpg |

### Type de traction

| Dongchedi | Notre format |
|-----------|--------------|
| FWD | FWD |
| RWD | RWD |
| AWD, all-wheel | AWD |
| 4WD, 4x4 | 4WD |

### Type de carrosserie

| Dongchedi | Notre format |
|-----------|--------------|
| SUV | suv |
| Sedan | sedan |
| Hatchback, Liftback | hatchback |
| Minivan, Microvan | van |
| Wagon | wagon |
| Coupe, Sports Car | coupe |
| Pickup, Mini Truck | pickup |
| Convertible | convertible |

---

## Conversion de prix

Les prix sur Dongchedi sont en **Yuan (CNY)**. La conversion vers USD utilise un taux approximatif:

```
Prix USD = Prix CNY × 0.14
```

> Note: Pour une precision optimale, implementer une API de taux de change en temps reel.

---

## Structure des fichiers

```
lib/api/dongchedi/
├── index.ts       # Exports
├── config.ts      # Configuration et constantes
├── types.ts       # Types TypeScript
└── service.ts     # Fonctions de service

app/api/dongchedi/
├── offers/route.ts           # Liste des vehicules
├── filters/route.ts          # Filtres disponibles
├── offer/[id]/route.ts       # Detail vehicule
├── sync/route.ts             # Synchronisation DB
└── photos/sync/route.ts      # Synchronisation photos
```

---

## Bucket Supabase pour les photos

Creer un bucket public dans Supabase Storage:

1. Aller dans **Storage** > **New bucket**
2. Nom: `dongchedi-photos`
3. Public: **Oui**
4. Allowed MIME types: `image/*`

---

## Cron job (Vercel)

Ajouter dans `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/dongchedi/photos/sync",
      "schedule": "30 6 * * *"
    },
    {
      "path": "/api/dongchedi/sync",
      "schedule": "0 7 * * *"
    }
  ]
}
```

---

## Support

Pour toute question sur l'API:

- Documentation officielle: https://auto-api.com/dongchedi
- Contact fournisseur: Contacter auto-api.com

---

## Checklist de mise en production

- [ ] Ajouter `DONGCHEDI_API_KEY` aux variables d'environnement
- [ ] Creer le bucket `dongchedi-photos` dans Supabase Storage
- [ ] Configurer les cron jobs pour la synchronisation
- [ ] Tester la synchronisation complete
- [ ] Informer le fournisseur que le telechargement des photos est configure

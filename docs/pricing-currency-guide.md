# Gestion des Prix et Devises - DriveBy Africa

## Architecture globale

Tous les prix sont **stockes en USD** dans la base de donnees. La conversion vers la devise de l'utilisateur se fait cote client en temps reel.

```
Base de donnees (USD) → API /currencies (taux) → Client (devise locale)
```

---

## 1. Champs de prix en base (table `vehicles`)

| Champ | Description |
|-------|-------------|
| `start_price_usd` | Prix de depart / prix d'achat source (en USD) |
| `buy_now_price_usd` | Prix d'achat immediat (en USD) |
| `current_price_usd` | Prix actuel / derniere enchere (en USD) |
| `effective_price_usd` | Prix calcule = `start_price_usd` + taxe export (pour Chine) |

**Priorite d'affichage du prix :**
```
start_price_usd ?? buy_now_price_usd ?? current_price_usd
```
Si aucun prix n'est disponible → affiche "Sur demande".

---

## 2. Regles de calcul par source

### Taxe d'export

| Source | Taxe export (USD) | Fichier |
|--------|-------------------|---------|
| Chine `china` | **980 USD** | `lib/utils/pricing.ts` |
| Coree `korea` | 0 USD | |
| Dubai `dubai` | 0 USD | |

```typescript
// lib/utils/pricing.ts
export const EXPORT_TAX_USD = {
  china: 980,
  korea: 0,
  dubai: 0,
};
```

**Important** : La taxe export est ajoutee **silencieusement** au prix affiche. L'utilisateur voit le prix FOB final sans detail de la taxe.

```typescript
// Affichage sur les cartes et pages detail
const displayPrice = price + getExportTax(vehicle.source);
```

### Frais fixes

| Frais | Montant | Usage |
|-------|---------|-------|
| Assurance cargo | **2.5%** du total (vehicule + taxe export + shipping) | Devis |
| Inspection & documents | **225 000 FCFA** / ~350 USD | Devis |

---

## 3. Frais de livraison (Shipping)

### Types d'expedition

| Type | Multiplicateur | Description |
|------|---------------|-------------|
| Container seul (20HQ) | **x1.0** | Container dedie exclusif |
| Groupage maritime | **x0.5** | Container partage |

### Couts par destination (USD, container seul)

Les couts sont stockes dans la table `shipping_routes` en base. Valeurs de secours :

| Destination | Coree | Chine | Dubai |
|-------------|-------|-------|-------|
| Libreville (Gabon) | 3 600 | 4 200 | 3 200 |
| Douala (Cameroun) | 3 400 | 4 000 | 3 000 |
| Dakar (Senegal) | 4 600 | 5 200 | 4 200 |
| Abidjan (Cote d'Ivoire) | 4 200 | 4 800 | 3 800 |

Les destinations sont gerees dans **Admin > Shipping** et chargees via `/api/shipping`.

### Calcul complet d'un devis

```
Prix vehicule (USD)
+ Taxe export (Chine = 980 USD, autres = 0)
= Prix effectif

Shipping (USD) x multiplicateur (1.0 ou 0.5)
= Cout shipping

Assurance = 2.5% x (prix effectif + shipping)

Inspection = 225 000 FCFA

TOTAL = prix effectif + shipping + assurance + inspection
```

**Exemple : vehicule chinois a 5 000 USD, container vers Libreville**

```
Prix vehicule :    5 000 USD
Taxe export :      + 980 USD
Prix effectif :    5 980 USD

Shipping :         4 200 USD x 1.0 = 4 200 USD

Sous-total :       10 180 USD

Assurance (2.5%) : 254 USD
Inspection :       350 USD

TOTAL :            10 784 USD
En FCFA (x615) :   6 632 160 FCFA
```

---

## 4. Systeme de devises

### API `/api/currencies`

Retourne toutes les devises actives avec leurs taux. Source prioritaire : table `currency_rates` en base, sinon valeurs par defaut.

### Taux par defaut (fallback)

| Devise | Taux (1 USD =) | Zone |
|--------|---------------|------|
| USD | 1 | Reference |
| EUR | 0.92 | Europe |
| XAF | 615 | Afrique Centrale (BEAC) |
| XOF | 615 | Afrique de l'Ouest (BCEAO) |
| NGN | 1 550 | Nigeria |
| GHS | 15.5 | Ghana |
| KES | 154 | Kenya |
| ZAR | 18.5 | Afrique du Sud |
| MAD | 10.1 | Maroc |
| EGP | 50.5 | Egypte |
| MGA | 4 650 | Madagascar |

71 devises africaines sont supportees au total. Voir `app/api/currencies/route.ts` pour la liste complete.

### Mise a jour des taux

1. **Automatique** : API frankfurter.app (gratuit, sans cle) avec cache 1h (`lib/utils/realtime-exchange.ts`)
2. **Manuelle** : Page admin `/admin/currencies` pour ajuster les taux
3. **Rafraichissement client** : Toutes les 12h via `LocaleProvider`

### Hierarchie des taux

```
1. Taux dynamiques (API frankfurter.app) - priorite haute
2. Taux base de donnees (table currency_rates)
3. Taux par defaut codes en dur - fallback
```

---

## 5. Formatage des prix

### Regles par devise (`lib/utils/currency.ts`)

| Devise | Format | Exemple |
|--------|--------|---------|
| XAF / XOF | `{montant} FCFA` | `6 632 160 FCFA` |
| USD | `${montant}` | `$10 784` |
| EUR | `{montant} €` | `9 920 €` |
| NGN | `₦{montant}` | `₦16 714 800` |
| Autres | `{montant} {code}` | `199 482 KES` |

Separateur de milliers : **espace** (standard francophone).

### Format abrege (filtres)

```typescript
// formatUsdToFcfaShort()
6 632 160 → "6.6M"
615 000   → "615K"
```

---

## 6. Devises de devis (quotes)

Seules 3 devises sont acceptees pour les devis officiels :

| Devise | Acceptee pour devis |
|--------|-------------------|
| **USD** | Oui |
| **EUR** | Oui |
| **XAF** | Oui |
| Autres (NGN, KES, etc.) | Non - devis genere en USD |

Si l'utilisateur navigue en NGN, les prix sont affiches en NGN mais le devis sera genere en USD.

---

## 7. Flux de donnees complet

```
┌─────────────────────────────────────────────────────────────┐
│                    BASE DE DONNEES                          │
│                                                             │
│  vehicles.start_price_usd  ──┐                              │
│  vehicles.buy_now_price_usd ─┼──► Prix de base (USD)        │
│  vehicles.current_price_usd ─┘                              │
│                                                             │
│  shipping_routes.{korea,china,dubai}_cost_usd               │
│  currency_rates.rate_to_usd                                 │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                    SERVEUR (API)                             │
│                                                             │
│  /api/currencies     → Taux de change actifs                │
│  /api/shipping       → Couts de livraison par destination   │
│  /api/exchange-rate  → Taux temps reel (frankfurter.app)    │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                    CLIENT (React)                            │
│                                                             │
│  LocaleProvider                                             │
│    ├── Detecte le pays → devise par defaut                  │
│    ├── Charge les taux depuis /api/currencies               │
│    └── Expose useCurrency() hook                            │
│                                                             │
│  useCurrency()                                              │
│    ├── formatPrice(amountUsd) → affichage devise locale     │
│    ├── convertFromUsd(amountUsd) → montant converti         │
│    └── formatQuotePrice(amountUsd) → prix devise devis      │
│                                                             │
│  Affichage prix = prix_base + getExportTax(source)          │
│  Devis = prix + taxe + shipping + assurance + inspection    │
└─────────────────────────────────────────────────────────────┘
```

---

## 8. Fichiers de reference

| Fichier | Role |
|---------|------|
| `lib/utils/pricing.ts` | Constantes (taxe export, assurance, inspection) et calcul de devis |
| `lib/utils/currency.ts` | Taux par defaut, formatage, conversion entre devises |
| `lib/utils/realtime-exchange.ts` | Taux temps reel via frankfurter.app |
| `components/providers/LocaleProvider.tsx` | Contexte React pour devise, hook `useCurrency()` |
| `store/useLocaleStore.ts` | Persistance langue/devise/pays (Zustand + localStorage) |
| `app/api/currencies/route.ts` | API CRUD devises (71 devises africaines) |
| `app/api/shipping/route.ts` | API destinations et couts shipping |
| `app/api/exchange-rate/route.ts` | API taux de change temps reel |
| `components/vehicles/ShippingEstimator.tsx` | Composant estimateur + calcul de devis |
| `components/vehicles/VehicleCard.tsx` | Affichage prix sur les cartes |

---

## 9. Configuration admin

### Modifier les taux de change
→ Page `/admin/currencies`
- Rechercher une devise
- Modifier le taux
- Activer/desactiver une devise
- Historique des changements

### Modifier les couts de livraison
→ Page `/admin/shipping` ou table `shipping_routes`
- Cout par source (Coree, Chine, Dubai) par destination
- Activer/desactiver une destination

### Modifier la taxe export
→ Fichier `lib/utils/pricing.ts` > `EXPORT_TAX_USD`
- Ajouter/modifier la taxe par source

### Modifier l'assurance ou l'inspection
→ Fichier `lib/utils/pricing.ts`
- `INSURANCE_RATE` : taux d'assurance (defaut 2.5%)
- `INSPECTION_FEE_XAF` : frais inspection en FCFA (defaut 225 000)
- `INSPECTION_FEE_USD` : frais inspection en USD (defaut 350)

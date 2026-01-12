# Driveby Africa

Plateforme d'importation de véhicules pour l'Afrique depuis la Corée du Sud, la Chine et Dubaï.

[![Netlify Status](https://api.netlify.com/api/v1/badges/your-badge-id/deploy-status)](https://app.netlify.com/sites/drivebyafrica/deploys)

## Technologies

- **Frontend**: Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Auth, Storage, Realtime)
- **State**: Zustand
- **Animations**: Framer Motion
- **Icons**: Lucide React

## Fonctionnalités

- Catalogue de véhicules multi-sources (Corée, Chine, Dubaï)
- Système d'enchères en temps réel
- Gestion des commandes avec suivi
- Authentification (Email, Téléphone OTP, Google)
- Dashboard utilisateur
- Design responsive

## Installation

```bash
# Cloner le repository
git clone https://github.com/FranckSowax/drivebyafrica.git
cd drivebyafrica

# Installer les dépendances
npm install

# Copier les variables d'environnement
cp .env.example .env.local

# Lancer en développement
npm run dev
```

## Variables d'environnement

Créez un fichier `.env.local` avec :

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Déploiement Netlify

### Option 1: Déploiement automatique (Recommandé)

1. Allez sur [Netlify](https://app.netlify.com)
2. Cliquez sur "Add new site" > "Import an existing project"
3. Connectez votre compte GitHub et sélectionnez `FranckSowax/drivebyafrica`
4. Configuration du build :
   - **Build command**: `npm run build`
   - **Publish directory**: `.next`
5. Ajoutez les variables d'environnement (voir ci-dessous)
6. Cliquez "Deploy site"

### Option 2: Netlify CLI

```bash
# Installer Netlify CLI
npm install -g netlify-cli

# Login
netlify login

# Initialiser le site
netlify init

# Déployer
netlify deploy --prod
```

### Variables d'environnement Netlify

Dans **Netlify Dashboard > Site Settings > Environment Variables**, ajoutez :

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | URL de votre projet Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clé anonyme Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Clé service role Supabase |
| `NEXT_PUBLIC_APP_URL` | URL de votre site (ex: https://drivebyafrica.netlify.app) |

## Structure du projet

```
├── app/
│   ├── (auth)/          # Pages d'authentification
│   ├── (main)/          # Pages principales
│   │   ├── cars/        # Catalogue véhicules
│   │   ├── auctions/    # Salle d'enchères
│   │   └── dashboard/   # Dashboard utilisateur
│   └── auth/            # Callback OAuth
├── components/
│   ├── ui/              # Composants UI réutilisables
│   ├── layout/          # Header, Footer, Sidebar
│   ├── vehicles/        # Composants véhicules
│   ├── auction/         # Composants enchères
│   └── orders/          # Composants commandes
├── lib/
│   ├── supabase/        # Clients Supabase
│   ├── hooks/           # Custom hooks
│   └── utils/           # Utilitaires
├── store/               # Zustand stores
├── types/               # Types TypeScript
└── supabase/
    └── migrations/      # Migrations SQL
```

## Configuration Supabase

1. Créez un projet sur [Supabase](https://supabase.com)
2. Exécutez les migrations dans `supabase/migrations/`
3. Configurez l'authentification :
   - Email/Password
   - Phone (SMS via Twilio)
   - Google OAuth
4. Copiez les clés API dans vos variables d'environnement

## Scripts

```bash
npm run dev      # Développement
npm run build    # Build production
npm run start    # Démarrer en production
npm run lint     # Linter
```

## Licence

MIT

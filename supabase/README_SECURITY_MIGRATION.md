# 🔐 Migration de Sécurité RLS - Guide Rapide

## 🎯 Objectif

Cette migration corrige des vulnérabilités de sécurité critiques dans les politiques RLS (Row Level Security) de la base de données Supabase.

## 🔴 Problèmes Corrigés

1. **Chat Conversations** : Tous les utilisateurs authentifiés pouvaient voir toutes les conversations
2. **Politiques manquantes** : Pas de protection UPDATE/DELETE sur plusieurs tables critiques

## 📦 Fichier de Migration

`migrations/20250124_secure_rls_policies.sql`

## 🚀 Application (3 options)

### Option 1 : Dashboard Supabase ⭐ RECOMMANDÉ

1. Ouvrez [https://app.supabase.com](https://app.supabase.com)
2. Sélectionnez votre projet
3. Allez dans **SQL Editor**
4. Créez une nouvelle requête
5. Copiez tout le contenu de `migrations/20250124_secure_rls_policies.sql`
6. Cliquez sur **Run**

### Option 2 : Script Node.js

```bash
cd supabase-mcp-server
node apply-security-migration.js
```

**Prérequis** : `SUPABASE_SERVICE_ROLE_KEY` dans votre `.env`

### Option 3 : Supabase CLI

```bash
supabase db push
```

## ✅ Vérification

Après application, testez :

1. **Chat** : Un utilisateur normal ne doit voir que ses propres conversations
2. **Vehicles** : Un utilisateur normal ne doit pas pouvoir modifier les véhicules
3. **Transactions** : Personne ne doit pouvoir modifier les transactions existantes

## 📖 Documentation Complète

- **Rapport détaillé** : Voir `/SECURITY_FIX_REPORT.md`
- **Analyse base de données** : Voir `/SUPABASE_DATABASE_ANALYSIS.md`

## ⚠️ Important

- ✅ Cette migration ne casse aucune fonctionnalité utilisateur
- ✅ Les admins conservent tous leurs droits
- ✅ Les données ne sont pas modifiées, seules les politiques d'accès changent

## 🆘 Support

En cas de problème, consultez le rapport détaillé dans `/SECURITY_FIX_REPORT.md`

---

**Créé le** : 24 janvier 2026
**Statut** : ⚠️ En attente d'application

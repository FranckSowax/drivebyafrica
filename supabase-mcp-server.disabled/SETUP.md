# Configuration du Serveur MCP Supabase pour Driveby Africa

## ✅ Configuration Terminée

Le serveur MCP Supabase est maintenant configuré et prêt à être utilisé avec votre projet Driveby Africa.

### 📋 Informations de Configuration

- **URL Supabase**: `https://ggwfilyahaljqqsookls.supabase.co`
- **Clé anonyme**: Configurée dans `.env`
- **22 outils MCP** disponibles

---

## 🚀 Utilisation avec Claude Desktop

### Étape 1: Copier la Configuration

Le fichier de configuration Claude Desktop a été créé: [claude-desktop-config.json](./claude-desktop-config.json)

### Étape 2: Intégrer à Claude Desktop

1. **Localiser le fichier de configuration de Claude Desktop** :
   ```
   ~/Library/Application Support/Claude/claude_desktop_config.json
   ```

2. **Option A - Remplacer complètement** (si vous n'avez pas d'autres serveurs MCP) :
   ```bash
   cp claude-desktop-config.json ~/Library/Application\ Support/Claude/claude_desktop_config.json
   ```

3. **Option B - Fusionner** (si vous avez déjà d'autres serveurs MCP) :
   - Ouvrez `~/Library/Application Support/Claude/claude_desktop_config.json`
   - Ajoutez cette section dans `mcpServers`:

   ```json
   "supabase-drivebyafrica": {
     "command": "node",
     "args": [
       "/Users/user/Downloads/drivebyafrica-main/supabase-mcp-server/dist/index.js"
     ],
     "env": {
       "SUPABASE_URL": "https://ggwfilyahaljqqsookls.supabase.co",
       "SUPABASE_ANON_KEY": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdnd2ZpbHlhaGFsanFxc29va2xzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgyMzYzMjcsImV4cCI6MjA4MzgxMjMyN30.-ml_nY2KWxFwm4V8mI-zcMr9uyYUtIT0Rfh_i4u13Os"
     }
   }
   ```

### Étape 3: Redémarrer Claude Desktop

Fermez complètement Claude Desktop et relancez-le pour charger la nouvelle configuration.

---

## 🛠️ Outils Disponibles

Une fois configuré, vous aurez accès à ces outils dans Claude Desktop :

### 📊 Base de Données (7 outils)
- `supabase_select` - Requêter des données avec filtres
- `supabase_insert` - Insérer des enregistrements
- `supabase_update` - Mettre à jour des enregistrements
- `supabase_delete` - Supprimer des enregistrements
- `supabase_upsert` - Insérer ou mettre à jour
- `supabase_rpc` - Appeler des fonctions Postgres
- `supabase_count` - Compter des enregistrements

### 🔐 Authentification (6 outils)
- `supabase_auth_sign_up` - Créer un utilisateur
- `supabase_auth_sign_in` - Connexion
- `supabase_auth_sign_out` - Déconnexion
- `supabase_auth_get_user` - Obtenir l'utilisateur actuel
- `supabase_auth_update_user` - Mettre à jour l'utilisateur
- `supabase_auth_reset_password` - Réinitialiser le mot de passe

### 📦 Stockage (5 outils)
- `supabase_storage_list_buckets` - Lister les buckets
- `supabase_storage_upload` - Uploader un fichier
- `supabase_storage_list_files` - Lister les fichiers
- `supabase_storage_get_public_url` - Obtenir l'URL publique
- `supabase_storage_create_signed_url` - Créer une URL signée

### ⚡ Realtime (3 outils)
- `supabase_realtime_subscribe` - S'abonner aux changements
- `supabase_realtime_unsubscribe` - Se désabonner
- `supabase_realtime_broadcast` - Diffuser un message

---

## 💡 Exemples d'Utilisation

### Requêter des véhicules
```
Utilise supabase_select pour me montrer les 10 derniers véhicules de la table vehicles
```

### Créer un profil utilisateur
```
Utilise supabase_insert pour créer un nouveau profil avec full_name="John Doe" et country="Gabon"
```

### Lister les buckets de stockage
```
Utilise supabase_storage_list_buckets pour voir tous les buckets disponibles
```

---

## 🔧 Développement et Tests

### Tester le serveur localement
```bash
# Build
npm run build

# Tester avec MCP Inspector
npm run inspector

# Exécuter directement
npm run dev
```

### Modifier les variables d'environnement
Éditez le fichier `.env` dans ce répertoire pour changer les clés Supabase.

### Ajouter une clé de service (admin)
Pour activer les outils d'administration, ajoutez dans `.env` :
```env
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

---

## 📚 Documentation Complète

Consultez [README.md](./README.md) pour la documentation complète incluant :
- Tous les paramètres de chaque outil
- Exemples détaillés
- Considérations de sécurité
- Architecture du code

---

## ✅ Vérification

Pour vérifier que tout fonctionne :

1. **Vérifier le build**:
   ```bash
   npm run build
   ```

2. **Tester le serveur**:
   ```bash
   node dist/index.js
   ```
   Vous devriez voir: `[Server] Supabase MCP server running on stdio`

3. **Dans Claude Desktop**: Après redémarrage, vous devriez voir le serveur `supabase-drivebyafrica` dans la liste des outils disponibles.

---

## 🆘 Dépannage

### Le serveur ne démarre pas
- Vérifiez que Node.js est installé: `node --version`
- Vérifiez que les dépendances sont installées: `npm install`
- Vérifiez le fichier `.env` existe et contient les bonnes valeurs

### Claude Desktop ne voit pas le serveur
- Vérifiez que le chemin dans `claude_desktop_config.json` est correct
- Redémarrez complètement Claude Desktop
- Vérifiez les logs de Claude Desktop pour des erreurs

### Erreurs d'authentification Supabase
- Vérifiez que la clé `SUPABASE_ANON_KEY` est correcte
- Vérifiez que l'URL Supabase est accessible
- Pour les opérations admin, ajoutez `SUPABASE_SERVICE_ROLE_KEY`

---

**Le serveur MCP Supabase est maintenant configuré et prêt à l'emploi ! 🎉**

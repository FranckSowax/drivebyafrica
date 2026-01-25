# Configuration Encar Sync

## 🔑 Configuration GitHub Secret (REQUIS)

Pour que le workflow Encar fonctionne, vous devez configurer le secret `ENCAR_API_KEY` dans GitHub.

### Étapes de configuration:

1. **Allez sur votre repository GitHub**
   ```
   https://github.com/FranckSowax/drivebyafrica
   ```

2. **Accédez aux Secrets**
   - Cliquez sur **Settings** (en haut à droite)
   - Dans le menu de gauche, cliquez sur **Secrets and variables** → **Actions**

3. **Ajoutez le secret**
   - Cliquez sur **New repository secret**
   - **Name**: `ENCAR_API_KEY`
   - **Value**: `iT6g1fVqqGRAHeYkPFtU`
   - Cliquez sur **Add secret**

## ✅ Vérification

Une fois le secret configuré, vous pouvez:

1. **Tester manuellement le workflow**:
   - Allez dans l'onglet **Actions**
   - Sélectionnez **Encar Daily Sync**
   - Cliquez sur **Run workflow**
   - Cliquez sur **Run workflow** (confirmation)

2. **Attendre le sync automatique**:
   - Le workflow s'exécute automatiquement à **5:00 AM GMT** chaque jour

## 📊 Marques synchronisées

Le sync filtre uniquement ces marques populaires:

### Coréennes 🇰🇷
- Hyundai
- Kia
- KGM (SsangYong)
- Genesis

### Japonaises 🇯🇵
- Toyota
- Honda
- Lexus
- Nissan
- Mazda
- Mitsubishi
- Suzuki
- Subaru

### Américaines 🇺🇸
- Chevrolet
- ChevroletGMDaewoo
- GM

## 📈 Statistiques

Le sync génère des statistiques détaillées dans GitHub Actions:
- Véhicules récupérés de l'API
- Véhicules filtrés par marque
- Véhicules ajoutés/mis à jour
- Véhicules supprimés (expirés)
- Véhicules ignorés (sans images)
- Erreurs éventuelles

## ⚙️ Configuration avancée

### Modifier le nombre de pages
Par défaut, le sync traite 2000 pages (~40,000 véhicules avant filtrage).

Pour changer:
1. Allez dans **Actions** → **Encar Daily Sync**
2. Cliquez sur **Run workflow**
3. Modifiez `max_pages` (ex: 5000)
4. Lancez le workflow

### Désactiver la suppression des véhicules expirés
Par défaut, les véhicules qui ne sont plus sur Encar sont supprimés.

Pour désactiver:
1. Allez dans **Actions** → **Encar Daily Sync**
2. Cliquez sur **Run workflow**
3. Décochez `remove_expired`
4. Lancez le workflow

## 🐛 Résolution de problèmes

### Erreur: "ENCAR_API_KEY not configured"
→ Suivez les étapes de configuration ci-dessus

### Workflow timeout
→ Réduisez `max_pages` ou contactez le support

### Pas de véhicules ajoutés
→ Vérifiez que les marques dans l'API correspondent aux filtres
→ Vérifiez les logs pour voir les véhicules filtrés

## 📞 Support

Pour tout problème:
1. Vérifiez les logs dans **Actions**
2. Vérifiez que le secret est bien configuré
3. Contactez l'équipe technique si nécessaire

# Configuration MCP Supabase pour Driveby Africa

Ce guide explique comment configurer le serveur MCP Supabase pour permettre à Claude Code d'interagir directement avec votre base de données Supabase.

## Qu'est-ce que MCP Supabase ?

Le Model Context Protocol (MCP) est un protocole qui permet à Claude d'interagir avec des services externes. Le serveur MCP Supabase offre les capacités suivantes :

- Lister les projets et organisations Supabase
- Exécuter des requêtes SQL en lecture seule
- Gérer les tables et le schéma de la base de données
- Créer et gérer les fonctions Edge
- Appliquer des migrations de base de données

## Prérequis

1. Un compte Supabase avec un projet existant
2. Node.js 18+ installé
3. Claude Code ou Cursor installé

## Étapes de configuration

### 1. Obtenir le token d'accès Supabase

1. Connectez-vous à [Supabase Dashboard](https://supabase.com/dashboard)
2. Allez dans **Account** → **Access Tokens**
3. Cliquez sur **Generate new token**
4. Donnez un nom descriptif (ex: "Claude MCP")
5. Copiez le token généré

### 2. Configurer la variable d'environnement

Ajoutez le token à votre fichier `.env.local` :

```bash
SUPABASE_ACCESS_TOKEN=sbp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### 3. Configuration pour Claude Code

Le fichier `.claude/settings.local.json` a déjà été configuré :

```json
{
  "mcpServers": {
    "supabase": {
      "command": "npx",
      "args": [
        "-y",
        "@supabase/mcp-server-supabase@latest",
        "--access-token",
        "${SUPABASE_ACCESS_TOKEN}"
      ]
    }
  },
  "permissions": {
    "allow": [
      "mcp__supabase__*"
    ]
  }
}
```

### 4. Configuration pour Cursor

Le fichier `.cursor/mcp.json` a déjà été configuré :

```json
{
  "mcpServers": {
    "supabase": {
      "command": "npx",
      "args": [
        "-y",
        "@supabase/mcp-server-supabase@latest",
        "--access-token",
        "${SUPABASE_ACCESS_TOKEN}"
      ]
    }
  }
}
```

## Utilisation

Une fois configuré, vous pouvez demander à Claude de :

- **Lister les tables** : "Montre-moi les tables de ma base de données Supabase"
- **Exécuter des requêtes** : "Exécute SELECT * FROM vehicles LIMIT 10"
- **Créer des migrations** : "Crée une migration pour ajouter une colonne 'color' à la table vehicles"
- **Vérifier le schéma** : "Décris la structure de la table orders"

## Commandes MCP disponibles

| Commande | Description |
|----------|-------------|
| `list_projects` | Liste tous vos projets Supabase |
| `get_project` | Obtient les détails d'un projet |
| `list_tables` | Liste les tables d'une base de données |
| `execute_sql` | Exécute une requête SQL (lecture seule par défaut) |
| `apply_migration` | Applique une migration SQL |
| `list_functions` | Liste les fonctions Edge |
| `create_function` | Crée une nouvelle fonction Edge |

## Sécurité

- Le token d'accès Supabase donne accès à **tous** vos projets
- Ne commitez **jamais** le fichier `.claude/settings.local.json` (déjà dans .gitignore)
- Utilisez des tokens avec les permissions minimales nécessaires
- Révoquez les tokens inutilisés depuis le dashboard Supabase

## Dépannage

### Le serveur MCP ne démarre pas

1. Vérifiez que Node.js 18+ est installé : `node --version`
2. Vérifiez que le token est valide
3. Essayez de lancer manuellement :
   ```bash
   npx -y @supabase/mcp-server-supabase@latest --access-token $SUPABASE_ACCESS_TOKEN
   ```

### Claude ne voit pas le serveur MCP

1. Redémarrez Claude Code / Cursor
2. Vérifiez que le fichier de configuration est au bon endroit
3. Vérifiez les permissions du fichier

## Ressources

- [Documentation MCP Supabase](https://github.com/supabase/mcp-server-supabase)
- [Model Context Protocol](https://modelcontextprotocol.io/)
- [Supabase Documentation](https://supabase.com/docs)

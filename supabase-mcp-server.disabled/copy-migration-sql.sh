#!/bin/bash

# Script pour copier le SQL de migration dans le presse-papiers

echo ""
echo "📋 Copie du SQL de migration dans le presse-papiers..."
echo ""

MIGRATION_FILE="../supabase/migrations/20250124_secure_rls_policies.sql"

if [ ! -f "$MIGRATION_FILE" ]; then
    echo "❌ Fichier de migration non trouvé: $MIGRATION_FILE"
    exit 1
fi

# Copier dans le presse-papiers (macOS)
if command -v pbcopy &> /dev/null; then
    cat "$MIGRATION_FILE" | pbcopy
    echo "✅ SQL copié dans le presse-papiers (macOS)!"
elif command -v xclip &> /dev/null; then
    cat "$MIGRATION_FILE" | xclip -selection clipboard
    echo "✅ SQL copié dans le presse-papiers (Linux)!"
elif command -v clip &> /dev/null; then
    cat "$MIGRATION_FILE" | clip
    echo "✅ SQL copié dans le presse-papiers (Windows)!"
else
    echo "⚠️  Outil de presse-papiers non trouvé"
    echo "   Copiez manuellement le fichier: $MIGRATION_FILE"
    exit 1
fi

echo ""
echo "🚀 PROCHAINES ÉTAPES:"
echo ""
echo "1. Ouvrez https://app.supabase.com"
echo "2. Sélectionnez votre projet Driveby Africa"
echo "3. Menu gauche → SQL Editor"
echo "4. New query"
echo "5. Collez (Cmd+V) - Le SQL est déjà dans votre presse-papiers!"
echo "6. Run (Ctrl+Enter)"
echo ""
echo "✅ C'est tout! La migration sera appliquée."
echo ""


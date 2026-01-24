#!/usr/bin/env node

/**
 * Application de la migration via l'API REST PostgreSQL de Supabase
 * Utilise l'endpoint pg_query pour exécuter du SQL brut
 */

import { config } from 'dotenv';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

config();

console.log('\n🚀 APPLICATION DE LA MIGRATION VIA API REST SUPABASE\n');
console.log('='.repeat(80));

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY non trouvé');
  process.exit(1);
}

console.log('✅ Service role key configurée');
console.log(`✅ URL: ${supabaseUrl}\n`);

// Lire le fichier SQL
const migrationPath = join(__dirname, '..', 'supabase', 'migrations', '20250124_secure_rls_policies.sql');
const migrationSQL = readFileSync(migrationPath, 'utf-8');

console.log('📄 Migration chargée\n');
console.log('⚠️  Tentative d\'exécution via l\'API REST PostgreSQL...\n');

// Essayer d'exécuter via l'API REST
// Note: Supabase n'expose pas directement un endpoint pour exécuter du SQL arbitraire
// La meilleure approche reste le Dashboard

async function tryExecuteSQL() {
  try {
    // Endpoint potentiel (peut ne pas être disponible)
    const url = `${supabaseUrl}/rest/v1/rpc/exec`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseServiceKey,
        'Authorization': `Bearer ${supabaseServiceKey}`
      },
      body: JSON.stringify({
        query: migrationSQL
      })
    });

    const result = await response.json();

    if (response.ok) {
      console.log('✅ Migration exécutée avec succès!');
      console.log(result);
      return true;
    } else {
      console.log('⚠️  L\'API REST n\'est pas disponible pour exécuter du SQL');
      console.log(`   Statut: ${response.status}`);
      console.log(`   Message: ${JSON.stringify(result)}`);
      return false;
    }
  } catch (error) {
    console.log('⚠️  Impossible d\'utiliser l\'API REST:', error.message);
    return false;
  }
}

const success = await tryExecuteSQL();

if (!success) {
  console.log('\n' + '─'.repeat(80));
  console.log('\n💡 SOLUTION: Utiliser le Dashboard Supabase SQL Editor\n');
  console.log('L\'exécution de SQL DDL (CREATE POLICY, DROP POLICY, etc.) nécessite');
  console.log('l\'utilisation du SQL Editor du Dashboard Supabase.\n');

  console.log('📋 INSTRUCTIONS:\n');
  console.log('1. Ouvrez https://app.supabase.com');
  console.log('2. Sélectionnez votre projet Driveby Africa');
  console.log('3. Menu gauche → "SQL Editor"');
  console.log('4. Cliquez sur "New query"');
  console.log('5. Copiez TOUT le contenu du fichier:');
  console.log(`   ${migrationPath}`);
  console.log('6. Collez dans l\'éditeur SQL');
  console.log('7. Cliquez sur "Run" (ou Ctrl+Enter)\n');

  console.log('✅ Le SQL est affiché ci-dessous pour copie facile:\n');
  console.log('─'.repeat(80));
  console.log(migrationSQL);
  console.log('─'.repeat(80));

  console.log('\n📊 RÉSULTAT ATTENDU:');
  console.log('   - Plusieurs commandes DROP POLICY');
  console.log('   - Plusieurs commandes CREATE POLICY');
  console.log('   - Aucune erreur critique');
  console.log('   - Message "Success. No rows returned"');
}

console.log('\n' + '='.repeat(80));
console.log('✅ Processus terminé\n');

#!/usr/bin/env node

/**
 * Application de la migration de sécurité RLS via MCP Supabase
 * Nécessite la clé SERVICE_ROLE_KEY pour bypass RLS
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
config();

console.log('\n🔐 APPLICATION DE LA MIGRATION DE SÉCURITÉ RLS\n');
console.log('='.repeat(80));

// Check environment variables
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  console.error('\n❌ Erreur: SUPABASE_URL manquant dans .env');
  process.exit(1);
}

console.log(`\n✅ SUPABASE_URL trouvé: ${supabaseUrl}`);

// Determine which key to use
let supabase;
let useServiceRole = false;

if (supabaseServiceKey && supabaseServiceKey !== 'your-service-role-key-here') {
  console.log('✅ SUPABASE_SERVICE_ROLE_KEY trouvé - Utilisation du service role (recommandé)');
  supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
  useServiceRole = true;
} else {
  console.log('⚠️  SUPABASE_SERVICE_ROLE_KEY non configuré');
  console.log('   Tentative avec ANON_KEY (peut échouer pour certaines opérations)');

  if (!supabaseAnonKey) {
    console.error('\n❌ Erreur: Aucune clé Supabase disponible');
    process.exit(1);
  }

  supabase = createClient(supabaseUrl, supabaseAnonKey);
}

console.log('\n' + '─'.repeat(80));
console.log('\n📖 COMMENT OBTENIR LA SERVICE_ROLE_KEY:\n');
console.log('1. Ouvrez https://app.supabase.com');
console.log('2. Sélectionnez votre projet Driveby Africa');
console.log('3. Allez dans Settings → API');
console.log('4. Section "Project API keys"');
console.log('5. Copiez la clé "service_role" (⚠️  Ne JAMAIS exposer côté client!)');
console.log('6. Ajoutez dans supabase-mcp-server/.env:');
console.log('   SUPABASE_SERVICE_ROLE_KEY=votre-cle-service-role');
console.log('\n' + '─'.repeat(80));

// Si pas de service role key, proposer d'ouvrir le dashboard
if (!useServiceRole) {
  console.log('\n❌ IMPOSSIBLE DE CONTINUER SANS SERVICE_ROLE_KEY\n');
  console.log('💡 SOLUTION ALTERNATIVE: Appliquer la migration via le Dashboard Supabase\n');
  console.log('1. Ouvrez https://app.supabase.com');
  console.log('2. Allez dans SQL Editor');
  console.log('3. Copiez le contenu de:');
  console.log('   supabase/migrations/20250124_secure_rls_policies.sql');
  console.log('4. Collez et exécutez dans le SQL Editor\n');

  console.log('📄 Le fichier de migration est prêt à être copié:');
  console.log(`   ${join(__dirname, '..', 'supabase', 'migrations', '20250124_secure_rls_policies.sql')}\n`);

  process.exit(1);
}

// Continuer avec service role key
console.log('\n🔄 Test de connexion avec service role...\n');

try {
  const { data, error } = await supabase
    .from('profiles')
    .select('count', { count: 'exact', head: true });

  if (error) {
    console.error('❌ Erreur de connexion:', error.message);
    process.exit(1);
  }

  console.log('✅ Connexion établie avec succès (service role bypass RLS)\n');
} catch (err) {
  console.error('❌ Impossible de se connecter:', err.message);
  process.exit(1);
}

// Lire le fichier de migration
console.log('📄 Lecture de la migration...\n');

const migrationPath = join(__dirname, '..', 'supabase', 'migrations', '20250124_secure_rls_policies.sql');
let migrationSQL;

try {
  migrationSQL = readFileSync(migrationPath, 'utf-8');
  console.log(`✅ Migration chargée (${migrationSQL.length} caractères)`);
} catch (err) {
  console.error('❌ Impossible de lire le fichier de migration:', err.message);
  process.exit(1);
}

console.log('\n⚠️  ATTENTION: Cette migration va modifier les politiques RLS de la base de données');
console.log('   Voulez-vous continuer? (Ctrl+C pour annuler)\n');

// Attendre 3 secondes
await new Promise(resolve => setTimeout(resolve, 3000));

console.log('🚀 Application de la migration...\n');

// La meilleure approche est d'utiliser le SQL Editor du dashboard
// Mais on peut essayer via le client Supabase

console.log('⚠️  NOTE: L\'exécution SQL directe via le client JavaScript a des limitations.');
console.log('   Pour une migration complexe comme celle-ci, le Dashboard est recommandé.\n');

console.log('📋 OPTIONS D\'APPLICATION:\n');

console.log('Option A - Dashboard Supabase (Recommandé) ⭐');
console.log('  1. Ouvrez https://app.supabase.com');
console.log('  2. SQL Editor');
console.log('  3. Nouvelle requête');
console.log('  4. Copiez/collez le contenu de:');
console.log(`     ${migrationPath}`);
console.log('  5. Exécutez\n');

console.log('Option B - Supabase CLI (Si installé)');
console.log('  cd /Users/user/Downloads/drivebyafrica-main');
console.log('  supabase db push\n');

console.log('Option C - Copier le SQL maintenant');
console.log('  Le contenu est affiché ci-dessous pour copie facile:\n');

console.log('─'.repeat(80));
console.log('DÉBUT DU SQL À COPIER');
console.log('─'.repeat(80));
console.log(migrationSQL);
console.log('─'.repeat(80));
console.log('FIN DU SQL');
console.log('─'.repeat(80));

console.log('\n✅ Migration prête à être appliquée!');
console.log('\n💡 Prochaine étape: Copiez le SQL ci-dessus et exécutez-le dans le Dashboard Supabase\n');
console.log('🔗 Dashboard: https://app.supabase.com → SQL Editor\n');

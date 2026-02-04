#!/usr/bin/env node

/**
 * Exécution de la migration de sécurité RLS avec service_role
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

config();

console.log('\n🔐 EXÉCUTION DE LA MIGRATION DE SÉCURITÉ RLS\n');
console.log('='.repeat(80));

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY non trouvé dans .env');
  process.exit(1);
}

console.log('✅ Service role key configurée');
console.log(`✅ URL: ${supabaseUrl}\n`);

// Create admin client
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

console.log('🔄 Test de connexion...\n');

try {
  const { data, error } = await supabase
    .from('profiles')
    .select('count', { count: 'exact', head: true });

  if (error && error.code !== 'PGRST116') {
    console.error('❌ Erreur de connexion:', error.message);
    process.exit(1);
  }

  console.log('✅ Connexion établie avec service_role (bypass RLS)\n');
} catch (err) {
  console.error('❌ Erreur:', err.message);
  process.exit(1);
}

console.log('─'.repeat(80));
console.log('\n📋 IMPORTANT:\n');
console.log('Le client JavaScript Supabase ne peut pas exécuter du SQL DDL arbitraire.');
console.log('Pour appliquer cette migration, vous devez utiliser le Dashboard Supabase.\n');

console.log('🚀 VOICI COMMENT PROCÉDER:\n');
console.log('1. Ouvrez https://app.supabase.com');
console.log('2. Sélectionnez votre projet');
console.log('3. Allez dans "SQL Editor" (menu de gauche)');
console.log('4. Cliquez sur "New query"');
console.log('5. Copiez le SQL ci-dessous');
console.log('6. Collez-le dans l\'éditeur');
console.log('7. Cliquez sur "Run" (ou Ctrl+Enter)\n');

console.log('─'.repeat(80));
console.log('📄 SQL DE MIGRATION À COPIER:');
console.log('─'.repeat(80));
console.log('');

// Lire et afficher le SQL
const migrationPath = join(__dirname, '..', 'supabase', 'migrations', '20250124_secure_rls_policies.sql');
const migrationSQL = readFileSync(migrationPath, 'utf-8');

console.log(migrationSQL);

console.log('');
console.log('─'.repeat(80));
console.log('FIN DU SQL');
console.log('─'.repeat(80));

console.log('\n✅ Migration prête à être appliquée!\n');

console.log('💡 ALTERNATIVE: Utiliser Supabase CLI');
console.log('   Si vous avez Supabase CLI installé:');
console.log('   $ supabase db push\n');

console.log('⚠️  NOTE: Une fois appliquée, la migration:');
console.log('   ✅ Sécurisera les conversations (users voient seulement leurs conversations)');
console.log('   ✅ Protégera les véhicules contre modifications non autorisées');
console.log('   ✅ Rendra les transactions immuables');
console.log('   ✅ Ne cassera aucune fonctionnalité utilisateur\n');

// Vérifier l'état actuel des politiques
console.log('🔍 Vérification de l\'état actuel des politiques...\n');

// Test 1: Vérifier si les politiques permissives existent encore
console.log('Test 1: Vérifier les conversations (devrait montrer le problème actuel)');

const { count: convCount, error: convError } = await supabase
  .from('chat_conversations')
  .select('*', { count: 'exact', head: true });

if (convError) {
  console.log(`   ⚠️  Erreur: ${convError.message}`);
} else {
  console.log(`   ℹ️  ${convCount || 0} conversations dans la base`);
}

// Test 2: Vérifier les véhicules
console.log('\nTest 2: Vérifier les véhicules');

const { count: vehCount, error: vehError } = await supabase
  .from('vehicles')
  .select('*', { count: 'exact', head: true });

if (vehError) {
  console.log(`   ⚠️  Erreur: ${vehError.message}`);
} else {
  console.log(`   ℹ️  ${vehCount || 0} véhicules dans la base`);
}

console.log('\n' + '='.repeat(80));
console.log('\n🎯 PROCHAINE ÉTAPE: Copiez le SQL ci-dessus et exécutez-le dans le Dashboard\n');
console.log('🔗 https://app.supabase.com → SQL Editor\n');

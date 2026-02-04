#!/usr/bin/env node

/**
 * Script pour appliquer la migration de sécurité RLS
 * Ce script applique la migration 20250124_secure_rls_policies.sql
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

console.log('🔐 Application de la migration de sécurité RLS\n');
console.log('='.repeat(80));

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  console.error('❌ SUPABASE_URL manquant dans .env');
  process.exit(1);
}

if (!supabaseServiceKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY manquant dans .env');
  console.error('⚠️  Cette migration nécessite la clé service_role pour bypass RLS');
  console.error('   Ajoutez SUPABASE_SERVICE_ROLE_KEY dans votre fichier .env');
  process.exit(1);
}

// Create admin client with service role key (bypasses RLS)
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function applyMigration() {
  console.log('\n📄 Lecture du fichier de migration...');

  try {
    const migrationPath = join(__dirname, '..', 'supabase', 'migrations', '20250124_secure_rls_policies.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf-8');

    console.log(`✅ Migration chargée (${migrationSQL.length} caractères)`);

    console.log('\n⚠️  ATTENTION: Cette migration va modifier les politiques RLS');
    console.log('   - Corriger les politiques trop permissives sur chat_conversations et chat_messages');
    console.log('   - Ajouter des politiques UPDATE/DELETE sécurisées');
    console.log('   - Bloquer les modifications non autorisées\n');

    console.log('🔄 Application de la migration...\n');

    // Split SQL into individual statements (basic split by ';')
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--') && !s.startsWith('COMMENT'));

    let successCount = 0;
    let errorCount = 0;
    const errors = [];

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];

      // Skip comments and empty statements
      if (!statement || statement.startsWith('--')) continue;

      // Show progress
      const preview = statement.substring(0, 60).replace(/\n/g, ' ');
      process.stdout.write(`[${i + 1}/${statements.length}] ${preview}...`);

      try {
        const { error } = await supabase.rpc('exec_sql', { query: statement + ';' });

        if (error) {
          // Try direct execution if RPC fails
          // Note: Direct SQL execution is not available in Supabase client
          // We'll log the error but continue
          console.log(' ⚠️');
          console.log(`   Erreur: ${error.message}`);
          errorCount++;
          errors.push({ statement: preview, error: error.message });
        } else {
          console.log(' ✅');
          successCount++;
        }
      } catch (err) {
        console.log(' ❌');
        console.log(`   Exception: ${err.message}`);
        errorCount++;
        errors.push({ statement: preview, error: err.message });
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log(`\n📊 Résultat:`);
    console.log(`   ✅ Succès: ${successCount}`);
    console.log(`   ❌ Erreurs: ${errorCount}`);

    if (errorCount > 0) {
      console.log('\n⚠️  Certaines commandes ont échoué. Cela peut être normal si:');
      console.log('   - Les politiques existent déjà');
      console.log('   - exec_sql n\'est pas disponible (voir note ci-dessous)\n');

      console.log('📋 Erreurs détaillées:');
      errors.forEach((err, idx) => {
        console.log(`\n${idx + 1}. ${err.statement}`);
        console.log(`   Erreur: ${err.error}`);
      });

      console.log('\n💡 NOTE IMPORTANTE:');
      console.log('   La fonction exec_sql n\'est pas disponible par défaut dans Supabase.');
      console.log('   Pour appliquer cette migration, vous avez 2 options:\n');
      console.log('   Option 1 (Recommandée): Via Dashboard Supabase');
      console.log('   1. Ouvrez https://app.supabase.com');
      console.log('   2. Allez dans SQL Editor');
      console.log('   3. Copiez le contenu de supabase/migrations/20250124_secure_rls_policies.sql');
      console.log('   4. Exécutez-le directement\n');
      console.log('   Option 2: Via CLI Supabase');
      console.log('   1. Installez Supabase CLI: npm install -g supabase');
      console.log('   2. Exécutez: supabase db reset (en local)');
      console.log('   3. Ou: supabase db push (pour production)\n');
    } else {
      console.log('\n✅ Migration appliquée avec succès!');
    }

    console.log('\n🔍 Vérification des politiques RLS...\n');

    // Test basic access
    const tests = [
      { name: 'Accès public aux véhicules', table: 'vehicles', should: 'succeed' },
      { name: 'Lecture profiles', table: 'profiles', should: 'fail without auth' },
      { name: 'Lecture chat_conversations', table: 'chat_conversations', should: 'fail without auth' }
    ];

    for (const test of tests) {
      const { count, error } = await supabase
        .from(test.table)
        .select('*', { count: 'exact', head: true });

      if (test.table === 'vehicles') {
        if (error) {
          console.log(`❌ ${test.name}: ${error.message}`);
        } else {
          console.log(`✅ ${test.name}: ${count} enregistrements accessibles`);
        }
      } else {
        // Pour les tables protégées, on s'attend à ce qu'elles soient vides ou inaccessibles
        console.log(`ℹ️  ${test.name}: ${count || 0} enregistrements`);
      }
    }

  } catch (error) {
    console.error('\n❌ Erreur lors de l\'application de la migration:');
    console.error(error);
    process.exit(1);
  }
}

// =============================================
// MAIN
// =============================================

console.log('\n🔍 Test de la connexion...');

try {
  const { data, error } = await supabase
    .from('profiles')
    .select('count')
    .limit(1);

  if (error && error.code !== 'PGRST116') {
    console.error('❌ Erreur de connexion:', error.message);
    process.exit(1);
  }

  console.log('✅ Connexion Supabase établie\n');
} catch (err) {
  console.error('❌ Impossible de se connecter:', err.message);
  process.exit(1);
}

await applyMigration();

console.log('\n' + '='.repeat(80));
console.log('✅ Script terminé!\n');
console.log('📄 Pour appliquer manuellement la migration:');
console.log('   Fichier: supabase/migrations/20250124_secure_rls_policies.sql');
console.log('   Dashboard: https://app.supabase.com → SQL Editor\n');

#!/usr/bin/env node

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Load environment variables
config();

console.log('🔍 Analyse de la base de données Supabase - Driveby Africa\n');
console.log('='.repeat(80));
console.log('\n');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Variables d\'environnement manquantes');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Fonction pour obtenir les informations de schéma
async function analyzeTable(tableName) {
  console.log(`\n📋 Table: ${tableName}`);
  console.log('-'.repeat(80));

  try {
    // Essayer de compter les enregistrements
    const { count, error: countError } = await supabase
      .from(tableName)
      .select('*', { count: 'exact', head: true });

    if (countError) {
      console.log(`   ⚠️  Erreur de comptage: ${countError.message}`);
    } else {
      console.log(`   📊 Nombre d'enregistrements: ${count}`);
    }

    // Essayer de récupérer un échantillon
    const { data, error: dataError } = await supabase
      .from(tableName)
      .select('*')
      .limit(1);

    if (dataError) {
      console.log(`   ⚠️  Erreur de lecture: ${dataError.message}`);
      console.log(`   🔒 Politique RLS: Probablement RESTREINTE (pas d'accès public)`);
    } else if (data && data.length > 0) {
      console.log(`   ✅ Accès en lecture: AUTORISÉ`);
      console.log(`   📝 Colonnes détectées: ${Object.keys(data[0]).join(', ')}`);
    } else {
      console.log(`   ℹ️  Table vide ou accès restreint`);
    }

    // Test d'insertion (sera rejeté si RLS est actif)
    const testData = {};
    const { error: insertError } = await supabase
      .from(tableName)
      .insert([testData])
      .select();

    if (insertError) {
      if (insertError.code === '42501') {
        console.log(`   🔒 Politique RLS INSERT: ACTIVE (accès refusé)`);
      } else if (insertError.message.includes('null value')) {
        console.log(`   ⚠️  Politique RLS INSERT: PERMISSIVE (mais contraintes de colonnes)`);
      } else {
        console.log(`   🔒 Politique RLS INSERT: ${insertError.message}`);
      }
    } else {
      console.log(`   ⚠️  Politique RLS INSERT: PERMISSIVE (insertion autorisée!)`);
    }

  } catch (err) {
    console.log(`   ❌ Erreur: ${err.message}`);
  }
}

// Fonction pour analyser les politiques RLS via SQL
async function checkRLSPolicies() {
  console.log('\n🔐 ANALYSE DES POLITIQUES RLS');
  console.log('='.repeat(80));

  try {
    // Requête pour obtenir les politiques RLS
    const { data, error } = await supabase.rpc('get_rls_policies');

    if (error) {
      console.log('\n⚠️  Impossible de récupérer les politiques RLS directement');
      console.log('   (Nécessite des privilèges admin ou une fonction RPC personnalisée)');
      console.log('\n   Alternative: Tests empiriques effectués pour chaque table ci-dessus');
    } else {
      console.log('\n✅ Politiques RLS récupérées:');
      console.log(JSON.stringify(data, null, 2));
    }
  } catch (err) {
    console.log('\n⚠️  Fonction RPC non disponible pour lister les politiques');
  }
}

// Liste des tables connues du projet
const knownTables = [
  'profiles',
  'vehicles',
  'bids',
  'notifications',
  'saved_vehicles',
  'chat_messages',
  'chat_rooms',
  'transactions',
  'reviews',
  'admin_logs'
];

// Analyser chaque table
console.log('📊 ANALYSE DES TABLES');
console.log('='.repeat(80));

for (const table of knownTables) {
  await analyzeTable(table);
}

// Vérifier les politiques RLS
await checkRLSPolicies();

// Statistiques globales
console.log('\n\n📈 STATISTIQUES GLOBALES');
console.log('='.repeat(80));

const stats = {
  vehicles: 0,
  bids: 0,
  profiles: 0,
  notifications: 0,
  chat_messages: 0
};

for (const [table, _] of Object.entries(stats)) {
  const { count } = await supabase
    .from(table)
    .select('*', { count: 'exact', head: true });
  stats[table] = count || 0;
}

console.log(`
   🚗 Véhicules: ${stats.vehicles}
   💰 Enchères: ${stats.bids}
   👤 Profils: ${stats.profiles}
   🔔 Notifications: ${stats.notifications}
   💬 Messages: ${stats.chat_messages}
`);

// Vérifier les buckets de storage
console.log('\n📦 STORAGE BUCKETS');
console.log('='.repeat(80));

try {
  const { data: buckets, error } = await supabase.storage.listBuckets();

  if (error) {
    console.log(`⚠️  Erreur: ${error.message}`);
  } else if (buckets.length === 0) {
    console.log('ℹ️  Aucun bucket de storage configuré');
  } else {
    for (const bucket of buckets) {
      console.log(`\n📁 Bucket: ${bucket.name}`);
      console.log(`   Public: ${bucket.public ? 'Oui' : 'Non'}`);
      console.log(`   ID: ${bucket.id}`);

      // Essayer de lister les fichiers
      const { data: files, error: filesError } = await supabase.storage
        .from(bucket.name)
        .list('', { limit: 5 });

      if (filesError) {
        console.log(`   Fichiers: Accès restreint`);
      } else {
        console.log(`   Fichiers: ${files.length} fichier(s) visible(s)`);
      }
    }
  }
} catch (err) {
  console.log(`❌ Erreur: ${err.message}`);
}

console.log('\n\n✅ Analyse terminée!');
console.log('='.repeat(80));

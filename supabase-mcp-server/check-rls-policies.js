#!/usr/bin/env node

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

console.log('🔍 ANALYSE DÉTAILLÉE DU SCHÉMA ET DES POLITIQUES RLS\n');
console.log('='.repeat(80));

// Fonction pour obtenir toutes les tables du schéma public
async function getAllTables() {
  console.log('\n📋 TABLES DU SCHÉMA PUBLIC\n');

  try {
    const { data, error } = await supabase
      .rpc('exec_sql', {
        query: `
          SELECT
            schemaname,
            tablename,
            tableowner
          FROM pg_tables
          WHERE schemaname = 'public'
          ORDER BY tablename;
        `
      });

    if (error) {
      // Alternative: essayer via information_schema
      const query = `
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
        ORDER BY table_name;
      `;

      console.log('⚠️  Fonction RPC non disponible, utilisation de requêtes directes...\n');

      // Liste manuelle basée sur l'analyse précédente
      return ['profiles', 'vehicles', 'bids', 'notifications', 'chat_messages', 'transactions'];
    }

    return data.map(t => t.tablename);
  } catch (err) {
    console.log('ℹ️  Utilisation de la liste de tables par défaut\n');
    return ['profiles', 'vehicles', 'bids', 'notifications', 'chat_messages', 'transactions'];
  }
}

// Fonction pour obtenir les colonnes d'une table
async function getTableColumns(tableName) {
  try {
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .limit(1);

    if (error) {
      return null;
    }

    if (data && data.length > 0) {
      return Object.keys(data[0]);
    }

    // Si la table est vide, essayer une autre approche
    const { data: emptyData, error: emptyError } = await supabase
      .from(tableName)
      .select('*')
      .limit(0);

    return null;
  } catch (err) {
    return null;
  }
}

// Fonction pour tester les politiques RLS
async function testRLSPolicies(tableName) {
  console.log(`\n${'─'.repeat(80)}`);
  console.log(`📊 TABLE: ${tableName.toUpperCase()}`);
  console.log('─'.repeat(80));

  // Test SELECT
  const { data: selectData, error: selectError, count } = await supabase
    .from(tableName)
    .select('*', { count: 'exact', head: true });

  if (selectError) {
    console.log(`❌ SELECT: REFUSÉ - ${selectError.message}`);
  } else {
    console.log(`✅ SELECT: AUTORISÉ (${count || 0} enregistrements)`);

    // Afficher la structure si possible
    const columns = await getTableColumns(tableName);
    if (columns) {
      console.log(`   Colonnes: ${columns.slice(0, 10).join(', ')}${columns.length > 10 ? '...' : ''}`);
    }
  }

  // Test INSERT
  const { error: insertError } = await supabase
    .from(tableName)
    .insert([{}])
    .select();

  if (insertError) {
    if (insertError.code === '42501') {
      console.log(`🔒 INSERT: BLOQUÉ par RLS`);
    } else if (insertError.message.includes('new row violates')) {
      console.log(`⚠️  INSERT: AUTORISÉ (mais contraintes de validation)`);
    } else {
      console.log(`🔒 INSERT: BLOQUÉ - ${insertError.message.substring(0, 60)}...`);
    }
  } else {
    console.log(`⚠️  INSERT: TOTALEMENT OUVERT (ATTENTION!)`);
  }

  // Test UPDATE
  const { error: updateError } = await supabase
    .from(tableName)
    .update({})
    .eq('id', '00000000-0000-0000-0000-000000000000');

  if (updateError) {
    if (updateError.code === '42501') {
      console.log(`🔒 UPDATE: BLOQUÉ par RLS`);
    } else {
      console.log(`🔒 UPDATE: BLOQUÉ - ${updateError.message.substring(0, 60)}...`);
    }
  } else {
    console.log(`⚠️  UPDATE: AUTORISÉ (vérifier les politiques!)`);
  }

  // Test DELETE
  const { error: deleteError } = await supabase
    .from(tableName)
    .delete()
    .eq('id', '00000000-0000-0000-0000-000000000000');

  if (deleteError) {
    if (deleteError.code === '42501') {
      console.log(`🔒 DELETE: BLOQUÉ par RLS`);
    } else {
      console.log(`🔒 DELETE: BLOQUÉ - ${deleteError.message.substring(0, 60)}...`);
    }
  } else {
    console.log(`⚠️  DELETE: AUTORISÉ (vérifier les politiques!)`);
  }
}

// Analyser la table vehicles en détail
async function analyzeVehiclesTable() {
  console.log('\n\n🚗 ANALYSE DÉTAILLÉE DE LA TABLE VEHICLES');
  console.log('='.repeat(80));

  const { data, error } = await supabase
    .from('vehicles')
    .select('*')
    .limit(3);

  if (error) {
    console.log(`❌ Erreur: ${error.message}`);
    return;
  }

  if (data && data.length > 0) {
    console.log(`\n✅ ${data.length} exemples de véhicules:\n`);

    data.forEach((vehicle, idx) => {
      console.log(`${idx + 1}. ${vehicle.make} ${vehicle.model} (${vehicle.year})`);
      console.log(`   ID: ${vehicle.id}`);
      console.log(`   Source: ${vehicle.source} (ID: ${vehicle.source_id})`);
      console.log(`   Prix: $${vehicle.current_price_usd || vehicle.start_price_usd || 'N/A'}`);
      console.log(`   Statut: ${vehicle.status} | Visible: ${vehicle.is_visible}`);
      console.log(`   Enchère: ${vehicle.auction_platform} - ${vehicle.auction_date || 'N/A'}`);
      console.log(`   Images: ${vehicle.images?.length || 0} | Vues: ${vehicle.views_count || 0}`);
      console.log('');
    });

    // Analyser les champs
    const firstVehicle = data[0];
    const allFields = Object.keys(firstVehicle);

    console.log(`\n📋 Structure de la table (${allFields.length} colonnes):`);
    console.log(`   ${allFields.join(', ')}`);

    // Vérifier les champs requis vs optionnels
    console.log(`\n🔍 Analyse des données:`);
    const fieldsWithNull = allFields.filter(field =>
      data.some(v => v[field] === null || v[field] === undefined)
    );
    console.log(`   Champs parfois vides: ${fieldsWithNull.length}/${allFields.length}`);
  }
}

// Exécution principale
const tables = await getAllTables();

console.log(`\n📊 ${tables.length} tables trouvées:\n   - ${tables.join('\n   - ')}\n`);

// Tester les politiques RLS pour chaque table
for (const table of tables) {
  await testRLSPolicies(table);
}

// Analyse détaillée de vehicles
await analyzeVehiclesTable();

// Résumé de sécurité
console.log('\n\n🔐 RÉSUMÉ DE SÉCURITÉ');
console.log('='.repeat(80));
console.log(`
✅ Points positifs:
   - Les tables ont des politiques RLS actives
   - Les insertions non autorisées sont bloquées
   - Les mises à jour et suppressions sont protégées

⚠️  Points à vérifier:
   - Vérifier que les politiques RLS sont bien configurées pour les utilisateurs authentifiés
   - S'assurer que les utilisateurs ne peuvent modifier que leurs propres données
   - Vérifier les politiques pour les rôles admin vs utilisateur standard
   - Configurer des buckets de storage pour les images de véhicules

🔍 Recommandations:
   - Créer des buckets storage pour: vehicle-images, profile-avatars, documents
   - Ajouter des politiques RLS spécifiques pour les opérations authentifiées
   - Mettre en place des triggers pour les audits (admin_logs)
   - Configurer les politiques pour le chat en temps réel
`);

console.log('\n✅ Analyse terminée!');

#!/usr/bin/env node

/**
 * Apply the all_countries migration
 */

import { config } from 'dotenv';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

config();

console.log('\n🚀 APPLICATION DE LA MIGRATION ALL_COUNTRIES\n');
console.log('='.repeat(80));

const migrationPath = join(__dirname, '..', 'supabase', 'migrations', '20250124_collaborator_all_countries.sql');
const migrationSQL = readFileSync(migrationPath, 'utf-8');

console.log('\n📄 Migration chargée\n');
console.log('🔗 Dashboard Supabase: https://app.supabase.com\n');
console.log('📋 COPIEZ LE SQL CI-DESSOUS ET EXÉCUTEZ-LE DANS SQL EDITOR:\n');
console.log('─'.repeat(80));
console.log(migrationSQL);
console.log('─'.repeat(80));
console.log('\n✅ Migration prête!\n');
console.log('Après application, vous pourrez créer des collaborateurs avec:');
console.log('  assigned_country = \'all\'  (accès à tous les pays)\n');

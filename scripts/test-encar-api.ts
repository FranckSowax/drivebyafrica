/**
 * Script de test pour l'API Encar
 * Usage: npx tsx scripts/test-encar-api.ts
 */

import { config } from 'dotenv';
config({ path: '.env.local' });

const ACCESS_NAME = process.env.ENCAR_ACCESS_NAME || 'driveby';
const API_KEY = process.env.ENCAR_API_KEY;

if (!API_KEY || API_KEY === 'your-encar-api-key') {
  console.error('❌ ENCAR_API_KEY non configurée dans .env.local');
  process.exit(1);
}

const BASE_URL = `https://${ACCESS_NAME}.auto-api.com/api/v2/encar`;

async function testFilters() {
  console.log('\n🔍 Test GET /filters...');
  const url = `${BASE_URL}/filters?api_key=${API_KEY}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.error(`❌ Erreur ${response.status}: ${response.statusText}`);
      const text = await response.text();
      console.error('Réponse:', text.slice(0, 500));
      return null;
    }

    const data = await response.json();
    console.log('✅ Filtres récupérés avec succès!');
    console.log(`   - Marques disponibles: ${Object.keys(data.mark || {}).slice(0, 5).join(', ')}...`);
    console.log(`   - Types de transmission: ${(data.transmission_type || []).join(', ')}`);
    console.log(`   - Types de carrosserie: ${(data.body_type || []).join(', ')}`);
    return data;
  } catch (error) {
    console.error('❌ Erreur:', error);
    return null;
  }
}

async function testOffers() {
  console.log('\n🚗 Test GET /offers (page 1)...');
  const url = `${BASE_URL}/offers?api_key=${API_KEY}&page=1`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.error(`❌ Erreur ${response.status}: ${response.statusText}`);
      const text = await response.text();
      console.error('Réponse:', text.slice(0, 500));
      return null;
    }

    const data = await response.json();
    console.log('✅ Offres récupérées avec succès!');
    console.log(`   - Nombre de résultats: ${data.result?.length || 0}`);
    console.log(`   - Page actuelle: ${data.meta?.page}`);
    console.log(`   - Page suivante: ${data.meta?.next_page}`);

    if (data.result && data.result.length > 0) {
      const first = data.result[0];
      console.log('\n📋 Premier véhicule:');
      console.log(`   - ID: ${first.inner_id}`);
      console.log(`   - Marque: ${first.data?.mark}`);
      console.log(`   - Modèle: ${first.data?.model}`);
      console.log(`   - Année: ${first.data?.year}`);
      console.log(`   - Prix: ${first.data?.price} (x10,000 KRW) = ${first.data?.price_won} KRW`);
      console.log(`   - Kilométrage: ${first.data?.km_age} km`);
      console.log(`   - Images: ${first.data?.images?.length || 0}`);
    }

    return data;
  } catch (error) {
    console.error('❌ Erreur:', error);
    return null;
  }
}

async function testOffersWithFilters() {
  console.log('\n🔎 Test GET /offers avec filtres (Hyundai, SUV)...');
  const url = `${BASE_URL}/offers?api_key=${API_KEY}&page=1&mark=Hyundai&body_type=SUV`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.error(`❌ Erreur ${response.status}: ${response.statusText}`);
      return null;
    }

    const data = await response.json();
    console.log('✅ Offres filtrées récupérées!');
    console.log(`   - Nombre de Hyundai SUV: ${data.result?.length || 0}`);

    return data;
  } catch (error) {
    console.error('❌ Erreur:', error);
    return null;
  }
}

async function testDifferentAccessNames() {
  const possibleNames = ['api', 'encar', 'data', 'v2', 'auto'];
  console.log('\n🔄 Test de différents access_names...');

  for (const name of possibleNames) {
    const testUrl = `https://${name}.auto-api.com/api/v2/encar/filters?api_key=${API_KEY}`;
    console.log(`   Essai avec '${name}'...`);

    try {
      const response = await fetch(testUrl, { signal: AbortSignal.timeout(5000) });
      if (response.ok) {
        console.log(`   ✅ '${name}' fonctionne!`);
        return name;
      } else {
        console.log(`   ❌ '${name}' - Status ${response.status}`);
      }
    } catch (error: any) {
      if (error.cause?.code === 'ENOTFOUND') {
        console.log(`   ❌ '${name}' - Domaine inexistant`);
      } else {
        console.log(`   ❌ '${name}' - ${error.message}`);
      }
    }
  }
  return null;
}

async function main() {
  console.log('🚀 Test de l\'API Encar');
  console.log(`   Access Name configuré: ${ACCESS_NAME}`);
  console.log(`   Base URL: ${BASE_URL}`);
  console.log(`   API Key: ${API_KEY?.slice(0, 8)}...`);

  // D'abord tester l'access_name configuré
  const testUrl = `${BASE_URL}/filters?api_key=${API_KEY}`;
  try {
    const response = await fetch(testUrl, { signal: AbortSignal.timeout(5000) });
    if (response.ok) {
      console.log(`\n✅ Access name '${ACCESS_NAME}' valide!`);

      // Test 1: Filtres
      await testFilters();

      // Test 2: Offres
      await testOffers();

      // Test 3: Offres filtrées
      await testOffersWithFilters();

      console.log('\n✨ Tests terminés avec succès!');
      return;
    }
  } catch (error: any) {
    if (error.cause?.code === 'ENOTFOUND') {
      console.log(`\n❌ Le sous-domaine '${ACCESS_NAME}.auto-api.com' n'existe pas.`);
    }
  }

  // Essayer d'autres noms
  const workingName = await testDifferentAccessNames();

  if (workingName) {
    console.log(`\n💡 Mettez à jour ENCAR_ACCESS_NAME=${workingName} dans .env.local`);
  } else {
    console.log('\n❌ Aucun access_name trouvé automatiquement.');
    console.log('📧 Contactez auto-api.com pour obtenir votre access_name:');
    console.log('   - Email: access@auto-api.com');
    console.log('   - Telegram: @autodatabase');
  }

  console.log('\n✨ Tests terminés!');
}

main().catch(console.error);

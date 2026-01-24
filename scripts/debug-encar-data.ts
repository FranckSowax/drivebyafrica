/**
 * Debug: examiner la structure des données Encar
 */

import { config } from 'dotenv';
config({ path: '.env.local' });

const ACCESS_NAME = process.env.ENCAR_ACCESS_NAME || 'api1';
const API_KEY = process.env.ENCAR_API_KEY;

async function main() {
  const url = `https://${ACCESS_NAME}.auto-api.com/api/v2/encar/offers?api_key=${API_KEY}&page=1`;

  const response = await fetch(url);
  const data = await response.json();

  if (data.result && data.result[0]) {
    const first = data.result[0];
    console.log('Structure complète du premier véhicule:');
    console.log(JSON.stringify(first, null, 2));

    console.log('\n--- Images ---');
    console.log('Type:', typeof first.data.images);
    console.log('Valeur:', first.data.images);

    if (Array.isArray(first.data.images)) {
      console.log('Premier élément:', first.data.images[0]);
    }
  }
}

main().catch(console.error);

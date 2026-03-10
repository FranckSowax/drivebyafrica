/**
 * Vehicle Knowledge Sync — generates a RAG knowledge document from the vehicles table.
 * Run daily after vehicle sync to keep chatbot knowledge up-to-date.
 *
 * Produces 2 documents:
 *   1. "Catalogue véhicules — {date}" — inventory summary with stats, prices, brands
 *   2. "Langage utilisateur — expressions de recherche" — user language patterns
 */

import { createClient } from '@supabase/supabase-js';
import { generateEmbeddings, chunkText } from './embeddings';

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

interface VehicleRow {
  make: string;
  model: string;
  year: number;
  start_price_usd: number | null;
  fob_price_usd: number | null;
  mileage: number | null;
  source: string | null;
  fuel_type: string | null;
  transmission: string | null;
  body_type: string | null;
}

interface BrandStats {
  count: number;
  minPrice: number;
  maxPrice: number;
  avgPrice: number;
  models: Map<string, number>;
  sources: Set<string>;
  years: number[];
  fuelTypes: Set<string>;
  bodyTypes: Set<string>;
}

// ──────────────────────────────────────────────
// Main export
// ──────────────────────────────────────────────

export async function syncVehicleKnowledge(): Promise<{ catalogDocId: string; languageDocId: string }> {
  const supabase = getAdmin();
  const today = new Date().toISOString().split('T')[0];

  console.log(`[VehicleKB] Starting vehicle knowledge sync for ${today}`);

  // 1. Fetch all visible vehicles (only the columns we need)
  const { data: vehicles, error } = await supabase
    .from('vehicles')
    .select('make, model, year, start_price_usd, fob_price_usd, mileage, source, fuel_type, transmission, body_type')
    .eq('is_visible', true);

  if (error) throw new Error(`Vehicle fetch error: ${error.message}`);
  if (!vehicles || vehicles.length === 0) throw new Error('No vehicles found');

  const rows = vehicles as VehicleRow[];
  console.log(`[VehicleKB] Fetched ${rows.length} vehicles`);

  // 2. Aggregate stats
  const brandMap = new Map<string, BrandStats>();
  const sourceStats: Record<string, { count: number; brands: Set<string> }> = {};
  const bodyTypeCounts: Record<string, number> = {};
  const fuelTypeCounts: Record<string, number> = {};
  let totalWithPrice = 0;
  let globalMinPrice = Infinity;
  let globalMaxPrice = 0;

  for (const v of rows) {
    const brand = (v.make || 'Inconnu').trim();
    const brandLower = brand.toLowerCase();
    const model = (v.model || '').trim();
    const source = (v.source || 'unknown').toLowerCase();
    const price = v.fob_price_usd || v.start_price_usd || 0;

    // Brand stats
    if (!brandMap.has(brandLower)) {
      brandMap.set(brandLower, {
        count: 0, minPrice: Infinity, maxPrice: 0, avgPrice: 0,
        models: new Map(), sources: new Set(), years: [], fuelTypes: new Set(), bodyTypes: new Set(),
      });
    }
    const bs = brandMap.get(brandLower)!;
    bs.count++;
    if (price > 0) {
      bs.minPrice = Math.min(bs.minPrice, price);
      bs.maxPrice = Math.max(bs.maxPrice, price);
      bs.avgPrice = ((bs.avgPrice * (bs.count - 1)) + price) / bs.count;
      totalWithPrice++;
      globalMinPrice = Math.min(globalMinPrice, price);
      globalMaxPrice = Math.max(globalMaxPrice, price);
    }
    if (model) {
      bs.models.set(model, (bs.models.get(model) || 0) + 1);
    }
    bs.sources.add(source);
    bs.years.push(v.year || 0);
    if (v.fuel_type) bs.fuelTypes.add(v.fuel_type);
    if (v.body_type) bs.bodyTypes.add(v.body_type);

    // Source stats
    if (!sourceStats[source]) sourceStats[source] = { count: 0, brands: new Set() };
    sourceStats[source].count++;
    sourceStats[source].brands.add(brandLower);

    // Body type / fuel
    if (v.body_type) bodyTypeCounts[v.body_type] = (bodyTypeCounts[v.body_type] || 0) + 1;
    if (v.fuel_type) fuelTypeCounts[v.fuel_type] = (fuelTypeCounts[v.fuel_type] || 0) + 1;
  }

  // 3. Generate catalog document
  const catalogContent = buildCatalogDocument(rows.length, brandMap, sourceStats, bodyTypeCounts, fuelTypeCounts, globalMinPrice, globalMaxPrice, today);

  // 4. Generate user language document
  const languageContent = buildLanguageDocument(brandMap, sourceStats, bodyTypeCounts, fuelTypeCounts);

  // 5. Upsert into knowledge base (replace previous day's docs)
  const catalogDocId = await upsertKnowledgeDoc(
    supabase,
    `Catalogue véhicules — ${today}`,
    catalogContent,
    'vehicle_info',
    { sync_date: today, vehicle_count: rows.length, brand_count: brandMap.size }
  );

  const languageDocId = await upsertKnowledgeDoc(
    supabase,
    'Langage utilisateur — expressions de recherche',
    languageContent,
    'vehicle_info',
    { sync_date: today, type: 'user_language_patterns' }
  );

  console.log(`[VehicleKB] Sync complete: catalog=${catalogDocId}, language=${languageDocId}`);
  return { catalogDocId, languageDocId };
}

// ──────────────────────────────────────────────
// Catalog document builder
// ──────────────────────────────────────────────

function buildCatalogDocument(
  totalVehicles: number,
  brandMap: Map<string, BrandStats>,
  sourceStats: Record<string, { count: number; brands: Set<string> }>,
  bodyTypeCounts: Record<string, number>,
  fuelTypeCounts: Record<string, number>,
  globalMinPrice: number,
  globalMaxPrice: number,
  today: string,
): string {
  const lines: string[] = [];

  lines.push(`# Catalogue Driveby Africa — Mise à jour ${today}`);
  lines.push('');
  lines.push(`## Résumé de l'inventaire`);
  lines.push(`- Total véhicules disponibles : ${totalVehicles}`);
  lines.push(`- Nombre de marques : ${brandMap.size}`);
  lines.push(`- Fourchette de prix : $${globalMinPrice.toLocaleString()} — $${globalMaxPrice.toLocaleString()} USD`);
  lines.push('');

  // By source
  lines.push('## Répartition par origine');
  const sourceLabels: Record<string, string> = {
    korea: 'Corée du Sud (Encar)',
    china: 'Chine (Dongchedi/CHE168)',
    dubai: 'Dubaï (Émirats Arabes Unis)',
  };
  for (const [src, stats] of Object.entries(sourceStats).sort((a, b) => b[1].count - a[1].count)) {
    const label = sourceLabels[src] || src;
    lines.push(`- ${label} : ${stats.count} véhicules, ${stats.brands.size} marques`);
  }
  lines.push('');

  // Top brands with details — sorted by count
  lines.push('## Marques disponibles (du + au - représenté)');
  const sortedBrands = [...brandMap.entries()].sort((a, b) => b[1].count - a[1].count);

  for (const [brand, stats] of sortedBrands) {
    const displayBrand = brand.charAt(0).toUpperCase() + brand.slice(1);
    const priceRange = stats.minPrice < Infinity
      ? `$${Math.round(stats.minPrice).toLocaleString()} — $${Math.round(stats.maxPrice).toLocaleString()}`
      : 'Prix sur demande';
    const yearMin = Math.min(...stats.years.filter(y => y > 0));
    const yearMax = Math.max(...stats.years);
    const origins = [...stats.sources].join(', ');

    // Top 5 models
    const topModels = [...stats.models.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([m, c]) => `${m} (${c})`)
      .join(', ');

    lines.push(`### ${displayBrand} — ${stats.count} véhicules`);
    lines.push(`- Prix : ${priceRange}`);
    lines.push(`- Années : ${yearMin}–${yearMax}`);
    lines.push(`- Origine : ${origins}`);
    if (topModels) lines.push(`- Modèles populaires : ${topModels}`);
    if (stats.fuelTypes.size > 0) lines.push(`- Carburant : ${[...stats.fuelTypes].join(', ')}`);
    if (stats.bodyTypes.size > 0) lines.push(`- Types : ${[...stats.bodyTypes].join(', ')}`);
    lines.push('');
  }

  // Body types
  lines.push('## Types de carrosserie');
  const bodyLabels: Record<string, string> = {
    suv: 'SUV / Crossover', sedan: 'Berline', hatchback: 'Citadine / Compacte',
    pickup: 'Pick-up', van: 'Van / Utilitaire', coupe: 'Coupé',
    wagon: 'Break', convertible: 'Cabriolet', minivan: 'Monospace',
  };
  for (const [bt, count] of Object.entries(bodyTypeCounts).sort((a, b) => b[1] - a[1])) {
    lines.push(`- ${bodyLabels[bt] || bt} : ${count} véhicules`);
  }
  lines.push('');

  // Fuel types
  lines.push('## Types de motorisation');
  const fuelLabels: Record<string, string> = {
    petrol: 'Essence', diesel: 'Diesel', hybrid: 'Hybride', electric: 'Électrique', lpg: 'GPL',
  };
  for (const [ft, count] of Object.entries(fuelTypeCounts).sort((a, b) => b[1] - a[1])) {
    lines.push(`- ${fuelLabels[ft] || ft} : ${count} véhicules`);
  }
  lines.push('');

  // Price segments
  lines.push('## Segments de prix');
  lines.push('- Économique (< $5 000) : idéal petit budget, véhicules d\'occasion récente');
  lines.push('- Milieu de gamme ($5 000 — $15 000) : SUV compacts, berlines confortables');
  lines.push('- Premium ($15 000 — $30 000) : SUV full options, marques allemandes');
  lines.push('- Luxe (> $30 000) : Land Cruiser, Porsche, BMW X5, Mercedes GLE');

  return lines.join('\n');
}

// ──────────────────────────────────────────────
// User language / expression mapping document
// ──────────────────────────────────────────────

function buildLanguageDocument(
  brandMap: Map<string, BrandStats>,
  sourceStats: Record<string, { count: number; brands: Set<string> }>,
  bodyTypeCounts: Record<string, number>,
  fuelTypeCounts: Record<string, number>,
): string {
  const lines: string[] = [];

  lines.push('# Guide d\'interprétation des demandes clients Driveby Africa');
  lines.push('');
  lines.push('Ce document aide le chatbot à comprendre les expressions courantes des clients et à les convertir en recherches pertinentes dans le catalogue.');
  lines.push('');

  // Origin expressions
  lines.push('## Expressions liées à l\'ORIGINE');
  lines.push('');
  lines.push('### Corée / Coréen / Korean');
  lines.push('- "voiture de Corée", "coréenne", "marque coréenne", "véhicule coréen"');
  lines.push(`- Signifie : Hyundai, Kia${sourceStats['korea'] ? ` (${sourceStats['korea'].count} véhicules en stock)` : ''}`);
  lines.push('- Le client peut aussi dire : "comme en Corée", "importé de Corée", "marque sud-coréenne"');
  lines.push('');
  lines.push('### Chine / Chinois / Chinese');
  lines.push('- "voiture chinoise", "marque chinoise", "véhicule de Chine"');
  const chinaBrands = sourceStats['china'] ? [...sourceStats['china'].brands].slice(0, 10).join(', ') : 'BYD, Chery, Geely, Changan, Haval, Jetour, GAC';
  lines.push(`- Signifie : ${chinaBrands}${sourceStats['china'] ? ` (${sourceStats['china'].count} véhicules en stock)` : ''}`);
  lines.push('- Expressions fréquentes : "auto chinoise", "SUV chinois", "pas cher chinois", "véhicule neuf de Chine"');
  lines.push('');
  lines.push('### Japon / Japonais / Japanese');
  lines.push('- "voiture japonaise", "marque japonaise", "fiabilité japonaise"');
  lines.push('- Signifie : Toyota, Honda, Nissan, Lexus, Suzuki, Mitsubishi');
  lines.push('- Le client peut dire : "comme Toyota", "fiable comme les japonaises", "type japonais"');
  lines.push('');
  lines.push('### Dubaï / Dubai / Émirats');
  lines.push('- "importé de Dubaï", "véhicule de Dubaï", "occasion Dubaï"');
  lines.push(`- Signifie : véhicules toutes marques importés des Émirats Arabes Unis${sourceStats['dubai'] ? ` (${sourceStats['dubai'].count} véhicules en stock)` : ''}`);
  lines.push('- Souvent des Toyota, Lexus, Nissan, Land Rover tropicalisés (adaptés aux fortes chaleurs)');
  lines.push('');
  lines.push('### Allemagne / Allemand / German');
  lines.push('- "voiture allemande", "marque premium", "qualité allemande"');
  lines.push('- Signifie : BMW, Mercedes, Volkswagen, Audi, Porsche');
  lines.push('');

  // Price expressions
  lines.push('## Expressions liées au PRIX');
  lines.push('');
  lines.push('### Budget / Pas cher / Économique');
  lines.push('- "moins cher", "pas cher", "moins chères", "petit budget", "abordable", "économique", "bon marché"');
  lines.push('- Action : trier par prix croissant (start_price_usd ASC)');
  lines.push('- "voiture à 5 millions", "budget 10 millions" → convertir FCFA en USD (÷ taux XAF)');
  lines.push('- "under 10k", "$10000 max" → filtre prix max en USD');
  lines.push('');
  lines.push('### Haut de gamme / Luxe');
  lines.push('- "luxe", "premium", "haut de gamme", "full option", "tout équipé"');
  lines.push('- Action : filtrer par prix élevé ou marques premium (BMW, Mercedes, Porsche, Lexus, Land Rover)');
  lines.push('');
  lines.push('### Meilleur rapport qualité/prix');
  lines.push('- "bon rapport qualité prix", "meilleur deal", "bonne affaire", "promotion"');
  lines.push('- Action : suggérer les marques chinoises (meilleur équipement pour le prix) ou coréennes');
  lines.push('');

  // Vehicle type expressions
  lines.push('## Expressions liées au TYPE de véhicule');
  lines.push('');
  lines.push('### SUV / 4x4');
  lines.push('- "SUV", "4x4", "gros véhicule", "véhicule haut", "crossover", "tout-terrain"');
  lines.push(`- ${bodyTypeCounts['suv'] ? bodyTypeCounts['suv'] + ' SUV en stock' : 'SUV disponibles en stock'}`);
  lines.push('- Suggestions : Haval H6, Hyundai Tucson, Toyota RAV4, Chery Tiggo, Geely Monjaro');
  lines.push('');
  lines.push('### Berline / Sedan');
  lines.push('- "berline", "sedan", "voiture classique", "voiture normale", "4 portes"');
  lines.push(`- ${bodyTypeCounts['sedan'] ? bodyTypeCounts['sedan'] + ' berlines en stock' : 'Berlines disponibles'}`);
  lines.push('');
  lines.push('### Pick-up / Utilitaire');
  lines.push('- "pick-up", "pickup", "camionnette", "benne", "utilitaire", "pour le travail"');
  lines.push(`- ${bodyTypeCounts['pickup'] ? bodyTypeCounts['pickup'] + ' pick-ups en stock' : 'Pick-ups disponibles'}`);
  lines.push('- Souvent : Toyota Hilux, Ford Ranger, Great Wall Poer');
  lines.push('');
  lines.push('### Citadine / Compacte');
  lines.push('- "petite voiture", "citadine", "compacte", "pour la ville", "économique en carburant"');
  lines.push('- Suggestions : Suzuki Swift, Hyundai Venue, Kia Rio, BYD Dolphin');
  lines.push('');
  lines.push('### Familiale / 7 places');
  lines.push('- "familiale", "7 places", "grande voiture", "pour la famille", "monospace", "van"');
  lines.push('- Suggestions : Kia Carnival, Hyundai Palisade, Toyota Highlander');
  lines.push('');

  // Fuel / tech expressions
  lines.push('## Expressions liées à la MOTORISATION');
  lines.push('');
  lines.push('### Électrique / Hybride');
  lines.push('- "électrique", "EV", "hybride", "pas d\'essence", "zéro émission", "rechargeable"');
  lines.push(`- ${(fuelTypeCounts['electric'] || 0) + (fuelTypeCounts['hybrid'] || 0)} véhicules électriques/hybrides en stock`);
  lines.push('- Marques EV populaires : BYD, NIO, XPeng, Tesla, Hyundai Ioniq, Kia EV6');
  lines.push('');
  lines.push('### Diesel');
  lines.push('- "diesel", "gasoil", "gazole", "pour longues distances"');
  lines.push(`- ${fuelTypeCounts['diesel'] || 0} véhicules diesel en stock`);
  lines.push('');

  // Usage expressions
  lines.push('## Expressions liées à l\'USAGE');
  lines.push('');
  lines.push('### Usage urbain');
  lines.push('- "pour la ville", "embouteillages", "Libreville", "Dakar", "Abidjan"');
  lines.push('- Recommander : berlines compactes, hybrides, petits SUV');
  lines.push('');
  lines.push('### Usage rural / pistes');
  lines.push('- "brousse", "piste", "route défoncée", "campagne", "mine"');
  lines.push('- Recommander : 4x4, pick-up, SUV robustes (Land Cruiser, Pajero, Hilux)');
  lines.push('');
  lines.push('### Usage professionnel');
  lines.push('- "transport", "taxi", "VTC", "livraison", "entreprise", "flotte"');
  lines.push('- Recommander : berlines fiables (Toyota Corolla, Hyundai Elantra) ou utilitaires');
  lines.push('');

  // Common questions the chatbot should handle
  lines.push('## Questions fréquentes à reconnaître');
  lines.push('');
  lines.push('- "C\'est quoi le prix ?" / "Combien coûte..." → rechercher le véhicule et donner le prix FCFA + USD');
  lines.push('- "Vous avez des..." / "Disponible ?" → rechercher dans le catalogue');
  lines.push('- "Livraison combien ?" / "Frais de port ?" → consulter les tarifs shipping par destination');
  lines.push('- "Délai de livraison ?" → Corée: 35-45 jours, Chine: 40-60 jours, Dubaï: 25-35 jours');
  lines.push('- "C\'est garanti ?" / "Garantie ?" → consulter la politique de garantie');
  lines.push('- "Comment payer ?" / "Paiement ?" → Stripe, Mobile Money, virement bancaire');
  lines.push('- "Papiers" / "Dédouanement" / "Documents" → processus d\'importation en 13 étapes');
  lines.push('- "Photos" / "Images" / "Montre-moi" → envoyer les fiches véhicule avec images');
  lines.push('');

  // Slang and informal expressions
  lines.push('## Expressions informelles / argot');
  lines.push('');
  lines.push('- "bagnole", "caisse", "tire" → voiture');
  lines.push('- "char" (Cameroun/Canada) → voiture');
  lines.push('- "bolide" → voiture sportive ou rapide');
  lines.push('- "tank" → gros SUV / 4x4 (ne pas confondre avec la marque Tank de Great Wall)');
  lines.push('- "V8", "V6" → moteur puissant, chercher par cylindrée élevée');
  lines.push('- "turbo" → véhicule avec moteur turbo');
  lines.push('- "auto" → voiture (transmission automatique OU automobile selon contexte)');
  lines.push('- "BM" → BMW');
  lines.push('- "Merco" → Mercedes');
  lines.push('- "Toyo" → Toyota');
  lines.push('- "Yunda" / "Yundai" → Hyundai');

  // Available brands list for quick reference
  lines.push('');
  lines.push('## Liste des marques en stock (référence rapide)');
  const allBrands = [...brandMap.entries()]
    .sort((a, b) => b[1].count - a[1].count)
    .map(([b, s]) => `${b.charAt(0).toUpperCase() + b.slice(1)} (${s.count})`);
  lines.push(allBrands.join(', '));

  return lines.join('\n');
}

// ──────────────────────────────────────────────
// Upsert knowledge document (replace if title exists)
// ──────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function upsertKnowledgeDoc(
  supabase: any,
  title: string,
  content: string,
  category: string,
  metadata: Record<string, unknown>,
): Promise<string> {
  // Use 'as any' for tables not in generated types (same pattern as other files)
  const db = supabase as any;

  // Check if a document with this title already exists
  const { data: existing } = await db
    .from('knowledge_documents')
    .select('id')
    .eq('title', title)
    .maybeSingle();

  let docId: string;

  if (existing) {
    // Update existing document
    const { error } = await db
      .from('knowledge_documents')
      .update({ content, metadata, is_active: true })
      .eq('id', existing.id);
    if (error) throw error;

    // Delete old chunks
    await db
      .from('knowledge_chunks')
      .delete()
      .eq('document_id', existing.id);

    docId = existing.id;
    console.log(`[VehicleKB] Updated existing doc: ${title} (${docId})`);
  } else {
    // For the catalog doc, also deactivate older catalog docs
    if (title.startsWith('Catalogue véhicules')) {
      await db
        .from('knowledge_documents')
        .update({ is_active: false })
        .like('title', 'Catalogue véhicules%')
        .neq('title', title);
    }

    // Insert new
    const { data: doc, error } = await db
      .from('knowledge_documents')
      .insert({
        title,
        content,
        category,
        language: 'fr',
        source: 'vehicle_sync',
        is_active: true,
        metadata,
      })
      .select()
      .single();
    if (error) throw error;
    docId = doc.id;
    console.log(`[VehicleKB] Created new doc: ${title} (${docId})`);
  }

  // Chunk and embed
  const chunks = chunkText(content);
  if (chunks.length > 0) {
    const embeddings = await generateEmbeddings(chunks);
    const chunkRows = chunks.map((chunk, index) => ({
      document_id: docId,
      content: chunk,
      chunk_index: index,
      embedding: JSON.stringify(embeddings[index]),
      metadata: { char_count: chunk.length },
    }));

    const { error: chunkError } = await db
      .from('knowledge_chunks')
      .insert(chunkRows);
    if (chunkError) throw chunkError;

    console.log(`[VehicleKB] Embedded ${chunks.length} chunks for: ${title}`);
  }

  return docId;
}

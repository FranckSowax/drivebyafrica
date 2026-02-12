/**
 * Maps ISO country codes to display names (French).
 * Used during profile creation to resolve registration country codes.
 */
const ISO_TO_NAME: Record<string, string> = {
  // Afrique Centrale
  GA: 'Gabon',
  CM: 'Cameroun',
  CG: 'Congo',
  CD: 'RD Congo',
  CF: 'Centrafrique',
  TD: 'Tchad',
  GQ: 'Guinée Équatoriale',
  ST: 'São Tomé-et-Príncipe',
  // Afrique de l'Ouest
  CI: "Côte d'Ivoire",
  SN: 'Sénégal',
  BJ: 'Bénin',
  TG: 'Togo',
  ML: 'Mali',
  BF: 'Burkina Faso',
  GN: 'Guinée',
  GW: 'Guinée-Bissau',
  NE: 'Niger',
  NG: 'Nigeria',
  GH: 'Ghana',
  SL: 'Sierra Leone',
  LR: 'Liberia',
  GM: 'Gambie',
  MR: 'Mauritanie',
  CV: 'Cap-Vert',
  // Afrique de l'Est
  KE: 'Kenya',
  TZ: 'Tanzanie',
  UG: 'Ouganda',
  RW: 'Rwanda',
  BI: 'Burundi',
  ET: 'Éthiopie',
  DJ: 'Djibouti',
  ER: 'Érythrée',
  SO: 'Somalie',
  SS: 'Soudan du Sud',
  // Afrique du Nord
  MA: 'Maroc',
  DZ: 'Algérie',
  TN: 'Tunisie',
  LY: 'Libye',
  EG: 'Égypte',
  SD: 'Soudan',
  // Afrique Australe
  ZA: 'Afrique du Sud',
  AO: 'Angola',
  MZ: 'Mozambique',
  ZM: 'Zambie',
  ZW: 'Zimbabwe',
  BW: 'Botswana',
  NA: 'Namibie',
  MW: 'Malawi',
  SZ: 'Eswatini',
  LS: 'Lesotho',
  // Océan Indien
  MG: 'Madagascar',
  MU: 'Maurice',
  SC: 'Seychelles',
  KM: 'Comores',
  // Europe / Autres
  FR: 'France',
  BE: 'Belgique',
  CH: 'Suisse',
  CA: 'Canada',
  OTHER: 'Autre',
};

/**
 * Resolves a country value to a display name.
 * Handles ISO codes (e.g. 'GA' → 'Gabon') and passes through full names.
 */
export function resolveCountryName(value: string | null | undefined): string {
  if (!value) return 'Gabon';
  // If it's a short code (2-5 chars uppercase), try to map it
  if (value.length <= 5 && value === value.toUpperCase()) {
    return ISO_TO_NAME[value] || value;
  }
  // Already a full name
  return value;
}

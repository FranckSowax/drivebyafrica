/**
 * All 54 African countries with ISO codes and flags.
 * Used in campaign segmentation, shipping, and forms.
 */
export const AFRICAN_COUNTRIES = [
  // West Africa
  { value: 'BJ', label: 'Bénin', flag: '🇧🇯', region: 'west' },
  { value: 'BF', label: 'Burkina Faso', flag: '🇧🇫', region: 'west' },
  { value: 'CV', label: 'Cap-Vert', flag: '🇨🇻', region: 'west' },
  { value: 'CI', label: 'Côte d\'Ivoire', flag: '🇨🇮', region: 'west' },
  { value: 'GM', label: 'Gambie', flag: '🇬🇲', region: 'west' },
  { value: 'GH', label: 'Ghana', flag: '🇬🇭', region: 'west' },
  { value: 'GN', label: 'Guinée', flag: '🇬🇳', region: 'west' },
  { value: 'GW', label: 'Guinée-Bissau', flag: '🇬🇼', region: 'west' },
  { value: 'LR', label: 'Libéria', flag: '🇱🇷', region: 'west' },
  { value: 'ML', label: 'Mali', flag: '🇲🇱', region: 'west' },
  { value: 'MR', label: 'Mauritanie', flag: '🇲🇷', region: 'west' },
  { value: 'NE', label: 'Niger', flag: '🇳🇪', region: 'west' },
  { value: 'NG', label: 'Nigéria', flag: '🇳🇬', region: 'west' },
  { value: 'SN', label: 'Sénégal', flag: '🇸🇳', region: 'west' },
  { value: 'SL', label: 'Sierra Leone', flag: '🇸🇱', region: 'west' },
  { value: 'TG', label: 'Togo', flag: '🇹🇬', region: 'west' },

  // Central Africa
  { value: 'CM', label: 'Cameroun', flag: '🇨🇲', region: 'central' },
  { value: 'CF', label: 'Centrafrique', flag: '🇨🇫', region: 'central' },
  { value: 'TD', label: 'Tchad', flag: '🇹🇩', region: 'central' },
  { value: 'CG', label: 'Congo', flag: '🇨🇬', region: 'central' },
  { value: 'CD', label: 'RD Congo', flag: '🇨🇩', region: 'central' },
  { value: 'GQ', label: 'Guinée équatoriale', flag: '🇬🇶', region: 'central' },
  { value: 'GA', label: 'Gabon', flag: '🇬🇦', region: 'central' },
  { value: 'ST', label: 'São Tomé-et-Príncipe', flag: '🇸🇹', region: 'central' },

  // East Africa
  { value: 'BI', label: 'Burundi', flag: '🇧🇮', region: 'east' },
  { value: 'KM', label: 'Comores', flag: '🇰🇲', region: 'east' },
  { value: 'DJ', label: 'Djibouti', flag: '🇩🇯', region: 'east' },
  { value: 'ER', label: 'Érythrée', flag: '🇪🇷', region: 'east' },
  { value: 'ET', label: 'Éthiopie', flag: '🇪🇹', region: 'east' },
  { value: 'KE', label: 'Kenya', flag: '🇰🇪', region: 'east' },
  { value: 'MG', label: 'Madagascar', flag: '🇲🇬', region: 'east' },
  { value: 'MW', label: 'Malawi', flag: '🇲🇼', region: 'east' },
  { value: 'MU', label: 'Maurice', flag: '🇲🇺', region: 'east' },
  { value: 'MZ', label: 'Mozambique', flag: '🇲🇿', region: 'east' },
  { value: 'RW', label: 'Rwanda', flag: '🇷🇼', region: 'east' },
  { value: 'SC', label: 'Seychelles', flag: '🇸🇨', region: 'east' },
  { value: 'SO', label: 'Somalie', flag: '🇸🇴', region: 'east' },
  { value: 'SS', label: 'Soudan du Sud', flag: '🇸🇸', region: 'east' },
  { value: 'SD', label: 'Soudan', flag: '🇸🇩', region: 'east' },
  { value: 'TZ', label: 'Tanzanie', flag: '🇹🇿', region: 'east' },
  { value: 'UG', label: 'Ouganda', flag: '🇺🇬', region: 'east' },

  // Southern Africa
  { value: 'AO', label: 'Angola', flag: '🇦🇴', region: 'south' },
  { value: 'BW', label: 'Botswana', flag: '🇧🇼', region: 'south' },
  { value: 'SZ', label: 'Eswatini', flag: '🇸🇿', region: 'south' },
  { value: 'LS', label: 'Lesotho', flag: '🇱🇸', region: 'south' },
  { value: 'NA', label: 'Namibie', flag: '🇳🇦', region: 'south' },
  { value: 'ZA', label: 'Afrique du Sud', flag: '🇿🇦', region: 'south' },
  { value: 'ZM', label: 'Zambie', flag: '🇿🇲', region: 'south' },
  { value: 'ZW', label: 'Zimbabwe', flag: '🇿🇼', region: 'south' },

  // North Africa
  { value: 'DZ', label: 'Algérie', flag: '🇩🇿', region: 'north' },
  { value: 'EG', label: 'Égypte', flag: '🇪🇬', region: 'north' },
  { value: 'LY', label: 'Libye', flag: '🇱🇾', region: 'north' },
  { value: 'MA', label: 'Maroc', flag: '🇲🇦', region: 'north' },
  { value: 'TN', label: 'Tunisie', flag: '🇹🇳', region: 'north' },
];

export type AfricanCountryCode = string;
export type AfricanRegion = string;

export const REGIONS = [
  { value: 'west', label: 'Afrique de l\'Ouest' },
  { value: 'central', label: 'Afrique Centrale' },
  { value: 'east', label: 'Afrique de l\'Est' },
  { value: 'south', label: 'Afrique Australe' },
  { value: 'north', label: 'Afrique du Nord' },
];

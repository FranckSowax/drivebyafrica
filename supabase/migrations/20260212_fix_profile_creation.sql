-- ============================================
-- FIX: handle_new_user() trigger to copy all registration fields
-- Previously only copied full_name, losing whatsapp and country
-- ============================================

-- Country ISO code to name mapping function
CREATE OR REPLACE FUNCTION public.iso_country_to_name(code TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN CASE code
    -- Afrique Centrale
    WHEN 'GA' THEN 'Gabon'
    WHEN 'CM' THEN 'Cameroun'
    WHEN 'CG' THEN 'Congo'
    WHEN 'CD' THEN 'RD Congo'
    WHEN 'CF' THEN 'Centrafrique'
    WHEN 'TD' THEN 'Tchad'
    WHEN 'GQ' THEN 'Guinée Équatoriale'
    WHEN 'ST' THEN 'São Tomé-et-Príncipe'
    -- Afrique de l'Ouest
    WHEN 'CI' THEN 'Côte d''Ivoire'
    WHEN 'SN' THEN 'Sénégal'
    WHEN 'BJ' THEN 'Bénin'
    WHEN 'TG' THEN 'Togo'
    WHEN 'ML' THEN 'Mali'
    WHEN 'BF' THEN 'Burkina Faso'
    WHEN 'GN' THEN 'Guinée'
    WHEN 'GW' THEN 'Guinée-Bissau'
    WHEN 'NE' THEN 'Niger'
    WHEN 'NG' THEN 'Nigeria'
    WHEN 'GH' THEN 'Ghana'
    WHEN 'SL' THEN 'Sierra Leone'
    WHEN 'LR' THEN 'Liberia'
    WHEN 'GM' THEN 'Gambie'
    WHEN 'MR' THEN 'Mauritanie'
    WHEN 'CV' THEN 'Cap-Vert'
    -- Afrique de l'Est
    WHEN 'KE' THEN 'Kenya'
    WHEN 'TZ' THEN 'Tanzanie'
    WHEN 'UG' THEN 'Ouganda'
    WHEN 'RW' THEN 'Rwanda'
    WHEN 'BI' THEN 'Burundi'
    WHEN 'ET' THEN 'Éthiopie'
    WHEN 'DJ' THEN 'Djibouti'
    WHEN 'ER' THEN 'Érythrée'
    WHEN 'SO' THEN 'Somalie'
    WHEN 'SS' THEN 'Soudan du Sud'
    -- Afrique du Nord
    WHEN 'MA' THEN 'Maroc'
    WHEN 'DZ' THEN 'Algérie'
    WHEN 'TN' THEN 'Tunisie'
    WHEN 'LY' THEN 'Libye'
    WHEN 'EG' THEN 'Égypte'
    WHEN 'SD' THEN 'Soudan'
    -- Afrique Australe
    WHEN 'ZA' THEN 'Afrique du Sud'
    WHEN 'AO' THEN 'Angola'
    WHEN 'MZ' THEN 'Mozambique'
    WHEN 'ZM' THEN 'Zambie'
    WHEN 'ZW' THEN 'Zimbabwe'
    WHEN 'BW' THEN 'Botswana'
    WHEN 'NA' THEN 'Namibie'
    WHEN 'MW' THEN 'Malawi'
    WHEN 'SZ' THEN 'Eswatini'
    WHEN 'LS' THEN 'Lesotho'
    -- Océan Indien
    WHEN 'MG' THEN 'Madagascar'
    WHEN 'MU' THEN 'Maurice'
    WHEN 'SC' THEN 'Seychelles'
    WHEN 'KM' THEN 'Comores'
    -- Europe / Autres
    WHEN 'FR' THEN 'France'
    WHEN 'BE' THEN 'Belgique'
    WHEN 'CH' THEN 'Suisse'
    WHEN 'CA' THEN 'Canada'
    WHEN 'OTHER' THEN 'Autre'
    ELSE code -- Fallback: return the raw value if not mapped
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Updated trigger function: copies full_name, whatsapp_number, and country
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  raw_country TEXT;
  resolved_country TEXT;
BEGIN
  raw_country := NEW.raw_user_meta_data->>'country';

  -- Map ISO code to full name, fallback to raw value or default
  IF raw_country IS NOT NULL AND char_length(raw_country) <= 5 THEN
    resolved_country := public.iso_country_to_name(raw_country);
  ELSIF raw_country IS NOT NULL THEN
    resolved_country := raw_country; -- Already a full name
  ELSE
    resolved_country := 'Gabon'; -- Default
  END IF;

  INSERT INTO public.profiles (id, full_name, whatsapp_number, country)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'whatsapp',
    resolved_country
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- BACKFILL: Update existing profiles with missing data from auth.users metadata
-- ============================================
UPDATE profiles p
SET
  whatsapp_number = COALESCE(p.whatsapp_number, u.raw_user_meta_data->>'whatsapp'),
  country = CASE
    WHEN p.country = 'Gabon' AND u.raw_user_meta_data->>'country' IS NOT NULL
         AND u.raw_user_meta_data->>'country' != 'GA'
    THEN public.iso_country_to_name(u.raw_user_meta_data->>'country')
    WHEN p.country = 'Gabon' AND u.raw_user_meta_data->>'country' = 'GA'
    THEN 'Gabon' -- Already correct
    ELSE p.country -- Keep existing value
  END
FROM auth.users u
WHERE p.id = u.id
  AND (
    (p.whatsapp_number IS NULL AND u.raw_user_meta_data->>'whatsapp' IS NOT NULL)
    OR
    (p.country = 'Gabon' AND u.raw_user_meta_data->>'country' IS NOT NULL AND u.raw_user_meta_data->>'country' != 'GA')
  );

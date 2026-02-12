-- ============================================
-- FIX: handle_new_user() trigger to copy all registration fields
-- Previously only copied full_name, losing whatsapp and country
-- Now also robust: ON CONFLICT + EXCEPTION handler to never block signup
-- ============================================

-- Updated trigger function: copies full_name, whatsapp_number, and country
-- with error handling so user creation NEVER fails due to profile issues
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  raw_country TEXT;
  resolved_country TEXT;
BEGIN
  raw_country := NEW.raw_user_meta_data->>'country';

  -- Map common ISO codes to display names
  resolved_country := CASE raw_country
    WHEN 'GA' THEN 'Gabon'
    WHEN 'CM' THEN 'Cameroun'
    WHEN 'CG' THEN 'Congo'
    WHEN 'CD' THEN 'RD Congo'
    WHEN 'CF' THEN 'Centrafrique'
    WHEN 'TD' THEN 'Tchad'
    WHEN 'GQ' THEN 'Guinée Équatoriale'
    WHEN 'CI' THEN 'Côte d''Ivoire'
    WHEN 'SN' THEN 'Sénégal'
    WHEN 'BJ' THEN 'Bénin'
    WHEN 'TG' THEN 'Togo'
    WHEN 'ML' THEN 'Mali'
    WHEN 'BF' THEN 'Burkina Faso'
    WHEN 'GN' THEN 'Guinée'
    WHEN 'NE' THEN 'Niger'
    WHEN 'NG' THEN 'Nigeria'
    WHEN 'GH' THEN 'Ghana'
    WHEN 'KE' THEN 'Kenya'
    WHEN 'TZ' THEN 'Tanzanie'
    WHEN 'UG' THEN 'Ouganda'
    WHEN 'RW' THEN 'Rwanda'
    WHEN 'ET' THEN 'Éthiopie'
    WHEN 'MA' THEN 'Maroc'
    WHEN 'DZ' THEN 'Algérie'
    WHEN 'TN' THEN 'Tunisie'
    WHEN 'EG' THEN 'Égypte'
    WHEN 'ZA' THEN 'Afrique du Sud'
    WHEN 'AO' THEN 'Angola'
    WHEN 'MZ' THEN 'Mozambique'
    WHEN 'MG' THEN 'Madagascar'
    WHEN 'FR' THEN 'France'
    WHEN 'BE' THEN 'Belgique'
    WHEN 'CH' THEN 'Suisse'
    WHEN 'CA' THEN 'Canada'
    WHEN 'OTHER' THEN 'Autre'
    WHEN NULL THEN 'Gabon'
    ELSE COALESCE(raw_country, 'Gabon')
  END;

  INSERT INTO public.profiles (id, full_name, whatsapp_number, country)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'whatsapp',
    resolved_country
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = COALESCE(NULLIF(profiles.full_name, ''), EXCLUDED.full_name),
    whatsapp_number = COALESCE(profiles.whatsapp_number, EXCLUDED.whatsapp_number),
    country = CASE
      WHEN profiles.country IS NULL OR profiles.country = 'Gabon'
      THEN EXCLUDED.country
      ELSE profiles.country
    END;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Never block user creation — profile can be completed later by the app
  RAISE WARNING 'handle_new_user failed for user %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

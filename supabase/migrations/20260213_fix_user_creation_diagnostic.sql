-- ============================================
-- DIAGNOSTIC & FIX COMPLET: User Creation Error 500
-- ============================================

-- 1. VÉRIFICATION DE LA STRUCTURE
-- ============================================

-- Vérifier que la colonne role existe
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns 
WHERE table_name = 'profiles' AND column_name = 'role';

-- Vérifier la contrainte check sur role
SELECT conname, pg_get_constraintdef(oid) as definition
FROM pg_constraint 
WHERE conname = 'profiles_role_check' AND conrelid = 'profiles'::regclass;

-- Compter les profils avec role NULL (problème potentiel)
SELECT COUNT(*) as null_roles FROM profiles WHERE role IS NULL;

-- 2. SUPPRESSION DES TRIGGERS PROBLÉMATIQUES (si besoin)
-- ============================================

-- Supprimer le trigger existant pour recréation propre
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 3. FONCTION CORRIGÉE ULTRA-SIMPLE
-- ============================================
-- Version minimaliste qui ne peut pas échouer

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insertion minimaliste avec gestion d'erreur maximale
  BEGIN
    INSERT INTO public.profiles (id, full_name, whatsapp_number, country, role)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
      COALESCE(NEW.raw_user_meta_data->>'whatsapp', ''),
      COALESCE(NEW.raw_user_meta_data->>'country', 'Gabon'),
      'user'  -- Toujours définir explicitement
    )
    ON CONFLICT (id) DO UPDATE SET
      full_name = COALESCE(NULLIF(profiles.full_name, ''), EXCLUDED.full_name),
      whatsapp_number = COALESCE(profiles.whatsapp_number, EXCLUDED.whatsapp_number),
      country = CASE WHEN profiles.country IS NULL THEN EXCLUDED.country ELSE profiles.country END,
      role = COALESCE(profiles.role, 'user');
  EXCEPTION WHEN OTHERS THEN
    -- Log l'erreur mais ne bloque JAMAIS la création d'utilisateur
    RAISE LOG 'handle_new_user error for %: % - %', NEW.id, SQLSTATE, SQLERRM;
  END;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. RECRÉATION DU TRIGGER
-- ============================================

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5. CORRECTION DES DONNÉES EXISTANTES
-- ============================================

-- Mettre à jour les profils sans role
UPDATE profiles SET role = 'user' WHERE role IS NULL;

-- 6. CORRECTION DE LA CONTRAINTE
-- ============================================

-- Supprimer l'ancienne contrainte si elle existe
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

-- Recréer avec tous les rôles valides incluant 'user'
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check 
  CHECK (role IN ('user', 'admin', 'super_admin', 'collaborator'));

-- 7. DÉFINITION DU DÉFAUT
-- ============================================

-- S'assurer que la colonne a un défaut
ALTER TABLE profiles ALTER COLUMN role SET DEFAULT 'user';

-- ============================================
-- VÉRIFICATION FINALE
-- ============================================

-- Vérifier le trigger est bien créé
SELECT 
  tgname as trigger_name,
  proname as function_name,
  tgrelid::regclass as table_name
FROM pg_trigger t
JOIN pg_proc p ON p.oid = t.tgfoid
WHERE tgname = 'on_auth_user_created';

-- Vérifier la fonction existe et est valide
SELECT 
  proname,
  prosrc IS NOT NULL as has_source,
  prosecdef as is_security_definer
FROM pg_proc 
WHERE proname = 'handle_new_user';

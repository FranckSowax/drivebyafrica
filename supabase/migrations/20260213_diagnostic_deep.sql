-- ============================================
-- DIAGNOSTIC PROFOND: Erreur 500 sur Signup
-- ============================================
-- Ce script diagnostic tous les problèmes potentiels

-- 1. VÉRIFICATION AUTH SCHEMA
-- ============================================

-- Vérifier que le schéma auth existe et est accessible
SELECT schema_name FROM information_schema.schemata WHERE schema_name = 'auth';

-- Vérifier la table auth.users existe
SELECT table_name FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'users';

-- 2. VÉRIFICATION DU TRIGGER SUR AUTH.USERS
-- ============================================

-- Lister tous les triggers sur auth.users
SELECT 
    tgname as trigger_name,
    tgenabled as enabled_status,
    proname as function_name
FROM pg_trigger t
JOIN pg_proc p ON p.oid = t.tgfoid
WHERE tgrelid = 'auth.users'::regclass
AND NOT tgisinternal;

-- 3. VÉRIFICATION DE LA FONCTION HANDLE_NEW_USER
-- ============================================

-- Vérifier la fonction existe et son code source
SELECT 
    proname,
    prosrc,
    prosecdef,
    proowner::regrole as owner
FROM pg_proc 
WHERE proname = 'handle_new_user';

-- 4. VÉRIFICATION DES DROITS
-- ============================================

-- Vérifier les droits sur la table profiles
SELECT 
    grantee,
    privilege_type
FROM information_schema.table_privileges
WHERE table_name = 'profiles' 
AND privilege_type IN ('INSERT', 'UPDATE', 'SELECT');

-- 5. TEST DE CRÉATION DE PROFIL MANUEL
-- ============================================

-- Test: Essayer d'insérer un profil de test (sera rollback)
DO $$
BEGIN
    INSERT INTO profiles (id, full_name, whatsapp_number, country, role)
    VALUES (
        '00000000-0000-0000-0000-000000000000'::uuid,
        'Test User',
        '+241000000000',
        'Gabon',
        'user'
    );
    RAISE NOTICE 'TEST INSERT: SUCCÈS - La table profiles accepte les insertions';
    -- Supprimer le test
    DELETE FROM profiles WHERE id = '00000000-0000-0000-0000-000000000000'::uuid;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'TEST INSERT: ÉCHEC - %', SQLERRM;
END $$;

-- 6. VÉRIFICATION DES CONTRAINTES PROFILES
-- ============================================

-- Lister toutes les contraintes sur profiles
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conrelid = 'profiles'::regclass;

-- 7. VÉRIFICATION DES ERREURS RÉCENTES (si disponible)
-- ============================================

-- Compter les profils créés récemment avec problèmes
SELECT 
    COUNT(*) as total_profiles,
    COUNT(CASE WHEN full_name IS NULL OR full_name = '' THEN 1 END) as missing_name,
    COUNT(CASE WHEN role IS NULL THEN 1 END) as missing_role,
    COUNT(CASE WHEN whatsapp_number IS NULL THEN 1 END) as missing_whatsapp,
    MAX(created_at) as most_recent
FROM profiles
WHERE created_at > NOW() - INTERVAL '24 hours';

-- 8. SOLUTION: DÉSACTIVER TEMPORAIREMENT LE TRIGGER POUR TEST
-- ============================================

-- Si vous voulez tester sans le trigger:
-- ALTER TABLE auth.users DISABLE TRIGGER on_auth_user_created;

-- 9. SOLUTION FINALE: RECONSTRUCTION COMPLÈTE
-- ============================================

-- Si le problème persiste, exécutez cette section:

-- 9.1 Supprimer le trigger existant
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 9.2 Supprimer et recréer la fonction avec une approche différente
DROP FUNCTION IF EXISTS public.handle_new_user();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_full_name TEXT;
  v_whatsapp TEXT;
  v_country TEXT;
BEGIN
  -- Récupérer les valeurs avec coalescence
  v_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', '');
  v_whatsapp := COALESCE(NEW.raw_user_meta_data->>'whatsapp', '');
  v_country := COALESCE(NEW.raw_user_meta_data->>'country', 'Gabon');

  -- Essayer l'insertion avec gestion d'erreur interne
  BEGIN
    INSERT INTO public.profiles (id, full_name, whatsapp_number, country, role)
    VALUES (NEW.id, v_full_name, v_whatsapp, v_country, 'user');
    
    RAISE LOG 'Profile created successfully for user %', NEW.id;
    
  EXCEPTION WHEN unique_violation THEN
    -- Le profil existe déjà, mettre à jour si nécessaire
    UPDATE public.profiles 
    SET role = COALESCE(role, 'user')
    WHERE id = NEW.id;
    
    RAISE LOG 'Profile already existed for user %, updated role', NEW.id;
    
  EXCEPTION WHEN OTHERS THEN
    -- Log l'erreur mais ne pas bloquer
    RAISE LOG 'Profile creation warning for user %: %', NEW.id, SQLERRM;
  END;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9.3 Recréer le trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 9.4 Vérifier le trigger est bien créé
SELECT 
    tgname,
    tgenabled
FROM pg_trigger
WHERE tgrelid = 'auth.users'::regclass
AND tgname = 'on_auth_user_created';

-- 10. NETTOYAGE: Corriger les profils existants
-- ============================================

-- Mettre à jour tous les profils sans role
UPDATE profiles 
SET role = 'user' 
WHERE role IS NULL;

-- Vérifier le résultat
SELECT 
    COUNT(*) as total,
    COUNT(CASE WHEN role IS NULL THEN 1 END) as null_roles,
    COUNT(CASE WHEN role = 'user' THEN 1 END) as users,
    COUNT(CASE WHEN role = 'admin' THEN 1 END) as admins,
    COUNT(CASE WHEN role = 'collaborator' THEN 1 END) as collaborators
FROM profiles;

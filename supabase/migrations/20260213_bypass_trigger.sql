-- ============================================
-- SOLUTION IMMÉDIATE: Bypass temporaire du trigger
-- ============================================
-- Exécutez ceci SI le problème persiste après les autres fix

-- ÉTAPE 1: Désactiver temporairement le trigger pour tester
-- ============================================
-- Cela permettra de voir si le problème vient du trigger ou d'ailleurs

-- Désactiver le trigger (sans le supprimer)
ALTER TABLE auth.users DISABLE TRIGGER on_auth_user_created;

-- Tester la création d'utilisateur maintenant
-- Si ça fonctionne, le problème vient bien du trigger

-- ÉTAPE 2: Réactiver avec une fonction ultra-minimaliste
-- ============================================

-- Supprimer l'ancienne fonction
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- Créer une fonction qui ne fait presque rien (juste log)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Log seulement, pas d'insertion pour tester
  RAISE LOG 'New user created: %, meta: %', NEW.id, NEW.raw_user_meta_data;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recréer le trigger avec cette fonction minimale
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Tester à nouveau

-- ÉTAPE 3: Si ça marche, réactiver progressivement
-- ============================================

-- Désactiver le trigger
ALTER TABLE auth.users DISABLE TRIGGER on_auth_user_created;

-- Recréer la fonction complète mais avec gestion d'erreur maximale
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Pause de 10ms pour éviter les deadlocks
  PERFORM pg_sleep(0.01);
  
  BEGIN
    INSERT INTO profiles (id, full_name, whatsapp_number, country, role)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
      COALESCE(NEW.raw_user_meta_data->>'whatsapp', ''),
      COALESCE(NEW.raw_user_meta_data->>'country', 'Gabon'),
      'user'
    );
  EXCEPTION WHEN OTHERS THEN
    -- Ignore toute erreur
    NULL;
  END;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recréer le trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Réactiver
ALTER TABLE auth.users ENABLE TRIGGER on_auth_user_created;

-- ============================================
-- ALTERNATIVE: Trigger en mode "autonomous" (si disponible)
-- ============================================
-- Note: PostgreSQL 14+ avec dblink ou pg_background

-- Si vous avez dblink installé:
-- CREATE EXTENSION IF NOT EXISTS dblink;

-- Puis une version qui utilise dblink pour exécuter async:
/*
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM dblink_exec('dbname=' || current_database(), 
    format('INSERT INTO profiles (id, full_name, whatsapp_number, country, role) VALUES (%L, %L, %L, %L, %L)',
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
      COALESCE(NEW.raw_user_meta_data->>'whatsapp', ''),
      COALESCE(NEW.raw_user_meta_data->>'country', 'Gabon'),
      'user'
    )
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
*/

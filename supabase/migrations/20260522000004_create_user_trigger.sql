-- Função disparada após novo usuário no Supabase Auth:
-- 1. Cria registro em public.users
-- 2. Enrola usuário na liga padrão (Test Bolão)
-- SECURITY DEFINER necessário para escrever em public.* a partir de auth.*
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.league_members (league_id, user_id, role)
  VALUES ('00000000-0000-0000-0000-000000000001', NEW.id, 'member')
  ON CONFLICT (league_id, user_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Remove trigger anterior se existir (idempotência)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

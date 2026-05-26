-- ================================================
-- TIMECLOCK | Schema Supabase
-- Rode isso no SQL Editor do seu projeto Supabase
-- ================================================

-- Tabela de perfis (extende auth.users do Supabase)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de registros de horas
CREATE TABLE time_entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ,
  duration_seconds INTEGER, -- calculado ao parar
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================
-- RLS (Row Level Security) — cada user vê só o seu
-- ================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;

-- profiles: user vê só o próprio, admin vê todos
CREATE POLICY "user_see_own_profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "admin_see_all_profiles" ON profiles
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "user_update_own_profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- time_entries: user gerencia os próprios
CREATE POLICY "user_manage_own_entries" ON time_entries
  FOR ALL USING (auth.uid() = user_id);

-- admin vê todos os registros
CREATE POLICY "admin_see_all_entries" ON time_entries
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ================================================
-- Trigger: cria profile automaticamente no signup
-- ================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'role', 'member')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ================================================
-- Função: busca e-mail pelo nome do usuário (para login por nome)
-- ================================================
CREATE OR REPLACE FUNCTION get_email_by_name(p_name TEXT)
RETURNS TEXT AS $$
DECLARE
  v_email TEXT;
BEGIN
  SELECT au.email INTO v_email
  FROM auth.users au
  JOIN profiles p ON p.id = au.id
  WHERE LOWER(p.name) = LOWER(p_name)
  LIMIT 1;
  RETURN v_email;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================
-- View: resumo de horas por usuário (admin dashboard)
-- ================================================
CREATE VIEW hours_summary AS
SELECT
  p.id AS user_id,
  p.name,
  p.role,
  COUNT(te.id) AS total_sessions,
  COALESCE(SUM(te.duration_seconds), 0) AS total_seconds,
  ROUND(COALESCE(SUM(te.duration_seconds), 0) / 3600.0, 2) AS total_hours,
  DATE(MAX(te.started_at)) AS last_session
FROM profiles p
LEFT JOIN time_entries te ON te.user_id = p.id
GROUP BY p.id, p.name, p.role;

-- ===================================================
-- SCRIPT DE RESTAURAÇÃO TOTAL DE PODERES ADMIN
-- ===================================================

-- 1. GARANTIR QUE AS POLÍTICAS PERMITEM QUE O ADMIN VEJA TUDO
-- (Rodar isso primeiro para liberar o acesso ao banco)

DROP POLICY IF EXISTS "user_profiles_select_policy" ON public.user_profiles;
DROP POLICY IF EXISTS "user_profiles_update_policy" ON public.user_profiles;
DROP POLICY IF EXISTS "user_profiles_delete_policy" ON public.user_profiles;
DROP POLICY IF EXISTS "user_profiles_insert_policy" ON public.user_profiles;

-- Seleção: Dono ou Admin
CREATE POLICY "user_profiles_select_policy" ON public.user_profiles FOR SELECT 
USING (auth.uid() = id OR (EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND is_admin = true)));

-- Update: Dono ou Admin
CREATE POLICY "user_profiles_update_policy" ON public.user_profiles FOR UPDATE 
USING (auth.uid() = id OR (EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND is_admin = true)));

-- Insert: Apenas o próprio (durante cadastro)
CREATE POLICY "user_profiles_insert_policy" ON public.user_profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Delete: Apenas Admin
CREATE POLICY "user_profiles_delete_policy" ON public.user_profiles FOR DELETE 
USING (EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND is_admin = true));

-- 2. FORÇAR STATUS DE ADMIN NO BANCO (O MAIS IMPORTANTE)
-- Este comando garante que seu e-mail tenha is_admin = true
UPDATE public.user_profiles 
SET is_admin = TRUE, is_authorized = TRUE, plan = 'PREMIUM'
WHERE email = 'ivanrossi@outlook.com';

-- 3. CASO O PERFIL NÃO EXISTA (Raro, mas possível se o Sync falhou)
-- Este bloco tenta inserir o perfil caso ele não exista, buscando o ID correto na tabela auth.users
DO $$
DECLARE
    v_user_id UUID;
BEGIN
    SELECT id INTO v_user_id FROM auth.users WHERE email = 'ivanrossi@outlook.com';
    
    IF v_user_id IS NOT NULL THEN
        INSERT INTO public.user_profiles (id, name, email, is_admin, is_authorized, plan)
        VALUES (v_user_id, 'Ivan Rossi Admin', 'ivanrossi@outlook.com', TRUE, TRUE, 'PREMIUM')
        ON CONFLICT (id) DO UPDATE SET is_admin = TRUE, is_authorized = TRUE, plan = 'PREMIUM';
    END IF;
END $$;

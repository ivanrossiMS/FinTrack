-- ===================================================
-- REFORÇO NUCLEAR DE PERMISSÕES E DADOS DO SISTEMA
-- ===================================================

-- 1. Garantir que o Ivan seja Admin no Banco (Layer 1)
UPDATE public.user_profiles
SET 
  is_admin = true, 
  is_authorized = true, 
  plan = 'PREMIUM'
WHERE email = 'ivanrossi@outlook.com';

-- 2. Garantir que a tabela de perfis aceite o Ivan
INSERT INTO public.user_profiles (id, name, email, is_admin, is_authorized, plan)
SELECT id, email, email, true, true, 'PREMIUM'
FROM auth.users
WHERE email = 'ivanrossi@outlook.com'
ON CONFLICT (id) DO UPDATE 
SET is_admin = true, is_authorized = true, plan = 'PREMIUM';

-- 3. Sincronizar Métodos de Pagamento Obrigatórios para o Admin
INSERT INTO public.payment_methods (id, user_id, name, color)
SELECT 'pm_dinheiro', id, 'Dinheiro', '#10b981' FROM public.user_profiles WHERE email = 'ivanrossi@outlook.com'
UNION ALL
SELECT 'pm_pix', id, 'Pix', '#06b6d4' FROM public.user_profiles WHERE email = 'ivanrossi@outlook.com'
UNION ALL
SELECT 'pm_debito', id, 'Cartão de Débito', '#3b82f6' FROM public.user_profiles WHERE email = 'ivanrossi@outlook.com'
UNION ALL
SELECT 'pm_credito', id, 'Cartão de Crédito', '#6366f1' FROM public.user_profiles WHERE email = 'ivanrossi@outlook.com'
UNION ALL
SELECT 'pm_cripto', id, 'Cripto', '#f59e0b' FROM public.user_profiles WHERE email = 'ivanrossi@outlook.com'
UNION ALL
SELECT 'pm_cheque', id, 'Cheque', '#64748b' FROM public.user_profiles WHERE email = 'ivanrossi@outlook.com'
UNION ALL
SELECT 'pm_permuta', id, 'Permuta', '#8b5cf6' FROM public.user_profiles WHERE email = 'ivanrossi@outlook.com'
ON CONFLICT (id) DO NOTHING;

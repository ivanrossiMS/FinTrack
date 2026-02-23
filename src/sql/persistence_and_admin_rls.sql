-- ===================================================
-- REFORÇO DE ADMIN E PERSISTÊNCIA GLOBAL (RLS)
-- ===================================================

-- 1. Função auxiliar para verificar se o usuário é Admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = auth.uid() AND is_admin = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Atualizar Políticas para user_profiles
DROP POLICY IF EXISTS "Users can view their own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.user_profiles;

CREATE POLICY "Admins can view all profiles / Users can view own" 
ON public.user_profiles FOR SELECT 
USING (auth.uid() = id OR public.is_admin());

CREATE POLICY "Admins can manage all profiles / Users can update own" 
ON public.user_profiles FOR UPDATE 
USING (auth.uid() = id OR public.is_admin())
WITH CHECK (auth.uid() = id OR public.is_admin());

-- 3. Atualizar Políticas para Categorias
DROP POLICY IF EXISTS "Users can manage their own categories" ON public.categories;
CREATE POLICY "Admin Global / User Personal - Categories" 
ON public.categories FOR ALL 
USING (auth.uid() = user_id OR public.is_admin())
WITH CHECK (auth.uid() = user_id OR public.is_admin());

-- 4. Atualizar Políticas para Métodos de Pagamento
DROP POLICY IF EXISTS "Users can manage their own payment methods" ON public.payment_methods;
CREATE POLICY "Admin Global / User Personal - Methods" 
ON public.payment_methods FOR ALL 
USING (auth.uid() = user_id OR public.is_admin())
WITH CHECK (auth.uid() = user_id OR public.is_admin());

-- 5. Atualizar Políticas para Transações
DROP POLICY IF EXISTS "Users can manage their own transactions" ON public.transactions;
CREATE POLICY "Admin Global / User Personal - Transactions" 
ON public.transactions FOR ALL 
USING (auth.uid() = user_id OR public.is_admin())
WITH CHECK (auth.uid() = user_id OR public.is_admin());

-- 6. Atualizar Políticas para Compromissos
DROP POLICY IF EXISTS "Users can manage their own commitments" ON public.commitments;
CREATE POLICY "Admin Global / User Personal - Commitments" 
ON public.commitments FOR ALL 
USING (auth.uid() = user_id OR public.is_admin())
WITH CHECK (auth.uid() = user_id OR public.is_admin());

-- 7. Atualizar Políticas para Metas de Economia
DROP POLICY IF EXISTS "Users can manage their own savings goals" ON public.savings_goals;
CREATE POLICY "Admin Global / User Personal - Savings" 
ON public.savings_goals FOR ALL 
USING (auth.uid() = user_id OR public.is_admin())
WITH CHECK (auth.uid() = user_id OR public.is_admin());

-- 8. Política para Fornecedores (Tabela que pode ter sido criada recentemente)
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin Global / User Personal - Suppliers" ON public.suppliers;
CREATE POLICY "Admin Global / User Personal - Suppliers" 
ON public.suppliers FOR ALL 
USING (auth.uid() = user_id OR public.is_admin())
WITH CHECK (auth.uid() = user_id OR public.is_admin());

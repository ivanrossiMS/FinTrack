-- ==========================================
-- NUCLEAR RESET & RE-INSTALLATION SCRIPT
-- ==========================================
-- WARNING: This will delete ALL data in your public schema.

-- 1. DROP EVERYTHING (Clean Slate)
DROP TABLE IF EXISTS public.commitments CASCADE;
DROP TABLE IF EXISTS public.transactions CASCADE;
DROP TABLE IF EXISTS public.savings_goals CASCADE;
DROP TABLE IF EXISTS public.payment_methods CASCADE;
DROP TABLE IF EXISTS public.categories CASCADE;
DROP TABLE IF EXISTS public.user_profiles CASCADE;

-- 2. CREATE USER PROFILES
CREATE TABLE public.user_profiles (
    id UUID REFERENCES auth.users NOT NULL PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    profession TEXT,
    avatar TEXT,
    is_admin BOOLEAN DEFAULT FALSE,
    is_authorized BOOLEAN DEFAULT TRUE, -- Default to TRUE for now to facilitate onboarding
    plan TEXT DEFAULT 'FREE'
);

-- 3. CREATE CATEGORIES
CREATE TABLE public.categories (
    id TEXT PRIMARY KEY,
    user_id UUID REFERENCES auth.users NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL, -- 'EXPENSE' or 'INCOME'
    color TEXT,
    icon TEXT,
    is_default BOOLEAN DEFAULT FALSE
);

-- 4. CREATE PAYMENT METHODS
CREATE TABLE public.payment_methods (
    id TEXT PRIMARY KEY,
    user_id UUID REFERENCES auth.users NOT NULL,
    name TEXT NOT NULL,
    color TEXT
);

-- 5. CREATE TRANSACTIONS
CREATE TABLE public.transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users NOT NULL,
    type TEXT NOT NULL, -- 'EXPENSE' or 'INCOME'
    amount DECIMAL(12,2) NOT NULL,
    description TEXT NOT NULL,
    date TIMESTAMP WITH TIME ZONE NOT NULL,
    category_id TEXT REFERENCES public.categories(id),
    payment_method_id TEXT REFERENCES public.payment_methods(id),
    supplier_id TEXT,
    is_recurring BOOLEAN DEFAULT FALSE,
    recurrence_count INTEGER,
    installment_id UUID,
    installment_number INTEGER,
    total_installments INTEGER,
    tags TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. CREATE COMMITMENTS (Scheduled payments)
CREATE TABLE public.commitments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users NOT NULL,
    description TEXT NOT NULL,
    due_date TIMESTAMP WITH TIME ZONE NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    status TEXT DEFAULT 'PENDING',
    category_id TEXT REFERENCES public.categories(id),
    payment_method_id TEXT REFERENCES public.payment_methods(id),
    transaction_id UUID REFERENCES public.transactions(id),
    payment_date DATE,
    installment_id UUID,
    installment_number INTEGER,
    total_installments INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. CREATE SAVINGS GOALS
CREATE TABLE public.savings_goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users NOT NULL,
    description TEXT NOT NULL,
    target_amount DECIMAL(12,2) NOT NULL,
    current_amount DECIMAL(12,2) DEFAULT 0,
    target_date TIMESTAMP WITH TIME ZONE NOT NULL,
    color TEXT,
    icon TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 8. ENABLE ROW LEVEL SECURITY
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commitments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.savings_goals ENABLE ROW LEVEL SECURITY;

-- 9. CREATE RLS POLICIES
CREATE POLICY "Users can view their own profile" ON public.user_profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can insert their own profile" ON public.user_profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON public.user_profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can manage their own categories" ON public.categories FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own payment methods" ON public.payment_methods FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own transactions" ON public.transactions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own commitments" ON public.commitments FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own savings goals" ON public.savings_goals FOR ALL USING (auth.uid() = user_id);

-- 10. CATEGORY AUTO-INJECTION FUNCTION
CREATE OR REPLACE FUNCTION public.handle_new_user_setup()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert 30 Fixed Categories for the new user
  INSERT INTO public.categories (id, user_id, name, type, color, icon, is_default) VALUES
  -- Saídas (Expense)
  ('cat_alimentacao_' || NEW.id, NEW.id, 'Alimentação', 'EXPENSE', '#ef4444', 'Utensils', true),
  ('cat_aluguel_' || NEW.id, NEW.id, 'Aluguel', 'EXPENSE', '#dc2626', 'Home', true),
  ('cat_saude_' || NEW.id, NEW.id, 'Saúde', 'EXPENSE', '#b91c1c', 'HeartPulse', true),
  ('cat_transporte_' || NEW.id, NEW.id, 'Transporte', 'EXPENSE', '#991b1b', 'Car', true),
  ('cat_educacao_' || NEW.id, NEW.id, 'Educação', 'EXPENSE', '#7f1d1d', 'GraduationCap', true),
  ('cat_lazer_' || NEW.id, NEW.id, 'Lazer', 'EXPENSE', '#f87171', 'Palmtree', true),
  ('cat_vestuario_' || NEW.id, NEW.id, 'Vestuário', 'EXPENSE', '#fca5a5', 'Shirt', true),
  ('cat_contas_fixas_' || NEW.id, NEW.id, 'Contas Fixas', 'EXPENSE', '#ef4444', 'FileText', true),
  ('cat_supermercado_' || NEW.id, NEW.id, 'Supermercado', 'EXPENSE', '#dc2626', 'ShoppingCart', true),
  ('cat_academia_' || NEW.id, NEW.id, 'Academia', 'EXPENSE', '#b91c1c', 'Activity', true),
  ('cat_assinaturas_' || NEW.id, NEW.id, 'Assinaturas', 'EXPENSE', '#991b1b', 'Play', true),
  ('cat_cuidados_pessoais_' || NEW.id, NEW.id, 'Cuidados Pessoais', 'EXPENSE', '#7f1d1d', 'Sparkles', true),
  ('cat_presentes_' || NEW.id, NEW.id, 'Presentes', 'EXPENSE', '#f87171', 'Gift', true),
  ('cat_viagens_' || NEW.id, NEW.id, 'Viagens', 'EXPENSE', '#fca5a5', 'Plane', true),
  ('cat_manutencao_casa_' || NEW.id, NEW.id, 'Manutenção Casa', 'EXPENSE', '#ef4444', 'Wrench', true),
  ('cat_eletronicos_' || NEW.id, NEW.id, 'Eletrônicos', 'EXPENSE', '#dc2626', 'Smartphone', true),
  ('cat_pets_' || NEW.id, NEW.id, 'Pets', 'EXPENSE', '#b91c1c', 'Dog', true),
  ('cat_impostos_' || NEW.id, NEW.id, 'Impostos', 'EXPENSE', '#991b1b', 'Gavel', true),
  ('cat_outros_gastos_' || NEW.id, NEW.id, 'Outros Gastos', 'EXPENSE', '#7f1d1d', 'MoreHorizontal', true),
  -- Entradas (Income)
  ('cat_salario_' || NEW.id, NEW.id, 'Salário', 'INCOME', '#22c55e', 'Wallet', true),
  ('cat_pro-labore_' || NEW.id, NEW.id, 'Pro-labore', 'INCOME', '#16a34a', 'Briefcase', true),
  ('cat_rendimentos_' || NEW.id, NEW.id, 'Rendimentos', 'INCOME', '#15803d', 'TrendingUp', true),
  ('cat_vendas_' || NEW.id, NEW.id, 'Vendas', 'INCOME', '#166534', 'Tag', true),
  ('cat_reembolsos_' || NEW.id, NEW.id, 'Reembolsos', 'INCOME', '#14532d', 'RotateCcw', true),
  ('cat_premios_' || NEW.id, NEW.id, 'Prêmios', 'INCOME', '#4ade80', 'Award', true),
  ('cat_alugueis_recebidos_' || NEW.id, NEW.id, 'Aluguéis Recebidos', 'INCOME', '#86efac', 'Key', true),
  ('cat_freelance_' || NEW.id, NEW.id, 'Freelance', 'INCOME', '#22c55e', 'Laptop', true),
  ('cat_dividendos_' || NEW.id, NEW.id, 'Dividendos', 'INCOME', '#16a34a', 'Coins', true),
  ('cat_bonificacoes_' || NEW.id, NEW.id, 'Bonificações', 'INCOME', '#15803d', 'PlusCircle', true),
  ('cat_outras_receitas_' || NEW.id, NEW.id, 'Outras Receitas', 'INCOME', '#166534', 'MoreVertical', true);
  
  -- Insert Default Payment Method
  INSERT INTO public.payment_methods (id, user_id, name, color) VALUES
  ('pay_dinheiro_' || NEW.id, NEW.id, 'Dinheiro', '#22c55e');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11. TRIGGER FOR PROFILE CREATION (Automatic)
-- This ensures that when a user registers, their categories are created immediately
CREATE TRIGGER on_profile_created
  AFTER INSERT ON public.user_profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_setup();

-- 12. SPECIAL PERMISSION FOR ADMIN
-- Ensure ivanrossi@outlook.com is always unauthorized bypass if needed
UPDATE public.user_profiles SET is_admin = TRUE, is_authorized = TRUE WHERE email = 'ivanrossi@outlook.com';

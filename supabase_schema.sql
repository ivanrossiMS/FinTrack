-- ########################################################
-- # FINTRACK SUPABASE INITIAL SCHEMA (IDEMPOTENT VERSION)
-- ########################################################
-- COMO USAR:
-- 1. Abra o SQL Editor na Supabase
-- 2. Cole este script inteiro
-- 3. Clique em RUN
-- ########################################################

-- 1. Create User Profiles table
DROP TABLE IF EXISTS public.user_profiles; -- Limpeza de versão anterior caso exista
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users NOT NULL PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    profession TEXT,
    avatar_url TEXT,
    role TEXT DEFAULT 'USER',
    is_authorized BOOLEAN DEFAULT TRUE,
    plan TEXT DEFAULT 'FREE',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Create Categories table
CREATE TABLE IF NOT EXISTS public.categories (
    id TEXT PRIMARY KEY,
    user_id UUID REFERENCES auth.users NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    color TEXT,
    icon TEXT,
    is_default BOOLEAN DEFAULT FALSE
);

-- 3. Create Suppliers table
CREATE TABLE IF NOT EXISTS public.suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users NOT NULL,
    name TEXT NOT NULL,
    contact TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Create Payment Methods table
CREATE TABLE IF NOT EXISTS public.payment_methods (
    id TEXT PRIMARY KEY,
    user_id UUID REFERENCES auth.users NOT NULL,
    name TEXT NOT NULL,
    color TEXT,
    is_default BOOLEAN DEFAULT FALSE
);

-- ── TYPE STANDARDIZATION (Ensure TEXT IDs for categories and payment methods) ──
-- This handles migrations from older UUID versions of the schema.
DO $$ 
BEGIN
  -- 1. Drop existing constraints to allow type changes
  ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_category_id_fkey;
  ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_payment_method_id_fkey;
  ALTER TABLE public.commitments DROP CONSTRAINT IF EXISTS commitments_category_id_fkey;
  ALTER TABLE public.commitments DROP CONSTRAINT IF EXISTS commitments_payment_method_id_fkey;

  -- 2. Fix categories.id and its references
  IF (SELECT data_type FROM information_schema.columns WHERE table_name = 'categories' AND column_name = 'id') = 'uuid' THEN
    ALTER TABLE public.transactions ALTER COLUMN category_id TYPE TEXT USING category_id::text;
    ALTER TABLE public.commitments ALTER COLUMN category_id TYPE TEXT USING category_id::text;
    ALTER TABLE public.categories ALTER COLUMN id TYPE TEXT USING id::text;
  END IF;

  -- 3. Fix payment_methods.id and its references
  IF (SELECT data_type FROM information_schema.columns WHERE table_name = 'payment_methods' AND column_name = 'id') = 'uuid' THEN
    ALTER TABLE public.transactions ALTER COLUMN payment_method_id TYPE TEXT USING payment_method_id::text;
    ALTER TABLE public.commitments ALTER COLUMN payment_method_id TYPE TEXT USING payment_method_id::text;
    ALTER TABLE public.payment_methods ALTER COLUMN id TYPE TEXT USING id::text;
  END IF;
  
  -- 4. Re-add constraints (now with matched types)
  ALTER TABLE public.transactions 
    ADD CONSTRAINT transactions_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE SET NULL;
  ALTER TABLE public.transactions 
    ADD CONSTRAINT transactions_payment_method_id_fkey FOREIGN KEY (payment_method_id) REFERENCES public.payment_methods(id) ON DELETE SET NULL;
  ALTER TABLE public.commitments 
    ADD CONSTRAINT commitments_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE SET NULL;
  ALTER TABLE public.commitments 
    ADD CONSTRAINT commitments_payment_method_id_fkey FOREIGN KEY (payment_method_id) REFERENCES public.payment_methods(id) ON DELETE SET NULL;

  -- 5. Ensure is_default columns exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'categories' AND column_name = 'is_default') THEN
    ALTER TABLE public.categories ADD COLUMN is_default BOOLEAN DEFAULT FALSE;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payment_methods' AND column_name = 'is_default') THEN
    ALTER TABLE public.payment_methods ADD COLUMN is_default BOOLEAN DEFAULT FALSE;
  END IF;
END $$;

-- 5. Create Transactions table
CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users NOT NULL,
    type TEXT NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    description TEXT NOT NULL,
    date TIMESTAMP WITH TIME ZONE NOT NULL,
    category_id TEXT,
    payment_method_id TEXT,
    supplier_id UUID REFERENCES public.suppliers(id),
    is_recurring BOOLEAN DEFAULT FALSE,
    recurrence_count INTEGER,
    installment_id UUID,
    installment_number INTEGER,
    total_installments INTEGER,
    tags TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. Create Commitments table
CREATE TABLE IF NOT EXISTS public.commitments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users NOT NULL,
    description TEXT NOT NULL,
    due_date TIMESTAMP WITH TIME ZONE NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    status TEXT DEFAULT 'PENDING',
    category_id TEXT,
    payment_method_id TEXT,
    transaction_id UUID REFERENCES public.transactions(id),
    payment_date DATE,
    installment_id UUID,
    installment_number INTEGER,
    total_installments INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. Create Savings Goals table
CREATE TABLE IF NOT EXISTS public.savings_goals (
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

-- Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commitments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.savings_goals ENABLE ROW LEVEL SECURITY;

-- ── FUNCTIONS & POLICIES ──

-- Admin check function
CREATE OR REPLACE FUNCTION is_admin() 
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND (role = 'ADMIN' OR email = 'ivanrossi@outlook.com')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Cleanup existing policies to avoid "already exists" errors
DO $$ 
DECLARE 
  pol RECORD;
BEGIN
  FOR pol IN (SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public') 
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', pol.policyname, pol.tablename);
  END LOOP;
END $$;

-- User Profiles Policies
CREATE POLICY "Admin can view all profiles" ON public.profiles FOR SELECT USING (is_admin());
CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admin can update all profiles" ON public.profiles FOR UPDATE USING (is_admin());

-- Generic Multi-tenant Policies (Applied to all data tables)
DO $$ 
DECLARE 
  t text;
BEGIN
  FOR t IN SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('categories', 'suppliers', 'payment_methods', 'transactions', 'commitments', 'savings_goals')
  LOOP
    EXECUTE format('CREATE POLICY "Manage own %I" ON public.%I FOR ALL USING (auth.uid() = user_id OR is_admin()) WITH CHECK (auth.uid() = user_id OR is_admin())', t, t);
  END LOOP;
END $$;

-- ── AUTOMATIC PROFILE CREATION TRIGGER ──
-- This ensures every user in auth.users has a record in public.user_profiles
-- World-class approach: database triggers are more reliable than client-side sync.

CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  -- 1. Create Profile
  INSERT INTO public.profiles (id, name, email, role, is_authorized)
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1), 'Usuário'), 
    NEW.email,
    CASE WHEN NEW.email = 'ivanrossi@outlook.com' THEN 'ADMIN' ELSE 'USER' END,
    TRUE
  )
  ON CONFLICT (id) DO NOTHING;

  -- 2. Seed Default Categories
  INSERT INTO public.categories (id, user_id, name, type, color, icon, is_default)
  VALUES
    ('cat_contas_casa', NEW.id, 'Contas', 'EXPENSE', '#6366f1', 'Home', true),
    ('cat_impostos', NEW.id, 'Impostos & Taxas', 'EXPENSE', '#64748b', 'FileText', true),
    ('cat_seguros', NEW.id, 'Seguros', 'EXPENSE', '#475569', 'Shield', true),
    ('cat_dividas', NEW.id, 'Dívidas & Empréstimos', 'EXPENSE', '#ef4444', 'TrendingDown', true),
    ('cat_cartao', NEW.id, 'Cartão de Crédito', 'EXPENSE', '#f43f5e', 'CreditCard', true),
    ('cat_mercado', NEW.id, 'Compras / Mercado Extra', 'EXPENSE', '#10b981', 'ShoppingBag', true),
    ('cat_vestuario', NEW.id, 'Vestuário', 'EXPENSE', '#ec4899', 'Shirt', true),
    ('cat_beleza', NEW.id, 'Beleza & Autocuidado', 'EXPENSE', '#f472b6', 'Sparkles', true),
    ('cat_casa_manut', NEW.id, 'Casa & Manutenção', 'EXPENSE', '#06b6d4', 'Hammer', true),
    ('cat_tecnologia', NEW.id, 'Tecnologia', 'EXPENSE', '#3b82f6', 'Cpu', true),
    ('cat_viagens', NEW.id, 'Viagens', 'EXPENSE', '#8b5cf6', 'Plane', true),
    ('cat_presentes', NEW.id, 'Presentes & Doações', 'EXPENSE', '#d946ef', 'Gift', true),
    ('cat_assinaturas', NEW.id, 'Assinaturas', 'EXPENSE', '#0ea5e9', 'RefreshCw', true),
    ('cat_educacao', NEW.id, 'Educação & Livros', 'EXPENSE', '#f59e0b', 'BookOpen', true),
    ('cat_pets', NEW.id, 'Pets & Cuidado', 'EXPENSE', '#14b8a6', 'Dog', true),
    ('cat_transporte', NEW.id, 'Transporte / Veículos', 'EXPENSE', '#f97316', 'Car', true),
    ('cat_alimentacao', NEW.id, 'Alimentação', 'EXPENSE', '#fb7185', 'Utensils', true),
    ('cat_lazer', NEW.id, 'Lazer', 'EXPENSE', '#a855f7', 'Gamepad2', true),
    ('cat_saude', NEW.id, 'Saúde', 'EXPENSE', '#f43f5e', 'Activity', true),
    ('cat_investimentos', NEW.id, 'Investimentos', 'EXPENSE', '#06b6d4', 'TrendingUp', true),
    ('cat_extras', NEW.id, 'Extras', 'EXPENSE', '#94a3b8', 'MoreHorizontal', true),
    ('cat_salario', NEW.id, 'Salário', 'INCOME', '#22c55e', 'Wallet', true),
    ('cat_bonus', NEW.id, 'Bônus / 13º', 'INCOME', '#16a34a', 'Coins', true),
    ('cat_comissoes', NEW.id, 'Comissões', 'INCOME', '#10b981', 'Percentage', true),
    ('cat_aluguel', NEW.id, 'Renda de Aluguel', 'INCOME', '#0d9488', 'Key', true),
    ('cat_rendimentos', NEW.id, 'Rendimentos', 'INCOME', '#06b6d4', 'TrendingUp', true),
    ('cat_reembolsos', NEW.id, 'Reembolsos', 'INCOME', '#38bdf8', 'ArrowLeftRight', true),
    ('cat_restituicao', NEW.id, 'Restituição / Devoluções', 'INCOME', '#4ade80', 'Undo2', true),
    ('cat_premios', NEW.id, 'Prêmios / Sorteios', 'INCOME', '#fbbf24', 'Trophy', true),
    ('cat_servicos', NEW.id, 'Serviços / Consultorias', 'INCOME', '#3b82f6', 'Briefcase', true),
    ('cat_vendas', NEW.id, 'Vendas', 'INCOME', '#4f46e5', 'ShoppingBag', true)
  ON CONFLICT (id) DO NOTHING;

  -- 3. Seed Default Payment Methods
  INSERT INTO public.payment_methods (id, user_id, name, color, is_default)
  VALUES
    ('pm_dinheiro', NEW.id, 'Dinheiro', '#10b981', true),
    ('pm_pix', NEW.id, 'Pix', '#06b6d4', true),
    ('pm_credito', NEW.id, 'Cartão de Crédito', '#6366f1', true),
    ('pm_debito', NEW.id, 'Cartão de Débito', '#3b82f6', true),
    ('pm_permuta', NEW.id, 'Permuta', '#8b5cf6', true)
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to run after auth.users insertion
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ── REPAIR ORPHAN PROFILES & SEED DEFAULTS ──
INSERT INTO public.profiles (id, name, email, role, is_authorized)
SELECT 
  id, 
  COALESCE(raw_user_meta_data->>'name', split_part(email, '@', 1), 'Usuário'), 
  email,
  CASE WHEN email = 'ivanrossi@outlook.com' THEN 'ADMIN' ELSE 'USER' END,
  TRUE
FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- Seed defaults for ANY profile that has 0 categories (EXISTING USERS REPAIR)
DO $$
DECLARE
    user_record RECORD;
BEGIN
    FOR user_record IN SELECT id FROM public.profiles
    LOOP
        -- Se não tiver categorias, injeta
        IF NOT EXISTS (SELECT 1 FROM public.categories WHERE user_id = user_record.id) THEN
            INSERT INTO public.categories (id, user_id, name, type, color, icon, is_default)
            VALUES
                ('cat_contas_casa', user_record.id, 'Contas', 'EXPENSE', '#6366f1', 'Home', true),
                ('cat_impostos', user_record.id, 'Impostos & Taxas', 'EXPENSE', '#64748b', 'FileText', true),
                ('cat_seguros', user_record.id, 'Seguros', 'EXPENSE', '#475569', 'Shield', true),
                ('cat_dividas', user_record.id, 'Dívidas & Empréstimos', 'EXPENSE', '#ef4444', 'TrendingDown', true),
                ('cat_cartao', user_record.id, 'Cartão de Crédito', 'EXPENSE', '#f43f5e', 'CreditCard', true),
                ('cat_mercado', user_record.id, 'Compras / Mercado Extra', 'EXPENSE', '#10b981', 'ShoppingBag', true),
                ('cat_vestuario', user_record.id, 'Vestuário', 'EXPENSE', '#ec4899', 'Shirt', true),
                ('cat_beleza', user_record.id, 'Beleza & Autocuidado', 'EXPENSE', '#f472b6', 'Sparkles', true),
                ('cat_casa_manut', user_record.id, 'Casa & Manutenção', 'EXPENSE', '#06b6d4', 'Hammer', true),
                ('cat_tecnologia', user_record.id, 'Tecnologia', 'EXPENSE', '#3b82f6', 'Cpu', true),
                ('cat_viagens', user_record.id, 'Viagens', 'EXPENSE', '#8b5cf6', 'Plane', true),
                ('cat_presentes', user_record.id, 'Presentes & Doações', 'EXPENSE', '#d946ef', 'Gift', true),
                ('cat_assinaturas', user_record.id, 'Assinaturas', 'EXPENSE', '#0ea5e9', 'RefreshCw', true),
                ('cat_educacao', user_record.id, 'Educação & Livros', 'EXPENSE', '#f59e0b', 'BookOpen', true),
                ('cat_pets', user_record.id, 'Pets & Cuidado', 'EXPENSE', '#14b8a6', 'Dog', true),
                ('cat_transporte', user_record.id, 'Transporte / Veículos', 'EXPENSE', '#f97316', 'Car', true),
                ('cat_alimentacao', user_record.id, 'Alimentação', 'EXPENSE', '#fb7185', 'Utensils', true),
                ('cat_lazer', user_record.id, 'Lazer', 'EXPENSE', '#a855f7', 'Gamepad2', true),
                ('cat_saude', user_record.id, 'Saúde', 'EXPENSE', '#f43f5e', 'Activity', true),
                ('cat_investimentos', user_record.id, 'Investimentos', 'EXPENSE', '#06b6d4', 'TrendingUp', true),
                ('cat_extras', user_record.id, 'Extras', 'EXPENSE', '#94a3b8', 'MoreHorizontal', true),
                ('cat_salario', user_record.id, 'Salário', 'INCOME', '#22c55e', 'Wallet', true),
                ('cat_bonus', user_record.id, 'Bônus / 13º', 'INCOME', '#16a34a', 'Coins', true),
                ('cat_comissoes', user_record.id, 'Comissões', 'INCOME', '#10b981', 'Percentage', true),
                ('cat_aluguel', user_record.id, 'Renda de Aluguel', 'INCOME', '#0d9488', 'Key', true),
                ('cat_rendimentos', user_record.id, 'Rendimentos', 'INCOME', '#06b6d4', 'TrendingUp', true),
                ('cat_reembolsos', user_record.id, 'Reembolsos', 'INCOME', '#38bdf8', 'ArrowLeftRight', true),
                ('cat_restituicao', user_record.id, 'Restituição / Devoluções', 'INCOME', '#4ade80', 'Undo2', true),
                ('cat_premios', user_record.id, 'Prêmios / Sorteios', 'INCOME', '#fbbf24', 'Trophy', true),
                ('cat_servicos', user_record.id, 'Serviços / Consultorias', 'INCOME', '#3b82f6', 'Briefcase', true),
                ('cat_vendas', user_record.id, 'Vendas', 'INCOME', '#4f46e5', 'ShoppingBag', true)
            ON CONFLICT (id) DO NOTHING;
        END IF;

        -- Mesma lógica para payment methods
        IF NOT EXISTS (SELECT 1 FROM public.payment_methods WHERE user_id = user_record.id) THEN
            INSERT INTO public.payment_methods (id, user_id, name, color, is_default)
            VALUES
                ('pm_dinheiro', user_record.id, 'Dinheiro', '#10b981', true),
                ('pm_pix', user_record.id, 'Pix', '#06b6d4', true),
                ('pm_credito', user_record.id, 'Cartão de Crédito', '#6366f1', true),
                ('pm_debito', user_record.id, 'Cartão de Débito', '#3b82f6', true),
                ('pm_permuta', user_record.id, 'Permuta', '#8b5cf6', true)
            ON CONFLICT (id) DO NOTHING;
        END IF;
    END LOOP;
END $$;

-- 8. Storage Buckets Setup
INSERT INTO storage.buckets (id, name, public) 
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public) 
VALUES ('attachments', 'attachments', false)
ON CONFLICT (id) DO NOTHING;

-- Cleanup storage policies
DO $$ 
DECLARE 
  pol RECORD;
BEGIN
  FOR pol IN (SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects') 
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', pol.policyname);
  END LOOP;
END $$;

-- Storage Policies for Avatars
CREATE POLICY "Avatar public access" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "Users can upload their own avatar" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can update their own avatar" ON storage.objects FOR UPDATE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Storage Policies for Attachments
CREATE POLICY "Users can manage their own attachments" ON storage.objects FOR ALL USING (bucket_id = 'attachments' AND (auth.uid()::text = (storage.foldername(name))[1] OR is_admin())) WITH CHECK (bucket_id = 'attachments' AND (auth.uid()::text = (storage.foldername(name))[1] OR is_admin()));

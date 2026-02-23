-- ===================================================
-- SCHEMA DE FORNECEDORES E MÉTODOS DE PAGAMENTO
-- ===================================================

-- 1. Criar Tabela de Fornecedores (Suppliers)
CREATE TABLE IF NOT EXISTS public.suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users NOT NULL,
    name TEXT NOT NULL,
    contact TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Habilitar RLS para Fornecedores
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

-- 3. Políticas RLS para Fornecedores
DROP POLICY IF EXISTS "Users can manage their own suppliers" ON public.suppliers;
CREATE POLICY "Users can manage their own suppliers" ON public.suppliers
FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 4. Inserir Métodos de Pagamento Fixos (Sincronização Elite)
-- Primeiro limpamos para garantir a padronização solicitada
-- Nota: Isso afetará apenas os registros que mapearem para o auth.uid() atual ao rodar, 
-- mas deixamos aqui como referência para o usuário.

/*
INSERT INTO public.payment_methods (id, user_id, name, color)
VALUES 
    ('pm_dinheiro', auth.uid(), 'Dinheiro', '#10b981'),
    ('pm_pix', auth.uid(), 'Pix', '#06b6d4'),
    ('pm_debito', auth.uid(), 'Cartão de Débito', '#3b82f6'),
    ('pm_credito', auth.uid(), 'Cartão de Crédito', '#6366f1'),
    ('pm_cripto', auth.uid(), 'Cripto', '#f59e0b'),
    ('pm_cheque', auth.uid(), 'Cheque', '#64748b'),
    ('pm_permuta', auth.uid(), 'Permuta', '#8b5cf6')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, color = EXCLUDED.color;
*/

-- ==========================================
-- PERFORMANCE OPTIMIZATION INDICES
-- ==========================================

-- Transactions optimization
CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON public.transactions(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_category ON public.transactions(category_id);

-- Commitments optimization
CREATE INDEX IF NOT EXISTS idx_commitments_user_due ON public.commitments(user_id, due_date ASC);
CREATE INDEX IF NOT EXISTS idx_commitments_status ON public.commitments(status);

-- User Profiles optimization
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON public.user_profiles(email);

-- Savings Goals optimization
CREATE INDEX IF NOT EXISTS idx_savings_goals_user ON public.savings_goals(user_id);

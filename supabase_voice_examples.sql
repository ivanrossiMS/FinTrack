-- Create ai_voice_examples table for few-shot learning
CREATE TABLE IF NOT EXISTS public.ai_voice_examples (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    transcript TEXT NOT NULL,
    category_id TEXT,
    amount DECIMAL(12, 2),
    type TEXT CHECK (type IN ('INCOME', 'EXPENSE')),
    description TEXT,
    date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add RLS policies
ALTER TABLE public.ai_voice_examples ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own voice examples"
    ON public.ai_voice_examples
    FOR ALL
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Index for faster retrieval by user
CREATE INDEX IF NOT EXISTS idx_ai_voice_examples_user ON public.ai_voice_examples(user_id);

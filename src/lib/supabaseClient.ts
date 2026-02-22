import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    const errorMsg = 'SUPABASE CONFIG ERROR: VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY não encontradas nas variáveis do Netlify.';
    console.error(errorMsg);
    // Em produção, isso ajudará a identificar se o problema é de configuração
    if (import.meta.env.PROD) {
        throw new Error(errorMsg);
    }
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '');

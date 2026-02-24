import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('SUPABASE CONFIG ERROR: VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY não encontradas.');
}

console.log('🏗️ [SUPABASE CLIENT] Initializing with Standard Robust Persistence');

export const supabase = createClient(
    supabaseUrl || 'https://placeholder.supabase.co',
    supabaseAnonKey || 'placeholder-key',
    {
        auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true,
            storageKey: 'fintrack_auth_session'
        }
    }
);

console.log('✅ [SUPABASE] Client initialized successfully');

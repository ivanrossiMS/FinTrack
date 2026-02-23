import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('SUPABASE CONFIG ERROR: VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY não encontradas.');
}

// ── HYBRID STORAGE: localStorage for data + session cookie for lifecycle ──
const HybridStorage = {
    getItem: (key: string) => {
        // Check if the "session alive" cookie flag exists
        const isSessionAlive = document.cookie.split(';').some((item) => item.trim().startsWith('fintrack_session_active='));

        if (!isSessionAlive) {
            // Browser was closed (cookie gone) -> Clear localStorage
            localStorage.removeItem(key);
            return null;
        }

        return localStorage.getItem(key);
    },
    setItem: (key: string, value: string) => {
        // 1. Set the data in localStorage (high capacity, persists on reload/tabs)
        localStorage.setItem(key, value);

        // 2. Set/Refresh a session-only cookie (no expires = cleared on browser close)
        document.cookie = `fintrack_session_active=true; path=/; SameSite=Lax`;
    },
    removeItem: (key: string) => {
        localStorage.removeItem(key);
        document.cookie = `fintrack_session_active=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC; SameSite=Lax`;
    }
};

console.log('🏗️ [SUPABASE CLIENT] Initializing with Atomic CookieStorage');

export const supabase = createClient(
    supabaseUrl || 'https://placeholder.supabase.co',
    supabaseAnonKey || 'placeholder-key',
    {
        auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true,
            storageKey: 'fintrack_auth_session',
            storage: HybridStorage as any
        }
    }
);

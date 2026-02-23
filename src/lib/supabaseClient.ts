import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('SUPABASE CONFIG ERROR: VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY não encontradas.');
}

// ── CUSTOM STORAGE: Cookie-based for "Logout on Browser Close" ──
const CookieStorage = {
    getItem: (key: string) => {
        const name = key + "=";
        const decodedCookie = decodeURIComponent(document.cookie);
        const ca = decodedCookie.split(';');
        for (let i = 0; i < ca.length; i++) {
            let c = ca[i];
            while (c.charAt(0) == ' ') c = c.substring(1);
            if (c.indexOf(name) == 0) return c.substring(name.length, c.length);
        }
        return null;
    },
    setItem: (key: string, value: string) => {
        // No "Expires" makes it a session-only cookie
        document.cookie = `${key}=${value}; path=/; SameSite=Lax`;
    },
    removeItem: (key: string) => {
        document.cookie = `${key}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC; SameSite=Lax`;
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
            storage: CookieStorage as any
        }
    }
);

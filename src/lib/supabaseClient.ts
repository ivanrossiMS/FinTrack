import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('SUPABASE CONFIG ERROR: VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY não encontradas.');
}

// Inicializa sem jogar erro no nível do módulo para o app não "morrer" no import
// ── HYBRID SESSION STORAGE ──
// Combines localStorage (capacity) with a Session Cookie Heartbeat (lifecycle).
// Resolves the 4KB cookie limit while ensuring automatic logout when the browser closes.
const hybridStorage = {
    getItem: (key: string) => {
        // Heartbeat check: if the session cookie is gone, the session is dead.
        const hasHeartbeat = document.cookie.includes('fintrack_heartbeat=active');
        if (!hasHeartbeat) {
            localStorage.removeItem(key);
            return null;
        }
        return localStorage.getItem(key);
    },
    setItem: (key: string, value: string) => {
        // Set the heartbeat cookie (Session scope - dies when browser closes)
        document.cookie = "fintrack_heartbeat=active; path=/; SameSite=Lax";
        localStorage.setItem(key, value);
    },
    removeItem: (key: string) => {
        localStorage.removeItem(key);
        // Only clear heartbeat if we are explicitly removing the main session key
        if (key.includes('auth-token')) {
            document.cookie = "fintrack_heartbeat=; path=/; Max-Age=-99999999;";
        }
    }
};

export const supabase = createClient(
    supabaseUrl || 'https://placeholder.supabase.co',
    supabaseAnonKey || 'placeholder-key',
    {
        auth: {
            storage: hybridStorage,
            autoRefreshToken: true,
            persistSession: true,
            detectSessionInUrl: true
        }
    }
);

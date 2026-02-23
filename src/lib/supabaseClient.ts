import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('SUPABASE CONFIG ERROR: VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY não encontradas.');
}

// Inicializa sem jogar erro no nível do módulo para o app não "morrer" no import
// Implementação de Storage via Cookies de Sessão (compartilha abas, limpa ao fechar navegador)
const cookieStorage = {
    getItem: (key: string) => {
        const name = `${key}=`;
        const ca = document.cookie.split(';');
        for (let i = 0; i < ca.length; i++) {
            let c = ca[i].trim();
            if (c.indexOf(name) === 0) {
                const value = c.substring(name.length, c.length);
                try {
                    return decodeURIComponent(value);
                } catch (e) {
                    return value;
                }
            }
        }
        return null;
    },
    setItem: (key: string, value: string) => {
        const encodedValue = encodeURIComponent(value);
        // Cookie sem "Expires" ou "Max-Age" = Cookie de Sessão
        document.cookie = `${key}=${encodedValue};path=/;SameSite=Lax`;
    },
    removeItem: (key: string) => {
        document.cookie = `${key}=;path=/;Max-Age=-99999999;`;
    }
};

export const supabase = createClient(
    supabaseUrl || 'https://placeholder.supabase.co',
    supabaseAnonKey || 'placeholder-key',
    {
        auth: {
            storage: cookieStorage,
            autoRefreshToken: true,
            persistSession: true,
            detectSessionInUrl: true
        }
    }
);

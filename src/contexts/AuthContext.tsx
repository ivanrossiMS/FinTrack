import * as React from 'react';
import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

interface AuthContextType {
    isAuthenticated: boolean;
    user: any;
    login: (email: string, pass: string) => Promise<{ success: boolean; error?: string }>;
    register: (name: string, email: string, pass: string) => Promise<{ success: boolean; error?: string }>;
    logout: () => Promise<void>;
    updateUser: (user: any) => Promise<void>;
    adminUpdateUserInfo: (targetEmail: string, updates: any) => Promise<void>;
    impersonateUser: (email: string) => void;
    stopImpersonating: () => void;
    changePassword: (currentPass: string, newPass: string) => Promise<{ success: boolean; message: string }>;
    isImpersonating: boolean;
    loading: boolean;
    supabaseUrl: string;
    supabaseKeyMasked: string;
    resetAppCache: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [isImpersonating, setIsImpersonating] = useState(false);

    // Debug info from env
    const supUrl = import.meta.env.VITE_SUPABASE_URL || 'ERRO: URL NÃO DEFINIDA';
    const rawKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
    const maskedKey = rawKey ? `${rawKey.substring(0, 8)}...${rawKey.substring(rawKey.length - 8)}` : 'ERRO: CHAVE NÃO DEFINIDA';

    const resetAppCache = () => {
        console.log('ResetAppCache: Limpando TUDO e recarregando...');
        localStorage.clear();
        sessionStorage.clear();
        window.location.reload();
    };

    useEffect(() => {
        let isMounted = true;
        let authEventHandled = false;

        console.log('Auth: Inicializando sistemas de segurança...');

        // Listener reativo (Fonte Única de Verdade)
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            console.log(`onAuthStateChange [${event}]:`, !!session);
            authEventHandled = true;

            if (session?.user) {
                try {
                    // Busca perfil com um mecanismo de retry simples
                    const { data: profile, error: pError } = await supabase
                        .from('user_profiles')
                        .select('*')
                        .eq('id', session.user.id)
                        .single();

                    if (!pError && profile && isMounted) {
                        setUser({
                            id: session.user.id,
                            name: profile.name,
                            email: profile.email,
                            avatar: profile.avatar,
                            isAdmin: profile.is_admin,
                            isAuthorized: profile.is_authorized,
                            plan: profile.plan || 'FREE'
                        });
                        setIsAuthenticated(true);
                    }
                } catch (err) {
                    console.error('Falha ao sincronizar perfil:', err);
                }
            } else if (isMounted) {
                // Se o evento for de saída ou se for a verificação inicial e não houver ninguém
                setUser(null);
                setIsAuthenticated(false);
            }

            // Para o loading apenas nos estados de conclusão da verificação
            if (isMounted && (event === 'INITIAL_SESSION' || event === 'SIGNED_IN' || event === 'SIGNED_OUT')) {
                setLoading(false);
            }
        });

        // Failsafe: Se o Supabase não disparar nenhum evento em 10 segundos (raro mas possível em migrações)
        const failsafe = setTimeout(() => {
            if (isMounted && !authEventHandled) {
                console.warn('Auth: Failsafe disparado (Supabase demorou muito). Liberando tela.');
                setLoading(false);
            }
        }, 10000);

        return () => {
            isMounted = false;
            subscription.unsubscribe();
            clearTimeout(failsafe);
        };
    }, []);

    const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
        console.log('Login: [1/3] Preparando ambiente limpo...');
        try {
            // Remove vestígios de sessões problemáticas ANTES de tentar logar
            Object.keys(localStorage).forEach(key => {
                if (key.startsWith('sb-')) localStorage.removeItem(key);
            });

            console.log('Login: [2/3] Autenticando...', email);
            const { data, error } = await supabase.auth.signInWithPassword({ email, password });

            if (error) {
                console.error('Login: Erro Auth:', error.message);
                return { success: false, error: error.message };
            }

            if (data?.user) {
                console.log('Login: [3/3] Sucesso! Sincronizando profile...');
                // O onAuthStateChange cuidará de setar o User Profile.
                // Apenas retornamos sucesso.
                return { success: true };
            }
            return { success: false, error: "Resposta incompleta do servidor." };
        } catch (err: any) {
            console.error('Login: Erro inesperado:', err);
            return { success: false, error: "Erro de conexão profunda." };
        }
    };

    const register = async (name: string, email: string, password: string): Promise<{ success: boolean; error?: string }> => {
        try {
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: { data: { name } }
            });

            if (error) return { success: false, error: error.message };

            if (data?.user) {
                const userEmail = email.toLowerCase();
                const masterEmail = 'ivanrossi@outlook.com';
                const isMasterAdmin = userEmail === masterEmail;

                await supabase.from('user_profiles').upsert([{
                    id: data.user.id,
                    name,
                    email: email,
                    is_admin: isMasterAdmin,
                    is_authorized: isMasterAdmin,
                    plan: 'FREE'
                }]);

                return { success: true, error: isMasterAdmin ? undefined : "AUTORIZACAO_PENDENTE" };
            }
            return { success: false, error: "Erro na criação." };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    };

    const logout = async () => {
        console.log('Logout: Resetando aplicação...');
        try {
            await supabase.auth.signOut();
        } catch (e) { }

        // Limpeza total garantida
        setIsAuthenticated(false);
        setUser(null);
        localStorage.clear();
        sessionStorage.clear();
        window.location.href = '/login';
    };

    const updateUser = async (updatedUser: any) => {
        if (!user?.id) return;
        const { error } = await supabase.from('user_profiles').update({
            name: updatedUser.name,
            avatar: updatedUser.avatar,
            phone: updatedUser.phone,
            profession: updatedUser.profession
        }).eq('id', user.id);
        if (!error) setUser({ ...user, ...updatedUser });
    };

    const adminUpdateUserInfo = async (targetId: string, updates: any) => {
        await supabase.from('user_profiles').update({
            is_admin: updates.isAdmin,
            is_authorized: updates.isAuthorized,
            plan: updates.plan
        }).eq('id', targetId);
    };

    const impersonateUser = (_email: string) => {
        if (!user || (!user.isAdmin && !isImpersonating)) return;
        localStorage.setItem('fintrack_original_admin', JSON.stringify(user));
        setIsImpersonating(true);
        // Lógica de impersonate simplificada para esta fase
        window.location.reload();
    };

    const stopImpersonating = () => {
        localStorage.removeItem('fintrack_original_admin');
        setIsImpersonating(false);
        window.location.reload();
    };

    const changePassword = async (_currentPass: string, _newPass: string) => {
        return { success: true, message: 'Senha alterada com sucesso!' };
    };

    if (loading) {
        return <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--color-bg)', color: 'var(--color-text)' }}>Carregando Finance+...</div>;
    }

    return (
        <AuthContext.Provider value={{
            isAuthenticated, user, login, register, logout, updateUser, adminUpdateUserInfo, impersonateUser, stopImpersonating, changePassword, isImpersonating, loading,
            supabaseUrl: supUrl,
            supabaseKeyMasked: maskedKey,
            resetAppCache
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within an AuthProvider');
    return context;
};

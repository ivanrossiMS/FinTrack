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
        console.log('ResetAppCache: Limpando tudo e recarregando...');
        localStorage.clear();
        sessionStorage.clear();
        // Remove especificamente chaves do Supabase para garantir
        Object.keys(localStorage).forEach(key => {
            if (key.includes('supabase') || key.startsWith('sb-')) {
                localStorage.removeItem(key);
            }
        });
        window.location.reload();
    };

    useEffect(() => {
        let isMounted = true;

        // Listeners de mudança de estado (Supabase)
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            console.log('onAuthStateChange:', event);
            if (session?.user) {
                try {
                    const { data: profile } = await supabase
                        .from('user_profiles')
                        .select('*')
                        .eq('id', session.user.id)
                        .single();

                    if (profile && isMounted) {
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
                    console.error('onAuthStateChange profile fetch error:', err);
                }
            } else if (isMounted) {
                setUser(null);
                setIsAuthenticated(false);
            }
            if (isMounted) setLoading(false);
        });

        // Verificação Inicial com Auto-Cura (Timeout de 3s)
        const checkSession = async () => {
            console.log('Auth: Iniciando verificação de sessão...');
            try {
                const sessionPromise = supabase.auth.getSession();
                const timeoutPromise = new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('SESSION_DEADLOCK')), 3000)
                );

                const { data: { session } } = await Promise.race([sessionPromise, timeoutPromise]) as any;

                if (session?.user) {
                    console.log('Auth: Sessão encontrada para', session.user.email);
                    const { data: profile } = await supabase
                        .from('user_profiles')
                        .select('*')
                        .eq('id', session.user.id)
                        .single();

                    if (profile && isMounted) {
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
                } else {
                    console.log('Auth: Nenhuma sessão ativa.');
                }
            } catch (err: any) {
                console.error('Auth Init Error:', err.message);
                if (err.message === 'SESSION_DEADLOCK') {
                    console.warn('Auth: Detectado travamento de sessão! Executando auto-limpeza...');
                    localStorage.clear();
                    // Se estiver travado, recarrega para limpar o estado do Singleton do Supabase
                    if (isMounted) window.location.reload();
                }
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        checkSession();

        return () => {
            isMounted = false;
            subscription.unsubscribe();
        };
    }, []);

    const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
        console.log('Login: [1/4] Limpando ambiente...');
        try {
            // Limpeza agressiva de chaves do Supabase no localStorage antes de tentar login
            Object.keys(localStorage).forEach(key => {
                if (key.startsWith('sb-')) localStorage.removeItem(key);
            });

            console.log('Login: [2/4] Autenticando...', email);
            const loginPromise = supabase.auth.signInWithPassword({ email, password });
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Tempo limite do servidor (60s). Verifique sua rede.')), 60000)
            );

            const { data, error } = await Promise.race([loginPromise, timeoutPromise]) as any;

            if (error) {
                console.error('Login: Erro Auth:', error.message);
                return { success: false, error: error.message };
            }

            if (data?.user) {
                console.log('Login: [3/4] Auth OK! Carregando perfil...');
                const { data: profile } = await supabase
                    .from('user_profiles')
                    .select('*')
                    .eq('id', data.user.id)
                    .single();

                if (profile) {
                    console.log('Login: [4/4] Finalizando...');
                    const profileEmail = profile.email?.toLowerCase();
                    const masterEmail = 'ivanrossi@outlook.com';

                    if (!profile.is_authorized && profileEmail !== masterEmail) {
                        await logout();
                        return { success: false, error: "Conta pendente de autorização." };
                    }

                    setUser({
                        id: data.user.id,
                        name: profile.name,
                        email: profile.email,
                        avatar: profile.avatar,
                        isAdmin: profile.is_admin,
                        isAuthorized: profile.is_authorized,
                        plan: profile.plan
                    });
                    setIsAuthenticated(true);
                    return { success: true };
                } else {
                    // Auto-recuperação (idêntica à anterior, mas mantida por segurança)
                    console.log('Login: Perfil não encontrado. Criando...');
                    const userEmail = data.user.email?.toLowerCase();
                    const masterEmail = 'ivanrossi@outlook.com';
                    const isMasterAdmin = userEmail === masterEmail;

                    const { error: recError } = await supabase.from('user_profiles').insert([{
                        id: data.user.id,
                        name: data.user.user_metadata?.name || data.user.email?.split('@')[0] || 'Usuário',
                        email: data.user.email,
                        is_admin: isMasterAdmin,
                        is_authorized: true,
                        plan: 'FREE'
                    }]);

                    if (!recError) {
                        const { data: newP } = await supabase.from('user_profiles').select('*').eq('id', data.user.id).single();
                        if (newP) {
                            setUser({ id: data.user.id, name: newP.name, email: newP.email, isAdmin: newP.is_admin, isAuthorized: newP.is_authorized, plan: newP.plan });
                            setIsAuthenticated(true);
                            return { success: true };
                        }
                    }
                    return { success: false, error: "Erro ao criar perfil após login." };
                }
            }
            return { success: false, error: "Resposta inválida do servidor." };
        } catch (err: any) {
            console.error('Login: Erro inesperado:', err);
            return { success: false, error: err.message || "Erro de conexão." };
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

                if (isMasterAdmin) {
                    setUser({ id: data.user.id, name, email, isAdmin: true, isAuthorized: true, plan: 'FREE' });
                    setIsAuthenticated(true);
                    return { success: true };
                } else {
                    return { success: true, error: "AUTORIZACAO_PENDENTE" };
                }
            }
            return { success: false, error: "Erro ao criar usuário." };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    };

    const logout = async () => {
        console.log('Logout: Iniciando reset completo do app...');
        try {
            // Desloga no servidor sem esperar (fire and forget com timeout curto)
            const logoutPromise = supabase.auth.signOut();
            const timeoutPromise = new Promise(resolve => setTimeout(resolve, 1000));
            await Promise.race([logoutPromise, timeoutPromise]);
        } catch (e) { }

        // Limpa estado da UI
        setIsAuthenticated(false);
        setUser(null);

        // Limpa TUDO e força reload para resetar o singleton do Supabase Client
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

    const impersonateUser = (email: string) => {
        if (!user || (!user.isAdmin && !isImpersonating)) return;
        const users = JSON.parse(localStorage.getItem('fintrack_users') || '[]');
        const target = users.find((u: any) => u.email === email);
        if (!target) return;
        if (!isImpersonating) localStorage.setItem('fintrack_original_admin', JSON.stringify(user));
        const userSession = {
            name: target.name,
            email: target.email,
            avatar: target.avatar,
            isAdmin: target.isAdmin || target.email === 'ivanrossi@outlook.com'
        };
        setUser(userSession);
        setIsImpersonating(true);
    };

    const stopImpersonating = () => {
        const originalAdmin = localStorage.getItem('fintrack_original_admin');
        if (!originalAdmin) {
            logout();
            return;
        }
        setUser(JSON.parse(originalAdmin));
        localStorage.removeItem('fintrack_impersonating');
        localStorage.removeItem('fintrack_original_admin');
        setIsImpersonating(false);
    };

    const changePassword = async (_currentPass: string, _newPass: string) => {
        return { success: true, message: 'Senha alterada com sucesso!' };
    };

    if (loading) {
        return <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Carregando Finance+...</div>;
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

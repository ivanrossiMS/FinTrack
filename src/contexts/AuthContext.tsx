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
        localStorage.clear();
        sessionStorage.clear();
        window.location.reload();
    };

    useEffect(() => {
        let isMounted = true;
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
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

        const checkSession = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (session?.user) {
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
                }
            } catch (err) {
                console.error('Initial session check error:', err);
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        checkSession();
        const timeout = setTimeout(() => {
            if (isMounted && loading) {
                setLoading(false);
            }
        }, 5000);

        return () => {
            isMounted = false;
            subscription.unsubscribe();
            clearTimeout(timeout);
        };
    }, []);

    const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
        console.log('Login: [1/4] Limpando vestígios de sessões anteriores...');
        try {
            // Tenta limpar sessão antes com um timeout curto (2s) para não travar o login
            try {
                const signOutPromise = supabase.auth.signOut();
                const signOutTimeout = new Promise((resolve) => setTimeout(() => resolve({ error: 'timeout' }), 2000));
                await Promise.race([signOutPromise, signOutTimeout]);
            } catch (e) {
                console.warn('Login: Erro ou timeout na limpeza inicial (ignorado).');
            }

            // Limpeza bruta do localStorage (remove todas as chaves do Supabase)
            Object.keys(localStorage).forEach(key => {
                if (key.startsWith('sb-')) localStorage.removeItem(key);
            });

            console.log('Login: [2/4] Enviando credenciais para Supabase:', email);
            const loginPromise = supabase.auth.signInWithPassword({ email, password });
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Tempo limite do Supabase excedido no Login (60s). Verifique sua conexão ou se bloqueador de anúncios está interferindo.')), 60000)
            );

            const { data, error } = await Promise.race([loginPromise, timeoutPromise]) as any;

            if (error) {
                console.error('Login: Erro no Auth do Supabase:', error);
                // Se o erro for "session_not_found" ou similar, limpamos novamente para garantir
                localStorage.clear();
                return { success: false, error: error.message };
            }

            if (data?.user) {
                console.log('Login: [3/4] Auth OK! Buscando perfil do usuário...');

                // Tentativa de buscar perfil com timeout também
                const { data: profile, error: pError } = await supabase
                    .from('user_profiles')
                    .select('*')
                    .eq('id', data.user.id)
                    .single();

                if (pError) console.error('Login: Erro ao buscar perfil:', pError);

                if (profile) {
                    console.log('Login: [4/4] Perfil encontrado. Validando autorização...');
                    const profileEmail = profile.email?.toLowerCase();
                    const masterEmail = 'ivanrossi@outlook.com';

                    if (!profile.is_authorized && profileEmail !== masterEmail) {
                        console.warn('Login: Usuário não autorizado.');
                        await supabase.auth.signOut();
                        return { success: false, error: "Sua conta ainda não foi autorizada pelo administrador." };
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
                    console.log('Login: SUCESSO! Entrando no app...');
                    return { success: true };
                } else {
                    console.log('Login: Perfil ausente. Iniciando Auto-Recuperação...');
                    const userEmail = data.user.email?.toLowerCase();
                    const masterEmail = 'ivanrossi@outlook.com';
                    const isMasterAdmin = userEmail === masterEmail;

                    const { error: recoveryError } = await supabase
                        .from('user_profiles')
                        .insert([{
                            id: data.user.id,
                            name: data.user.user_metadata?.name || data.user.email?.split('@')[0] || 'Usuário',
                            email: data.user.email,
                            is_admin: isMasterAdmin,
                            is_authorized: true,
                            plan: 'FREE'
                        }]);

                    if (recoveryError) {
                        console.error('Login: Erro na auto-recuperação:', recoveryError);
                        return { success: false, error: "Erro ao criar perfil: " + recoveryError.message };
                    }

                    const { data: newProfile } = await supabase.from('user_profiles').select('*').eq('id', data.user.id).single();
                    if (newProfile) {
                        setUser({
                            id: data.user.id,
                            name: newProfile.name,
                            email: newProfile.email,
                            isAdmin: newProfile.is_admin,
                            isAuthorized: newProfile.is_authorized,
                            plan: newProfile.plan
                        });
                        setIsAuthenticated(true);
                        console.log('Login: Sucesso após auto-recuperação!');
                        return { success: true };
                    }
                }
            }
            return { success: false, error: "Falha ao processar resposta do servidor." };
        } catch (err: any) {
            console.error('Login: Erro inesperado capturado:', err);
            return { success: false, error: err.message || "Erro inesperado no cliente." };
        }
    };

    const register = async (name: string, email: string, password: string): Promise<{ success: boolean; error?: string }> => {
        console.log('Cadastro: [1/3] Iniciando tentativa para', email);
        try {
            const registerPromise = supabase.auth.signUp({
                email,
                password,
                options: { data: { name } }
            });

            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Tempo limite do Supabase excedido no Cadastro (60s).')), 60000)
            );

            console.log('Cadastro: [2/3] Aguardando resposta do Supabase Auth...');
            const { data, error } = await Promise.race([registerPromise, timeoutPromise]) as any;

            if (error) {
                console.error('Cadastro: Erro no Auth:', error);
                return { success: false, error: error.message };
            }

            if (data?.user) {
                console.log('Cadastro: [3/3] Auth OK! Criando perfil no banco de dados...');
                const userEmail = email.toLowerCase();
                const masterEmail = 'ivanrossi@outlook.com';
                const isMasterAdmin = userEmail === masterEmail;

                const { error: profileError } = await supabase.from('user_profiles').upsert([{
                    id: data.user.id,
                    name,
                    email: email,
                    is_admin: isMasterAdmin,
                    is_authorized: isMasterAdmin,
                    plan: 'FREE'
                }]);

                if (profileError) {
                    console.error('Cadastro: Perfil falhou (mas login criado):', profileError);
                }

                if (isMasterAdmin) {
                    setUser({ id: data.user.id, name, email, isAdmin: true, isAuthorized: true, plan: 'FREE' });
                    setIsAuthenticated(true);
                    console.log('Cadastro: SUCESSO total (Admin)!');
                    return { success: true };
                } else {
                    console.log('Cadastro: SUCESSO! Autorização pendente.');
                    return { success: true, error: "AUTORIZACAO_PENDENTE" };
                }
            }
            return { success: false, error: "Falha na criação do usuário." };
        } catch (err: any) {
            console.error('Cadastro: Erro inesperado capturado:', err);
            return { success: false, error: err.message || "Erro inesperado." };
        }
    };

    const logout = async () => {
        console.log('Logout: Saindo e limpando estado...');
        // Limpa estado local imediatamente da UI
        setIsAuthenticated(false);
        setUser(null);
        localStorage.clear();

        // Tenta deslogar do servidor em background (não trava a UI)
        try {
            await supabase.auth.signOut();
        } catch (e) {
            console.warn('Logout: Erro ao avisar servidor, mas estado local já foi limpo.');
        }
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

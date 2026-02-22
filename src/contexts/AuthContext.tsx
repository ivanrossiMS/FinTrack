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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [isImpersonating, setIsImpersonating] = useState(false);

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
        console.log('Login attempt started for:', email);
        try {
            const loginPromise = supabase.auth.signInWithPassword({ email, password });
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Tempo limite do Supabase excedido.')), 15000)
            );

            const { data, error } = await Promise.race([loginPromise, timeoutPromise]) as any;

            if (error) {
                return { success: false, error: error.message };
            }

            if (data.user) {
                const { data: profile, error: pError } = await supabase
                    .from('user_profiles')
                    .select('*')
                    .eq('id', data.user.id)
                    .single();

                if (profile) {
                    const profileEmail = profile.email?.toLowerCase();
                    const masterEmail = 'ivanrossi@outlook.com';

                    if (!profile.is_authorized && profileEmail !== masterEmail) {
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
                    return { success: true };
                } else {
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

                    if (recoveryError) return { success: false, error: "Erro ao criar perfil: " + recoveryError.message };

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
                        return { success: true };
                    }
                }
            }
            return { success: false, error: "Usuário não encontrado." };
        } catch (err: any) {
            return { success: false, error: err.message || "Erro inesperado." };
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

            if (data.user) {
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
            return { success: false, error: "Falha na criação do usuário." };
        } catch (err: any) {
            return { success: false, error: err.message || "Erro inesperado." };
        }
    };

    const logout = async () => {
        await supabase.auth.signOut();
        setIsAuthenticated(false);
        setUser(null);
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

    const changePassword = async (currentPass: string, newPass: string) => {
        // Simplified for this prototype
        return { success: true, message: 'Senha alterada com sucesso!' };
    };

    if (loading) {
        return <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Carregando Finance+...</div>;
    }

    return (
        <AuthContext.Provider value={{
            isAuthenticated, user, login, register, logout, updateUser, adminUpdateUserInfo, impersonateUser, stopImpersonating, changePassword, isImpersonating, loading
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

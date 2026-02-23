import * as React from 'react';
import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

interface AuthContextType {
    isAuthenticated: boolean;
    user: any;
    loading: boolean;
    login: (email: string, pass: string) => Promise<{ success: boolean; error?: string }>;
    register: (name: string, email: string, pass: string) => Promise<{ success: boolean; needsEmailAuth: boolean; error?: string }>;
    logout: () => Promise<void>;
    updateUser: (updates: any) => Promise<void>;
    adminUpdateUserInfo: (targetUserId: string, updates: any) => Promise<void>;
    impersonateUser: (userId: string) => Promise<void>;
    stopImpersonating: () => Promise<void>;
    changePassword: (newPass: string) => Promise<{ success: boolean; message: string }>;
    isImpersonating: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [isImpersonating, setIsImpersonating] = useState(false);

    // Safety locks
    const fetchingLocks = React.useRef(new Set<string>());
    const authInitialized = React.useRef(false);

    // Profile fetching with retry and timeout
    const fetchProfile = async (userId: string) => {
        if (fetchingLocks.current.has(userId)) return;
        fetchingLocks.current.add(userId);

        const withTimeout = (promise: Promise<any>, ms: number) =>
            Promise.race([
                promise,
                new Promise((_, reject) => setTimeout(() => reject(new Error('TIMEOUT')), ms))
            ]);

        let success = false;
        try {
            // Attempt Supabase query with 4s timeout
            // @ts-ignore - PostgrestBuilder is Thenable
            const { data: profile, error } = await withTimeout(
                supabase.from('profiles').select('*').eq('id', userId).single() as any,
                4000
            );

            if (profile && !error) {
                setUser(profile);
                success = true;
            } else if (error) {
                console.warn('Profile fetch rejected:', error.message);
            }
        } catch (err) {
            console.error('Profile fetch timed out or failed');
        }

        // Fallback: If DB fetch fails but Auth session exists, synthesize user to prevent lock-out
        if (!success) {
            try {
                const { data: { user: authUser } } = await supabase.auth.getUser();
                if (authUser && authUser.id === userId) {
                    setUser({
                        id: authUser.id,
                        email: authUser.email,
                        name: authUser.user_metadata?.name || authUser.email?.split('@')[0] || 'Usuário',
                        role: authUser.email === 'ivanrossi@outlook.com' ? 'ADMIN' : (authUser.app_metadata?.role || 'USER'),
                        plan: 'FREE',
                        is_authorized: true
                    });
                }
            } catch (e) {
                console.error('Fallback synthesis failed');
            }
        }

        fetchingLocks.current.delete(userId);
        setLoading(false);
    };

    // Unified Auth Lifecycle
    useEffect(() => {
        const syncAuth = async () => {
            if (authInitialized.current) return;

            try {
                // 1. Check current session
                const { data: { session } } = await supabase.auth.getSession();

                if (session) {
                    await fetchProfile(session.user.id);
                } else {
                    setLoading(false);
                }
            } catch (err) {
                console.error('Auth sync failed:', err);
                setLoading(false);
            } finally {
                authInitialized.current = true;
            }
        };

        syncAuth();

        // 2. Listen for changes (Login, Logout, Refresh, Multi-tab)
        const { data: authData } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === 'SIGNED_OUT') {
                setUser(null);
                setIsImpersonating(false);
                setLoading(false);
                fetchingLocks.current.clear();
                return;
            }

            if (session) {
                // If we already have the same user and it's just a routine refresh, skip re-fetch
                if (user && user.id === session.user.id && event !== 'TOKEN_REFRESHED' && event !== 'PASSWORD_RECOVERY') {
                    setLoading(false);
                    return;
                }
                await fetchProfile(session.user.id);
            } else {
                setUser(null);
                setIsImpersonating(false);
                setLoading(false);
            }
        });

        return () => authData.subscription.unsubscribe();
    }, [user?.id]);

    const login = async (email: string, password: string) => {
        try {
            const { data, error } = await supabase.auth.signInWithPassword({ email, password });
            if (error) return { success: false, error: error.message };
            return { success: true };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    };

    const register = async (name: string, email: string, password: string) => {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: { data: { name } }
        });

        if (error) return { success: false, needsEmailAuth: false, error: error.message };
        return { success: true, needsEmailAuth: !data.session };
    };

    const logout = async () => {
        await supabase.auth.signOut();
    };

    const updateUser = async (updates: any) => {
        if (!user) return;
        const { error } = await supabase.from('profiles').update(updates).eq('id', user.id);
        if (error) throw error;
        await fetchProfile(user.id);
    };

    const adminUpdateUserInfo = async (targetUserId: string, updates: any) => {
        const { error } = await supabase.from('profiles').update(updates).eq('id', targetUserId);
        if (error) throw error;
    };

    const impersonateUser = async (userId: string) => {
        sessionStorage.setItem('fintrack_impersonated_id', userId);
        setIsImpersonating(true);
        window.location.reload();
    };

    const stopImpersonating = async () => {
        sessionStorage.removeItem('fintrack_impersonated_id');
        setIsImpersonating(false);
        window.location.reload();
    };

    const changePassword = async (newPass: string): Promise<{ success: boolean; message: string }> => {
        const { error } = await supabase.auth.updateUser({ password: newPass });
        if (error) return { success: false, message: error.message };
        return { success: true, message: 'Senha alterada com sucesso!' };
    };

    if (loading) {
        return (
            <div style={{
                height: '100vh',
                width: '100vw',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                background: '#0a0a0a',
                color: 'white'
            }}>
                <div className="vanta-loader" style={{
                    width: '40px',
                    height: '40px',
                    border: '3px solid #333',
                    borderTop: '3px solid #22c55e',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                }} />
                <style>{`
                    @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
                `}</style>
            </div>
        );
    }

    return (
        <AuthContext.Provider value={{
            isAuthenticated: !!user,
            user,
            loading,
            login,
            register,
            logout,
            updateUser,
            adminUpdateUserInfo,
            impersonateUser,
            stopImpersonating,
            changePassword,
            isImpersonating
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

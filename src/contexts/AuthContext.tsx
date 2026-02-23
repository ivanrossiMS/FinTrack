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
    const fetchingLocks = React.useRef(new Set<string>());
    const authInitialized = React.useRef(false);

    useEffect(() => {
        const initializeAuth = async () => {
            if (authInitialized.current) return;

            try {
                const { data: { session } } = await supabase.auth.getSession();

                if (session) {
                    const jwtMetadata = session.user.app_metadata;
                    const hasMetadata = jwtMetadata?.role && jwtMetadata?.is_authorized !== undefined;

                    console.log('⚡ Vanta Boot Stage 1:', session.user.id, hasMetadata ? '(JWT Ready)' : '(JWT Stale)');

                    if (!hasMetadata) {
                        console.warn('🛡️ Vanta Shield: Refreshing session for metadata sync...');
                        const { data: { session: refreshedSession } = {} } = await supabase.auth.refreshSession();
                        await fetchProfile(refreshedSession?.user.id || session.user.id);
                    } else {
                        await fetchProfile(session.user.id);
                    }
                } else {
                    console.log('⚡ Vanta Boot: Visitor Mode');
                    setLoading(false);
                }
                authInitialized.current = true;
            } catch (err) {
                console.error('⚡ Vanta Boot Error:', err);
                setLoading(false);
                authInitialized.current = true;
            }
        };

        initializeAuth();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            console.log(`📡 Vanta Stream Event: ${event}`);

            if (session) {
                const jwtMetadata = session.user.app_metadata;
                const hasMetadata = jwtMetadata?.role && jwtMetadata?.is_authorized !== undefined;

                // Lock: If we already have the user data and token is ready, stop.
                if (user && user.id === session.user.id && hasMetadata && event !== 'PASSWORD_RECOVERY') {
                    setLoading(false);
                    return;
                }

                await fetchProfile(session.user.id);
            } else {
                setUser(null);
                setIsImpersonating(false);
                setLoading(false);
                fetchingLocks.current.clear();
            }
        });

        return () => subscription.unsubscribe();
    }, [user?.id]);

    const fetchProfile = async (userId: string) => {
        // NUCLEAR LOCK: Absolutely prevent parallel fetches for the same ID
        if (fetchingLocks.current.has(userId)) {
            console.log('🛡️ Vanta Lock: Parallel fetch blocked for', userId);
            return;
        }

        fetchingLocks.current.add(userId);

        const delay = (ms: number) => new Promise(res => setTimeout(res, ms));
        let success = false;

        // Failsafe: Ensure UI always unlocks even if networking is totally broken
        const failsafeTimeout = setTimeout(() => {
            if (!success) {
                console.error('☢️ CRITICAL: Profile fetch stalled for 8s. Forcing UI Unlock.');
                setLoading(false);
                fetchingLocks.current.delete(userId);
            }
        }, 8000);

        try {
            console.log('🚀 Vanta Fetch Start:', userId);

            for (let i = 2; i >= 0; i--) {
                const { data: profile, error } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', userId)
                    .single();

                if (profile && !error) {
                    setUser(profile);
                    success = true;
                    console.log('✅ Vanta Fetch Success:', userId);
                    break;
                }

                if (i === 1) {
                    console.warn('🛡️ Vanta Shield: DB query failed/blocked. Attempting Token Refresh...');
                    await supabase.auth.refreshSession();
                }

                if (i > 0) await delay(800);
            }

            // High-Resolution Fallback
            if (!success) {
                console.warn('🛡️ Vanta Fallback: DB inaccessible. Synthesizing Session State...');
                const { data: { user: authUser } } = await supabase.auth.getUser();
                if (authUser) {
                    setUser({
                        id: authUser.id,
                        email: authUser.email,
                        name: authUser.user_metadata?.name || authUser.email?.split('@')[0] || 'Usuário',
                        role: authUser.email === 'ivanrossi@outlook.com' ? 'ADMIN' : (authUser.app_metadata?.role || 'USER'),
                        plan: 'FREE',
                        is_authorized: true
                    });
                    success = true;
                }
            }
        } catch (err) {
            console.error('❌ Vanta Fetch Fatal:', err);
        } finally {
            clearTimeout(failsafeTimeout);
            fetchingLocks.current.delete(userId);
            setLoading(false);
        }
    };

    const login = async (email: string, password: string) => {
        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) return { success: false, error: error.message };
        return { success: true };
    };

    const register = async (name: string, email: string, password: string) => {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: { name }
            }
        });

        if (error) return { success: false, needsEmailAuth: false, error: error.message };

        // If session exists immediate, they are logged in (auto-confirm)
        // If not, they might need email verification
        return {
            success: true,
            needsEmailAuth: !data.session
        };
    };

    const logout = async () => {
        await supabase.auth.signOut();
    };

    const updateUser = async (updates: any) => {
        if (!user) return;
        const { error } = await supabase
            .from('profiles')
            .update(updates)
            .eq('id', user.id);

        if (error) {
            console.error('Error updating profile:', error);
            throw error;
        }

        // Fetch fresh data to ensure sync
        await fetchProfile(user.id);
    };

    const adminUpdateUserInfo = async (targetUserId: string, updates: any) => {
        const { error } = await supabase
            .from('profiles')
            .update(updates)
            .eq('id', targetUserId);

        if (error) throw error;
    };

    const impersonateUser = async (userId: string) => {
        // Logic for impersonation with Supabase typically involves a custom claim or temporary token
        // For this simple case, we'll store the target in session storage to "mimic" data fetching
        sessionStorage.setItem('fintrack_impersonated_id', userId);
        setIsImpersonating(true);
        window.location.reload(); // Refresh to trigger data context reload with impersonated ID
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

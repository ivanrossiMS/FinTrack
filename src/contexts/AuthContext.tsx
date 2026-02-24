import * as React from 'react';
import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

interface AuthContextType {
    isAuthenticated: boolean;
    user: any;
    session: any;
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
    const [session, setSession] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [isImpersonating, setIsImpersonating] = useState(false);

    // Safety locks
    const fetchingLocks = React.useRef(new Set<string>());
    const authInitialized = React.useRef(false);

    // Profile fetching without fallback synthesis or timeouts
    const fetchProfile = async (userId: string) => {
        if (fetchingLocks.current.has(userId)) return;
        fetchingLocks.current.add(userId);

        try {
            console.log(`📡 [AUTH] fetchProfile: Fetching DB profile for ${userId}...`);
            const { data: profile, error } = await supabase.from('profiles').select('*').eq('id', userId).single();

            if (profile && !error) {
                console.log('✅ [AUTH] fetchProfile: DB profile loaded.');
                setUser(profile);
            } else if (error) {
                console.warn('⚠️ [AUTH] fetchProfile: DB profile not found or error:', error.message);
                // We DON'T set user to null here if we already have partial data or want to keep session alive
            }
        } catch (err: any) {
            console.error(`❌ [AUTH] fetchProfile: Unexpected error: ${err.message}`);
        } finally {
            fetchingLocks.current.delete(userId);
            setLoading(false);
        }
    };

    // Unified Auth Lifecycle
    useEffect(() => {
        const syncAuth = async () => {
            if (authInitialized.current) return;

            try {
                console.log('🏗️ [AUTH] syncAuth: Starting boot session check...');
                const { data: { session: initialSession }, error: sessionError } = await supabase.auth.getSession();

                if (sessionError) {
                    console.error('❌ [AUTH] syncAuth: getSession error:', sessionError.message);
                }

                setSession(initialSession);
                console.log('📡 [AUTH] syncAuth: Session state updated:', initialSession ? `YES (${initialSession.user.id})` : 'NULL');

                if (initialSession) {
                    await fetchProfile(initialSession.user.id);
                } else {
                    setLoading(false);
                }
            } catch (err: any) {
                console.error(`❌ [AUTH] syncAuth: Critical fail: ${err.message}`);
                setLoading(false);
            } finally {
                authInitialized.current = true;
                console.log('🏁 [AUTH] syncAuth: Boot sequence completed.');
            }
        };

        syncAuth();

        // Listen for changes (Login, Logout, Refresh, Multi-tab)
        const { data: authData } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
            console.log(`Bell [AUTH] onAuthStateChange EVENT: ${event} | Session: ${currentSession ? 'PRESENT' : 'NULL'}`);

            setSession(currentSession);

            if (event === 'SIGNED_OUT') {
                console.log('📤 [AUTH] SIGNED_OUT: Clearing user state.');
                setUser(null);
                setSession(null);
                setIsImpersonating(false);
                setLoading(false);
                fetchingLocks.current.clear();
                return;
            }

            if (currentSession) {
                // If we already have the same user and it's just a routine refresh, skip re-fetch
                if (user && user.id === currentSession.user.id && event !== 'TOKEN_REFRESHED' && event !== 'PASSWORD_RECOVERY') {
                    console.log('⏩ [AUTH] User match, skipping profile fetch.');
                    setLoading(false);
                    return;
                }
                console.log('🔄 [AUTH] Refreshing profile...');
                await fetchProfile(currentSession.user.id);
            } else {
                console.log('⚠️ [AUTH] No session. Clearing user.');
                setUser(null);
                setIsImpersonating(false);
                setLoading(false);
            }
        });

        return () => authData.subscription.unsubscribe();
    }, [user?.id]);

    const login = async (email: string, password: string) => {
        try {
            const { error } = await supabase.auth.signInWithPassword({ email, password });
            if (error) return { success: false, error: error.message };
            return { success: true };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    };

    const register = async (name: string, email: string, password: string) => {
        const { error } = await supabase.auth.signUp({
            email,
            password,
            options: { data: { name } }
        });

        if (error) return { success: false, needsEmailAuth: false, error: error.message };
        // Since we are not using data, we'll check if a session would have been created
        // Supabase sign-up usually returns a user if successful.
        return { success: true, needsEmailAuth: true };
    };

    const logout = async () => {
        console.log('🚪 [AUTH] logout: Manual sign-out initiated.');
        const { error } = await supabase.auth.signOut();
        if (error) {
            console.error('❌ [AUTH] logout error:', error.message);
        } else {
            console.log('✅ [AUTH] logout: signOut completed successfully.');
        }
    };

    const updateUser = async (updates: any) => {
        if (!user) return;
        // VANTA-REINFORCEMENT: Use upsert instead of update to handle missing records automatically
        const { error } = await supabase.from('profiles').upsert({
            id: user.id,
            email: user.email, // Preserve critical email
            ...updates,
            updated_at: new Date().toISOString()
        });
        if (error) {
            console.error('❌ [AUTH] updateUser failed:', error.message);
            throw error;
        }
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
            isAuthenticated: !!session,
            user,
            session,
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

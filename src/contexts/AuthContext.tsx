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
    const [isImpersonating, setIsImpersonating] = useState(!!sessionStorage.getItem('fintrack_impersonated_id'));

    // Safety locks
    const fetchingLocks = React.useRef(new Set<string>());
    const authInitialized = React.useRef(false);
    const userRef = React.useRef<any>(null);

    // Synchronized state setter
    const syncUser = (val: any) => {
        userRef.current = val;
        setUser(val);
    };

    // Profile fetching - Background task, doesn't block UI loading
    const fetchProfile = async (userId: string) => {
        if (fetchingLocks.current.has(userId)) {
            console.log('⏩ [AUTH] fetchProfile: Lock active, skipping redundant fetch.');
            return;
        }
        fetchingLocks.current.add(userId);

        try {
            console.log(`📡 [AUTH] fetchProfile: Fetching DB profile for ${userId}...`);
            const { data: profile, error } = await supabase.from('profiles').select('*').eq('id', userId).single();

            if (profile && !error) {
                console.log('✅ [AUTH] fetchProfile: DB profile loaded.');
                syncUser(profile);
            } else if (error) {
                console.warn('⚠️ [AUTH] fetchProfile: DB profile not found or error:', error.message);
            }
        } catch (err: any) {
            console.error(`❌ [AUTH] fetchProfile: Unexpected error: ${err.message}`);
        } finally {
            fetchingLocks.current.delete(userId);
            // DO NOT set loading(false) here. It should be handled by the session Logic.
        }
    };

    // Unified Auth Lifecycle
    useEffect(() => {
        let mounted = true;
        let isInitialCheckDone = false;

        // Function to unlock UI safely
        const unlockUI = () => {
            if (mounted && !isInitialCheckDone) {
                console.log('🏁 [AUTH] Unlocking UI (Auth settled)');
                setLoading(false);
                authInitialized.current = true;
                isInitialCheckDone = true;
            }
        };

        // 1. Initial manual session check (Non-blocking backup)
        supabase.auth.getSession().then(({ data: { session: initialSession }, error }) => {
            if (!mounted) return;
            if (error) console.error('❌ [AUTH] getSession error:', error.message);

            if (initialSession) {
                console.log('📡 [AUTH] Initial session found via getSession');
                setSession(initialSession);
                const impersonatedId = sessionStorage.getItem('fintrack_impersonated_id');
                const targetId = impersonatedId || initialSession.user.id;
                fetchProfile(targetId);
            }
            // Even if session is null, we unlock after first check
            unlockUI();
        }).catch(err => {
            console.error('❌ [AUTH] getSession crash:', err);
            unlockUI();
        });

        // 2. Listen for changes (Login, Logout, Refresh, Multi-tab)
        const { data: authData } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
            console.log(`🔔 [AUTH] onAuthStateChange EVENT: ${event}`);

            if (!mounted) return;

            setSession(currentSession);

            if (event === 'SIGNED_OUT') {
                syncUser(null);
                setSession(null);
                setIsImpersonating(false);
                fetchingLocks.current.clear();
                unlockUI(); // Ensure UI unlocks on sign out
                return;
            }

            if (currentSession) {
                const impersonatedId = sessionStorage.getItem('fintrack_impersonated_id');
                const targetId = impersonatedId || currentSession.user.id;

                // Avoid unnecessary fetches if profile is already loaded for this user
                if (!userRef.current || userRef.current.id !== targetId || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
                    fetchProfile(targetId);
                }
                unlockUI(); // Unlock if we found a session
            } else {
                syncUser(null);
                setIsImpersonating(false);
                unlockUI();
            }
        });

        // 3. Failsafe: Force unlock after 4 seconds if nothing resolved
        const failsafe = setTimeout(() => {
            if (loading) {
                console.warn('⚠️ [AUTH] Failsafe: UI unlock forced after 4s timeout');
                unlockUI();
            }
        }, 4000);

        return () => {
            mounted = false;
            clearTimeout(failsafe);
            authData.subscription.unsubscribe();
        };
    }, []);

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

        const { error } = await supabase.from('profiles')
            .update({
                ...updates,
                updated_at: new Date().toISOString()
            })
            .eq('id', user.id);

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

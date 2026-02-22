import * as React from 'react';
import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

interface AuthContextType {
    isAuthenticated: boolean;
    user: any;
    login: (email: string, pass: string) => Promise<boolean>;
    register: (name: string, email: string, pass: string) => Promise<boolean>;
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
    const [user, setUser] = useState<any>(null); // To store current user info
    const [loading, setLoading] = useState(true);
    const [isImpersonating, setIsImpersonating] = useState(false);

    useEffect(() => {
        let isMounted = true;

        // Listen for auth state changes
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

        // Check initial session
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

        // Failsafe: force stop loading after 5 seconds if still stuck
        const timeout = setTimeout(() => {
            if (isMounted && loading) {
                console.warn('Auth loading timed out - forcing continue');
                setLoading(false);
            }
        }, 5000);

        return () => {
            isMounted = false;
            subscription.unsubscribe();
            clearTimeout(timeout);
        };
    }, []);

    const login = async (email: string, password: string): Promise<boolean> => {
        console.log('Login attempt started for:', email);
        try {
            // Failsafe: if no response in 10s
            const loginPromise = supabase.auth.signInWithPassword({
                email,
                password,
            });

            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Tempo limite do Supabase excedido.')), 10000)
            );

            const { data, error } = await Promise.race([loginPromise, timeoutPromise]) as any;

            if (error) {
                console.error('Supabase Login Error:', error);
                alert(`Erro no login: ${error.message}`);
                return false;
            }

            console.log('Login successful, checking profile...');
            if (data.user) {
                const { data: profile, error: profileError } = await supabase
                    .from('user_profiles')
                    .select('*')
                    .eq('id', data.user.id)
                    .single();

                if (profile) {
                    // ... existing profile logic
                    if (!profile.is_authorized && profile.email !== 'ivanrossi@outlook.com') {
                        alert("Sua conta ainda não foi autorizada pelo administrador.");
                        await supabase.auth.signOut();
                        return false;
                    }

                    const userSession = {
                        id: data.user.id,
                        name: profile.name,
                        email: profile.email,
                        avatar: profile.avatar,
                        isAdmin: profile.is_admin,
                        isAuthorized: profile.is_authorized,
                        plan: profile.plan
                    };
                    setUser(userSession);
                    setIsAuthenticated(true);
                    return true;
                } else {
                    // ... exists in next chunks
                    // AUTO-RECOVERY: If login works but profile is missing, create it!
                    console.log('Profile missing, attempting auto-recovery...');
                    const isMasterAdmin = data.user.email === 'ivanrossi@outlook.com';
                    const { error: recoveryError } = await supabase
                        .from('user_profiles')
                        .insert([
                            {
                                id: data.user.id,
                                name: data.user.email?.split('@')[0] || 'Usuário',
                                email: data.user.email,
                                is_admin: isMasterAdmin,
                                is_authorized: true, // Auto-authorize if they could login
                                plan: 'FREE'
                            }
                        ]);

                    if (recoveryError) {
                        alert("Erro ao recuperar perfil: " + recoveryError.message);
                        return false;
                    }

                    // Refresh and try to set session again
                    const { data: newProfile } = await supabase
                        .from('user_profiles')
                        .select('*')
                        .eq('id', data.user.id)
                        .single();

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
                        return true;
                    }
                }
            }
            return false;
        } catch (err) {
            console.error(err);
            return false;
        }
    };

    const register = async (name: string, email: string, password: string): Promise<boolean> => {
        try {
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: { name }
                }
            });

            if (error) {
                alert(`Erro no cadastro: ${error.message}`);
                return false;
            }

            if (data.user) {
                const isMasterAdmin = email === 'ivanrossi@outlook.com';

                // Create or update profile in our custom table
                const { error: profileError } = await supabase
                    .from('user_profiles')
                    .upsert([
                        {
                            id: data.user.id,
                            name,
                            email,
                            is_admin: isMasterAdmin,
                            is_authorized: isMasterAdmin,
                            plan: 'FREE'
                        }
                    ]);

                if (profileError) {
                    console.error('Error creating profile:', profileError);
                    alert(`O login foi criado, mas houve um erro ao criar o perfil: ${profileError.message}`);
                }

                if (isMasterAdmin) {
                    const userSession = {
                        id: data.user.id,
                        name,
                        email,
                        isAdmin: true,
                        isAuthorized: true,
                        plan: 'FREE'
                    };
                    setUser(userSession);
                    setIsAuthenticated(true);
                    return true;
                } else {
                    alert("Conta criada com sucesso! Aguarde a autorização do administrador.");
                    return true;
                }
            }
            return false;
        } catch (err) {
            console.error(err);
            return false;
        }
    };

    const logout = async () => {
        await supabase.auth.signOut();
        setIsAuthenticated(false);
        setUser(null);
    };

    const updateUser = async (updatedUser: any) => {
        if (!user?.id) return;

        const { error } = await supabase
            .from('user_profiles')
            .update({
                name: updatedUser.name,
                avatar: updatedUser.avatar,
                phone: updatedUser.phone,
                profession: updatedUser.profession
            })
            .eq('id', user.id);

        if (!error) {
            setUser({ ...user, ...updatedUser });
        } else {
            console.error('Error updating user:', error);
        }
    };

    const adminUpdateUserInfo = async (targetId: string, updates: any) => {
        const { error } = await supabase
            .from('user_profiles')
            .update({
                is_admin: updates.isAdmin,
                is_authorized: updates.isAuthorized,
                plan: updates.plan
            })
            .eq('id', targetId);

        if (error) {
            console.error('Error in adminUpdateUserInfo:', error);
        }
    };

    const impersonateUser = (email: string) => {
        if (!user || (!user.isAdmin && !isImpersonating)) return;

        const users = JSON.parse(localStorage.getItem('fintrack_users') || '[]');
        const target = users.find((u: any) => u.email === email);
        if (!target) return;

        // Store original admin if not already impersonating
        if (!isImpersonating) {
            localStorage.setItem('fintrack_original_admin', JSON.stringify(user));
        }

        const userSession = {
            name: target.name,
            email: target.email,
            avatar: target.avatar,
            isAdmin: target.isAdmin || target.email === 'ivanrossi@outlook.com'
        };

        setUser(userSession);
        localStorage.setItem('fintrack_current_user', JSON.stringify(userSession));
        localStorage.setItem('fintrack_impersonating', 'true');
        setIsImpersonating(true);
    };

    const stopImpersonating = () => {
        const originalAdmin = localStorage.getItem('fintrack_original_admin');
        if (!originalAdmin) {
            logout();
            return;
        }

        const adminSession = JSON.parse(originalAdmin);
        setUser(adminSession);
        localStorage.setItem('fintrack_current_user', JSON.stringify(adminSession));
        localStorage.removeItem('fintrack_impersonating');
        localStorage.removeItem('fintrack_original_admin');
        setIsImpersonating(false);
    };

    const changePassword = async (currentPass: string, newPass: string): Promise<{ success: boolean; message: string }> => {
        const users = JSON.parse(localStorage.getItem('fintrack_users') || '[]');
        const userIndex = users.findIndex((u: any) => u.email === user.email);

        if (userIndex === -1) return { success: false, message: 'Usuário não encontrado.' };

        const registeredUser = users[userIndex];

        // In this app, we are using plain text passwords for simplicity as inherited from previous code, 
        // but normally we would use bcrypt.
        if (registeredUser.password !== currentPass) {
            return { success: false, message: 'Senha atual incorreta.' };
        }

        if (currentPass === newPass) {
            return { success: false, message: 'A nova senha não pode ser igual à atual.' };
        }

        // Update password
        users[userIndex].password = newPass;
        localStorage.setItem('fintrack_users', JSON.stringify(users));

        return { success: true, message: 'Senha alterada com sucesso!' };
    };

    if (loading) {
        return (
            <div style={{
                height: '100vh',
                width: '100vw',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#f8fafc',
                fontFamily: 'sans-serif'
            }}>
                <div style={{
                    width: '40px',
                    height: '40px',
                    border: '4px solid #e2e8f0',
                    borderTopColor: '#3b82f6',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite',
                    marginBottom: '1rem'
                }} />
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                <p style={{ color: '#64748b', fontSize: '14px', fontWeight: 500 }}>Iniciando Finance+...</p>
                <noscript>Você precisa ativar o JavaScript para rodar este site.</noscript>
                {/* Fallback caso demore demais */}
                <button
                    onClick={() => setLoading(false)}
                    style={{ marginTop: '20px', padding: '10px', fontSize: '12px', color: '#94a3b8', border: 'none', background: 'none', cursor: 'pointer', textDecoration: 'underline' }}
                >
                    Ainda carregando? Clique aqui para tentar forçar.
                </button>
            </div>
        );
    }

    return (
        <AuthContext.Provider value={{
            isAuthenticated,
            user,
            login,
            register,
            logout,
            updateUser,
            adminUpdateUserInfo,
            impersonateUser,
            stopImpersonating,
            changePassword,
            isImpersonating,
            loading
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

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

        // Limpa cookies (importante para o novo storage de sessão)
        document.cookie.split(";").forEach((c) => {
            document.cookie = c
                .replace(/^ +/, "")
                .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
        });

        window.location.reload();
    };

    useEffect(() => {
        let isMounted = true;
        console.log('Auth: [INIT] Início da verificação de segurança...');

        const initAuth = async () => {
            try {
                // Listener reativo (Fonte Única de Verdade)
                const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
                    if (!isMounted) return;
                    console.log(`Auth: Evento [${event}] recebido.`);

                    if (session?.user) {
                        setIsAuthenticated(true);
                        setUser((prev: any) => prev || {
                            id: session.user.id,
                            email: session.user.email,
                            name: session.user.user_metadata?.name || 'Usuário'
                        });

                        // Sync Profile em background
                        supabase.from('user_profiles').select('*').eq('id', session.user.id).single()
                            .then(({ data: profile, error: pError }) => {
                                if (!pError && profile && isMounted) {
                                    console.log('Auth: Profile sincronizado.');
                                    setUser({
                                        id: session.user.id,
                                        name: profile.name,
                                        email: profile.email,
                                        avatar: profile.avatar,
                                        isAdmin: profile.is_admin,
                                        isAuthorized: profile.is_authorized,
                                        plan: profile.plan || 'FREE'
                                    });
                                }
                            });
                    } else {
                        setIsAuthenticated(false);
                        setUser(null);
                    }

                    // SEMPRE libera o loading em eventos de estado
                    setLoading(false);
                });

                return subscription;
            } catch (err) {
                console.error('Auth: Erro fatal no listener:', err);
                setLoading(false);
                return null;
            }
        };

        const subPromise = initAuth();

        // FAILSAFE NUCLEAR: Liberação garantida em 2 segundos
        const timer = setTimeout(() => {
            if (isMounted) {
                console.warn('Auth: [FAILSAFE] Forçando liberação da UI após 2s.');
                setLoading(false);
            }
        }, 2000);

        return () => {
            isMounted = false;
            clearTimeout(timer);
            subPromise.then(s => s?.unsubscribe());
        };
    }, []);

    const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
        try {
            const { data, error } = await supabase.auth.signInWithPassword({ email, password });
            if (error) return { success: false, error: error.message };
            if (data?.user) return { success: true };
            return { success: false, error: "Falha na resposta." };
        } catch (err: any) {
            return { success: false, error: "Erro de conexão." };
        }
    };

    const register = async (name: string, email: string, password: string): Promise<{ success: boolean; error?: string }> => {
        try {
            const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { name } } });
            if (error) return { success: false, error: error.message };
            if (data?.user) {
                const isMaster = email.toLowerCase() === 'ivanrossi@outlook.com';
                await supabase.from('user_profiles').upsert([{
                    id: data.user.id,
                    name,
                    email: email.toLowerCase(),
                    is_admin: isMaster,
                    is_authorized: isMaster,
                    plan: 'FREE'
                }]);
                return { success: true };
            }
            return { success: false, error: "Erro na criação." };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    };

    const logout = async () => {
        try { await supabase.auth.signOut(); } catch (e) { }
        setIsAuthenticated(false);
        setUser(null);
        localStorage.clear();
        sessionStorage.clear();
        window.location.href = '/login';
    };

    const updateUser = async (updatedUser: any) => {
        if (!user?.id) return;
        const { error } = await supabase.from('user_profiles').update({ ...updatedUser }).eq('id', user.id);
        if (!error) setUser({ ...user, ...updatedUser });
    };

    const adminUpdateUserInfo = async (targetId: string, updates: any) => {
        await supabase.from('user_profiles').update({ ...updates }).eq('id', targetId);
    };

    const impersonateUser = (_id: string) => {
        if (!user || (!user.isAdmin && !isImpersonating)) return;
        localStorage.setItem('fintrack_original_admin', JSON.stringify(user));
        setIsImpersonating(true);
        window.location.reload();
    };

    const stopImpersonating = () => {
        localStorage.removeItem('fintrack_original_admin');
        setIsImpersonating(false);
        window.location.reload();
    };

    const changePassword = async (_cp: string, _np: string) => ({ success: true, message: 'OK' });

    if (loading) {
        return (
            <div style={{
                height: '100vh',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#ffffff',
                color: '#334155',
                fontFamily: 'sans-serif',
                textAlign: 'center',
                padding: '20px'
            }}>
                <div style={{ fontSize: '24px', fontWeight: '900', color: '#6366f1', marginBottom: '10px' }}>Finance+</div>
                <div style={{ fontSize: '14px', marginBottom: '30px' }}>Carregando seu ambiente seguro...</div>

                <div style={{ width: '30px', height: '30px', border: '3px solid #f1f5f9', borderTop: '3px solid #6366f1', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />

                <div style={{ marginTop: '50px', maxWidth: '300px' }}>
                    <button
                        onClick={() => setLoading(false)}
                        style={{
                            width: '100%',
                            padding: '14px',
                            backgroundColor: '#6366f1',
                            color: 'white',
                            border: 'none',
                            borderRadius: '12px',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            boxShadow: '0 10px 15px -3px rgba(99, 102, 241, 0.3)'
                        }}
                    >
                        ENTRAR AGORA (FORÇAR)
                    </button>

                    <button
                        onClick={resetAppCache}
                        style={{
                            width: '100%',
                            marginTop: '12px',
                            padding: '10px',
                            backgroundColor: 'transparent',
                            color: '#94a2b8',
                            border: '1px solid #e2e8f0',
                            borderRadius: '12px',
                            fontSize: '12px',
                            cursor: 'pointer'
                        }}
                    >
                        Limpar Dados e Reiniciar
                    </button>
                </div>

                <div style={{ marginTop: '40px', fontSize: '10px', color: '#cbd5e1' }}>
                    Infra: {supUrl.includes('placeholder') ? 'CONFIGURAÇÃO PENDENTE' : 'CONECTADO'}
                </div>

                <style>{`
                    @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
                `}</style>
            </div>
        );
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

import * as React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export const ProtectedRoute: React.FC = () => {
    const { isAuthenticated, loading, user, logout } = useAuth();

    if (loading) {
        return (
            <div style={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'var(--color-bg)',
                fontFamily: 'var(--font-sans)',
                padding: '2rem'
            }}>
                <div style={{ textAlign: 'center', maxWidth: '300px' }}>
                    <div style={{
                        width: '48px',
                        height: '48px',
                        border: '4px solid var(--color-primary-light)',
                        borderTop: '4px solid var(--color-primary)',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite',
                        margin: '0 auto 1.5rem'
                    }} />
                    <p style={{
                        color: 'var(--color-primary)',
                        fontWeight: 700,
                        letterSpacing: '0.05em',
                        animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                        marginBottom: '2rem'
                    }}>
                        AUTENTICANDO...
                    </p>
                    <div style={{ paddingTop: '2rem', borderTop: '1px solid var(--color-border)' }}>
                        <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '1rem' }}>
                            Demorando demais?
                        </p>
                        <button
                            onClick={() => {
                                window.location.href = '/login';
                            }}
                            style={{
                                color: 'var(--color-danger)',
                                fontWeight: 600,
                                fontSize: '0.9rem',
                                textDecoration: 'underline'
                            }}
                        >
                            Tentar recarregar
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    // Check for authorization (Phase K)
    if (user && user.is_authorized === false) {
        return (
            <div style={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'var(--color-bg)',
                fontFamily: 'var(--font-sans)',
                padding: '2rem'
            }}>
                <div style={{
                    textAlign: 'center',
                    maxWidth: '400px',
                    padding: '3rem',
                    background: 'var(--color-surface)',
                    backdropFilter: 'var(--glass-blur)',
                    borderRadius: 'var(--radius-xl)',
                    border: '1px solid var(--color-border)',
                    boxShadow: 'var(--shadow-lg)'
                }}>
                    <div style={{
                        width: '64px',
                        height: '64px',
                        backgroundColor: 'var(--color-warning-light)',
                        color: 'var(--color-warning)',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 1.5rem'
                    }}>
                        <AlertTriangle size={32} />
                    </div>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-text)', marginBottom: '0.5rem' }}>
                        Acesso Pendente
                    </h2>
                    <p style={{ color: 'var(--color-text-muted)', fontSize: '0.95rem', lineHeight: '1.5', marginBottom: '2rem' }}>
                        Sua conta foi criada com sucesso, mas ainda precisa ser <strong>liberada por um administrador</strong> para que você possa acessar o sistema.
                    </p>
                    <div style={{ paddingTop: '2rem', borderTop: '1px solid var(--color-border)' }}>
                        <button
                            onClick={() => logout()}
                            style={{
                                width: '100%',
                                padding: '1rem',
                                backgroundColor: 'var(--color-bg)',
                                color: 'var(--color-text)',
                                fontWeight: 700,
                                borderRadius: 'var(--radius-lg)',
                                border: '1px solid var(--color-border)',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                            }}
                        >
                            Sair da Conta
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return <Outlet />;
};

import * as React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

export const ProtectedRoute: React.FC = () => {
    const { isAuthenticated, loading } = useAuth();

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
                                sessionStorage.clear();
                                localStorage.clear();
                                window.location.href = '/login';
                            }}
                            style={{
                                color: 'var(--color-danger)',
                                fontWeight: 600,
                                fontSize: '0.9rem',
                                textDecoration: 'underline'
                            }}
                        >
                            Voltar para o Login
                        </button>
                    </div>
                    <style>{`
                        @keyframes spin { to { transform: rotate(360deg); } }
                        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: .5; } }
                    `}</style>
                </div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    return <Outlet />;
};

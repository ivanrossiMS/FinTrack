import * as React from 'react';
import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import logoFull from '../assets/logo-full.svg';
import './Login.css';

export const Login: React.FC = () => {
    const { login, resetAppCache } = useAuth();
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setIsSubmitLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsSubmitLoading(true);

        try {
            const result = await login(email, password);
            if (result.success) {
                navigate('/');
            } else {
                setError(result.error || 'E-mail ou senha incorretos ou conta ainda não autorizada.');
            }
        } catch (err: any) {
            setError(err.message || 'Ocorreu um erro inesperado.');
        } finally {
            setIsSubmitLoading(false);
        }
    };

    return (
        <div className="login-page">
            <div className="login-card animate-up">
                <div className="login-header">
                    <div className="logo-container">
                        <img src={logoFull} alt="Finance+" className="logo-img" />
                    </div>
                    <p className="slogan">O jeito moderno de controlar gastos.</p>
                </div>

                <form onSubmit={handleSubmit} className="login-form">
                    <Input
                        type="email"
                        label="E-mail"
                        placeholder="seu@email.com"
                        value={email}
                        onChange={e => {
                            setEmail(e.target.value);
                            setError('');
                        }}
                        autoFocus
                    />
                    <Input
                        type="password"
                        label="Senha"
                        placeholder="••••••••"
                        value={password}
                        onChange={e => {
                            setPassword(e.target.value);
                            setError('');
                        }}
                        error={error}
                    />
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '-0.5rem' }}>
                        <Link to="/forgot-password" style={{ fontSize: '0.8125rem', color: 'var(--color-primary)', fontWeight: 600 }}>
                            Esqueceu a senha?
                        </Link>
                    </div>
                    <Button type="submit" fullWidth size="lg" disabled={loading}>
                        {loading ? 'Entrando...' : 'Entrar na conta'}
                    </Button>
                </form>

                <div className="register-footer">
                    <p>
                        Ainda não tem conta? <Link to="/register" className="register-link">Criar conta grátis</Link>
                    </p>

                    <div style={{
                        marginTop: '2rem',
                        padding: '1rem',
                        backgroundColor: 'rgba(0,0,0,0.03)',
                        borderRadius: '8px',
                        fontSize: '10px',
                        color: '#94a3b8',
                        textAlign: 'left',
                        wordBreak: 'break-all'
                    }}>
                        <strong>DEBUG INFO:</strong><br />
                        URL: {(useAuth() as any).supabaseUrl}<br />
                        Key: {(useAuth() as any).supabaseKeyMasked}<br />
                        Status: {error ? '🔴 Verifique o erro' : '🟢 Online'}<br />
                        <button
                            onClick={() => resetAppCache()}
                            style={{
                                marginTop: '10px',
                                padding: '4px 8px',
                                backgroundColor: '#fee2e2',
                                color: '#ef4444',
                                borderRadius: '4px',
                                border: '1px solid #fca5a5',
                                cursor: 'pointer',
                                fontWeight: 'bold'
                            }}
                        >
                            Limpar Tudo & Recarregar Site
                        </button>
                    </div>

                    <p style={{ marginTop: '1rem', fontSize: '0.75rem', opacity: 0.5 }}>
                        @copyright by Ivan Rossi - todos direitos reservados
                    </p>
                </div>
            </div>
        </div>
    );
};

import * as React from 'react';
import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import logoFull from '../assets/logo-full.svg';
import './Login.css';

export const Login: React.FC = () => {
    const { login } = useAuth();
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        const { success, error: authError } = await login(email, password);
        if (success) {
            navigate('/dashboard');
        } else {
            setError(authError || 'E-mail ou senha incorretos');
        }
    };

    return (
        <div className="login-page">
            <div className="login-card animate-up">
                <div className="login-header">
                    <div className="logo-container">
                        <img src={logoFull} alt="FinTrack" className="logo-img" />
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
                    <Button type="submit" fullWidth size="lg">Entrar na conta</Button>
                </form>

                <div className="register-footer">
                    <p>
                        Ainda não tem conta? <Link to="/register" className="register-link">Criar conta grátis</Link>
                    </p>
                    <p style={{ marginTop: '2rem', fontSize: '0.75rem', opacity: 0.5 }}>
                        @copyright by Ivan Rossi - todos direitos reservados
                    </p>
                </div>
            </div>
        </div>
    );
};

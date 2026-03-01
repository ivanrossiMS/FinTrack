import * as React from 'react';
import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import logoFull from '../assets/logo-full.svg';
import './Login.css';

export const Register: React.FC = () => {
    const { register } = useAuth();
    const navigate = useNavigate();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (password !== confirmPassword) {
            setError('As senhas não coincidem');
            return;
        }

        setError('');
        const { success, needsEmailAuth, error } = await register(name, email, password);

        if (success) {
            if (needsEmailAuth) {
                alert('Conta criada! Verifique seu e-mail para confirmar o cadastro antes de entrar.');
            } else {
                alert('Conta criada com sucesso!');
            }
            navigate('/login');
        } else {
            setError(error || 'Erro ao criar conta');
        }
    };

    return (
        <div className="login-page">
            <div className="login-card animate-up">
                <div className="login-header">
                    <div className="logo-container">
                        <img src={logoFull} alt="FinTrack" className="logo-img" />
                    </div>
                    <p className="slogan">Comece hoje sua jornada para a liberdade.</p>
                </div>

                <form onSubmit={handleSubmit} className="login-form">
                    <Input
                        label="Nome Completo"
                        placeholder="Nome Sobrenome"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        required
                    />
                    <Input
                        type="email"
                        label="E-mail"
                        placeholder="seu@email.com"
                        value={email}
                        onChange={e => {
                            setEmail(e.target.value);
                            setError('');
                        }}
                        required
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
                        required
                    />
                    <Input
                        type="password"
                        label="Confirmar Senha"
                        placeholder="••••••••"
                        value={confirmPassword}
                        onChange={e => {
                            setConfirmPassword(e.target.value);
                            setError('');
                        }}
                        error={error}
                        required
                    />
                    <Button type="submit" fullWidth size="lg">Cadastrar</Button>
                </form>

                <div className="register-footer">
                    <p>
                        Já tem uma conta? <Link to="/login" className="register-link">Entrar</Link>
                    </p>
                    <p className="auth-copyright">
                        @copyright by Ivan Rossi - todos direitos reservados
                    </p>
                </div>
            </div>
        </div>
    );
};

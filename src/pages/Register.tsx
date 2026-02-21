import * as React from 'react';
import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { UserPlus } from 'lucide-react';

export const Register: React.FC = () => {
    const { register } = useAuth();
    const navigate = useNavigate();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (password !== confirmPassword) {
            setError('As senhas não coincidem');
            return;
        }

        if (register(name, email, password)) {
            navigate('/');
        } else {
            setError('E-mail já cadastrado');
        }
    };

    return (
        <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '100vh',
            backgroundColor: 'var(--color-bg)'
        }}>
            <div style={{
                width: '100%',
                maxWidth: '400px',
                padding: '2rem',
                backgroundColor: 'var(--color-surface)',
                borderRadius: 'var(--radius-lg)',
                boxShadow: 'var(--shadow-lg)',
                border: '1px solid var(--color-border)'
            }}>
                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <div style={{
                        width: '64px',
                        height: '64px',
                        borderRadius: '50%',
                        backgroundColor: 'var(--color-primary-light)',
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 1rem'
                    }}>
                        <UserPlus size={32} style={{ color: 'var(--color-primary)' }} />
                    </div>
                    <h1 className="text-lg font-bold">Criar Conta</h1>
                    <p style={{ color: 'var(--color-text-muted)' }}>Comece a controlar suas finanças</p>
                </div>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <Input
                        label="Nome Completo"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        required
                    />
                    <Input
                        type="email"
                        label="E-mail"
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
                        value={confirmPassword}
                        onChange={e => {
                            setConfirmPassword(e.target.value);
                            setError('');
                        }}
                        error={error}
                        required
                    />
                    <Button type="submit" fullWidth>Cadastrar</Button>
                </form>

                <div className="text-center mt-4">
                    <p className="text-sm text-muted">
                        Já tem uma conta? <Link to="/login" className="text-primary font-bold hover:underline">Entrar</Link>
                    </p>
                </div>
            </div>
        </div>
    );
};

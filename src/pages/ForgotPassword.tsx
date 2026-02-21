import * as React from 'react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { KeyRound, ArrowLeft } from 'lucide-react';

export const ForgotPassword: React.FC = () => {
    const [email, setEmail] = useState('');
    const [step, setStep] = useState<1 | 2>(1);
    const [code, setCode] = useState('');
    const [newPassword, setNewPassword] = useState('');

    const handleSendCode = (e: React.FormEvent) => {
        e.preventDefault();
        // Simulation
        alert(`Código de verificação enviado para ${email} (Simulado: use 1234)`);
        setStep(2);
    };

    const handleReset = (e: React.FormEvent) => {
        e.preventDefault();
        // Simulation - In a real app we would verify code
        const users = JSON.parse(localStorage.getItem('fintrack_users') || '[]');
        const userIndex = users.findIndex((u: any) => u.email === email);

        if (userIndex >= 0) {
            users[userIndex].password = newPassword;
            localStorage.setItem('fintrack_users', JSON.stringify(users));
            alert('Senha alterada com sucesso! Faça login com a nova senha.');
            window.location.href = '/login';
        } else {
            alert('E-mail não encontrado.');
            setStep(1);
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
                        <KeyRound size={32} style={{ color: 'var(--color-primary)' }} />
                    </div>
                    <h1 className="text-lg font-bold">Recuperar Senha</h1>
                    <p style={{ color: 'var(--color-text-muted)' }}>
                        {step === 1 ? 'Informe seu e-mail para continuar' : 'Crie uma nova senha'}
                    </p>
                </div>

                {step === 1 ? (
                    <form onSubmit={handleSendCode} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <Input
                            type="email"
                            label="E-mail"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            required
                        />
                        <Button type="submit" fullWidth>Enviar Código</Button>
                    </form>
                ) : (
                    <form onSubmit={handleReset} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <Input
                            label="Código de Verificação"
                            value={code}
                            onChange={e => setCode(e.target.value)}
                            placeholder="1234"
                            required
                        />
                        <Input
                            type="password"
                            label="Nova Senha"
                            value={newPassword}
                            onChange={e => setNewPassword(e.target.value)}
                            required
                        />
                        <Button type="submit" fullWidth>Alterar Senha</Button>
                    </form>
                )}

                <div className="text-center mt-6">
                    <Link to="/login" className="text-sm text-text-muted hover:text-primary flex items-center justify-center gap-1">
                        <ArrowLeft size={14} /> Voltar para Login
                    </Link>
                </div>
            </div>
        </div>
    );
};

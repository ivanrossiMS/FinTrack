import * as React from 'react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { KeyRound, ArrowLeft } from 'lucide-react';

export const ForgotPassword: React.FC = () => {
    const [email, setEmail] = useState('');
    const [step, setStep] = useState<1 | 2>(1);
    const [loading, setLoading] = useState(false);

    const handleSendCode = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/reset-password`,
        });

        setLoading(false);
        if (error) {
            alert(`Erro: ${error.message}`);
        } else {
            setStep(2);
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
                        {step === 1
                            ? 'Informe seu e-mail para receber o link de recuperação'
                            : 'Verifique sua caixa de entrada'}
                    </p>
                </div>

                {step === 1 ? (
                    <form onSubmit={handleSendCode} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <Input
                            type="email"
                            label="E-mail"
                            placeholder="seu@email.com"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            required
                        />
                        <Button type="submit" fullWidth disabled={loading}>
                            {loading ? 'Enviando...' : 'Enviar Link de Recuperação'}
                        </Button>
                    </form>
                ) : (
                    <div style={{ textAlign: 'center' }}>
                        <p style={{ marginBottom: '2rem', fontSize: '0.9375rem', lineHeight: '1.5' }}>
                            Enviamos as instruções para <strong>{email}</strong>.<br />
                            Clique no link enviado para definir sua nova senha.
                        </p>
                        <Link to="/login" style={{ width: '100%' }}>
                            <Button fullWidth variant="secondary">Voltar para Login</Button>
                        </Link>
                    </div>
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

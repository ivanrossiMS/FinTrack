import * as React from 'react';
import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Lock, ArrowLeft, CheckCircle2 } from 'lucide-react';

export const ResetPassword: React.FC = () => {
    const navigate = useNavigate();
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        // Verifica se existe uma sessão (o Supabase cria uma sessão automática ao clicar no link de recovery)
        const checkSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                setError('Sessão de recuperação expirada ou inválida. Solicite um novo link.');
            }
        };
        checkSession();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (password.length < 6) {
            setError('A senha deve ter pelo menos 6 caracteres.');
            return;
        }

        if (password !== confirmPassword) {
            setError('As senhas não coincidem.');
            return;
        }

        setLoading(true);
        try {
            const { error: resetError } = await supabase.auth.updateUser({
                password: password
            });

            if (resetError) throw resetError;

            setSuccess(true);
            setTimeout(() => {
                navigate('/login');
            }, 3000);
        } catch (err: any) {
            setError(err.message || 'Erro ao redefinir senha.');
        } finally {
            setLoading(false);
        }
    };

    if (success) {
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
                    border: '1px solid var(--color-border)',
                    textAlign: 'center'
                }}>
                    <div style={{ color: 'var(--color-success)', marginBottom: '1rem' }}>
                        <CheckCircle2 size={64} style={{ margin: '0 auto' }} />
                    </div>
                    <h1 className="text-xl font-bold mb-2">Senha Alterada!</h1>
                    <p style={{ color: 'var(--color-text-muted)', marginBottom: '2rem' }}>
                        Sua senha foi redefinida com sucesso. Redirecionando para o login...
                    </p>
                    <Link to="/login">
                        <Button fullWidth>Ir para Login Agora</Button>
                    </Link>
                </div>
            </div>
        );
    }

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
                        <Lock size={32} style={{ color: 'var(--color-primary)' }} />
                    </div>
                    <h1 className="text-lg font-bold">Nova Senha</h1>
                    <p style={{ color: 'var(--color-text-muted)' }}>
                        Defina sua nova credencial de acesso
                    </p>
                </div>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <Input
                        type="password"
                        label="Nova Senha"
                        placeholder="••••••••"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        required
                        disabled={loading || !!error && error.includes('expirada')}
                    />
                    <Input
                        type="password"
                        label="Confirmar Nova Senha"
                        placeholder="••••••••"
                        value={confirmPassword}
                        onChange={e => setConfirmPassword(e.target.value)}
                        required
                        disabled={loading || !!error && error.includes('expirada')}
                        error={error}
                    />

                    <Button type="submit" fullWidth disabled={loading || !!error && error.includes('expirada')}>
                        {loading ? 'Salvando...' : 'Redefinir Senha'}
                    </Button>
                </form>

                <div className="text-center mt-6">
                    <Link to="/login" className="text-sm text-text-muted hover:text-primary flex items-center justify-center gap-1">
                        <ArrowLeft size={14} /> Voltar para Login
                    </Link>
                </div>
            </div>
        </div>
    );
};

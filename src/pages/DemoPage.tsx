import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Home,
    DollarSign,
    PieChart,
    Calendar,
    Target,
    TrendingUp,
    ArrowLeft,
    Crown
} from 'lucide-react';
import './Dashboard.css';
import './Reports.css';

export const DemoPage: React.FC = () => {
    const navigate = useNavigate();

    return (
        <div className="demo-wrapper" style={{ backgroundColor: 'var(--lp-bg)', minHeight: '100vh', color: 'white' }}>
            <nav style={{ padding: '1.5rem', borderBottom: '1px solid var(--lp-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <button onClick={() => navigate('/')} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--lp-text-muted)', fontWeight: 600 }}>
                    <ArrowLeft size={20} />
                    Voltar para Landing
                </button>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ padding: '0.4rem 0.8rem', background: 'rgba(99, 102, 241, 0.2)', border: '1px solid var(--lp-primary)', borderRadius: '100px', fontSize: '0.75rem', fontWeight: 800, color: 'var(--lp-primary)' }}>
                        MODO DEMO INTERATIVO
                    </div>
                </div>
            </nav>

            <div className="landing-container" style={{ paddingTop: '3rem' }}>
                <header style={{ marginBottom: '3rem' }}>
                    <h1 style={{ fontSize: '2.5rem', fontWeight: 800 }}>Bem-vindo ao FinTrack</h1>
                    <p style={{ color: 'var(--lp-text-muted)', fontSize: '1.125rem' }}>Explore a interface e as funcionalidades sem precisar de cadastro.</p>
                </header>

                {/* Mock Summary Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>
                    <DemoStatCard label="Saldo Total" value="R$ 12.450,00" color="#6366f1" />
                    <DemoStatCard label="Receitas (Mês)" value="R$ 8.500,00" color="#10b981" />
                    <DemoStatCard label="Despesas (Mês)" value="R$ 3.240,00" color="#f43f5e" />
                    <DemoStatCard label="Investido" value="R$ 45.000,00" color="#0ea5e9" />
                </div>

                {/* Mock Featured Area */}
                <div style={{ background: 'var(--lp-surface)', border: '1px solid var(--lp-border)', borderRadius: '24px', padding: '2.5rem', marginBottom: '4rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                        <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Exemplo de Extrato</h2>
                    </div>
                    <div className="rep-items-list" style={{ background: 'transparent' }}>
                        <DemoRow date="22/02" desc="Supermercado Extra" cat="Alimentação" val="- R$ 254,00" />
                        <DemoRow date="21/02" desc="Salário Mensal" cat="Renda" val="+ R$ 8.500,00" positive />
                        <DemoRow date="20/02" desc="Assinatura Netflix" cat="Lazer" val="- R$ 55,90" />
                        <DemoRow date="19/02" desc="Aluguel Apartamento" cat="Moradia" val="- R$ 2.200,00" />
                    </div>
                </div>

                <div style={{ textAlign: 'center', paddingBottom: '6rem' }}>
                    <h3 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1rem' }}>Gostou da experiência?</h3>
                    <button onClick={() => navigate('/register')} style={{ background: 'var(--lp-primary)', color: 'white', padding: '1rem 2.5rem', borderRadius: '12px', fontWeight: 800, fontSize: '1.125rem' }}>
                        Criar minha conta agora
                    </button>
                </div>
            </div>
        </div>
    );
};

const DemoStatCard = ({ label, value, color }: { label: string, value: string, color: string }) => (
    <div style={{ background: 'var(--lp-surface)', border: '1px solid var(--lp-border)', borderRadius: '20px', padding: '1.5rem' }}>
        <span style={{ fontSize: '0.75rem', fontWeight: 700, opacity: 0.6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
        <div style={{ fontSize: '1.75rem', fontWeight: 900, marginTop: '0.5rem', color: color }}>{value}</div>
    </div>
);

const DemoRow = ({ date, desc, cat, val, positive }: { date: string, desc: string, cat: string, val: string, positive?: boolean }) => (
    <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr 150px 120px', gap: '1rem', padding: '1.25rem', borderBottom: '1px solid rgba(255,255,255,0.05)', alignItems: 'center' }}>
        <span style={{ fontWeight: 700, opacity: 0.8 }}>{date}</span>
        <span style={{ fontWeight: 600 }}>{desc}</span>
        <span style={{ fontSize: '0.875rem', color: 'var(--lp-primary)', background: 'rgba(99, 102, 241, 0.1)', padding: '0.4rem 0.8rem', borderRadius: '100px', width: 'fit-content' }}>{cat}</span>
        <span style={{ fontWeight: 800, textAlign: 'right', color: positive ? '#10b981' : '#f43f5e' }}>{val}</span>
    </div>
);

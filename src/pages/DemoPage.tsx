import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ArrowLeft,
    BrainCircuit,
    Calendar,
    Target,
    BarChart3,
    TrendingUp,
    ShieldCheck,
    AlertCircle,
    CheckCircle2,
    Sparkles,
    ArrowUpRight,
    ArrowDownRight
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

            {/* Summary View */}
            <header style={{ marginBottom: '3rem' }}>
                <h1 style={{ fontSize: '2.5rem', fontWeight: 800 }}>Bem-vindo ao FinTrack</h1>
                <p style={{ color: 'var(--lp-text-muted)', fontSize: '1.125rem' }}>Explore a ferramenta de gestão financeira mais completa do mercado.</p>
            </header>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>
                <DemoStatCard label="Patrimônio Total" value="R$ 158.420,00" color="#6366f1" />
                <DemoStatCard label="Disponível" value="R$ 12.450,00" color="#10b981" />
                <DemoStatCard label="Investido" value="R$ 145.970,00" color="#0ea5e9" />
                <DemoStatCard label="Contas do Mês" value="R$ 3.240,00" color="#f43f5e" />
            </div>

            <div className="demo-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '2rem', marginBottom: '4rem' }}>

                {/* AI ASSISTANT SECTION */}
                <div className="demo-card-elite">
                    <div className="demo-card-header">
                        <div className="header-icon ai"><BrainCircuit size={20} /></div>
                        <h3>FinTrack AI Assistant</h3>
                    </div>
                    <div className="demo-ai-chat">
                        <div className="ai-bubble incoming">
                            <Sparkles size={14} className="spark-ai" />
                            <p>Olá! Analisei seus gastos de Fevereiro. Você economizou 15% a mais em lazer do que o planejado. Que tal destinar R$ 400,00 extras para sua meta <b>"Viagem Europa"</b>?</p>
                        </div>
                        <div className="ai-bubble outgoing">
                            <p>Sim, por favor! Faça a transferência agora.</p>
                        </div>
                        <div className="ai-bubble incoming">
                            <CheckCircle2 size={14} className="check-ai" />
                            <p>Feito! Seu progresso para <b>"Viagem Europa"</b> subiu para 68%. Mantendo este ritmo, você atingirá a meta 2 meses antes do previsto.</p>
                        </div>
                    </div>
                </div>

                {/* COMMITMENTS / ACCOUNTS PAYABLE */}
                <div className="demo-card-elite">
                    <div className="demo-card-header">
                        <div className="header-icon alarm"><Calendar size={20} /></div>
                        <h3>Contas a Pagar (Próximos 7 dias)</h3>
                    </div>
                    <div className="demo-list">
                        <DemoListItem icon={<AlertCircle className="text-red" />} label="Aluguel" date="Amanhã" val="R$ 2.500,00" />
                        <DemoListItem icon={<AlertCircle className="text-yellow" />} label="Energia Elétrica" date="02/03" val="R$ 320,00" />
                        <DemoListItem icon={<CheckCircle2 className="text-gray" />} label="Internet Fibra" date="Pago" val="R$ 159,90" dimmed />
                        <DemoListItem icon={<AlertCircle className="text-yellow" />} label="Condomínio" date="05/03" val="R$ 680,00" />
                    </div>
                </div>

                {/* DREAMS / ECONOMY */}
                <div className="demo-card-elite">
                    <div className="demo-card-header">
                        <div className="header-icon dreams"><Target size={20} /></div>
                        <h3>Modo Realizar Sonhos</h3>
                    </div>
                    <div className="demo-dreams-grid">
                        <DemoDreamItem label="Viagem Japão" current={12000} total={25000} color="#6366f1" />
                        <DemoDreamItem label="Reserva de Emergência" current={15000} total={15000} color="#10b981" completed />
                        <DemoDreamItem label="Novo MacBook Pro" current={4500} total={18000} color="#f59e0b" />
                    </div>
                </div>

                {/* INVESTMENTS PERFORMANCE */}
                <div className="demo-card-elite">
                    <div className="demo-card-header">
                        <div className="header-icon invest"><BarChart3 size={20} /></div>
                        <h3>Investimentos vs Selic</h3>
                    </div>
                    <div className="demo-invest-view">
                        <div className="invest-metrics">
                            <div className="metric">
                                <span>Rentabilidade (Ano)</span>
                                <div className="val pos">+ 14.8% <TrendingUp size={16} /></div>
                            </div>
                            <div className="metric">
                                <span>Melhor Ativo</span>
                                <div className="val">PETR4 (+22%)</div>
                            </div>
                        </div>
                        <div className="mock-chart-container">
                            <div className="chart-line-bg" />
                            <div className="chart-line-active" />
                            <div className="chart-point" style={{ left: '80%', top: '30%' }} />
                        </div>
                    </div>
                </div>

            </div>

            <div style={{ textAlign: 'center', paddingBottom: '6rem' }}>
                <h3 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1rem' }}>Sua liberdade financeira começa aqui.</h3>
                <button onClick={() => navigate('/register')} style={{ background: 'var(--lp-primary)', color: 'white', padding: '1.25rem 3rem', borderRadius: '16px', fontWeight: 800, fontSize: '1.25rem', cursor: 'pointer', transition: 'all 0.3s' }}>
                    Ativar meu acesso Premium
                </button>
            </div>
        </div>
        </div >
    );
};

const DemoStatCard = ({ label, value, color }: { label: string, value: string, color: string }) => (
    <div className="demo-stat-mini">
        <span className="stat-label">{label}</span>
        <div className="stat-value" style={{ color: color }}>{value}</div>
    </div>
);

const DemoListItem = ({ icon, label, date, val, dimmed }: any) => (
    <div className={`demo-list-item ${dimmed ? 'dimmed' : ''}`}>
        <div className="item-main">
            {icon}
            <div className="item-info">
                <span className="name">{label}</span>
                <span className="date">{date}</span>
            </div>
        </div>
        <span className="val">{val}</span>
    </div>
);

const DemoDreamItem = ({ label, current, total, color, completed }: any) => {
    const pct = Math.min(100, (current / total) * 100);
    return (
        <div className="demo-dream-item">
            <div className="dream-header">
                <span className="name">{label}</span>
                <span className="pct">{pct.toFixed(0)}%</span>
            </div>
            <div className="progress-bg">
                <div className="progress-fill" style={{ width: `${pct}%`, backgroundColor: color }} />
            </div>
            <div className="dream-footer">
                <span>R$ {current.toLocaleString()}</span>
                <span>R$ {total.toLocaleString()}</span>
            </div>
        </div>
    );
};

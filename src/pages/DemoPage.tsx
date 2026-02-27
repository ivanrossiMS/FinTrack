import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ArrowLeft,
    BrainCircuit,
    Calendar,
    Target,
    BarChart3,
    TrendingUp,
    AlertCircle,
    CheckCircle2,
    Sparkles,
    Mic,
    Volume2
} from 'lucide-react';
import './Dashboard.css';
import './Reports.css';

export const DemoPage: React.FC = () => {
    const navigate = useNavigate();
    const [isListening, setIsListening] = React.useState(false);
    const [voiceText, setVoiceText] = React.useState('Clique no mic para falar...');

    const handleVoiceClick = () => {
        setIsListening(true);
        setVoiceText('Ouvindo...');
        setTimeout(() => {
            setIsListening(false);
            setVoiceText('Entendido! Lançamento de "Almoço R$ 45,00" adicionado com sucesso.');
        }, 3250);
    };

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

            <div className="landing-container" style={{ padding: '3rem 2rem' }}>
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

                    {/* VOICE ASSISTANT INTERACTION */}
                    <div className="demo-card-elite">
                        <div className="demo-card-header">
                            <div className="header-icon voice"><Mic size={20} /></div>
                            <h3>Assistente de Voz IA</h3>
                        </div>
                        <div className="demo-voice-content">
                            <div className={`mic-button-wrap ${isListening ? 'listening' : ''}`} onClick={handleVoiceClick}>
                                <div className="mic-rings">
                                    <div className="ring" />
                                    <div className="ring" />
                                </div>
                                <button className="mic-main-btn">
                                    {isListening ? <Volume2 size={32} /> : <Mic size={32} />}
                                </button>
                            </div>
                            <div className="voice-status-wrapper">
                                <p className="voice-status-text">{voiceText}</p>
                                {isListening && <div className="voice-wave"><span></span><span></span><span></span><span></span></div>}
                            </div>
                        </div>
                    </div>

                    {/* AI INSIGHTS SECTION */}
                    <div className="demo-card-elite">
                        <div className="demo-card-header">
                            <div className="header-icon ai"><BrainCircuit size={20} /></div>
                            <h3>Insights Financeiros</h3>
                        </div>
                        <div className="demo-ai-chat">
                            <div className="ai-bubble incoming">
                                <Sparkles size={14} className="spark-ai" />
                                <p>Análise de Outubro concluída. Notei um aumento de 12% em assinaturas recorrentes. <b>Economia potencial identificada:</b> R$ 240,00/mês ao cancelar serviços não utilizados.</p>
                            </div>
                            <div className="ai-bubble outgoing">
                                <p>Quais serviços seriam esses?</p>
                            </div>
                            <div className="ai-bubble incoming">
                                <CheckCircle2 size={14} className="check-ai" />
                                <p>Identifiquei 2 streamings sem uso nos últimos 60 dias. Além disso, se mantiver o aporte em <b>Tesouro Direto</b>, você atingirá sua Independência 1.4 anos antes.</p>
                            </div>
                        </div>
                    </div>

                    {/* COMMITMENTS / ACCOUNTS PAYABLE */}
                    <div className="demo-card-elite">
                        <div className="demo-card-header">
                            <div className="header-icon alarm"><Calendar size={20} /></div>
                            <h3>Lançamentos e Compromissos</h3>
                        </div>
                        <div className="demo-list">
                            <DemoListItem icon={<AlertCircle size={18} />} label="Aluguel Mensal" date="Vence Amanhã" val="R$ 2.500,00" status="urgent" />
                            <DemoListItem icon={<Calendar size={18} />} label="Energia Elétrica" date="02 de Outubro" val="R$ 320,00" status="pending" />
                            <DemoListItem icon={<CheckCircle2 size={18} />} label="Internet Fibra" date="Liquidado" val="R$ 159,90" status="paid" />
                            <DemoListItem icon={<Calendar size={18} />} label="Condomínio" date="05 de Outubro" val="R$ 680,00" status="pending" />
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
                            <DemoDreamItem label="Reserva de Emergência" current={15000} total={15000} color="#10b981" />
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
        </div>
    );
};

const DemoStatCard = ({ label, value, color }: { label: string, value: string, color: string }) => (
    <div className="demo-stat-mini">
        <span className="stat-label">{label}</span>
        <div className="stat-value" style={{ color: color }}>{value}</div>
    </div>
);

const DemoListItem = ({ icon, label, date, val, status }: any) => (
    <div className={`demo-list-item status-${status}`}>
        <div className="item-main">
            <div className="status-icon-wrap">{icon}</div>
            <div className="item-info">
                <span className="name">{label}</span>
                <span className="date">{date}</span>
            </div>
        </div>
        <div className="item-val-wrap">
            <span className="val">{val}</span>
            <div className={`status-badge ${status}`}>{status === 'paid' ? 'PAGO' : status === 'urgent' ? 'HOJE' : 'AGENDADO'}</div>
        </div>
    </div>
);

const DemoDreamItem = ({ label, current, total, color }: any) => {
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

import * as React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
    ArrowLeft,
    BrainCircuit,
    Calendar,
    TrendingUp,
    Mic,
    Volume2,
    ShieldCheck,
    PiggyBank,
    ArrowRight,
    Fingerprint,
    Zap,
    FilePieChart,
    Bell,
    TrendingDown,
    Activity
} from 'lucide-react';
import './LandingPage.css';

export const DemoPage: React.FC = () => {
    const navigate = useNavigate();
    const [isListening, setIsListening] = React.useState(false);
    const [voiceText, setVoiceText] = React.useState('Clique no mic para falar...');
    const [scrolled, setScrolled] = React.useState(false);

    React.useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const handleVoiceClick = () => {
        setIsListening(true);
        setVoiceText('Ouvindo...');
        setTimeout(() => {
            setIsListening(false);
            setVoiceText('Entendido! Lançamento de "Almoço R$ 45,00" adicionado com sucesso.');
        }, 3250);
    };

    return (
        <div className="landing-wrapper" style={{ paddingBottom: '100px' }}>
            <nav className={`landing-nav ${scrolled ? 'scrolled' : ''}`}>
                <div className="landing-container">
                    <Link to="/" className="landing-logo">
                        <div className="logo-icon-wrap">
                            <TrendingUp size={22} strokeWidth={3} />
                        </div>
                        <span className="logo-text">FinTrack</span>
                    </Link>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div className="badge-premium" style={{ marginBottom: 0 }}>
                            Modo Demo Interativo
                        </div>
                        <button onClick={() => navigate('/')} className="nav-link-item" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'none', border: 'none', cursor: 'pointer' }}>
                            <ArrowLeft size={16} />
                            Voltar
                        </button>
                    </div>
                </div>
            </nav>

            <div className="landing-container" style={{ paddingTop: '120px' }}>
                <header style={{ marginBottom: '3rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#2563EB', fontWeight: 700, fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>
                        <BrainCircuit size={18} /> Dashboard de Elite
                    </div>
                    <h1 className="section-title" style={{ textAlign: 'left', margin: 0 }}>Gestão Financeira do Futuro</h1>
                    <p className="section-subtitle" style={{ textAlign: 'left', marginTop: '0.5rem' }}>Visualize seu patrimônio com a clareza e o poder que ele merece.</p>
                </header>

                <div className="features-grid" style={{ marginBottom: '3rem', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem' }}>
                    <DemoStatCard label="Patrimônio Total" value="R$ 158.420,00" trend="+2.4%" icon={<Activity size={18} />} trendColor="#10b981" accent="blue" />
                    <DemoStatCard label="Disponível" value="R$ 12.450,00" trend="+ R$ 1.200" icon={<PiggyBank size={18} />} trendColor="#10b981" accent="green" tint="green" />
                    <DemoStatCard label="Investido" value="R$ 145.970,00" trend="+1.8%" icon={<TrendingUp size={18} />} trendColor="#10b981" accent="purple" tint="purple" />
                    <DemoStatCard label="Contas do Mês" value="R$ 3.240,00" trend="-12%" icon={<Calendar size={18} />} trendColor="#f43f5e" accent="pink" tint="pink" />
                </div>

                <div className="demo-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '2rem' }}>

                    {/* RELATÓRIOS PREMIUM */}
                    <div className="card-modern" style={{ padding: '2rem' }}>
                        <div className="card-accent-bar blue" />
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1.5rem' }}>
                            <div className="feature-icon-wrap" style={{ margin: 0, width: '40px', height: '40px', background: 'rgba(37, 99, 235, 0.1)', color: '#2563EB' }}><FilePieChart size={20} /></div>
                            <h3 className="feature-title" style={{ margin: 0 }}>Relatórios de Elite</h3>
                        </div>

                        <div className="mini-chart-container">
                            <div className="mini-chart-bar" style={{ height: '40%' }}></div>
                            <div className="mini-chart-bar secondary" style={{ height: '65%' }}></div>
                            <div className="mini-chart-bar" style={{ height: '55%' }}></div>
                            <div className="mini-chart-bar secondary" style={{ height: '90%' }}></div>
                            <div className="mini-chart-bar" style={{ height: '45%' }}></div>
                        </div>

                        <div style={{ marginTop: '1.5rem' }}>
                            <CategoryProgress label="Gastos Essenciais" value={65} color="#2563EB" />
                            <CategoryProgress label="Lazer & Estilo" value={22} color="#7C3AED" />
                            <CategoryProgress label="Investimentos" value={13} color="#10B981" />
                        </div>
                    </div>

                    {/* VOICE ASSISTANT */}
                    <div className="card-modern" style={{ padding: '2rem' }}>
                        <div className="card-accent-bar purple" />
                        <div className="card-bg-tint purple" />
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '2rem' }}>
                            <div className="feature-icon-wrap" style={{ margin: 0, width: '40px', height: '40px' }}><Mic size={20} /></div>
                            <h3 className="feature-title" style={{ margin: 0 }}>Assistente de Voz IA</h3>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2rem', padding: '1rem 0' }}>
                            <div className={`mic-wrap ${isListening ? 'listening' : ''}`} onClick={handleVoiceClick} style={{ cursor: 'pointer', position: 'relative' }}>
                                <div style={{
                                    width: '80px', height: '80px', borderRadius: '50%', background: isListening ? '#ef4444' : 'var(--grad-primary)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white',
                                    boxShadow: isListening ? '0 0 20px rgba(239, 68, 68, 0.4)' : '0 8px 16px rgba(37, 99, 235, 0.2)',
                                    transition: 'all 0.3s'
                                }}>
                                    {isListening ? <Volume2 size={32} /> : <Mic size={32} />}
                                </div>
                            </div>
                            <p style={{ fontWeight: 600, color: isListening ? '#ef4444' : 'var(--lp-text)', textAlign: 'center' }}>{voiceText}</p>
                        </div>
                    </div>

                    {/* TRANSACTIONS RESTORED */}
                    <div className="card-modern" style={{ padding: '2rem' }}>
                        <div className="card-accent-bar green" />
                        <div className="card-bg-tint green" />
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1.5rem' }}>
                            <div className="feature-icon-wrap" style={{ margin: 0, width: '40px', height: '40px', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}><TrendingUp size={20} /></div>
                            <h3 className="feature-title" style={{ margin: 0 }}>Lançamentos Recentes</h3>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <DemoListItem label="Supermercado Modelo" date="Hoje, 14:20" val="- R$ 450,00" type="expense" />
                            <DemoListItem label="Rendimento Dividendos" date="Ontem" val="+ R$ 1.250,00" type="income" />
                            <DemoListItem label="Assinatura Netflix" date="26 de Out" val="- R$ 55,90" type="expense" />
                        </div>
                    </div>

                    {/* COMPROMISSOS (BOLETOS) */}
                    <div className="card-modern" style={{ padding: '2rem' }}>
                        <div className="card-accent-bar orange" />
                        <div className="card-bg-tint orange" />
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1.5rem' }}>
                            <div className="feature-icon-wrap" style={{ margin: 0, width: '40px', height: '40px', background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }}><Bell size={20} /></div>
                            <h3 className="feature-title" style={{ margin: 0 }}>Próximos Boletos</h3>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <DemoListItem label="Aluguel Outubro" date="Vence em 2 dias" val="R$ 2.450,00" type="pending" />
                            <DemoListItem label="Condomínio" date="Vence em 5 dias" val="R$ 890,00" type="pending" />
                        </div>
                    </div>

                    {/* INVESTIMENTOS IA */}
                    <div className="card-modern" style={{ padding: '2rem' }}>
                        <div className="card-accent-bar purple" />
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1.5rem' }}>
                            <div className="feature-icon-wrap" style={{ margin: 0, width: '40px', height: '40px', background: 'rgba(124, 58, 237, 0.1)', color: '#7c3aed' }}><Fingerprint size={20} /></div>
                            <h3 className="feature-title" style={{ margin: 0 }}>Investimentos com IA</h3>
                        </div>
                        <div style={{ background: 'rgba(124, 58, 237, 0.05)', padding: '1.25rem', borderRadius: '16px', border: '1px dashed rgba(124, 58, 237, 0.2)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                                <Zap size={16} color="#7c3aed" />
                                <span style={{ fontWeight: 700, fontSize: '0.8125rem', color: '#7c3aed' }}>SUGESTÃO DO DIA</span>
                            </div>
                            <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--lp-text)' }}>Aumente sua exposição em Renda Fixa High Yield. Potencial de +2.5% vs CDI.</p>
                        </div>
                    </div>

                    {/* INSIGHTS */}
                    <div className="card-modern" style={{ padding: '2rem' }}>
                        <div className="card-accent-bar pink" />
                        <div className="card-bg-tint pink" />
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1.5rem' }}>
                            <div className="feature-icon-wrap" style={{ margin: 0, width: '40px', height: '40px', background: 'rgba(236, 72, 153, 0.1)', color: '#ec4899' }}><BrainCircuit size={20} /></div>
                            <h3 className="feature-title" style={{ margin: 0 }}>Smart Insights</h3>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <DemoInsightItem icon={<ShieldCheck size={18} />} title="Saldo Saudável" type="success" desc="Sua reserva de emergência cobriria 8 meses de custos." />
                            <DemoInsightItem icon={<TrendingDown size={18} />} title="Atenção" type="warning" desc="Gastos com delivery subiram 15% esta semana." />
                        </div>
                    </div>

                </div>

                <div style={{ textAlign: 'center', marginTop: '5rem', padding: '4rem', background: 'white', borderRadius: '32px', border: '1px solid var(--lp-border)', boxShadow: 'var(--shadow-card)', position: 'relative', overflow: 'hidden' }}>
                    <div className="card-accent-bar" />
                    <h2 className="section-title">Pronto para transformar sua realidade?</h2>
                    <p className="section-subtitle" style={{ marginBottom: '2.5rem' }}>Comece hoje mesmo a gerir seu patrimônio com a ferramenta usada pela elite financeira.</p>
                    <button onClick={() => navigate('/register')} className="btn-hero-primary" style={{ margin: '0 auto' }}>
                        Ativar meu acesso Premium
                        <ArrowRight size={20} />
                    </button>
                </div>
            </div>
        </div>
    );
};

const DemoStatCard = ({ label, value, trend, icon, trendColor, accent, tint }: any) => (
    <div className={`card-modern`} style={{ padding: '1.25rem' }}>
        <div className={`card-accent-bar ${accent}`} />
        {tint && <div className={`card-bg-tint ${tint}`} />}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
            <div style={{ color: 'var(--lp-text-muted)' }}>{icon}</div>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: trendColor, background: `${trendColor}10`, padding: '2px 8px', borderRadius: '100px' }}>{trend}</div>
        </div>
        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--lp-text-muted)', marginBottom: '2px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
        <div className="stat-value">{value}</div>
    </div>
);

const CategoryProgress = ({ label, value, color }: any) => (
    <div className="category-row">
        <div className="category-header">
            <span>{label}</span>
            <span>{value}%</span>
        </div>
        <div className="category-bar-bg">
            <div className="category-bar-fill" style={{ width: `${value}%`, background: color }}></div>
        </div>
    </div>
);

const DemoInsightItem = ({ icon, title, desc, type }: any) => (
    <div style={{ display: 'flex', gap: '1rem', padding: '1rem', borderRadius: '12px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
        <div style={{ color: type === 'success' ? '#10b981' : '#f59e0b', marginTop: '2px' }}>{icon}</div>
        <div>
            <div style={{ fontWeight: 700, fontSize: '0.9375rem', marginBottom: '2px' }}>{title}</div>
            <div style={{ fontSize: '0.8125rem', color: 'var(--lp-text-muted)', lineHeight: '1.4' }}>{desc}</div>
        </div>
    </div>
);

const DemoListItem = ({ label, date, val, type }: any) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 0', borderBottom: '1px solid var(--lp-border)' }}>
        <div>
            <div style={{ fontWeight: 700, fontSize: '0.875rem' }}>{label}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--lp-text-muted)' }}>{date}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
            <div style={{ fontWeight: 800, fontSize: '0.9375rem', color: type === 'income' ? '#10b981' : 'var(--lp-text)' }}>{val}</div>
            <div style={{ fontSize: '0.7rem', fontWeight: 700, color: type === 'pending' ? '#f59e0b' : (type === 'income' ? '#10b981' : '#f43f5e'), opacity: 0.8 }}>
                {type === 'pending' ? 'PENDENTE' : (type === 'income' ? 'RECEBIDO' : 'PAGO')}
            </div>
        </div>
    </div>
);

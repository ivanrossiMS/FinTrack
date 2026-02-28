import * as React from 'react';
import { Link } from 'react-router-dom';
import {
    Smartphone,
    Globe,
    ArrowRight,
    Gem,
    BarChart3,
    BrainCircuit,
    ShieldCheck,
    TrendingUp
} from 'lucide-react';
import './LandingPage.css';

const MockupUI = () => (
    <div className="ui-mockup">
        <div className="mockup-header">
            <div className="dot r" />
            <div className="dot y" />
            <div className="dot g" />
        </div>
        <div className="mockup-grid">
            <div className="mockup-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                    <div style={{ width: '40%', height: '10px', background: '#f1f5f9', borderRadius: '4px' }} />
                    <div style={{ width: '20%', height: '10px', background: '#e0e7ff', borderRadius: '4px' }} />
                </div>
                <div className="mockup-chart-row">
                    <div className="chart-bar" style={{ height: '40%' }} />
                    <div className="chart-bar active" style={{ height: '80%' }} />
                    <div className="chart-bar" style={{ height: '60%' }} />
                    <div className="chart-bar" style={{ height: '90%' }} />
                    <div className="chart-bar" style={{ height: '50%' }} />
                </div>
            </div>
            <div className="mockup-card">
                <div className="mockup-list-item">
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', width: '70%' }}>
                        <div className="item-circle" />
                        <div className="item-line" style={{ width: '60%' }} />
                    </div>
                    <div className="item-line" style={{ width: '20%' }} />
                </div>
                <div className="mockup-list-item" style={{ border: 0 }}>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', width: '70%' }}>
                        <div className="item-circle" style={{ background: '#e0e7ff' }} />
                        <div className="item-line" style={{ width: '40%' }} />
                    </div>
                    <div className="item-line" style={{ width: '25%' }} />
                </div>
            </div>
        </div>
    </div>
);

const FeatureCard = ({ icon, title, desc }: { icon: any, title: string, desc: string }) => (
    <div className="feature-card-elite">
        <div className="feature-icon-wrap">{icon}</div>
        <h3 className="feature-title">{title}</h3>
        <p className="feature-desc">{desc}</p>
    </div>
);

export const LandingPage: React.FC = () => {
    const [scrolled, setScrolled] = React.useState(false);

    React.useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return (
        <div className="landing-wrapper">
            <nav className={`landing-nav ${scrolled ? 'scrolled' : ''}`}>
                <div className="landing-container">
                    <Link to="/" className="landing-logo">
                        <div className="logo-icon-wrap">
                            <TrendingUp size={22} strokeWidth={3} />
                        </div>
                        <span className="logo-text">FinTrack</span>
                    </Link>

                    <div className="landing-nav-links">
                        <Link to="/" className="nav-link-item">Home</Link>
                        <Link to="/demo" className="nav-link-item">Demonstração</Link>
                        <Link to="/login" className="nav-link-item">Login</Link>
                        <Link to="/register" className="nav-btn-primary">Começar Agora</Link>
                    </div>
                </div>
            </nav>

            <header className="hero-section">
                <div className="landing-container">
                    <div className="hero-content">
                        <div className="badge-premium">
                            <Gem size={14} />
                            Gestão de Elite
                        </div>
                        <h1 className="hero-title">
                            Finanças sob <span className="gradient-text">Controle Absoluto</span>
                        </h1>
                        <p className="hero-subtitle">
                            A plataforma definitiva para quem busca clareza financeira,
                            automatização inteligente e o caminho real para a liberdade.
                        </p>
                        <div className="hero-actions">
                            <Link to="/register" className="btn-hero-primary">
                                Criar conta grátis
                                <ArrowRight size={20} />
                            </Link>
                            <Link to="/demo" className="btn-hero-secondary">
                                Ver demonstração
                            </Link>
                        </div>
                        <div className="hero-trust-bar">
                            <div className="trust-item"><ShieldCheck size={18} /> Dados Criptografados</div>
                            <div className="trust-item"><Globe size={18} /> Acesso Global</div>
                            <div className="trust-item"><Smartphone size={18} /> Multi-plataforma</div>
                        </div>
                    </div>

                    <div className="hero-visual">
                        <MockupUI />
                    </div>
                </div>
            </header>

            <section className="features-grid-section">
                <div className="landing-container">
                    <div className="section-header-center">
                        <h2 className="section-title">Tecnologia para sua Evolução</h2>
                        <p className="section-subtitle">Tudo o que você precisa para dominar seu patrimônio em um só lugar.</p>
                    </div>

                    <div className="features-grid">
                        <FeatureCard
                            icon={<BrainCircuit size={28} />}
                            title="Inteligência de Voice"
                            desc="Lance gastos e receitas apenas falando. Nossa IA processa e categoriza tudo instantaneamente."
                        />
                        <FeatureCard
                            icon={<BarChart3 size={28} />}
                            title="Dashboard de Elite"
                            desc="Visão clara de patrimônio, investimentos e fluxo de caixa com gráficos ultra-profissionais."
                        />
                        <FeatureCard
                            icon={<Gem size={28} />}
                            title="Modo Sonhos"
                            desc="Planeje metas e objetivos. Veja visualmente o quão perto você está de realizar seus sonhos."
                        />
                    </div>
                </div>
            </section>

            <section className="final-cta-section">
                <div className="landing-container">
                    <div className="cta-box">
                        <h2 className="cta-title">Sua jornada para a liberdade começa aqui.</h2>
                        <p className="cta-text">
                            Junte-se a milhares de pessoas que já transformaram sua relação com o dinheiro usando o FinTrack.
                        </p>
                        <Link to="/register" className="btn-cta-final">
                            Ativar meu acesso Premium
                        </Link>
                        <p className="cta-footer-note">Test drive gratuito por 7 dias. Sem compromisso.</p>
                    </div>
                </div>
            </section>

            <footer className="landing-footer">
                <div className="landing-container">
                    <div className="footer-grid">
                        <div className="footer-brand">
                            <div className="landing-logo">
                                <div className="logo-icon-wrap">
                                    <TrendingUp size={22} strokeWidth={3} />
                                </div>
                                <span className="logo-text">FinTrack</span>
                            </div>
                            <p className="footer-desc">
                                A tecnologia mais avançada aplicada à sua gestão financeira pessoal.
                            </p>
                        </div>
                        <div className="footer-links">
                            <div className="footer-link-group">
                                <h4>Produto</h4>
                                <Link to="/demo">Demo</Link>
                                <Link to="/features">Recursos</Link>
                            </div>
                            <div className="footer-link-group">
                                <h4>Legal</h4>
                                <Link to="/privacy">Privacidade</Link>
                                <Link to="/terms">Termos</Link>
                            </div>
                        </div>
                    </div>
                    <div className="footer-bottom">
                        <p>&copy; 2026 FinTrack Elite. Todos os direitos reservados.</p>
                    </div>
                </div>
            </footer>
        </div>
    );
};

import * as React from 'react';
import { Link } from 'react-router-dom';
import {
    Layout,
    PieChart,
    Smartphone,
    Lock,
    Globe,
    Calendar,
    ArrowRight,
    Gem,
    BarChart3,
    BrainCircuit,
    Mic
} from 'lucide-react';
import './LandingPage.css';
import heroImage from '../assets/hero-mockup.png';

export const LandingPage: React.FC = () => {
    return (
        <div className="landing-wrapper">
            {/* Header / Nav */}
            <nav className="landing-nav">
                <div className="landing-container">
                    <div className="landing-logo">
                        <div className="logo-icon-wrap">
                            <span className="logo-spark" />
                            <PieChart size={24} className="logo-icon-svg" />
                        </div>
                        <span className="logo-text">FinTrack</span>
                    </div>
                    <div className="landing-nav-links">
                        <Link to="/login" className="nav-link-item">Entrar</Link>
                        <Link to="/register" className="nav-btn-primary">Começar Grátis</Link>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <header className="hero-section">
                <div className="landing-container">
                    <div className="hero-content">
                        <div className="badge-premium pulse">
                            <CrownIcon size={14} />
                            <span>GESTÃO FINANCEIRA DE ELITE V2.0</span>
                        </div>
                        <h1 className="hero-title">
                            Seu <span className="gradient-text">Centro de Comando</span> para a Liberdade Financeira
                        </h1>
                        <p className="hero-subtitle">
                            O FinTrack não é apenas um gerenciador; é uma experiência premium desenhada para quem busca clareza, precisão e o próximo nível de controle sobre seu dinheiro.
                        </p>
                        <div className="hero-actions">
                            <Link to="/register" className="btn-hero-primary">
                                Criar conta grátis
                                <ArrowRight size={20} />
                            </Link>
                            <Link to="/login" className="btn-hero-secondary">
                                Entrar no sistema
                            </Link>
                            <Link to="/demo" className="btn-hero-tertiary">
                                Ver demonstração
                            </Link>
                        </div>
                        <div className="hero-trust-bar">
                            <div className="trust-item"><Lock size={16} /> <span>Segurança Bancária</span></div>
                            <div className="trust-item"><Globe size={16} /> <span>Cloud Sync Cloud</span></div>
                            <div className="trust-item"><Smartphone size={16} /> <span>PWA Mobile</span></div>
                        </div>
                    </div>
                    <div className="hero-visual">
                        <div className="mockup-full-wrapper animate-float">
                            <img src={heroImage} alt="FinTrack Elite Dashboard Mockup" className="hero-mockup-img" />
                            <div className="hero-glow-1" />
                            <div className="hero-glow-2" />
                        </div>
                    </div>
                </div>
            </header>

            {/* Problem / Solution */}
            <section className="solution-section">
                <div className="landing-container">
                    <div className="section-header-center">
                        <h2 className="section-title">Chega de planilhas complexas e desorganização</h2>
                        <p className="section-subtitle">O caos financeiro termina aqui. O FinTrack oferece uma interface elegante que transforma números em decisões inteligentes.</p>
                    </div>
                </div>
            </section>

            {/* Features Grid - What makes us unique */}
            <section className="features-grid-section">
                <div className="landing-container">
                    <div className="features-grid">
                        <FeatureCard
                            icon={<BrainCircuit size={32} />}
                            title="Assistente IA"
                            desc="Análise preditiva de saúde financeira e sugestões inteligentes de economia via IA."
                        />
                        <FeatureCard
                            icon={<Gem size={32} />}
                            title="Modo Realizar Sonhos"
                            desc="Gestão de economia focada em objetivos. Visualize seus sonhos se tornando reais."
                        />
                        <FeatureCard
                            icon={<BarChart3 size={32} />}
                            title="Investimentos"
                            desc="Acompanhe sua carteira global e o rendimento do seu patrimônio em um só lugar."
                        />
                        <FeatureCard
                            icon={<Layout size={32} />}
                            title="Dashboard Inteligente"
                            desc="Visão 360º da sua saúde financeira. Gráficos em tempo real e filtros dinâmicos."
                        />
                        <FeatureCard
                            icon={<Calendar size={32} />}
                            title="Compromissos"
                            desc="Gestão completa de contas a pagar e receber com status visual e controle de parcelas."
                        />
                        <FeatureCard
                            icon={<Mic size={32} />}
                            title="Comando de Voz IA"
                            desc="Adicione lançamentos e consulte saldos apenas falando. Agilidade total com voz."
                        />
                        <FeatureCard
                            icon={<Smartphone size={32} />}
                            title="Experiência Mobile"
                            desc="Instale o PWA e tenha o controle total no seu celular, como um app nativo."
                        />
                    </div>
                </div>
            </section>

            {/* Final CTA */}
            <section className="final-cta-section">
                <div className="landing-container">
                    <div className="cta-box">
                        <h2 className="cta-title">Pronto para elevar seu controle financeiro?</h2>
                        <p className="cta-text">Junte-se a centenas de usuários que já transformaram sua relação com o dinheiro.</p>
                        <Link to="/register" className="btn-cta-final">
                            Começar agora — É grátis
                        </Link>
                        <div className="cta-footer-note">Sem complicação. Bonito. Intuitivo.</div>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="landing-footer">
                <div className="landing-container">
                    <div className="footer-grid">
                        <div className="footer-brand">
                            <span className="logo-text">FinTrack</span>
                            <p className="footer-desc">Gestão financeira de elite para o mundo moderno.</p>
                        </div>
                        <div className="footer-links">
                            <Link to="/login">Entrar</Link>
                            <Link to="/register">Criar conta</Link>
                            <a href="#">Termos</a>
                            <a href="#">Privacidade</a>
                        </div>
                    </div>
                    <div className="footer-bottom">
                        <p>© {new Date().getFullYear()} FinTrack by Ivan Rossi. Todos direitos reservados.</p>
                    </div>
                </div>
            </footer>
        </div>
    );
};

// Sub-components for cleaner structure
const FeatureCard: React.FC<{ icon: React.ReactNode, title: string, desc: string }> = ({ icon, title, desc }) => (
    <div className="feature-card-elite">
        <div className="feature-icon-wrap">{icon}</div>
        <h3 className="feature-title">{title}</h3>
        <p className="feature-desc">{desc}</p>
    </div>
);

const CrownIcon = ({ size }: { size: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="m2 4 3 12h14l3-12-6 7-4-7-4 7-6-7z" />
        <path d="M12 17v4" />
        <path d="m9 21 3-2 3 2" />
    </svg>
);

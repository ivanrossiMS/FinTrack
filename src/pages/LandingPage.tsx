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
    TrendingUp,
    Receipt,
    PieChart,
    Lock,
    Zap
} from 'lucide-react';
import './LandingPage.css';
import HeroMockup from '../assets/hero-mockup-new.png';

const FeatureCard = ({ icon, title, desc, variant = 'blue' }: { icon: any, title: string, desc: string, variant?: string }) => (
    <div className="feature-card-elite">
        <div className={`card-accent-bar ${variant}`} />
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
                        <Link to="/" className="nav-link-item hide-mobile">Home</Link>
                        <Link to="/demo" className="nav-link-item hide-mobile">Demonstração</Link>
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
                        <img src={HeroMockup} alt="FinTrack Dashboard Elite" className="hero-mockup-img animate-float" />
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
                            title="Inteligência de Voz"
                            desc="Lance gastos e receitas apenas falando. Nossa IA processa e categoriza tudo instantaneamente."
                            variant="blue"
                        />
                        <FeatureCard
                            icon={<Zap size={28} />}
                            title="IA de Insights"
                            desc="Análise preditiva que sugere cortes e otimizações automáticas para acelerar sua riqueza."
                            variant="purple"
                        />
                        <FeatureCard
                            icon={<Receipt size={28} />}
                            title="Controle de Boletos"
                            desc="Gestão completa de compromissos e contas fixas. Nunca mais pague juros por atraso."
                            variant="orange"
                        />
                        <FeatureCard
                            icon={<BarChart3 size={28} />}
                            title="Dashboard de Elite"
                            desc="Visão clara de patrimônio e fluxo de caixa com gráficos ultra-profissionais e modernos."
                            variant="cyan"
                        />
                        <FeatureCard
                            icon={<Gem size={28} />}
                            title="Modo Sonhos"
                            desc="Planeje metas e objetivos. Veja visualmente o quão perto você está de realizar seus sonhos."
                            variant="pink"
                        />
                        <FeatureCard
                            icon={<PieChart size={28} />}
                            title="Relatórios Elite"
                            desc="Análises profundas por categoria e período. Entenda cada centavo da sua vida financeira."
                            variant="green"
                        />
                        <FeatureCard
                            icon={<Lock size={28} />}
                            title="Segurança Máxima"
                            desc="Seus dados protegidos por criptografia de ponta a ponta e rígidos controles de acesso."
                            variant="blue"
                        />
                        <FeatureCard
                            icon={<Globe size={28} />}
                            title="Acesso Global"
                            desc="Gerencie suas finanças de qualquer lugar do mundo, em qualquer dispositivo, a qualquer hora."
                            variant="cyan"
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

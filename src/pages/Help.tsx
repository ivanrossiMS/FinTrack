import React from 'react';
import { HelpCircle, Mic, DollarSign, Calendar, Target, ShieldCheck, Zap, Info, ArrowRight } from 'lucide-react';
import './Help.css';

export const Help: React.FC = () => {
    const aiCommands = [
        { cmd: '"50 pão"', desc: 'Modo Ninja: Registra R$ 50 como despesa de "Pão" instantaneamente.' },
        { cmd: '"Gastei 100 reais no mercado"', desc: 'Registro detalhado de despesa com categoria automática.' },
        { cmd: '"Recebi 2000 do salário"', desc: 'Registra uma nova receita.' },
        { cmd: '"Ir para relatórios"', desc: 'Navegação rápida por voz para qualquer página.' },
        { cmd: '"Qual meu saldo este mês?"', desc: 'Consulta financeira inteligente via IA.' },
        { cmd: '"Contas vencidas?"', desc: 'Verificação rápida de pendências.' },
    ];

    return (
        <div className="help-page">
            <div className="help-header">
                <div className="help-header-icon">
                    <HelpCircle size={40} />
                </div>
                <h1>Central de Ajuda</h1>
                <p>Aprenda a dominar o FinTrack e transformar sua vida financeira.</p>
            </div>

            <div className="help-grid">
                {/* Section: Getting Started */}
                <section className="help-card intro">
                    <div className="help-card-header">
                        <Zap className="icon-pulse" size={24} />
                        <h2>Guia Rápido</h2>
                    </div>
                    <div className="help-card-content">
                        <p>O FinTrack foi desenhado para ser intuitivo. Aqui estão os pilares:</p>
                        <ul>
                            <li><strong>Dashboard:</strong> Sua visão geral de saúde financeira.</li>
                            <li><strong>Lançamentos:</strong> Onde a mágica acontece. Registre tudo o que entra e sai.</li>
                            <li><strong>Filtros Inteligentes:</strong> Clique nos cards de Resumo (Receita/Despesa) para filtrar sua lista instantaneamente.</li>
                        </ul>
                    </div>
                </section>

                {/* Section: AI Assistant */}
                <section className="help-card ai-special">
                    <div className="help-card-header">
                        <Mic className="icon-float" size={24} />
                        <h2>Assistente IA Ninja</h2>
                    </div>
                    <div className="help-card-content">
                        <p>Nosso assistente de voz é o seu melhor amigo. Você pode ser direto:</p>
                        <div className="ai-commands-list">
                            {aiCommands.map((item, i) => (
                                <div key={i} className="ai-command-item">
                                    <code className="ai-code">{item.cmd}</code>
                                    <span className="ai-desc">{item.desc}</span>
                                </div>
                            ))}
                        </div>
                        <div className="ai-tip">
                            <Info size={16} />
                            <span><strong>Dica:</strong> Quanto mais você usa, mais a IA aprende suas categorias preferidas!</span>
                        </div>
                    </div>
                </section>

                {/* Section: Features */}
                <section className="help-card">
                    <div className="help-card-header">
                        <Calendar size={24} />
                        <h2>Compromissos</h2>
                    </div>
                    <div className="help-card-content">
                        <p>Não esqueça mais de pagar boletos. Use os <strong>Compromissos</strong> para agendar contas recorrentes ou únicas. O sistema te avisará quando estiverem próximas do vencimento.</p>
                    </div>
                </section>

                <section className="help-card">
                    <div className="help-card-header">
                        <Target size={24} />
                        <h2>Economia & Metas</h2>
                    </div>
                    <div className="help-card-content">
                        <p>Quer comprar um carro ou viajar? Defina suas metas na aba <strong>Economia</strong>. Acompanhe seu progresso e veja quanto falta para realizar seu sonho.</p>
                    </div>
                </section>

                <section className="help-card">
                    <div className="help-card-header">
                        <ShieldCheck size={24} />
                        <h2>Privacidade</h2>
                    </div>
                    <div className="help-card-content">
                        <p>Seus dados são criptografados e sua voz é processada de forma segura. Nós nunca vendemos seus dados para terceiros.</p>
                    </div>
                </section>
            </div>

            <footer className="help-footer">
                <p>Ainda tem dúvidas? Explore as outras seções ou contate o suporte.</p>
                <button className="help-contact-btn" onClick={() => window.location.href = 'mailto:suporte@fintrack.com'}>
                    Contatar Suporte <ArrowRight size={18} />
                </button>
            </footer>
        </div>
    );
};

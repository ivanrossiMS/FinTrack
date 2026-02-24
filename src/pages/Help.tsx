import React from 'react';
import { HelpCircle, Mic, DollarSign, Calendar, Target, ShieldCheck, Zap, Info, ArrowRight, TrendingUp } from 'lucide-react';
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
            <div className="help-hero">
                <div className="hero-content">
                    <div className="hero-visual">
                        <div className="glass-circle principal">
                            <HelpCircle size={80} strokeWidth={1} />
                        </div>
                        <div className="glass-circle float-1">
                            <DollarSign size={32} />
                        </div>
                        <div className="glass-circle float-2">
                            <Zap size={24} />
                        </div>
                        <div className="hero-mesh-blob"></div>
                    </div>
                    <h1>Central de Ajuda</h1>
                    <p className="hero-subtitle">Aprenda a dominar o <span>FinTrack</span> e transforme sua vida financeira com inteligência.</p>
                </div>
            </div>

            <div className="help-grid">
                {/* Section: Dashboard */}
                <section className="help-card">
                    <div className="help-card-header">
                        <Zap className="icon-pulse" size={24} />
                        <h2>Dashboard</h2>
                    </div>
                    <div className="help-card-content">
                        <p><strong>O que faz:</strong> Sua central de comando financeira para uma visão global e rápida.</p>
                        <p><strong>Como usar:</strong> Acompanhe o balanço geral e o gráfico de evolução mensal. Passe o mouse ou toque nas barras do gráfico para ver detalhes por categoria e identificar para onde seu dinheiro está indo.</p>
                    </div>
                </section>

                {/* Section: Transactions */}
                <section className="help-card">
                    <div className="help-card-header">
                        <DollarSign size={24} />
                        <h2>Lançamentos</h2>
                    </div>
                    <div className="help-card-content">
                        <p><strong>O que faz:</strong> O local onde você registra toda a sua movimentação financeira diária.</p>
                        <p><strong>Como usar:</strong> Clique no botão "+" para abrir o formulário. Preencha o valor, a descrição e selecione uma categoria. Você também pode anexar comprovantes e definir fornecedores.</p>
                    </div>
                </section>

                {/* Section: Quick Filters */}
                <section className="help-card">
                    <div className="help-card-header">
                        <Info size={24} />
                        <h2>Filtros Rápidos</h2>
                    </div>
                    <div className="help-card-content">
                        <p><strong>O que faz:</strong> Ferramenta de agilidade para visualizar fatias específicas das suas finanças.</p>
                        <p><strong>Como usar:</strong> Na tela de Lançamentos, clique nos cards coloridos de Resumo (Receita ou Despesa) para filtrar a lista instantaneamente. Clique novamente para limpar o filtro.</p>
                    </div>
                </section>

                {/* Section: AI Assistant */}
                <section className="help-card ai-special">
                    <div className="help-card-header">
                        <Mic className="icon-float" size={24} />
                        <h2>Assistente IA Ninja</h2>
                    </div>
                    <div className="help-card-content">
                        <p>O assistente de voz do FinTrack é seu melhor amigo. Você pode ser direto:</p>
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
                        <p><strong>O que faz:</strong> Gerencia suas contas futuras e recorrentes (boletos, assinaturas, aluguel).</p>
                        <p><strong>Como usar:</strong> Cadastre um novo compromisso selecionando a data de vencimento. O sistema mostra o status como <strong>Pendente</strong>. Quando pagar, basta clicar no ícone de confirmação para dar baixa e gerar um lançamento automático.</p>
                    </div>
                </section>

                <section className="help-card">
                    <div className="help-card-header">
                        <Target size={24} />
                        <h2>Economia & Metas</h2>
                    </div>
                    <div className="help-card-content">
                        <p><strong>O que faz:</strong> Planeja sonhos e reservas de emergência.</p>
                        <p><strong>Como usar:</strong> Defina um nome para sua meta e o valor que deseja alcançar. Conforme você economiza, registre os aportes para ver a barra de progresso subir até os 100%.</p>
                    </div>
                </section>

                <section className="help-card">
                    <div className="help-card-header">
                        <TrendingUp size={24} />
                        <h2>Investimentos</h2>
                    </div>
                    <div className="help-card-content">
                        <p><strong>O que faz:</strong> Acompanha o crescimento do seu patrimônio em ativos.</p>
                        <p><strong>Como usar:</strong> Registre seus aportes em renda fixa ou variável. O sistema consolida o valor total investido e mostra o rendimento histórico da sua carteira no gráfico de performance.</p>
                    </div>
                </section>

                <section className="help-card">
                    <div className="help-card-header">
                        <ShieldCheck size={24} />
                        <h2>Privacidade</h2>
                    </div>
                    <div className="help-card-content">
                        <p>Seus dados no FinTrack são criptografados e sua voz é processada de forma segura. Nós nunca vendemos seus dados para terceiros.</p>
                    </div>
                </section>
            </div>

            <footer className="help-footer">
                <p>Ainda tem dúvidas? Explore as outras seções ou contate o suporte.</p>
                <button className="help-contact-btn" onClick={() => window.location.href = 'mailto:suporte@financeplus.com'}>
                    Contatar Suporte <ArrowRight size={18} />
                </button>
            </footer>
        </div>
    );
};

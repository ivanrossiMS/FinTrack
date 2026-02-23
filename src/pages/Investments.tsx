import React, { useMemo, useState, useEffect } from 'react';
import { useData } from '../contexts/DataContext';
import { formatCurrency } from '../utils/format';
import { Card } from '../components/ui/Card';
import { TrendingUp, ShieldCheck, Zap, Briefcase, ExternalLink, Info, ArrowRight, Sparkles, RefreshCw, DollarSign, Coins } from 'lucide-react';
import { addDays, isBefore, isAfter, endOfDay, subDays } from 'date-fns';
import { Transaction, Commitment } from '../models/types';
import { getInvestmentRecommendations, InvestmentRecommendation } from '../utils/geminiAI';
import './Investments.css';

export const Investments: React.FC = () => {
    const { data } = useData();
    const [aiRecs, setAiRecs] = useState<InvestmentRecommendation[]>([]);
    const [isLoadingRecs, setIsLoadingRecs] = useState(false);
    const [exchangeRates, setExchangeRates] = useState<any>(null);
    const [isLoadingRates, setIsLoadingRates] = useState(false);

    // Reusable logic for Idle Capital
    const insight = useMemo(() => {
        const totalBalance = data.transactions.reduce((acc: number, tx: Transaction) => {
            return tx.type === 'INCOME' ? acc + tx.amount : acc - tx.amount;
        }, 0);

        const now = new Date();
        const futureLimit = addDays(now, 15);

        const upcomingCommitmentsTotal = (data.commitments || [])
            .filter((c: Commitment) => c.status === 'PENDING')
            .filter((c: Commitment) => {
                const dueDate = new Date(c.dueDate);
                return isAfter(dueDate, subDays(now, 1)) && isBefore(dueDate, endOfDay(futureLimit));
            })
            .reduce((acc: number, c: Commitment) => acc + c.amount, 0);

        const availableCapital = Math.max(0, totalBalance - upcomingCommitmentsTotal);

        const annualRate = 0.1075;
        const dailyRate = Math.pow(1 + annualRate, 1 / 365) - 1;
        const dailyYield = availableCapital * dailyRate;

        return {
            balance: totalBalance,
            commitments: upcomingCommitmentsTotal,
            available: availableCapital,
            dailyYield: dailyYield
        };
    }, [data.transactions, data.commitments]);

    useEffect(() => {
        const fetchRecs = async () => {
            if (insight.available > 0) {
                setIsLoadingRecs(true);
                const recs = await getInvestmentRecommendations(insight.available);
                setAiRecs(recs);
                setIsLoadingRecs(false);
            }
        };
        fetchRecs();
    }, [insight.available]);

    useEffect(() => {
        const fetchRates = async () => {
            setIsLoadingRates(true);
            try {
                // Using a free API for demonstration (ExchangeRate-API or similar)
                // In production, we'd use a more robust or managed provider.
                const response = await fetch('https://open.er-api.com/v6/latest/BRL');
                const result = await response.json();
                if (result.rates) {
                    setExchangeRates(result.rates);
                }
            } catch (err) {
                console.error('Rates error:', err);
            } finally {
                setIsLoadingRates(false);
            }
        };
        fetchRates();
    }, []);

    const CurrencyCard = () => {
        if (!exchangeRates) return null;

        const mainRates = [
            { code: 'USD', name: 'Dólar Americano', rate: 1 / exchangeRates.USD, icon: <DollarSign size={20} /> },
            { code: 'EUR', name: 'Euro', rate: 1 / exchangeRates.EUR, icon: <Coins size={20} /> },
            { code: 'BTC', name: 'Bitcoin (USD)', rate: (1 / exchangeRates.USD) * (1 / (exchangeRates.BTC || 0.00001)), icon: <Zap size={20} /> },
        ];

        return (
            <Card className="inv-currency-card">
                <div className="inv-currency-header">
                    <h4 className="inv-currency-title">Conversão em Tempo Real</h4>
                    <RefreshCw size={14} className={isLoadingRates ? 'animate-spin' : ''} />
                </div>
                <div className="inv-currency-grid">
                    {mainRates.map(curr => (
                        <div key={curr.code} className="inv-currency-item">
                            <div className="inv-curr-info">
                                <div className="inv-curr-icon-box">{curr.icon}</div>
                                <div>
                                    <p className="inv-curr-code">{curr.code} / BRL</p>
                                    <p className="inv-curr-name">{curr.name}</p>
                                </div>
                            </div>
                            <div className="inv-curr-value">
                                {curr.code === 'BTC'
                                    ? `R$ ${curr.rate.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`
                                    : `R$ ${curr.rate.toLocaleString('pt-BR', { minimumFractionDigits: 3, maximumFractionDigits: 3 })}`}
                            </div>
                        </div>
                    ))}
                </div>
            </Card>
        );
    };

    const brokerages = [
        { name: 'BTG Pactual', url: 'https://www.btgpactual.com/', color: '#002B49', desc: 'Melhor banco de investimentos da América Latina.' },
        { name: 'XP Investimentos', url: 'https://www.xpi.com.br/', color: '#FFD700', desc: 'Líder em assessoria e variedade de produtos.', textColor: '#000' },
        { name: 'NuInvest', url: 'https://www.nuinvest.com.br/', color: '#8A05BE', desc: 'Simplicidade e integração com o ecossistema Nubank.' },
        { name: 'Inter Invest', url: 'https://www.bancointer.com.br/investimentos/', color: '#FF7A00', desc: 'Taxa zero e plataforma completa no Super App.' },
    ];

    return (
        <div className="inv-page">
            <header className="inv-header">
                <div className="inv-header-top">
                    <div className="inv-icon-box">
                        <TrendingUp size={24} />
                    </div>
                    <div>
                        <h2 className="text-4xl font-black text-text tracking-tighter">Portal de Investimentos</h2>
                        <p className="text-text-muted font-semibold text-lg opacity-80">Maximize seu capital com estratégia e inteligência.</p>
                    </div>
                </div>
            </header>

            {/* AI Summary Card */}
            <div className="inv-ai-card">
                <div className="inv-ai-content">
                    <div className="inv-ai-tag-row">
                        <Sparkles size={20} className="text-emerald-400" />
                        <span className="inv-ai-tag-label">INTELIGÊNCIA DE ALOCAÇÃO</span>
                    </div>

                    <div className="inv-ai-stats-grid">
                        <div>
                            <p className="inv-stat-label">Capital Parado Identificado</p>
                            <h3 className="inv-stat-value-large">{formatCurrency(insight.available)}</h3>
                        </div>
                        <div className="inv-stat-col-sep">
                            <p className="inv-stat-label">Potencial de Rendimento</p>
                            <h3 className="inv-stat-value-md">+ {formatCurrency(insight.dailyYield)} <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>/ dia</span></h3>
                            <p style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '0.5rem' }}>Calculado sobre CDI 100% (~10.75% a.a.)</p>
                        </div>
                    </div>

                    <div className="inv-ai-info-box">
                        <Info size={20} className="text-blue-400" />
                        <p className="inv-ai-info-text">
                            Este valor considera seu saldo atual de {formatCurrency(insight.balance)} menos os
                            compromissos registrados para os próximos 15 dias ({formatCurrency(insight.commitments)}).
                        </p>
                    </div>
                </div>

                {/* Aesthetic Background Orbs */}
                <div className="inv-bg-orb-1" />
                <div className="inv-bg-orb-2" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Investment Tiers */}
                <div className="lg:col-span-2 space-y-6">
                    <h3 className="inv-section-title">
                        Categorias Recomendadas <ArrowRight size={20} className="text-primary" />
                    </h3>

                    <div className="inv-tiers-grid">
                        {isLoadingRecs ? (
                            <div className="inv-loading-box">
                                <Sparkles className="animate-spin text-emerald-500" />
                                <p>Gerando estratégia personalizada...</p>
                            </div>
                        ) : aiRecs.length > 0 ? (
                            aiRecs.map((rec, idx) => (
                                <Card key={idx} className="inv-card-compact inv-ai-rec-card">
                                    <div className="inv-card-flex">
                                        <div className={`inv-tier-icon ${rec.riskLevel.toLowerCase()}`}>
                                            {rec.riskLevel === 'HIGH' ? <Zap size={24} /> :
                                                rec.riskLevel === 'MEDIUM' ? <Briefcase size={24} /> :
                                                    <ShieldCheck size={24} />}
                                        </div>
                                        <div className="w-full">
                                            <div className="flex justify-between items-center mb-1">
                                                <h4 className="inv-tier-title">{rec.title}</h4>
                                                <span className="inv-rec-allocation">{rec.allocation}</span>
                                            </div>
                                            <p className="inv-tier-desc">{rec.description}</p>
                                            <div className="inv-rec-products">
                                                {rec.products.map(p => (
                                                    <span key={p} className="inv-product-tag">{p}</span>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </Card>
                            ))
                        ) : (
                            <>
                                <Card className="inv-card-compact">
                                    <div className="inv-card-flex">
                                        <div className="inv-tier-icon reserva">
                                            <Zap size={24} />
                                        </div>
                                        <div>
                                            <h4 className="inv-tier-title">Reserva / Liquidez</h4>
                                            <p className="inv-tier-desc">
                                                Ideal para o capital parado de curto prazo. Foco em segurança e disponibilidade imediata.
                                            </p>
                                            <ul className="inv-tier-list">
                                                <li className="inv-tier-list-item">
                                                    <ShieldCheck size={14} className="text-emerald-500" /> Tesouro Selic
                                                </li>
                                                <li className="inv-tier-list-item">
                                                    <ShieldCheck size={14} className="text-emerald-500" /> CDB 100% CDI
                                                </li>
                                            </ul>
                                        </div>
                                    </div>
                                </Card>

                                <Card className="inv-card-compact">
                                    <div className="inv-card-flex">
                                        <div className="inv-tier-icon growth">
                                            <Briefcase size={24} />
                                        </div>
                                        <div>
                                            <h4 className="inv-tier-title">Crescimento / Médio Prazo</h4>
                                            <p className="inv-tier-desc">
                                                Para planos de 1 a 3 anos. Isenção de IR e taxas mais atrativas que o CDI básico.
                                            </p>
                                            <ul className="inv-tier-list">
                                                <li className="inv-tier-list-item">
                                                    <ShieldCheck size={14} className="text-blue-500" /> LCI / LCA
                                                </li>
                                                <li className="inv-tier-list-item">
                                                    <ShieldCheck size={14} className="text-blue-500" /> CDB Pré-fixado
                                                </li>
                                            </ul>
                                        </div>
                                    </div>
                                </Card>
                            </>
                        )}
                    </div>
                </div>

                {/* Sidebar */}
                <div>
                    <h3 className="inv-section-title">Câmbio e Moedas</h3>
                    <CurrencyCard />

                    <h3 className="inv-section-title" style={{ marginTop: '2.5rem' }}>Canais Oficiais</h3>
                    <div className="inv-broker-list">
                        {brokerages.map(broker => (
                            <a
                                key={broker.name}
                                href={broker.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inv-broker-card"
                            >
                                <div className="inv-broker-logo" style={{ background: broker.color, color: broker.textColor || 'white' }}>
                                    {broker.name.charAt(0)}
                                </div>
                                <div className="inv-broker-info">
                                    <div className="inv-broker-name-row">
                                        <span className="inv-broker-name">{broker.name}</span>
                                        <ExternalLink size={12} className="text-slate-400" />
                                    </div>
                                    <p className="inv-broker-desc">{broker.desc}</p>
                                </div>
                            </a>
                        ))}
                    </div>

                    <div className="inv-disclaimer">
                        <p className="inv-disclaimer-text">
                            <strong>Isenção de Responsabilidade:</strong> As sugestões acima são baseadas em cálculos matemáticos de liquidez e não constituem recomendação oficial de investimento.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

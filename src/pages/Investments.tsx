import * as React from 'react';
import { useMemo } from 'react';
import { useData } from '../contexts/DataContext';
import { formatCurrency } from '../utils/format';
import { Card } from '../components/ui/Card';
import { TrendingUp, ShieldCheck, Zap, Briefcase, ExternalLink, Info, ArrowRight, Sparkles } from 'lucide-react';
import { addDays, isBefore, isAfter, endOfDay, subDays } from 'date-fns';

export const Investments: React.FC = () => {
    const { data } = useData();

    // Reusable logic for Idle Capital
    const insight = useMemo(() => {
        const totalBalance = data.transactions.reduce((acc, tx) => {
            return tx.type === 'INCOME' ? acc + tx.amount : acc - tx.amount;
        }, 0);

        const now = new Date();
        const futureLimit = addDays(now, 15);

        const upcomingCommitmentsTotal = (data.commitments || [])
            .filter(c => c.status === 'PENDING')
            .filter(c => {
                const dueDate = new Date(c.dueDate);
                return isAfter(dueDate, subDays(now, 1)) && isBefore(dueDate, endOfDay(futureLimit));
            })
            .reduce((acc, c) => acc + c.amount, 0);

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

    const brokerages = [
        { name: 'BTG Pactual', url: 'https://www.btgpactual.com/', color: '#002B49', desc: 'Melhor banco de investimentos da América Latina.' },
        { name: 'XP Investimentos', url: 'https://www.xpi.com.br/', color: '#FFD700', desc: 'Líder em assessoria e variedade de produtos.', textColor: '#000' },
        { name: 'NuInvest', url: 'https://www.nuinvest.com.br/', color: '#8A05BE', desc: 'Simplicidade e integração com o ecossistema Nubank.' },
        { name: 'Inter Invest', url: 'https://www.bancointer.com.br/investimentos/', color: '#FF7A00', desc: 'Taxa zero e plataforma completa no Super App.' },
    ];

    return (
        <div className="investments-container" style={{ paddingBottom: '4rem' }}>
            <header style={{ marginBottom: '2.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
                    <div style={{
                        width: '48px', height: '48px', borderRadius: '16px',
                        background: 'linear-gradient(135deg, #10b981, #3b82f6)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white'
                    }}>
                        <TrendingUp size={24} />
                    </div>
                    <div>
                        <h2 className="text-4xl font-black text-text tracking-tighter">Portal de Investimentos</h2>
                        <p className="text-text-muted font-semibold text-lg opacity-80">Maximize seu capital com estratégia e inteligência.</p>
                    </div>
                </div>
            </header>

            {/* AI Summary Card */}
            <div style={{
                background: 'linear-gradient(135deg, #1e293b, #0f172a)',
                borderRadius: '28px',
                padding: '2.5rem',
                color: 'white',
                marginBottom: '3rem',
                position: 'relative',
                overflow: 'hidden',
                boxShadow: '0 20px 40px -12px rgba(15, 23, 42, 0.3)'
            }}>
                <div style={{ position: 'relative', zIndex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                        <Sparkles size={20} className="text-emerald-400" />
                        <span style={{ fontSize: '0.75rem', fontWeight: 800, letterSpacing: '0.1em', color: '#94a3b8' }}>INTELIGÊNCIA DE ALOCAÇÃO</span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '2rem' }}>
                        <div>
                            <p style={{ fontSize: '0.85rem', color: '#94a3b8', fontWeight: 600, marginBottom: '0.5rem' }}>Capital Parado Identificado</p>
                            <h3 style={{ fontSize: '2.5rem', fontWeight: 900, letterSpacing: '-0.04em' }}>{formatCurrency(insight.available)}</h3>
                        </div>
                        <div style={{ borderLeft: '1px solid rgba(255,255,255,0.1)', paddingLeft: '2rem' }}>
                            <p style={{ fontSize: '0.85rem', color: '#94a3b8', fontWeight: 600, marginBottom: '0.5rem' }}>Potencial de Rendimento</p>
                            <h3 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#10b981' }}>+ {formatCurrency(insight.dailyYield)} <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>/ dia</span></h3>
                            <p style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '0.5rem' }}>Calculado sobre CDI 100% (~10.75% a.a.)</p>
                        </div>
                    </div>

                    <div style={{
                        marginTop: '2rem', padding: '1.25rem', borderRadius: '18px',
                        background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)',
                        display: 'flex', alignItems: 'center', gap: '1rem'
                    }}>
                        <Info size={20} className="text-blue-400" />
                        <p style={{ fontSize: '0.85rem', color: '#cbd5e1', lineHeight: 1.6 }}>
                            Este valor considera seu saldo atual de {formatCurrency(insight.balance)} menos os
                            compromissos registrados para os próximos 15 dias ({formatCurrency(insight.commitments)}).
                        </p>
                    </div>
                </div>

                {/* Aesthetic Background Orbs */}
                <div style={{ position: 'absolute', top: '-50px', right: '-50px', width: '200px', height: '200px', background: 'rgba(16, 185, 129, 0.1)', filter: 'blur(80px)', borderRadius: '100%' }} />
                <div style={{ position: 'absolute', bottom: '-50px', left: '20%', width: '150px', height: '150px', background: 'rgba(59, 130, 246, 0.1)', filter: 'blur(60px)', borderRadius: '100%' }} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Investment Tiers */}
                <div className="lg:col-span-2 space-y-6">
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1e293b', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        Categorias Recomendadas <ArrowRight size={20} className="text-primary" />
                    </h3>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
                        <Card style={{ padding: '1.5rem', border: '1px solid #e2e8f0' }}>
                            <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                                <div style={{ padding: '0.75rem', borderRadius: '14px', background: '#f0fdf4', color: '#10b981' }}>
                                    <Zap size={24} />
                                </div>
                                <div>
                                    <h4 style={{ margin: '0 0 0.5rem 0', fontWeight: 800, fontSize: '1.1rem' }}>Reserva / Liquidez</h4>
                                    <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b', lineHeight: 1.5 }}>
                                        Ideal para o capital parado de curto prazo. Foco em segurança e disponibilidade imediata.
                                    </p>
                                    <ul style={{ margin: '1rem 0 0 0', padding: 0, listStyle: 'none', fontSize: '0.8rem', fontWeight: 700, color: '#475569' }}>
                                        <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
                                            <ShieldCheck size={14} className="text-emerald-500" /> Tesouro Selic
                                        </li>
                                        <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <ShieldCheck size={14} className="text-emerald-500" /> CDB 100% CDI
                                        </li>
                                    </ul>
                                </div>
                            </div>
                        </Card>

                        <Card style={{ padding: '1.5rem', border: '1px solid #e2e8f0' }}>
                            <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                                <div style={{ padding: '0.75rem', borderRadius: '14px', background: '#eff6ff', color: '#3b82f6' }}>
                                    <Briefcase size={24} />
                                </div>
                                <div>
                                    <h4 style={{ margin: '0 0 0.5rem 0', fontWeight: 800, fontSize: '1.1rem' }}>Crescimento / Médio Prazo</h4>
                                    <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b', lineHeight: 1.5 }}>
                                        Para planos de 1 a 3 anos. Isenção de IR e taxas mais atrativas que o CDI básico.
                                    </p>
                                    <ul style={{ margin: '1rem 0 0 0', padding: 0, listStyle: 'none', fontSize: '0.8rem', fontWeight: 700, color: '#475569' }}>
                                        <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
                                            <ShieldCheck size={14} className="text-blue-500" /> LCI / LCA
                                        </li>
                                        <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <ShieldCheck size={14} className="text-blue-500" /> CDB Pré-fixado
                                        </li>
                                    </ul>
                                </div>
                            </div>
                        </Card>
                    </div>
                </div>

                {/* Brokerage Links */}
                <div>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1e293b', marginBottom: '1.5rem' }}>Canais Oficiais</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {brokerages.map(broker => (
                            <a
                                key={broker.name}
                                href={broker.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem',
                                    borderRadius: '18px', background: 'white', border: '1px solid #e2e8f0',
                                    textDecoration: 'none', transition: 'all 0.2s ease'
                                }}
                                onMouseEnter={e => {
                                    e.currentTarget.style.transform = 'translateY(-2px)';
                                    e.currentTarget.style.boxShadow = '0 10px 20px -8px rgba(0,0,0,0.1)';
                                }}
                                onMouseLeave={e => {
                                    e.currentTarget.style.transform = 'none';
                                    e.currentTarget.style.boxShadow = 'none';
                                }}
                            >
                                <div style={{
                                    width: '44px', height: '44px', borderRadius: '12px',
                                    background: broker.color, color: broker.textColor || 'white',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: '0.9rem', fontWeight: 900
                                }}>
                                    {broker.name.charAt(0)}
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                        <span style={{ fontWeight: 800, color: '#1e293b', fontSize: '0.9rem' }}>{broker.name}</span>
                                        <ExternalLink size={12} className="text-slate-400" />
                                    </div>
                                    <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b', fontWeight: 500 }}>{broker.desc}</p>
                                </div>
                            </a>
                        ))}
                    </div>

                    <div style={{ marginTop: '2rem', padding: '1.25rem', borderRadius: '18px', background: '#f8fafc', border: '1px dashed #e2e8f0' }}>
                        <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b', fontWeight: 600, lineHeight: 1.5 }}>
                            <strong>Isenção de Responsabilidade:</strong> As sugestões acima são baseadas em cálculos matemáticos de liquidez e não constituem recomendação oficial de investimento.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

import * as React from 'react';
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../../contexts/DataContext';
import { formatCurrency } from '../../utils/format';
import { Sparkles, TrendingUp, ArrowRight, Info } from 'lucide-react';
import { addDays, isBefore, isAfter, endOfDay } from 'date-fns';

export const AICapitalAllocation: React.FC = () => {
    const { data } = useData();
    const navigate = useNavigate();

    const insight = useMemo(() => {
        // 1. Calculate Current Balance
        const totalBalance = data.transactions.reduce((acc, tx) => {
            return tx.type === 'INCOME' ? acc + tx.amount : acc - tx.amount;
        }, 0);

        if (totalBalance <= 0) return null;

        // 2. Calculate Commitments for the next 15 days
        const now = new Date();
        const futureLimit = addDays(now, 15);

        const upcomingCommitmentsTotal = (data.commitments || [])
            .filter(c => c.status === 'PENDING')
            .filter(c => {
                const dueDate = new Date(c.dueDate);
                return isAfter(dueDate, subDays(now, 1)) && isBefore(dueDate, endOfDay(futureLimit));
            })
            .reduce((acc, c) => acc + c.amount, 0);

        // 3. Calculate Available Capital
        const availableCapital = Math.max(0, totalBalance - upcomingCommitmentsTotal);

        if (availableCapital < 100) return null; // Only show if significant (> R$ 100)

        // 4. Calculate Yield (CDI ~10.75% per year)
        // Daily rate approximate: (1 + 0.1075)^(1/365) - 1
        const annualRate = 0.1075;
        const dailyRate = Math.pow(1 + annualRate, 1 / 365) - 1;
        const dailyYield = availableCapital * dailyRate;

        return {
            available: availableCapital,
            dailyYield: dailyYield,
            formattedAvailable: formatCurrency(availableCapital),
            formattedYield: formatCurrency(dailyYield)
        };
    }, [data.transactions, data.commitments]);

    if (!insight) return null;

    return (
        <div style={{
            background: 'rgba(255, 255, 255, 0.45)',
            backdropFilter: 'blur(20px) saturate(180%)',
            WebkitBackdropFilter: 'blur(20px) saturate(180%)',
            borderRadius: '24px',
            padding: '1.5rem',
            border: '1px solid rgba(255, 255, 255, 0.5)',
            boxShadow: '0 10px 30px -10px rgba(99, 102, 241, 0.15)',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem',
            position: 'relative',
            overflow: 'hidden',
        }}>
            {/* Neural Backdrop Glow */}
            <div style={{
                position: 'absolute',
                top: '-20%',
                right: '-10%',
                width: '150px',
                height: '150px',
                background: 'rgba(99, 102, 241, 0.15)',
                filter: 'blur(50px)',
                borderRadius: 'full',
                zIndex: 0
            }} />

            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', position: 'relative', zIndex: 1 }}>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                    <div style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: '14px',
                        background: 'linear-gradient(135deg, #6366f1, #a855f7)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        boxShadow: '0 8px 16px -4px rgba(99, 102, 241, 0.3)'
                    }}>
                        <Sparkles size={20} />
                    </div>
                    <div>
                        <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#1e293b', letterSpacing: '-0.02em' }}>
                            Alocação de Capital (IA)
                        </h4>
                        <span style={{ fontSize: '0.7rem', color: '#6366f1', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            Otimização de Liquidez
                        </span>
                    </div>
                </div>
                <div style={{
                    padding: '0.4rem 0.8rem',
                    borderRadius: '10px',
                    background: 'rgba(99, 102, 241, 0.08)',
                    color: '#6366f1',
                    fontSize: '0.7rem',
                    fontWeight: 800,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem'
                }}>
                    <TrendingUp size={14} /> NOVO
                </div>
            </div>

            <div style={{ position: 'relative', zIndex: 1, padding: '0.5rem 0' }}>
                <p style={{
                    margin: 0,
                    fontSize: '1rem',
                    fontWeight: 600,
                    color: '#334155',
                    lineHeight: 1.5,
                    letterSpacing: '-0.01em'
                }}>
                    Você tem <strong style={{ color: '#1e293b', fontWeight: 800 }}>{insight.formattedAvailable}</strong> parados que não serão usados nos próximos 15 dias.
                </p>
                <div style={{
                    marginTop: '1rem',
                    padding: '1rem',
                    background: 'rgba(255, 255, 255, 0.5)',
                    borderRadius: '16px',
                    border: '1px solid rgba(99, 102, 241, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                }}>
                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                        <div style={{ color: '#10b981', background: '#10b98110', padding: '0.5rem', borderRadius: '10px' }}>
                            <TrendingUp size={20} />
                        </div>
                        <div>
                            <p style={{ margin: 0, fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>Rendimento sugerido</p>
                            <p style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#10b981' }}>{insight.formattedYield} <span style={{ fontSize: '0.65rem', color: '#64748b', opacity: 0.8 }}>/ dia</span></p>
                        </div>
                    </div>
                    <button style={{
                        background: '#1e293b',
                        color: 'white',
                        border: 'none',
                        padding: '0.6rem 1rem',
                        borderRadius: '12px',
                        fontSize: '0.75rem',
                        fontWeight: 800,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                    }}
                        onMouseEnter={e => {
                            e.currentTarget.style.transform = 'translateX(4px)';
                            e.currentTarget.style.background = '#0f172a';
                        }}
                        onMouseLeave={e => {
                            e.currentTarget.style.transform = 'none';
                            e.currentTarget.style.background = '#1e293b';
                        }}
                        onClick={() => navigate('/savings')}
                    >
                        Investir <ArrowRight size={14} />
                    </button>
                </div>
            </div>

            <div style={{
                fontSize: '0.65rem',
                color: '#94a3b8',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                paddingTop: '0.5rem',
                borderTop: '1px solid rgba(226, 232, 240, 0.5)'
            }}>
                <Info size={12} />
                Cálculo baseado na taxa CDI atual (~10.75% a.a.) descontando compromissos de curto prazo.
            </div>
        </div>
    );
};

// Help sub-function (to be imported if needed)
function subDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() - days);
    return result;
}

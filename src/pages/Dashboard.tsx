import * as React from 'react';
import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { useData } from '../contexts/DataContext';
import { calculateStats, getDailyBalance, getCategoryExpenses } from '../utils/statistics';
import { startOfMonth, subDays, startOfDay, endOfDay, format, parseISO } from 'date-fns';
import { formatCurrency, formatDate } from '../utils/format';
import { BalanceChart } from '../components/charts/BalanceChart';
import { ExpensesPieChart } from '../components/charts/ExpensesPieChart';
import { InsightsCard } from '../components/charts/InsightsCard';
import { AICapitalAllocation } from '../components/dashboard/AICapitalAllocation';
import { ArrowUpCircle, ArrowDownCircle, Wallet, AlertCircle, Calendar, Clock } from 'lucide-react';
import './Dashboard.css';

type Period = 'today' | 'week' | 'month' | 'custom';

export const Dashboard: React.FC = () => {
    const { data } = useData();
    const navigate = useNavigate();
    const [period, setPeriod] = useState<Period>('month');
    const [customStart, setCustomStart] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
    const [customEnd, setCustomEnd] = useState(format(endOfDay(new Date()), 'yyyy-MM-dd'));

    const dateRange = useMemo(() => {
        const now = new Date();
        switch (period) {
            case 'today':
                return { start: startOfDay(now), end: endOfDay(now) };
            case 'week':
                return { start: subDays(now, 7), end: endOfDay(now) };
            case 'custom':
                return {
                    start: startOfDay(parseISO(customStart)),
                    end: endOfDay(parseISO(customEnd))
                };
            case 'month':
            default:
                return { start: startOfMonth(now), end: endOfDay(now) };
        }
    }, [period, customStart, customEnd]);

    const stats = useMemo(() =>
        calculateStats(data.transactions, dateRange.start, dateRange.end),
        [data.transactions, dateRange]
    );

    const dailyBalance = useMemo(() =>
        getDailyBalance(data.transactions, dateRange.start, dateRange.end),
        [data.transactions, dateRange]
    );

    const categoryExpenses = useMemo(() =>
        getCategoryExpenses(data.transactions, data.categories, dateRange.start, dateRange.end),
        [data.transactions, data.categories, dateRange]
    );



    const handleCategoryClick = (categoryId: string) => {
        navigate('/transactions', { state: { categoryId } });
    };

    return (
        <div className="dashboard-container">
            {/* Page Header */}
            <header className="dashboard-header">
                <div>
                    <h2 className="text-4xl font-black text-text tracking-tighter mb-2">Dashboard</h2>
                    <p className="text-text-muted font-semibold text-lg opacity-80">
                        Bem-vindo ao seu centro de comando financeiro.
                    </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 items-center w-full lg:w-auto">
                    <div className="range-selector">
                        {(['today', 'week', 'month', 'custom'] as Period[]).map(p => (
                            <button
                                key={p}
                                onClick={() => setPeriod(p)}
                                className={`seg-btn ${period === p ? 'active' : ''}`}
                            >
                                {p === 'today' ? 'Hoje' : p === 'week' ? '7 Dias' : p === 'month' ? 'Mês' : 'Personalizado'}
                            </button>
                        ))}
                    </div>

                    {period === 'custom' && (
                        <div className="custom-range-picker">
                            <Calendar size={18} className="text-primary" />
                            <div className="date-inputs">
                                <div className="date-input-group">
                                    <span className="date-input-label">De</span>
                                    <input
                                        type="date"
                                        value={customStart}
                                        onChange={e => setCustomStart(e.target.value)}
                                        className="date-field"
                                    />
                                </div>
                                <div className="date-input-separator">/</div>
                                <div className="date-input-group">
                                    <span className="date-input-label">Até</span>
                                    <input
                                        type="date"
                                        value={customEnd}
                                        onChange={e => setCustomEnd(e.target.value)}
                                        className="date-field"
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </header>

            {/* Premium KPI Section */}
            <div className="kpi-grid">
                <Card className="kpi-card card-balance col-span-12 sm:col-span-12 lg:col-span-4" onClick={() => navigate('/transactions')} style={{ cursor: 'pointer' }}>
                    <div className="kpi-icon-wrapper">
                        <Wallet size={32} strokeWidth={2.5} />
                    </div>
                    <div>
                        <p className="kpi-label">Saldo Total do Período</p>
                        <p className="kpi-value">
                            {formatCurrency(stats.balance)}
                        </p>
                    </div>
                </Card>

                <Card className="kpi-card card-income col-span-6 lg:col-span-4" onClick={() => navigate('/transactions', { state: { type: 'INCOME' } })} style={{ cursor: 'pointer' }}>
                    <div className="kpi-icon-wrapper">
                        <ArrowUpCircle size={32} strokeWidth={2.5} />
                    </div>
                    <div>
                        <p className="kpi-label">Total de Receitas</p>
                        <p className="kpi-value">
                            {formatCurrency(stats.income)}
                        </p>
                    </div>
                </Card>

                <Card className="kpi-card card-expense col-span-6 lg:col-span-4" onClick={() => navigate('/transactions', { state: { type: 'EXPENSE' } })} style={{ cursor: 'pointer' }}>
                    <div className="kpi-icon-wrapper">
                        <ArrowDownCircle size={32} strokeWidth={2.5} />
                    </div>
                    <div>
                        <p className="kpi-label">Total de Despesas</p>
                        <p className="kpi-value">
                            {formatCurrency(stats.expense)}
                        </p>
                        <div style={{ display: 'flex', gap: '8px', marginTop: '4px', fontSize: '11px', fontWeight: 700, opacity: 0.6 }}>
                            <span>Fixas: {formatCurrency(stats.fixedExpense)}</span>
                            <span>Var: {formatCurrency(stats.variableExpense)}</span>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Main Content Grid: Charts (8/4) */}
            <div className="chart-grid">
                <div className="main-chart-col">
                    <BalanceChart data={dailyBalance} />
                </div>
                <div className="side-chart-col">
                    <Card title="Despesas por Categoria" className="chart-card h-full">
                        <div className="pt-6">
                            <ExpensesPieChart data={categoryExpenses} onSliceClick={handleCategoryClick} />
                        </div>
                    </Card>
                </div>
            </div>

            {/* Financial Insights Section */}
            <div style={{ marginTop: '2rem', display: 'grid', gridTemplateColumns: '1fr', gap: '2rem' }}>
                <InsightsCard
                    stats={stats}
                    categoryExpenses={categoryExpenses}
                    transactionCount={data.transactions.length}
                />
                <AICapitalAllocation />
            </div>

            {/* ── Upcoming Commitments ── */}
            <div style={{ marginTop: '2rem' }}>
                <div style={{
                    background: '#ffffff',
                    borderRadius: '20px',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 4px 16px -4px rgba(0, 0, 0, 0.06)',
                    overflow: 'hidden',
                }}>
                    {/* Header */}
                    <div style={{
                        padding: '1.25rem 1.5rem',
                        borderBottom: '1px solid #f1f5f9',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.65rem',
                    }}>
                        <div style={{
                            width: '34px', height: '34px', borderRadius: '10px',
                            background: 'linear-gradient(135deg, #f59e0b, #f97316)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: 'white',
                        }}>
                            <Calendar size={18} />
                        </div>
                        <div>
                            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#1e293b', letterSpacing: '-0.01em' }}>
                                Próximos Compromissos
                            </h3>
                            <p style={{ margin: 0, fontSize: '0.7rem', color: '#94a3b8', fontWeight: 500 }}>
                                Contas pendentes por vencimento
                            </p>
                        </div>
                    </div>

                    {/* Content */}
                    <div style={{ padding: '1rem 1.5rem' }}>
                        {(data.commitments || []).filter(c => c.status === 'PENDING').length === 0 ? (
                            <div style={{
                                padding: '2.5rem 1.5rem',
                                textAlign: 'center',
                                borderRadius: '14px',
                                border: '2px dashed #e2e8f0',
                                color: '#94a3b8',
                                fontWeight: 600,
                                fontSize: '0.9rem',
                            }}>
                                Nenhum compromisso pendente por enquanto! 🌿
                            </div>
                        ) : (
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
                                gap: '0.75rem',
                            }}>
                                {(data.commitments || [])
                                    .filter(c => c.status === 'PENDING')
                                    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
                                    .slice(0, 3)
                                    .map(c => {
                                        const dueDate = new Date(c.dueDate);
                                        const today = new Date();
                                        const diffDays = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                                        const isUrgent = diffDays <= 3;
                                        const isOverdue = diffDays < 0;
                                        const accentColor = isOverdue ? '#ef4444' : isUrgent ? '#f59e0b' : '#6366f1';

                                        return (
                                            <div
                                                key={c.id}
                                                onClick={() => navigate('/commitments')}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '0.85rem',
                                                    padding: '1rem',
                                                    borderRadius: '14px',
                                                    background: `${accentColor}06`,
                                                    border: `1px solid ${accentColor}20`,
                                                    cursor: 'pointer',
                                                    transition: 'all 0.2s ease',
                                                    position: 'relative',
                                                    overflow: 'hidden',
                                                }}
                                                onMouseEnter={e => {
                                                    (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)';
                                                    (e.currentTarget as HTMLDivElement).style.boxShadow = '0 8px 20px -6px rgba(0,0,0,0.1)';
                                                }}
                                                onMouseLeave={e => {
                                                    (e.currentTarget as HTMLDivElement).style.transform = 'none';
                                                    (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
                                                }}
                                            >
                                                {/* Left accent bar */}
                                                <div style={{
                                                    position: 'absolute', left: 0, top: 0, bottom: 0,
                                                    width: '3px', background: accentColor, borderRadius: '14px 0 0 14px',
                                                }} />

                                                {/* Icon */}
                                                <div style={{
                                                    width: '40px', height: '40px', borderRadius: '12px',
                                                    background: `${accentColor}12`,
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    color: accentColor, flexShrink: 0,
                                                }}>
                                                    <Clock size={18} />
                                                </div>

                                                {/* Info */}
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <p style={{
                                                        margin: 0, fontWeight: 700, fontSize: '0.875rem', color: '#1e293b',
                                                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                                                    }}>
                                                        {c.description}
                                                    </p>
                                                    <p style={{
                                                        margin: '0.15rem 0 0 0', fontSize: '0.7rem', fontWeight: 600,
                                                        color: isOverdue ? '#ef4444' : isUrgent ? '#d97706' : '#94a3b8',
                                                    }}>
                                                        {isOverdue ? `Vencido há ${Math.abs(diffDays)} dia(s)` :
                                                            diffDays === 0 ? 'Vence hoje!' :
                                                                diffDays === 1 ? 'Vence amanhã' :
                                                                    `Vence em ${diffDays} dias · ${formatDate(c.dueDate)}`}
                                                    </p>
                                                </div>

                                                {/* Amount */}
                                                <span style={{
                                                    fontWeight: 800, fontSize: '0.95rem', color: accentColor,
                                                    fontFamily: 'var(--font-mono, monospace)',
                                                    whiteSpace: 'nowrap', flexShrink: 0,
                                                }}>
                                                    {formatCurrency(c.amount)}
                                                </span>
                                            </div>
                                        );
                                    })}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Empty State / Hints */}
            {data.transactions.length === 0 && (
                <div style={{
                    marginTop: '2rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1.25rem',
                    padding: '1.5rem',
                    borderRadius: '20px',
                    background: 'rgba(99, 102, 241, 0.04)',
                    border: '1px solid rgba(99, 102, 241, 0.12)',
                }}>
                    <div style={{
                        width: '52px', height: '52px', borderRadius: '14px',
                        background: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#6366f1', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', flexShrink: 0,
                    }}>
                        <AlertCircle size={28} strokeWidth={2.5} />
                    </div>
                    <div>
                        <h4 style={{ margin: '0 0 0.25rem 0', fontSize: '1.05rem', fontWeight: 800, color: '#1e293b' }}>
                            Comece sua jornada financeira
                        </h4>
                        <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 500, color: '#64748b', lineHeight: 1.5 }}>
                            Você ainda não registrou nenhuma transação. Vá até a aba <strong>Lançamentos</strong> e adicione sua primeira receita ou despesa para ver as métricas ganharem vida!
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};

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
import { ForecastChart } from '../components/charts/ForecastChart';
import { getForecastData } from '../utils/statistics';
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

    const forecastData = useMemo(() =>
        getForecastData(data.transactions, data.commitments || []),
        [data.transactions, data.commitments]
    );

    const handleCategoryClick = (categoryId: string) => {
        navigate('/transactions', { state: { categoryId } });
    };

    return (
        <div className="dashboard-container">
            {/* Page Header */}
            <header className="dashboard-header">
                <div>
                    <h2 className="dashboard-title">Dashboard</h2>
                    <p className="dashboard-subtitle">
                        Bem-vindo ao seu centro de comando financeiro.
                    </p>
                </div>

                <div className="flex gap-4 items-center">
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
                        <div style={{ backgroundColor: 'rgba(255, 255, 255, 0.7)' }} className="flex gap-2 items-center backdrop-blur-md p-2 rounded-2xl border border-border shadow-md animate-in fade-in slide-in-from-right-4">
                            <Calendar size={18} className="text-primary ml-2" />
                            <div className="flex gap-1 items-center px-2">
                                <input
                                    type="date"
                                    value={customStart}
                                    onChange={e => setCustomStart(e.target.value)}
                                    className="bg-transparent text-sm font-bold text-text focus:outline-none cursor-pointer"
                                />
                                <span className="text-text-muted font-black opacity-30">/</span>
                                <input
                                    type="date"
                                    value={customEnd}
                                    onChange={e => setCustomEnd(e.target.value)}
                                    className="bg-transparent text-sm font-bold text-text focus:outline-none cursor-pointer"
                                />
                            </div>
                        </div>
                    )}
                </div>
            </header>

            {/* Premium KPI Section */}
            <div className="kpi-grid">
                <Card className="kpi-card card-balance" onClick={() => navigate('/transactions')} style={{ cursor: 'pointer' }}>
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

                <Card className="kpi-card card-income" onClick={() => navigate('/transactions', { state: { type: 'INCOME' } })} style={{ cursor: 'pointer' }}>
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

                <Card className="kpi-card card-expense" onClick={() => navigate('/transactions', { state: { type: 'EXPENSE' } })} style={{ cursor: 'pointer' }}>
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

            {/* Financial Projection Section */}
            <div className="mt-8">
                <ForecastChart data={forecastData} />
            </div>

            {/* Upcoming Commitments (The "Didactic" touch) */}
            <div className="mt-8">
                <h3 className="text-2xl font-black text-text tracking-tight mb-4 flex items-center gap-2">
                    <Calendar size={24} className="text-primary" />
                    Próximos Compromissos
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {(data.commitments || [])
                        .filter(c => c.status === 'PENDING')
                        .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
                        .slice(0, 3)
                        .map(c => (
                            <Card key={c.id} className="p-5 border-none shadow-md hover:shadow-lg transition-all cursor-pointer backdrop-blur-sm" style={{ backgroundColor: 'rgba(255, 255, 255, 0.7)' }} onClick={() => navigate('/commitments')}>
                                <div className="flex justify-between items-start mb-3">
                                    <div className="bg-primary/10 p-2 rounded-xl text-primary">
                                        <Clock size={20} />
                                    </div>
                                    <span className="text-xs font-black uppercase text-text-muted opacity-40">
                                        Vence em {formatDate(c.dueDate)}
                                    </span>
                                </div>
                                <p className="font-bold text-lg text-text mb-1">{c.description}</p>
                                <p className="text-2xl font-black text-primary">{formatCurrency(c.amount)}</p>
                            </Card>
                        ))}
                    {(data.commitments || []).filter(c => c.status === 'PENDING').length === 0 && (
                        <div style={{ backgroundColor: 'var(--color-surface-soft)', borderColor: 'var(--color-border)' }} className="col-span-full p-8 text-center rounded-3xl border-2 border-dashed text-text-light font-medium">
                            Nenhum compromisso pendente por enquanto! 🌿
                        </div>
                    )}
                </div>
            </div>

            {/* Empty State / Hints */}
            {data.transactions.length === 0 && (
                <Card className="mt-12 flex items-center gap-6 p-8 border-none rounded-3xl shadow-inner" style={{ backgroundColor: 'var(--color-primary-light)' }}>
                    <div style={{ backgroundColor: 'var(--color-surface)' }} className="w-16 h-16 flex items-center justify-center rounded-2xl text-primary shadow-sm shrink-0">
                        <AlertCircle size={32} strokeWidth={2.5} />
                    </div>
                    <div>
                        <h4 className="text-xl font-bold mb-1" style={{ color: 'var(--color-text)' }}>Comece sua jornada financeira</h4>
                        <p className="font-medium leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
                            Você ainda não registrou nenhuma transação. Vá até a aba <strong>Lançamentos</strong> e adicione sua primeira receita ou despesa para ver as métricas ganharem vida!
                        </p>
                    </div>
                </Card>
            )}
        </div>
    );
};

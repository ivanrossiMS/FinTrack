import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../contexts/DataContext';
import { formatCurrency, formatDate } from '../utils/format';
import { exportToCSV, printReport } from '../utils/export';
import { Download, Printer, TrendingUp, TrendingDown, Target, Filter, CheckCircle, Clock, AlertTriangle, ListChecks, CalendarDays, Calendar, Lightbulb } from 'lucide-react';
import { startOfMonth, endOfMonth, startOfDay, subDays, parseISO, isWithinInterval } from 'date-fns';
import { ExpensesPieChart } from '../components/charts/ExpensesPieChart';
import { getCategoryExpenses } from '../utils/statistics';
import { Button } from '../components/ui/Button';
import { Transaction, Commitment } from '../models/types';
import { Filter as FilterIcon } from 'lucide-react';

type PeriodMode = 'TODAY' | '7DAYS' | 'MONTH' | 'CUSTOM';

const PERIOD_OPTIONS: { key: PeriodMode; label: string; icon: React.ReactNode }[] = [
    { key: 'TODAY', label: 'Hoje', icon: <CalendarDays size={14} /> },
    { key: '7DAYS', label: '7 dias', icon: <Calendar size={14} /> },
    { key: 'MONTH', label: 'Mensal', icon: <Calendar size={14} /> },
    { key: 'CUSTOM', label: 'Personalizado', icon: <Calendar size={14} /> },
];
import './Reports.css';

type CommitmentFilter = 'ALL' | 'PAID' | 'UPCOMING' | 'OVERDUE';

const COMMITMENT_FILTERS: { key: CommitmentFilter; label: string; icon: React.ReactNode }[] = [
    { key: 'ALL', label: 'Todos', icon: <ListChecks size={14} /> },
    { key: 'PAID', label: 'Pagos', icon: <CheckCircle size={14} /> },
    { key: 'UPCOMING', label: 'A vencer', icon: <Clock size={14} /> },
    { key: 'OVERDUE', label: 'Vencidos', icon: <AlertTriangle size={14} /> },
];

// Animated Counter Component
const CountUp: React.FC<{ end: number; duration?: number }> = ({ end, duration = 1000 }) => {
    const [count, setCount] = useState(0);

    useEffect(() => {
        let startTimestamp: number | null = null;
        const step = (timestamp: number) => {
            if (!startTimestamp) startTimestamp = timestamp;
            const progress = Math.min((timestamp - startTimestamp) / duration, 1);
            setCount(progress * end);
            if (progress < 1) {
                window.requestAnimationFrame(step);
            }
        };
        window.requestAnimationFrame(step);
    }, [end, duration]);

    return <span>{formatCurrency(count)}</span>;
};

export const Reports: React.FC = () => {
    const navigate = useNavigate();
    const { data } = useData();
    const [periodMode, setPeriodMode] = useState<PeriodMode>('MONTH');
    const [currentMonth, setCurrentMonth] = useState(new Date().toISOString().slice(0, 7));
    const [customStart, setCustomStart] = useState('');
    const [customEnd, setCustomEnd] = useState('');
    const [commitmentFilter, setCommitmentFilter] = useState<CommitmentFilter>('ALL');
    const [flowCategoryId, setFlowCategoryId] = useState<string>('');


    // ── Compute effective date range based on period mode ──
    const dateRange = useMemo(() => {
        const now = new Date();
        switch (periodMode) {
            case 'TODAY': {
                const day = startOfDay(now);
                return { start: day, end: new Date(day.getFullYear(), day.getMonth(), day.getDate(), 23, 59, 59, 999) };
            }
            case '7DAYS': {
                const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
                const start = startOfDay(subDays(now, 6));
                return { start, end };
            }
            case 'CUSTOM': {
                const start = customStart ? startOfDay(parseISO(customStart)) : startOfMonth(now);
                const end = customEnd ? new Date(parseISO(customEnd).getFullYear(), parseISO(customEnd).getMonth(), parseISO(customEnd).getDate(), 23, 59, 59, 999) : new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
                return { start, end };
            }
            case 'MONTH':
            default: {
                const monthStart = startOfMonth(parseISO(currentMonth + '-01'));
                return { start: monthStart, end: endOfMonth(monthStart) };
            }
        }
    }, [periodMode, currentMonth, customStart, customEnd]);



    const filteredData = useMemo(() => {
        return data.transactions.filter((t: Transaction) =>
            isWithinInterval(new Date(t.date), { start: dateRange.start, end: dateRange.end })
        ).sort((a: Transaction, b: Transaction) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }, [data.transactions, dateRange]);

    // ── Commitments filtered by period and status ──
    const filteredCommitments = useMemo(() => {
        const today = new Date().toISOString().slice(0, 10);

        const inRange = (data.commitments || []).filter((c: Commitment) =>
            isWithinInterval(new Date(c.dueDate), { start: dateRange.start, end: dateRange.end })
        );

        switch (commitmentFilter) {
            case 'PAID':
                return inRange.filter((c: Commitment) => c.status === 'PAID');
            case 'UPCOMING':
                return inRange.filter((c: Commitment) => c.status === 'PENDING' && c.dueDate.slice(0, 10) >= today);
            case 'OVERDUE':
                return inRange.filter((c: Commitment) => c.status === 'PENDING' && c.dueDate.slice(0, 10) < today);
            default:
                return inRange;
        }
    }, [data.commitments, dateRange, commitmentFilter]);



    const categoryExpenses = useMemo(() => {
        return getCategoryExpenses(data.transactions, data.categories, dateRange.start, dateRange.end);
    }, [data.transactions, data.categories, dateRange]);

    const totals = useMemo(() => {
        const income = filteredData.filter(t => t.type === 'INCOME').reduce((acc, t) => acc + t.amount, 0);
        const expense = filteredData.filter(t => t.type === 'EXPENSE').reduce((acc, t) => acc + t.amount, 0);
        const fixed = filteredData.filter(t => t.type === 'EXPENSE' && t.isFixed).reduce((acc, t) => acc + t.amount, 0);
        const variable = expense - fixed;
        return { income, expense, fixed, variable, balance: income - expense };
    }, [filteredData]);

    const filteredFlowData = useMemo(() => {
        if (!flowCategoryId) return filteredData;
        return filteredData.filter(t => t.categoryId === flowCategoryId);
    }, [filteredData, flowCategoryId]);

    const flowCategoryTotal = useMemo(() => {
        return filteredFlowData.reduce((acc, t) => acc + (t.type === 'EXPENSE' ? -t.amount : t.amount), 0);
    }, [filteredFlowData]);

    const handleExportCSV = () => {
        exportToCSV(
            filteredData,
            data.categories,
            data.suppliers,
            data.paymentMethods,
            filteredCommitments
        );
    };

    const getStatusBadge = (c: Commitment) => {
        const today = new Date().toISOString().slice(0, 10);
        if (c.status === 'PAID') {
            return <span className="rep-cm-badge paid">Pago</span>;
        }
        if (c.dueDate.slice(0, 10) < today) {
            return <span className="rep-cm-badge overdue">Vencido</span>;
        }
        return <span className="rep-cm-badge upcoming">A vencer</span>;
    };

    const handleCategoryClick = (categoryId: string) => {
        navigate('/transactions', { state: { categoryId } });
    };

    return (
        <div className="rep-page">
            {/* ── Top Bar Elite ── */}
            <header className="rep-header print-hide">
                <div className="rep-header-left">
                    <h1>Relatórios</h1>
                    <span className="rep-subtitle">Análise profunda e insights da sua saúde financeira</span>
                </div>

                <div className="rep-actions-card">
                    <Button variant="secondary" onClick={handleExportCSV} title="Exportar CSV">
                        <Download size={18} />
                        <span className="hidden md:inline">Exportar</span>
                    </Button>
                    <Button variant="secondary" onClick={printReport} title="Imprimir Relatório">
                        <Printer size={18} />
                        <span className="hidden md:inline">Imprimir</span>
                    </Button>
                </div>
            </header>

            <div className="rep-period-bar-container print-hide">
                <div className="rep-period-bar">
                    <div className="rep-period-pills">
                        {PERIOD_OPTIONS.map(opt => (
                            <button
                                key={opt.key}
                                className={`rep-period-pill ${periodMode === opt.key ? 'active' : ''}`}
                                onClick={() => setPeriodMode(opt.key)}
                            >
                                {opt.icon}
                                <span>{opt.label}</span>
                            </button>
                        ))}
                    </div>
                    <div className="rep-period-inputs">
                        {periodMode === 'MONTH' && (
                            <input
                                type="month"
                                className="rep-input-month"
                                value={currentMonth}
                                onChange={e => setCurrentMonth(e.target.value)}
                            />
                        )}
                        {periodMode === 'CUSTOM' && (
                            <div className="rep-period-custom-group">
                                <input
                                    type="date"
                                    className="rep-input-month"
                                    value={customStart}
                                    onChange={e => setCustomStart(e.target.value)}
                                />
                                <span className="rep-period-arrow">→</span>
                                <input
                                    type="date"
                                    className="rep-input-month"
                                    value={customEnd}
                                    onChange={e => setCustomEnd(e.target.value)}
                                />
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* ── Summary Row Elite ── */}
            <div className="rep-summary-grid">
                <div className={`rep-summ-card result ${totals.balance >= 0 ? 'positive' : 'negative'}`}>
                    <div className="rep-summ-icon"><Target size={24} /></div>
                    <div className="rep-summ-info">
                        <span className="rep-summ-label">Resultado Final</span>
                        <div className="rep-summ-value"><CountUp end={totals.balance} /></div>
                    </div>
                </div>

                <div className="rep-summ-card income">
                    <div className="rep-summ-icon"><TrendingUp size={24} /></div>
                    <div className="rep-summ-info">
                        <span className="rep-summ-label">Total Receitas</span>
                        <div className="rep-summ-value"><CountUp end={totals.income} /></div>
                    </div>
                </div>

                <div className="rep-summ-card expense">
                    <div className="rep-summ-icon"><TrendingDown size={24} /></div>
                    <div className="rep-summ-info">
                        <span className="rep-summ-label">Total Despesas</span>
                        <div className="rep-summ-value"><CountUp end={totals.expense} /></div>
                    </div>
                </div>
            </div>

            {/* ── Main Layout Grid ── */}
            <div className="rep-main-grid">

                {/* ── Column A: Analysis & Data ── */}
                <div className="rep-col-a">

                    {/* Chart Section */}
                    <div className="rep-card">
                        <h3 className="rep-card-title">Distribuição Geográfica de Gastos</h3>
                        <div className="rep-chart-container">
                            {categoryExpenses.length > 0 ? (
                                <ExpensesPieChart data={categoryExpenses} onSliceClick={handleCategoryClick} />
                            ) : (
                                <div className="rep-empty-state">
                                    <div className="rep-insight-icon-wrapper" style={{ marginBottom: '1rem', background: 'rgba(0,0,0,0.05)' }}>
                                        <Filter size={32} opacity={0.3} />
                                    </div>
                                    <span style={{ fontWeight: 600 }}>Nenhum dado para o gráfico</span>
                                    <span style={{ fontSize: '0.8125rem', opacity: 0.7 }}>Tente alterar o período ou os filtros</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Detailed Statement - Reformulated */}
                    <div className="rep-card rep-table-card rep-flow-card">
                        <div className="rep-flow-header">
                            <div className="rep-flow-header-main">
                                <div className="rep-flow-title-group">
                                    <h3 className="rep-card-title">Extrato de Fluxo</h3>
                                    <span className="rep-count-badge">{filteredFlowData.length} lançamentos</span>
                                </div>
                                <div className={`rep-flow-total-badge ${flowCategoryTotal >= 0 ? 'positive' : 'negative'}`}>
                                    <span className="label">Saldo do Filtro</span>
                                    <div className="value">
                                        {formatCurrency(flowCategoryTotal)}
                                    </div>
                                </div>
                            </div>

                            <div className="rep-flow-header-actions">
                                <div className="rep-select-container">
                                    <FilterIcon size={16} className="rep-select-icon" />
                                    <select
                                        className="rep-flow-cat-select"
                                        value={flowCategoryId}
                                        onChange={(e) => setFlowCategoryId(e.target.value)}
                                    >
                                        <option value="">Todas Categorias</option>
                                        {data.categories.map(cat => (
                                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div className="rep-grid-header">
                            <span className="rep-col-h">Data</span>
                            <span className="rep-col-h">Lançamento</span>
                            <span className="rep-col-h">Categoria</span>
                            <span className="rep-col-h" style={{ textAlign: 'right' }}>Valor</span>
                        </div>

                        <div className="rep-items-list">
                            {filteredFlowData.map((tx) => {
                                const cat = data.categories.find(c => c.id === tx.categoryId);
                                const isExpense = tx.type === 'EXPENSE';
                                return (
                                    <div key={tx.id} className="rep-grid-row">
                                        <div className="rep-col-date">
                                            <span className="day">{new Date(tx.date).getDate().toString().padStart(2, '0')}</span>
                                            <span className="month">{formatDate(tx.date).split('/')[1]}</span>
                                        </div>
                                        <div className="rep-col-info">
                                            <div className="rep-col-desc" title={tx.description}>
                                                <div className="rep-desc-content">
                                                    <span className="rep-main-text">{tx.description}</span>
                                                    <span className="rep-sub-text">
                                                        {data.paymentMethods.find(m => m.id === tx.paymentMethodId)?.name || tx.paymentMethodId || '—'}
                                                    </span>
                                                </div>
                                                {tx.isFixed && <span className="rep-fixed-tag">Fixa</span>}
                                            </div>
                                            <div className="rep-col-cat">
                                                <span
                                                    className="rep-badge-pill"
                                                    style={{
                                                        backgroundColor: (cat?.color || '#94a3b8') + '12',
                                                        color: cat?.color || '#64748b',
                                                        border: `1px solid ${cat?.color}25`
                                                    }}
                                                >
                                                    <div className="dot" style={{ backgroundColor: cat?.color }} />
                                                    {cat?.name || 'Geral'}
                                                </span>
                                            </div>
                                        </div>
                                        <div className={`rep-col-val ${isExpense ? 'expense' : 'income'}`}>
                                            <span className="symbol">{isExpense ? '−' : '+'}</span>
                                            {formatCurrency(tx.amount).replace('R$', '').trim()}
                                        </div>
                                    </div>
                                );
                            })}

                            {filteredFlowData.length === 0 && (
                                <div className="rep-empty-state">
                                    <Filter size={32} opacity={0.2} />
                                    <span>Nenhum lançamento encontrado para este filtro.</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Commitments */}
                    <div className="rep-card rep-table-card">
                        <div className="rep-table-header-bar">
                            <h3 className="rep-card-title">Agenda de Compromissos</h3>
                            <div className="rep-cm-filters" style={{ border: 'none', padding: 0 }}>
                                {COMMITMENT_FILTERS.map(f => (
                                    <button
                                        key={f.key}
                                        className={`rep-cm-filter-pill ${commitmentFilter === f.key ? 'active' : ''}`}
                                        onClick={() => setCommitmentFilter(f.key)}
                                    >
                                        {f.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="rep-grid-header rep-cm-grid">
                            <span className="rep-col-h">Data</span>
                            <span className="rep-col-h">Compromisso</span>
                            <span className="rep-col-h">Status</span>
                            <span className="rep-col-h" style={{ textAlign: 'right' }}>Valor</span>
                        </div>

                        <div className="rep-items-list">
                            {filteredCommitments
                                .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
                                .map(cm => {
                                    const sup = data.suppliers.find(s => s.id === cm.supplierId);
                                    return (
                                        <div key={cm.id} className="rep-grid-row rep-cm-grid">
                                            <div className="rep-col-date">
                                                <span className="day">{new Date(cm.dueDate).getDate()}</span>
                                                <span className="month">{formatDate(cm.dueDate).split('/')[1]}</span>
                                            </div>
                                            <div className="rep-col-info">
                                                <div className="rep-col-desc">
                                                    <div className="rep-desc-content">
                                                        <span className="rep-main-text">{cm.description}</span>
                                                        <span className="rep-sub-text">{sup?.name || 'Sem Fornecedor'}</span>
                                                    </div>
                                                </div>
                                                <div className="rep-col-status">{getStatusBadge(cm)}</div>
                                            </div>
                                            <div className="rep-col-val expense">
                                                {formatCurrency(cm.amount).replace('R$', '').trim()}
                                            </div>
                                        </div>
                                    );
                                })}
                        </div>
                    </div>
                </div>

                {/* ── Column B: Stats ── */}
                <aside className="rep-col-b">

                    {/* Elite Insight Card */}
                    <div className="rep-card rep-insight-card">
                        <div className="rep-insight-icon-wrapper">
                            <Lightbulb size={28} />
                        </div>
                        <p className="rep-insight-text">
                            {totals.balance >= 0
                                ? "Seu fluxo está positivo! Considere diversificar seus investimentos para acelerar sua liberdade financeira."
                                : "Atenção necessária: Seus gastos superaram as receitas. Revise categorias variáveis e evite compras por impulso."}
                        </p>
                    </div>

                    {/* Ranking Card */}
                    <div className="rep-card">
                        <h3 className="rep-card-title">Ranking de Gastos</h3>
                        <div className="rep-ranking-list">
                            {filteredData
                                .filter(t => t.type === 'EXPENSE')
                                .sort((a, b) => b.amount - a.amount)
                                .slice(0, 5)
                                .map((t, index) => {
                                    const maxAmount = Math.max(...filteredData.filter(x => x.type === 'EXPENSE').map(x => x.amount), 1);
                                    const percentage = (t.amount / maxAmount) * 100;
                                    return (
                                        <div key={t.id} className="rep-ranking-item">
                                            <div className="rep-rank-content">
                                                <div className="rep-rank-left">
                                                    <div className="rep-rank-num">{index + 1}</div>
                                                    <div className="rep-rank-details">
                                                        <span className="rep-rank-name">{t.description}</span>
                                                        <span className="rep-rank-date">{formatDate(t.date)}</span>
                                                    </div>
                                                </div>
                                                <span className="rep-rank-value">{formatCurrency(t.amount)}</span>
                                            </div>
                                            <div className="rep-rank-progress-bg">
                                                <div className="rep-rank-progress-fill" style={{ width: `${percentage}%` }} />
                                            </div>
                                        </div>
                                    );
                                })}
                        </div>
                    </div>

                </aside>
            </div>
        </div>
    );
};

import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../contexts/DataContext';
import { formatCurrency, formatDate } from '../utils/format';
import { exportToCSV, printReport } from '../utils/export';
import { Download, Printer, TrendingUp, TrendingDown, Target, Filter, CheckCircle, Clock, AlertTriangle, ListChecks, CalendarDays, Calendar } from 'lucide-react';
import { startOfMonth, endOfMonth, startOfDay, subDays, parseISO, isWithinInterval, format } from 'date-fns';
import { ExpensesPieChart } from '../components/charts/ExpensesPieChart';
import { getCategoryExpenses } from '../utils/statistics';
import { Button } from '../components/ui/Button';
import { Transaction, Commitment } from '../models/types';

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

export const Reports: React.FC = () => {
    const navigate = useNavigate();
    const { data } = useData();
    const [periodMode, setPeriodMode] = useState<PeriodMode>('MONTH');
    const [currentMonth, setCurrentMonth] = useState(new Date().toISOString().slice(0, 7));
    const [customStart, setCustomStart] = useState('');
    const [customEnd, setCustomEnd] = useState('');
    const [commitmentFilter, setCommitmentFilter] = useState<CommitmentFilter>('ALL');

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

    const periodLabel = useMemo(() => {
        switch (periodMode) {
            case 'TODAY': return format(new Date(), 'dd/MM/yyyy');
            case '7DAYS': return `${format(dateRange.start, 'dd/MM')} — ${format(dateRange.end, 'dd/MM/yyyy')}`;
            case 'CUSTOM': return `${customStart ? format(dateRange.start, 'dd/MM/yyyy') : '...'} — ${customEnd ? format(dateRange.end, 'dd/MM/yyyy') : '...'}`;
            default: return currentMonth;
        }
    }, [periodMode, dateRange, currentMonth, customStart, customEnd]);

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

    const commitmentTotals = useMemo(() => {
        const today = new Date().toISOString().slice(0, 10);
        const all = (data.commitments || []).filter(c =>
            isWithinInterval(new Date(c.dueDate), { start: dateRange.start, end: dateRange.end })
        );
        return {
            total: all.length,
            paid: all.filter(c => c.status === 'PAID').reduce((a, c) => a + c.amount, 0),
            paidCount: all.filter(c => c.status === 'PAID').length,
            upcoming: all.filter(c => c.status === 'PENDING' && c.dueDate.slice(0, 10) >= today).reduce((a, c) => a + c.amount, 0),
            upcomingCount: all.filter(c => c.status === 'PENDING' && c.dueDate.slice(0, 10) >= today).length,
            overdue: all.filter(c => c.status === 'PENDING' && c.dueDate.slice(0, 10) < today).reduce((a, c) => a + c.amount, 0),
            overdueCount: all.filter(c => c.status === 'PENDING' && c.dueDate.slice(0, 10) < today).length,
        };
    }, [data.commitments, dateRange]);

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
        <div className="rep-page print-container">
            {/* ── Top Bar ── */}
            <header className="rep-header print-hide">
                <div className="rep-header-left">
                    <h1>Relatórios</h1>
                    <span className="rep-subtitle">Análise detalhada da sua saúde financeira</span>
                </div>

                <div className="rep-actions-card">
                    <div className="rep-btn-group">
                        <Button variant="secondary" onClick={handleExportCSV} title="Exportar CSV">
                            <Download size={18} />
                            <span className="hidden md:inline">Exportar</span>
                        </Button>
                        <Button variant="secondary" onClick={printReport} title="Imprimir Relatório">
                            <Printer size={18} />
                            <span className="hidden md:inline">Imprimir</span>
                        </Button>
                    </div>
                </div>
            </header>

            {/* ── Period Filters ── */}
            <div className="rep-period-bar print-hide">
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
                        <>
                            <div className="rep-date-pair">
                                <label className="rep-label-mini">De</label>
                                <input
                                    type="date"
                                    className="rep-input-month"
                                    value={customStart}
                                    onChange={e => setCustomStart(e.target.value)}
                                />
                            </div>
                            <div className="rep-date-pair">
                                <label className="rep-label-mini">Até</label>
                                <input
                                    type="date"
                                    className="rep-input-month"
                                    value={customEnd}
                                    onChange={e => setCustomEnd(e.target.value)}
                                />
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* ── Print Header (visible only on print) ── */}
            <div className="rep-print-header">
                <h1>Finance+ — Relatório</h1>
                <p>Período: {periodLabel}</p>
            </div>

            {/* ── Main Layout Grid ── */}
            <div className="rep-main-grid">

                {/* ── Column A: Charts & Detailed ── */}
                <div className="rep-col-a">

                    {/* Summary Row */}
                    <div className="rep-summary-grid">
                        <div className="rep-summ-card income">
                            <div className="rep-summ-header-row">
                                <span className="label">Entradas</span>
                                <TrendingUp size={16} />
                            </div>
                            <span className="value">{formatCurrency(totals.income)}</span>
                        </div>
                        <div className="rep-summ-card expense">
                            <div className="rep-summ-header-row">
                                <span className="label">Saídas</span>
                                <TrendingDown size={16} />
                            </div>
                            <span className="value">{formatCurrency(totals.expense)}</span>
                            <div className="rep-summ-footer">
                                <span>Fixas: {formatCurrency(totals.fixed)}</span>
                                <span className="rep-summ-sep">|</span>
                                <span>Var: {formatCurrency(totals.variable)}</span>
                            </div>
                        </div>
                        <div className={`rep-summ-card result ${totals.balance >= 0 ? 'positive' : 'negative'}`}>
                            <div className="rep-summ-header-row">
                                <span className="label">Resultado</span>
                                <Target size={16} />
                            </div>
                            <span className="value">{formatCurrency(totals.balance)}</span>
                        </div>
                    </div>

                    {/* Chart Card */}
                    <div className="rep-card">
                        <h3 className="rep-card-title">Distribuição por Categoria</h3>
                        <div className="rep-chart-container">
                            {categoryExpenses.length > 0 ? (
                                <ExpensesPieChart data={categoryExpenses} onSliceClick={handleCategoryClick} />
                            ) : (
                                <div className="rep-empty-state">
                                    Sem despesas para exibir no gráfico.
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Statement Card — Lançamentos */}
                    <div className="rep-card rep-table-card">
                        <div className="rep-table-header-bar">
                            <h3 className="rep-card-title" style={{ margin: 0 }}>Extrato Detalhado</h3>
                            <span className="rep-count-badge">
                                {filteredData.length} REGISTROS
                            </span>
                        </div>

                        <div className="rep-table-scroll">
                            <div className="rep-grid-header">
                                <span className="rep-col-h">Data</span>
                                <span className="rep-col-h">Descrição</span>
                                <span className="rep-col-h">Categoria</span>
                                <span className="rep-col-h rep-col-r">Valor</span>
                            </div>

                            <div className="rep-items-list">
                                {filteredData.map((tx) => {
                                    const cat = data.categories.find(c => c.id === tx.categoryId);
                                    const isExpense = tx.type === 'EXPENSE';
                                    return (
                                        <div key={tx.id} className="rep-grid-row">
                                            <div className="rep-col-date">{formatDate(tx.date)}</div>
                                            <div className="rep-col-desc" title={tx.description}>
                                                {tx.description}
                                                {tx.isFixed && <span className="rep-fixed-tag">Fixa</span>}
                                            </div>
                                            <div className="rep-col-cat">
                                                <span
                                                    className="rep-badge-pill"
                                                    style={{
                                                        backgroundColor: (cat?.color || '#94a3b8') + '20',
                                                        color: cat?.color || '#64748b',
                                                        border: `1px solid ${cat?.color}40`
                                                    }}
                                                >
                                                    {cat?.name || 'Geral'}
                                                </span>
                                            </div>
                                            <div className={`rep-col-val ${isExpense ? 'expense' : 'income'}`}>
                                                {isExpense ? '- ' : '+ '}{formatCurrency(tx.amount)}
                                            </div>
                                        </div>
                                    );
                                })}

                                {filteredData.length === 0 && (
                                    <div className="rep-empty-state">
                                        <Filter size={32} opacity={0.3} />
                                        <span>Nenhum lançamento neste período.</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* ── Commitments Section ── */}
                    <div className="rep-card rep-table-card">
                        <div className="rep-table-header-bar">
                            <h3 className="rep-card-title" style={{ margin: 0 }}>Compromissos</h3>
                            <span className="rep-count-badge">
                                {filteredCommitments.length} REGISTROS
                            </span>
                        </div>

                        {/* Filter Pills */}
                        <div className="rep-cm-filters">
                            {COMMITMENT_FILTERS.map(f => (
                                <button
                                    key={f.key}
                                    className={`rep-cm-filter-pill ${commitmentFilter === f.key ? 'active' : ''}`}
                                    onClick={() => setCommitmentFilter(f.key)}
                                >
                                    {f.icon}
                                    <span>{f.label}</span>
                                    {f.key === 'PAID' && commitmentTotals.paidCount > 0 && (
                                        <span className="rep-cm-pill-count">{commitmentTotals.paidCount}</span>
                                    )}
                                    {f.key === 'UPCOMING' && commitmentTotals.upcomingCount > 0 && (
                                        <span className="rep-cm-pill-count">{commitmentTotals.upcomingCount}</span>
                                    )}
                                    {f.key === 'OVERDUE' && commitmentTotals.overdueCount > 0 && (
                                        <span className="rep-cm-pill-count overdue">{commitmentTotals.overdueCount}</span>
                                    )}
                                </button>
                            ))}
                        </div>

                        {/* Summary mini-cards for commitments */}
                        <div className="rep-cm-summary">
                            <div className="rep-cm-stat paid">
                                <span className="rep-cm-stat-label">Pagos</span>
                                <span className="rep-cm-stat-value">{formatCurrency(commitmentTotals.paid)}</span>
                            </div>
                            <div className="rep-cm-stat upcoming">
                                <span className="rep-cm-stat-label">A vencer</span>
                                <span className="rep-cm-stat-value">{formatCurrency(commitmentTotals.upcoming)}</span>
                            </div>
                            {commitmentTotals.overdueCount > 0 && (
                                <div className="rep-cm-stat overdue">
                                    <span className="rep-cm-stat-label">Vencidos</span>
                                    <span className="rep-cm-stat-value">{formatCurrency(commitmentTotals.overdue)}</span>
                                </div>
                            )}
                        </div>

                        <div className="rep-table-scroll">
                            <div className="rep-grid-header rep-cm-grid">
                                <span className="rep-col-h">Vencimento</span>
                                <span className="rep-col-h">Descrição</span>
                                <span className="rep-col-h">Fornecedor</span>
                                <span className="rep-col-h">Status</span>
                                <span className="rep-col-h rep-col-r">Valor</span>
                            </div>

                            <div className="rep-items-list">
                                {filteredCommitments
                                    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
                                    .map(cm => {
                                        const sup = data.suppliers.find(s => s.id === cm.supplierId);
                                        return (
                                            <div key={cm.id} className="rep-grid-row rep-cm-grid">
                                                <div className="rep-col-date">{formatDate(cm.dueDate)}</div>
                                                <div className="rep-col-desc" title={cm.description}>
                                                    {cm.description}
                                                </div>
                                                <div className="rep-col-desc" style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>
                                                    {sup?.name || '—'}
                                                </div>
                                                <div>{getStatusBadge(cm)}</div>
                                                <div className="rep-col-val expense">
                                                    {formatCurrency(cm.amount)}
                                                </div>
                                            </div>
                                        );
                                    })}

                                {filteredCommitments.length === 0 && (
                                    <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--color-text-light)', fontStyle: 'italic', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                                        <Filter size={32} opacity={0.3} />
                                        <span>Nenhum compromisso encontrado para o filtro selecionado.</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                </div>

                {/* ── Column B: Stats & Ranking ── */}
                <aside className="rep-col-b">

                    {/* High Expenses Card */}
                    <div className="rep-card">
                        <h3 className="rep-card-title">Maiores Despesas</h3>
                        <div className="rep-ranking-list">
                            {filteredData
                                .filter(t => t.type === 'EXPENSE')
                                .sort((a, b) => b.amount - a.amount)
                                .slice(0, 5)
                                .map((t, index) => (
                                    <div key={t.id} className="rep-ranking-item">
                                        <div className="rep-rank-left">
                                            <div className="rep-rank-num">{index + 1}</div>
                                            <span className="rep-rank-name" title={t.description}>{t.description}</span>
                                        </div>
                                        <span className="rep-rank-value">{formatCurrency(t.amount)}</span>
                                    </div>
                                ))}
                            {filteredData.filter(t => t.type === 'EXPENSE').length === 0 && (
                                <div className="rep-empty-state" style={{ padding: '2rem 0', fontSize: '0.75rem' }}>
                                    Nenhuma despesa registrada.
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Insight Card */}
                    <div className="rep-card rep-insight-card">
                        <h3 className="rep-card-title rep-insight-title">Insight Mensal</h3>
                        <p className="rep-insight-text">
                            {totals.balance >= 0
                                ? "Excelente! Suas receitas superaram as despesas este mês. Considere investir o excedente."
                                : "Atenção: Suas despesas superaram as receitas. Revise seus gastos em categorias não essenciais."}
                        </p>
                    </div>

                </aside>
            </div>
        </div>
    );
};

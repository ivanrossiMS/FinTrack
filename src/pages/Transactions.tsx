import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import {
    Plus, Search, Filter, Trash2, Edit, Lock,
    ArrowUpDown, ArrowUp, ArrowDown,
    X, Calendar, SlidersHorizontal, Anchor,
    TrendingUp, TrendingDown, Target, Paperclip
} from 'lucide-react';
import { useData } from '../contexts/DataContext';
import { Transaction, Attachment } from '../models/types';
import { formatCurrency, formatDate } from '../utils/format';
import { useLocation } from 'react-router-dom';
import { TransactionForm } from '../components/forms/TransactionForm';
import { AttachmentViewer } from '../components/ui/AttachmentViewer';
import { Input, Select } from '../components/ui/Input';
import { startOfMonth, endOfMonth, isWithinInterval, parseISO } from 'date-fns';
import { compareLocalePTBR, parseDateISO, normalizeSearch } from '../utils/sorting';
import { VoiceAssistant } from '../components/voice/VoiceAssistant';
import { ParsedTransaction } from '../utils/aiParser';
import './Transactions.css';

// ── Types ──
type SortColumn = 'description' | 'category' | 'date' | 'amount' | 'method';
type SortDirection = 'asc' | 'desc';

interface SortState {
    column: SortColumn | null;
    direction: SortDirection | null;
}

const SORT_COLUMNS: { key: SortColumn; label: string }[] = [
    { key: 'description', label: 'Descrição' },
    { key: 'category', label: 'Categoria' },
    { key: 'date', label: 'Data' },
    { key: 'amount', label: 'Valor' },
    { key: 'method', label: 'Método' },
];

import { Pagination } from '../components/ui/Pagination';

export const Transactions: React.FC = () => {
    const { data, deleteTransaction } = useData();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTx, setEditingTx] = useState<Transaction | undefined>(undefined);
    const [voiceData, setVoiceData] = useState<Partial<Transaction> | undefined>(undefined);
    const [isVoiceAssistantOpen, setIsVoiceAssistantOpen] = useState(false);
    const location = useLocation();
    const [viewingAttachments, setViewingAttachments] = useState<Attachment[] | null>(null);

    // ── Pagination State ──
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 20;

    // ── Filter state ──
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState<string>('ALL');
    const [filterMonth, setFilterMonth] = useState<string>(new Date().toISOString().slice(0, 7));
    const [dateStart, setDateStart] = useState('');
    const [dateEnd, setDateEnd] = useState('');
    const [filterFixed, setFilterFixed] = useState<'ALL' | 'FIXED' | 'VARIABLE'>('ALL');
    const [filterCategoryId, setFilterCategoryId] = useState<string>('ALL');

    // Reset page to 1 when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, filterType, filterMonth, dateStart, dateEnd, filterFixed, filterCategoryId]);

    // Handle incoming state from Dashboard or Voice Assistant
    useEffect(() => {
        if (!location.state) return;

        // Voice assistant prefill: open form with pre-parsed data
        if (location.state.openForm && location.state.voicePrefill) {
            const vp = location.state.voicePrefill as Partial<Transaction>;
            setVoiceData(vp);
            setEditingTx(undefined);
            setIsModalOpen(true);
            window.history.replaceState({}, document.title);
        } else if (location.state.categoryId) {
            setFilterCategoryId(location.state.categoryId);
            window.history.replaceState({}, document.title);
        } else if (location.state.type) {
            setFilterType(location.state.type);
            window.history.replaceState({}, document.title);
        }
    }, [location.state]);

    // ── Sort state ──
    const [sort, setSort] = useState<SortState>({ column: null, direction: null });

    // Whether a custom date range is active (takes priority over month filter)
    const isPeriodActive = dateStart !== '' || dateEnd !== '';

    // ── Lookup maps (memoised) ──
    const categoryMap = useMemo(() => {
        const map = new Map<string, { name: string; color: string }>();
        data.categories.forEach(c => map.set(c.id, { name: c.name, color: c.color || '#94a3b8' }));
        return map;
    }, [data.categories]);

    const paymentMethodMap = useMemo(() => {
        const map = new Map<string, { name: string; color: string }>();
        data.paymentMethods.forEach(m => map.set(m.id, { name: m.name, color: m.color || '#94a3b8' }));
        return map;
    }, [data.paymentMethods]);

    // ── Locked Transactions (from commitments) ──
    const lockedTransactionIds = useMemo(() => {
        const ids = new Set<string>();
        data.commitments?.forEach(c => {
            if (c.transactionId) ids.add(c.transactionId);
        });
        return ids;
    }, [data.commitments]);

    // ── Effective date range (auto-corrects if end < start) ──
    const effectiveDates = useMemo(() => {
        if (!dateStart && !dateEnd) return { start: '', end: '' };
        if (dateStart && dateEnd && dateStart > dateEnd) {
            return { start: dateEnd, end: dateStart };
        }
        return { start: dateStart, end: dateEnd };
    }, [dateStart, dateEnd]);

    // ── Filter + Sort pipeline ──
    const filteredTransactions = useMemo(() => {
        let result = data.transactions.filter(t => {
            // 1. Date filtering — period takes priority over month
            if (isPeriodActive) {
                const txDate = t.date.slice(0, 10); // yyyy-mm-dd
                if (effectiveDates.start && txDate < effectiveDates.start) return false;
                if (effectiveDates.end && txDate > effectiveDates.end) return false;
            } else if (filterMonth) {
                const date = parseISO(t.date);
                const start = startOfMonth(parseISO(filterMonth + '-01'));
                const end = endOfMonth(start);
                if (!isWithinInterval(date, { start, end })) return false;
            }

            // 2. Type
            if (filterType !== 'ALL' && t.type !== filterType) return false;

            // 3. Search (accent-insensitive)
            if (searchTerm) {
                const needle = normalizeSearch(searchTerm);
                const catName = categoryMap.get(t.categoryId)?.name || '';
                const matches = (
                    normalizeSearch(t.description).includes(needle) ||
                    normalizeSearch(catName).includes(needle)
                );
                if (!matches) return false;
            }

            // 4. Fixed filter
            if (filterFixed === 'FIXED' && !t.isFixed) return false;
            if (filterFixed === 'VARIABLE' && t.isFixed) return false;

            // 5. Category filter
            if (filterCategoryId !== 'ALL' && t.categoryId !== filterCategoryId) return false;

            return true;
        });

        // 4. Sort
        const col = sort.column;
        const dir = sort.direction;
        if (col && dir) {
            const multiplier = dir === 'asc' ? 1 : -1;
            result = [...result].sort((a, b) => {
                let cmp = 0;
                switch (col) {
                    case 'description':
                        cmp = compareLocalePTBR(a.description, b.description);
                        break;
                    case 'category': {
                        const catA = categoryMap.get(a.categoryId)?.name || '';
                        const catB = categoryMap.get(b.categoryId)?.name || '';
                        cmp = compareLocalePTBR(catA, catB);
                        break;
                    }
                    case 'date':
                        cmp = parseDateISO(a.date) - parseDateISO(b.date);
                        break;
                    case 'amount':
                        cmp = a.amount - b.amount;
                        break;
                    case 'method': {
                        const methodA = paymentMethodMap.get(a.paymentMethodId || '')?.name || '';
                        const methodB = paymentMethodMap.get(b.paymentMethodId || '')?.name || '';
                        cmp = compareLocalePTBR(methodA, methodB);
                        break;
                    }
                }
                if (cmp !== 0) return cmp * multiplier;
                // Tiebreaker: most recent first
                return parseDateISO(b.date) - parseDateISO(a.date);
            });
        } else {
            // Default: most recent first
            result = [...result].sort((a, b) => parseDateISO(b.date) - parseDateISO(a.date));
        }

        return result;
    }, [data.transactions, filterMonth, filterType, searchTerm, filterFixed, categoryMap, isPeriodActive, effectiveDates, sort, filterCategoryId]);

    // Pagination Logic
    const totalPages = Math.ceil(filteredTransactions.length / ITEMS_PER_PAGE);
    const displayedTransactions = useMemo(() => {
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        return filteredTransactions.slice(startIndex, startIndex + ITEMS_PER_PAGE);
    }, [filteredTransactions, currentPage]);

    // ── Summary Stats (derived from ALL filtered data) ──
    const summaryStats = useMemo(() => {
        const income = filteredTransactions.filter(t => t.type === 'INCOME').reduce((acc, t) => acc + t.amount, 0);
        const expense = filteredTransactions.filter(t => t.type === 'EXPENSE').reduce((acc, t) => acc + t.amount, 0);
        return {
            income,
            expense,
            balance: income - expense
        };
    }, [filteredTransactions]);

    // ── Handlers ──
    const handleEdit = (tx: Transaction) => {
        if (lockedTransactionIds.has(tx.id)) return;
        setEditingTx(tx);
        setIsModalOpen(true);
    };

    const handleDelete = (id: string) => {
        if (lockedTransactionIds.has(id)) return;
        if (confirm('Tem certeza que deseja excluir?')) {
            deleteTransaction(id);
        }
    };

    const handleCloseModal = () => {
        setEditingTx(undefined);
        setVoiceData(undefined);
        setIsModalOpen(false);
    };

    const handleVoiceResult = (result: ParsedTransaction) => {
        setVoiceData({
            type: result.type,
            description: result.description,
            amount: result.amount,
            date: result.date,
            categoryId: result.categoryId,
            paymentMethodId: result.paymentMethodId,
            supplierId: result.supplierId
        });
        setIsModalOpen(true);
    };

    // Cycle sort: null → asc → desc → null
    const handleSort = useCallback((column: SortColumn) => {
        setSort(prev => {
            if (prev.column !== column) return { column, direction: 'asc' };
            if (prev.direction === 'asc') return { column, direction: 'desc' };
            return { column: null, direction: null };
        });
    }, []);

    const clearAllFilters = useCallback(() => {
        setSearchTerm('');
        setFilterType('ALL');
        setFilterMonth(new Date().toISOString().slice(0, 7));
        setDateStart('');
        setDateEnd('');
        setFilterFixed('ALL');
        setFilterCategoryId('ALL');
        setSort({ column: null, direction: null });
        setCurrentPage(1);
    }, []);

    const hasActiveFilters = searchTerm !== '' || filterType !== 'ALL' || isPeriodActive || filterFixed !== 'ALL' || filterCategoryId !== 'ALL' || sort.column !== null;

    // Sort icon helper
    const SortIcon: React.FC<{ column: SortColumn }> = ({ column }) => {
        if (sort.column !== column) return <ArrowUpDown size={13} className="sort-icon neutral" />;
        if (sort.direction === 'asc') return <ArrowUp size={13} className="sort-icon active" />;
        return <ArrowDown size={13} className="sort-icon active" />;
    };

    // ── Active filter chips ──
    const activeChips: { label: string; onRemove: () => void }[] = [];
    if (searchTerm) activeChips.push({ label: `Busca: "${searchTerm}"`, onRemove: () => setSearchTerm('') });
    if (filterType !== 'ALL') activeChips.push({
        label: filterType === 'INCOME' ? 'Receitas' : 'Despesas',
        onRemove: () => setFilterType('ALL')
    });
    if (filterFixed !== 'ALL') activeChips.push({
        label: filterFixed === 'FIXED' ? 'Apenas Fixas' : 'Apenas Variáveis',
        onRemove: () => setFilterFixed('ALL')
    });
    if (isPeriodActive) activeChips.push({
        label: `Período: ${effectiveDates.start || '...'} → ${effectiveDates.end || '...'}`,
        onRemove: () => { setDateStart(''); setDateEnd(''); }
    });
    if (filterCategoryId !== 'ALL') {
        const catName = categoryMap.get(filterCategoryId)?.name || 'Categoria';
        activeChips.push({ label: `Categoria: ${catName}`, onRemove: () => setFilterCategoryId('ALL') });
    }

    if (sort.column) {
        const colLabel = SORT_COLUMNS.find(c => c.key === sort.column)?.label || '';
        activeChips.push({
            label: `Ordem: ${colLabel} ${sort.direction === 'asc' ? '↑' : '↓'}`,
            onRemove: () => setSort({ column: null, direction: null })
        });
    }

    return (
        <div className="tx-page">
            {/* ── Header ── */}
            <header className="tx-header">
                <div className="tx-header-left">
                    <h1>Lançamentos</h1>
                    <span className="tx-counter">{filteredTransactions.length} registros encontrados</span>
                </div>
                <div className="flex items-center gap-3">
                    <Button
                        onClick={() => setIsModalOpen(true)}
                        variant="primary"
                        className="tx-new-btn"
                    >
                        <Plus size={20} />
                        <span>Novo Lançamento</span>
                    </Button>
                </div>
            </header>

            {/* ── Summary Cards ── */}
            <div className="tx-summary-grid">
                <div className="tx-summary-card income">
                    <div className="tx-summ-header">
                        <span className="tx-summ-label">Receitas</span>
                        <TrendingUp size={20} className="tx-summ-icon" />
                    </div>
                    <span className="tx-summ-value">{formatCurrency(summaryStats.income)}</span>
                    <div className="tx-summ-indicator"></div>
                </div>

                <div className="tx-summary-card expense">
                    <div className="tx-summ-header">
                        <span className="tx-summ-label">Despesas</span>
                        <TrendingDown size={20} className="tx-summ-icon" />
                    </div>
                    <span className="tx-summ-value">{formatCurrency(summaryStats.expense)}</span>
                    <div className="tx-summ-indicator"></div>
                </div>

                <div className={`tx-summary-card balance ${summaryStats.balance >= 0 ? 'positive' : 'negative'}`}>
                    <div className="tx-summ-header">
                        <span className="tx-summ-label">Resultado</span>
                        <Target size={20} className="tx-summ-icon" />
                    </div>
                    <span className="tx-summ-value">{formatCurrency(summaryStats.balance)}</span>
                    <div className="tx-summ-indicator"></div>
                </div>
            </div>

            {/* ── Filters ── */}
            <div className="tx-filters-card">
                <div className="tx-filters-grid">
                    {/* Search */}
                    <div className="tx-search-wrapper">
                        <Search className="tx-search-icon" size={18} />
                        <input
                            className="input-field"
                            placeholder="Pesquisar por descrição ou categoria..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>

                    {/* Month */}
                    <div className="tx-filter-item">
                        <Input
                            type="month"
                            value={filterMonth}
                            onChange={e => setFilterMonth(e.target.value)}
                            disabled={isPeriodActive}
                            className={isPeriodActive ? 'tx-disabled' : ''}
                        />
                    </div>

                    {/* Type */}
                    <div className="tx-filter-item">
                        <Select
                            options={[
                                { value: 'ALL', label: 'Todos os Tipos' },
                                { value: 'INCOME', label: 'Receitas' },
                                { value: 'EXPENSE', label: 'Despesas' }
                            ]}
                            value={filterType}
                            onChange={e => setFilterType(e.target.value)}
                        />
                    </div>

                    {/* Fixed vs Variable */}
                    <div className="tx-filter-item">
                        <Select
                            options={[
                                { value: 'ALL', label: 'Todas (Fixas/Var.)' },
                                { value: 'FIXED', label: 'Apenas Fixas' },
                                { value: 'VARIABLE', label: 'Apenas Variáveis' }
                            ]}
                            value={filterFixed}
                            onChange={e => setFilterFixed(e.target.value as any)}
                        />
                    </div>

                    {/* Category Filter */}
                    <div className="tx-filter-item">
                        <Select
                            options={[
                                { value: 'ALL', label: 'Todas as Categorias' },
                                ...data.categories.map(c => ({ value: c.id, label: c.name }))
                            ]}
                            value={filterCategoryId}
                            onChange={e => setFilterCategoryId(e.target.value)}
                        />
                    </div>

                    {/* Date Start */}
                    <div className="tx-filter-item tx-filter-date">
                        <Calendar size={14} className="tx-date-icon" />
                        <input
                            type="date"
                            className="input-field"
                            value={dateStart}
                            onChange={e => setDateStart(e.target.value)}
                            title="Data inicial"
                        />
                    </div>

                    {/* Date End */}
                    <div className="tx-filter-item tx-filter-date">
                        <Calendar size={14} className="tx-date-icon" />
                        <input
                            type="date"
                            className="input-field"
                            value={dateEnd}
                            onChange={e => setDateEnd(e.target.value)}
                            title="Data final"
                        />
                    </div>

                    {/* Clear filters */}
                    <div className="tx-filter-item">
                        <button
                            className={`tx-clear-btn ${hasActiveFilters ? 'active' : ''}`}
                            onClick={clearAllFilters}
                            disabled={!hasActiveFilters}
                            title="Limpar todos os filtros"
                        >
                            <X size={16} />
                            <span>Limpar</span>
                        </button>
                    </div>
                </div>

                {/* Period active indicator */}
                {isPeriodActive && (
                    <div className="tx-period-notice">
                        <Calendar size={14} />
                        <span>Período personalizado ativo — filtro de mês desabilitado</span>
                    </div>
                )}
            </div>

            {/* ── Active Filter Chips ── */}
            {activeChips.length > 0 && (
                <div className="tx-chips-container">
                    {activeChips.map((chip, i) => (
                        <div key={i} className="tx-chip">
                            <span>{chip.label}</span>
                            <button onClick={chip.onRemove} className="tx-chip-remove">
                                <X size={14} />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* ── List Content ── */}
            <div className="tx-list-container">
                {/* Mobile Sort Dropdown */}
                <div className="tx-mobile-sort-bar">
                    <SlidersHorizontal size={18} />
                    <select
                        className="input-field"
                        value={sort.column || ''}
                        onChange={e => {
                            const val = e.target.value as SortColumn | '';
                            if (val === '') {
                                setSort({ column: null, direction: null });
                            } else {
                                setSort(prev => ({ column: val, direction: prev.direction || 'asc' }));
                            }
                        }}
                    >
                        <option value="">Ordenar por...</option>
                        {SORT_COLUMNS.map(c => (
                            <option key={c.key} value={c.key}>{c.label}</option>
                        ))}
                    </select>
                    <select
                        className="input-field"
                        value={sort.direction || 'asc'}
                        onChange={e => {
                            if (sort.column) {
                                setSort(prev => ({ ...prev, direction: e.target.value as SortDirection }));
                            }
                        }}
                        disabled={!sort.column}
                    >
                        <option value="asc">A-Z ↑</option>
                        <option value="desc">Z-A ↓</option>
                    </select>
                </div>

                <div className="tx-table-wrapper">
                    {filteredTransactions.length === 0 ? (
                        <div className="tx-empty-state">
                            <Filter size={64} />
                            <p>Nenhum lançamento encontrado para os filtros selecionados.</p>
                            {hasActiveFilters && (
                                <Button variant="secondary" onClick={clearAllFilters} size="sm">
                                    Limpar Filtros
                                </Button>
                            )}
                        </div>
                    ) : (
                        <>
                            {/* Desktop Header */}
                            <div className="tx-grid-header">
                                <span className="tx-header-col">ID</span>
                                <button className="tx-header-col sortable" onClick={() => handleSort('description')}>
                                    Descrição <SortIcon column="description" />
                                </button>
                                <button className="tx-header-col sortable" onClick={() => handleSort('category')}>
                                    Categoria <SortIcon column="category" />
                                </button>
                                <button className="tx-header-col sortable" onClick={() => handleSort('date')}>
                                    Data <SortIcon column="date" />
                                </button>
                                <button className="tx-header-col sortable tx-align-right" onClick={() => handleSort('amount')}>
                                    Valor <SortIcon column="amount" />
                                </button>
                                <button className="tx-header-col sortable" onClick={() => handleSort('method')}>
                                    Método <SortIcon column="method" />
                                </button>
                                <span className="tx-header-col tx-align-right">Ações</span>
                            </div>

                            {/* List of Transactions */}
                            <div className="tx-items-list">
                                {displayedTransactions.map(tx => {
                                    const cat = categoryMap.get(tx.categoryId);
                                    const catName = cat?.name || 'Geral';
                                    const catColor = cat?.color || '#94a3b8';
                                    const isExpense = tx.type === 'EXPENSE';
                                    const shortId = tx.id.substring(0, 6).toUpperCase();

                                    return (
                                        <div key={tx.id} className="tx-grid-row">
                                            {/* Column: ID */}
                                            <div className="tx-col-id">
                                                <span className="tx-id-text">#{shortId}</span>
                                            </div>

                                            {/* Column: Description */}
                                            <div className="tx-col-description">
                                                <div className="tx-status-indicator" style={{ backgroundColor: catColor }} />
                                                <span className="tx-description-text" title={tx.description}>
                                                    {tx.description}
                                                    {tx.isFixed && <Anchor size={12} className="tx-fixed-icon" style={{ marginLeft: '6px', color: 'var(--color-primary)', opacity: 0.7 }} />}
                                                    {tx.attachments && tx.attachments.length > 0 && (
                                                        <button
                                                            className="tx-att-indicator"
                                                            onClick={(e) => { e.stopPropagation(); setViewingAttachments(tx.attachments!); }}
                                                            title={`${tx.attachments.length} anexo(s)`}
                                                        >
                                                            <Paperclip size={12} />
                                                        </button>
                                                    )}
                                                </span>
                                            </div>

                                            {/* Column: Category */}
                                            <div className="tx-col-category">
                                                <span
                                                    className="tx-category-badge"
                                                    style={{
                                                        backgroundColor: `${catColor}15`,
                                                        color: catColor,
                                                        borderColor: `${catColor}30`
                                                    }}
                                                >
                                                    {catName}
                                                </span>
                                            </div>

                                            {/* Column: Date */}
                                            <div className="tx-col-date">
                                                {formatDate(tx.date)}
                                            </div>

                                            {/* Column: Amount */}
                                            <div className={`tx-col-amount ${isExpense ? 'expense' : 'income'}`}>
                                                {isExpense ? '- ' : '+ '}{formatCurrency(tx.amount)}
                                            </div>

                                            {/* Column: Method */}
                                            <div className="tx-col-method">
                                                {(() => {
                                                    const method = tx.paymentMethodId ? paymentMethodMap.get(tx.paymentMethodId) : null;
                                                    const mName = method?.name || 'Geral';
                                                    const mColor = method?.color || '#94a3b8';
                                                    return (
                                                        <span
                                                            className="tx-method-badge"
                                                            style={{
                                                                color: mColor,
                                                                backgroundColor: `${mColor}12`,
                                                                borderColor: `${mColor}30`
                                                            }}
                                                        >
                                                            {mName}
                                                        </span>
                                                    );
                                                })()}
                                            </div>

                                            {/* Column: Actions */}
                                            <div className="tx-col-actions">
                                                {lockedTransactionIds.has(tx.id) ? (
                                                    <div className="tx-lock-badge" title="Este lançamento está vinculado a um compromisso pago e só pode ser alterado na sessão de Compromissos.">
                                                        <Lock size={16} className="text-text-light opacity-60" />
                                                    </div>
                                                ) : (
                                                    <>
                                                        <button className="tx-btn-icon" onClick={() => handleEdit(tx)} title="Editar">
                                                            <Edit size={18} />
                                                        </button>
                                                        <button className="tx-btn-icon danger" onClick={() => handleDelete(tx.id)} title="Excluir">
                                                            <Trash2 size={18} />
                                                        </button>
                                                    </>
                                                )}
                                            </div>

                                            {/* Mobile Card Layout */}
                                            <div className="tx-mobile-card">
                                                <div className="tx-card-row">
                                                    <span className="tx-card-description">{tx.description}</span>
                                                    <span
                                                        className="tx-category-badge"
                                                        style={{
                                                            backgroundColor: `${catColor}15`,
                                                            color: catColor,
                                                            borderColor: `${catColor}30`
                                                        }}
                                                    >
                                                        {catName}
                                                    </span>
                                                </div>
                                                <div className="tx-card-row secondary">
                                                    <span className="tx-card-date">
                                                        {formatDate(tx.date)}
                                                    </span>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        {(() => {
                                                            const method = tx.paymentMethodId ? paymentMethodMap.get(tx.paymentMethodId) : null;
                                                            return method && (
                                                                <span className="tx-method-badge-mini" style={{ color: method.color, backgroundColor: `${method.color}15` }}>
                                                                    {method.name}
                                                                </span>
                                                            );
                                                        })()}
                                                        <span className={`tx-card-amount ${isExpense ? 'expense' : 'income'}`}>
                                                            {isExpense ? '- ' : '+ '}{formatCurrency(tx.amount)}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="tx-card-actions">
                                                    {lockedTransactionIds.has(tx.id) ? (
                                                        <div className="tx-lock-badge-mobile">
                                                            <Lock size={14} />
                                                            <span>Vinculado a Compromisso (Bloqueado)</span>
                                                        </div>
                                                    ) : (
                                                        <>
                                                            <button className="tx-btn-icon" onClick={() => handleEdit(tx)}>
                                                                <Edit size={18} />
                                                                <span>Editar</span>
                                                            </button>
                                                            <button className="tx-btn-icon danger" onClick={() => handleDelete(tx.id)}>
                                                                <Trash2 size={18} />
                                                                <span>Excluir</span>
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            <Pagination
                                currentPage={currentPage}
                                totalPages={totalPages}
                                onPageChange={setCurrentPage}
                                totalItems={filteredTransactions.length}
                                itemsPerPage={ITEMS_PER_PAGE}
                            />
                        </>
                    )}
                </div>
            </div>

            {/* ── Modal ── */}
            <Modal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                title={editingTx ? "Editar Lançamento" : "Novo Lançamento"}
            >
                <TransactionForm
                    onClose={handleCloseModal}
                    initialData={editingTx || voiceData}
                />
            </Modal>

            <VoiceAssistant
                isOpen={isVoiceAssistantOpen}
                onClose={() => setIsVoiceAssistantOpen(false)}
                onResult={handleVoiceResult}
            />

            <AttachmentViewer
                isOpen={!!viewingAttachments}
                onClose={() => setViewingAttachments(null)}
                attachments={viewingAttachments || []}
            />
        </div>
    );
};

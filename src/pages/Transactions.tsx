import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import {
    Plus, Search, Filter, Calendar, X,
    Trash2, Edit2, RefreshCcw, Lock,
    TrendingUp, TrendingDown, Target,
    ArrowUpDown, ArrowUp, ArrowDown,
    Anchor, Paperclip, SlidersHorizontal
} from 'lucide-react';
import { useData } from '../contexts/DataContext';
import { Transaction, Attachment, Category, PaymentMethod, Supplier, Commitment } from '../models/types';
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
type SortColumn = 'description' | 'category' | 'date' | 'amount' | 'method' | 'supplier';
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
    { key: 'supplier', label: 'Fornecedor' },
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
    const [filterMonth, setFilterMonth] = useState<string>('');
    const [dateStart, setDateStart] = useState('');
    const [dateEnd, setDateEnd] = useState('');
    const [filterFixed, setFilterFixed] = useState<'ALL' | 'FIXED' | 'VARIABLE'>('ALL');
    const [filterCategoryId, setFilterCategoryId] = useState<string>('ALL');
    const [filterSupplierId, setFilterSupplierId] = useState<string>('ALL');

    // Reset page to 1 when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, filterType, filterMonth, dateStart, dateEnd, filterFixed, filterCategoryId, filterSupplierId]);

    // Handle incoming state from Dashboard or Voice Assistant
    useEffect(() => {
        if (!location.state) return;

        // Voice assistant prefill: open form with pre-parsed data
        if (location.state.openForm && location.state.voicePrefill) {
            const vp = location.state.voicePrefill as any;
            setVoiceData(vp);
            setEditingTx(undefined);
            setIsModalOpen(true);
            // Salvar o transcrito original para aprendizado
            if (location.state.transcript) {
                (vp as any).transcript = location.state.transcript;
            }
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
        data.categories.forEach((c: Category) => map.set(c.id, { name: c.name, color: c.color || '#94a3b8' }));
        return map;
    }, [data.categories]);

    const paymentMethodMap = useMemo(() => {
        const map = new Map<string, { name: string; color: string }>();
        data.paymentMethods.forEach((m: PaymentMethod) => map.set(m.id, { name: m.name, color: m.color || '#94a3b8' }));
        return map;
    }, [data.paymentMethods]);

    const supplierMap = useMemo(() => {
        const map = new Map<string, string>();
        data.suppliers.forEach((s: Supplier) => map.set(s.id, s.name));
        return map;
    }, [data.suppliers]);

    // ── Locked Transactions (from commitments) ──
    const lockedTransactionIds = useMemo(() => {
        const ids = new Set<string>();
        data.commitments?.forEach((c: Commitment) => {
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
        let result = data.transactions.filter((t: Transaction) => {
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
                const supplierName = supplierMap.get(t.supplierId || '') || '';
                const matches = (
                    normalizeSearch(t.description).includes(needle) ||
                    normalizeSearch(catName).includes(needle) ||
                    normalizeSearch(supplierName).includes(needle)
                );
                if (!matches) return false;
            }

            // 4. Fixed filter
            if (filterFixed === 'FIXED' && !t.isFixed) return false;
            if (filterFixed === 'VARIABLE' && t.isFixed) return false;

            // 5. Category filter
            if (filterCategoryId !== 'ALL' && t.categoryId !== filterCategoryId) return false;

            // 6. Supplier filter
            if (filterSupplierId !== 'ALL' && t.supplierId !== filterSupplierId) return false;

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
                    case 'supplier': {
                        const supplierA = supplierMap.get(a.supplierId || '') || '';
                        const supplierB = supplierMap.get(b.supplierId || '') || '';
                        cmp = compareLocalePTBR(supplierA, supplierB);
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
    }, [data.transactions, filterMonth, filterType, searchTerm, filterFixed, categoryMap, supplierMap, isPeriodActive, effectiveDates, sort, filterCategoryId, filterSupplierId]);

    // Pagination Logic
    const totalPages = Math.ceil(filteredTransactions.length / ITEMS_PER_PAGE);
    const displayedTransactions = useMemo(() => {
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        return filteredTransactions.slice(startIndex, startIndex + ITEMS_PER_PAGE);
    }, [filteredTransactions, currentPage]);

    // ── Summary Stats (derived from ALL filtered data) ──
    const summaryStats = useMemo(() => {
        const income = filteredTransactions
            .filter((t: Transaction) => t.type === 'INCOME')
            .reduce((acc: number, t: Transaction) => acc + t.amount, 0);
        const expense = filteredTransactions
            .filter((t: Transaction) => t.type === 'EXPENSE')
            .reduce((acc: number, t: Transaction) => acc + t.amount, 0);
        return { income, expense, balance: income - expense };
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
        setSort((prev: SortState) => {
            if (prev.column !== column) return { column, direction: 'asc' };
            if (prev.direction === 'asc') return { column, direction: 'desc' };
            return { column: null, direction: null };
        });
    }, []);

    const clearAllFilters = useCallback(() => {
        setSearchTerm('');
        setFilterType('ALL');
        setFilterMonth('');
        setDateStart('');
        setDateEnd('');
        setFilterFixed('ALL');
        setFilterCategoryId('ALL');
        setFilterSupplierId('ALL');
        setSort({ column: null, direction: null });
        setCurrentPage(1);
    }, []);

    const hasActiveFilters = searchTerm !== '' || filterType !== 'ALL' || isPeriodActive || filterFixed !== 'ALL' || filterCategoryId !== 'ALL' || filterSupplierId !== 'ALL' || sort.column !== null;

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
        label: `Período: ${effectiveDates.start || '...'} → ${effectiveDates.end || '...'} `,
        onRemove: () => { setDateStart(''); setDateEnd(''); }
    });
    if (filterCategoryId !== 'ALL') {
        const catName = categoryMap.get(filterCategoryId)?.name || 'Categoria';
        activeChips.push({ label: `Categoria: ${catName} `, onRemove: () => setFilterCategoryId('ALL') });
    }
    if (filterSupplierId !== 'ALL') {
        const supName = supplierMap.get(filterSupplierId) || 'Fornecedor';
        activeChips.push({ label: `Fornecedor: ${supName} `, onRemove: () => setFilterSupplierId('ALL') });
    }

    if (sort.column) {
        const colLabel = SORT_COLUMNS.find(c => c.key === sort.column)?.label || '';
        activeChips.push({
            label: `Ordem: ${colLabel} ${sort.direction === 'asc' ? '↑' : '↓'} `,
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
                <div
                    className={`tx-summary-card income ${filterType === 'INCOME' ? 'active' : ''}`}
                    onClick={() => setFilterType(filterType === 'INCOME' ? 'ALL' : 'INCOME')}
                    title={filterType === 'INCOME' ? "Limpar filtro de Receitas" : "Filtrar apenas Receitas"}
                >
                    <div className="tx-summ-header">
                        <span className="tx-summ-label">Receitas</span>
                        <TrendingUp size={20} className="tx-summ-icon" />
                    </div>
                    <span className="tx-summ-value">{formatCurrency(summaryStats.income)}</span>
                    <div className="tx-summ-indicator"></div>
                </div>

                <div
                    className={`tx-summary-card expense ${filterType === 'EXPENSE' ? 'active' : ''}`}
                    onClick={() => setFilterType(filterType === 'EXPENSE' ? 'ALL' : 'EXPENSE')}
                    title={filterType === 'EXPENSE' ? "Limpar filtro de Despesas" : "Filtrar apenas Despesas"}
                >
                    <div className="tx-summ-header">
                        <span className="tx-summ-label">Despesas</span>
                        <TrendingDown size={20} className="tx-summ-icon" />
                    </div>
                    <span className="tx-summ-value">{formatCurrency(summaryStats.expense)}</span>
                    <div className="tx-summ-indicator"></div>
                </div>

                <div
                    className={`tx-summary-card balance ${summaryStats.balance >= 0 ? 'positive' : 'negative'} ${filterType === 'ALL' ? '' : 'inactive'}`}
                    onClick={() => setFilterType('ALL')}
                    title="Mostrar todos os lançamentos"
                >
                    <div className="tx-summ-header">
                        <span className="tx-summ-label">Resultado</span>
                        <Target size={20} className="tx-summ-icon" />
                    </div>
                    <span className="tx-summ-value">{formatCurrency(summaryStats.balance)}</span>
                    <div className="tx-summ-indicator"></div>
                </div>
            </div>

            {/* ── Filtros ── */}
            <div className="tx-filters-grid">
                {/* Row 1: Search and Business Filters */}
                <div className="tx-filters-row">
                    {/* Search */}
                    <div className="tx-filter-group tx-flex-grow-2">
                        <label className="tx-filter-label flex items-center gap-1">
                            <Search size={12} strokeWidth={2.5} />
                            Pesquisar
                        </label>
                        <div className="tx-search-wrapper">
                            <input
                                className="input-field"
                                placeholder="Descrição ou categoria..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Type */}
                    <div className="tx-filter-group">
                        <label className="tx-filter-label">Tipo</label>
                        <div className="tx-filter-item">
                            <Select
                                options={[
                                    { value: 'ALL', label: 'Todos' },
                                    { value: 'INCOME', label: 'Receitas' },
                                    { value: 'EXPENSE', label: 'Despesas' }
                                ]}
                                value={filterType}
                                onChange={e => setFilterType(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Fixed vs Variable */}
                    <div className="tx-filter-group">
                        <label className="tx-filter-label">Fixo/Var.</label>
                        <div className="tx-filter-item">
                            <Select
                                options={[
                                    { value: 'ALL', label: 'Todas' },
                                    { value: 'FIXED', label: 'Fixas' },
                                    { value: 'VARIABLE', label: 'Variáveis' }
                                ]}
                                value={filterFixed}
                                onChange={e => setFilterFixed(e.target.value as any)}
                            />
                        </div>
                    </div>

                    {/* Category */}
                    <div className="tx-filter-group">
                        <label className="tx-filter-label">Categoria</label>
                        <div className="tx-filter-item">
                            <Select
                                options={[
                                    { value: 'ALL', label: 'Todas' },
                                    ...data.categories.map(c => ({ value: c.id, label: c.name }))
                                ]}
                                value={filterCategoryId}
                                onChange={e => setFilterCategoryId(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Supplier */}
                    <div className="tx-filter-group">
                        <label className="tx-filter-label">Fornecedor</label>
                        <div className="tx-filter-item">
                            <Select
                                options={[
                                    { value: 'ALL', label: 'Todos' },
                                    ...data.suppliers.map(s => ({ value: s.id, label: s.name }))
                                ]}
                                value={filterSupplierId}
                                onChange={e => setFilterSupplierId(e.target.value)}
                            />
                        </div>
                    </div>
                </div>

                {/* Row 2: Temporal Controls and Actions */}
                <div className="tx-filters-row temporal">
                    <div className="tx-temporal-group">
                        {/* Month */}
                        <div className="tx-filter-group month-picker">
                            <label className="tx-filter-label">Mês</label>
                            <div className="tx-filter-item month-filter-wrapper">
                                <Input
                                    type="month"
                                    value={filterMonth}
                                    onChange={e => setFilterMonth(e.target.value)}
                                    disabled={isPeriodActive}
                                    className={`${isPeriodActive ? 'tx-disabled' : ''} ${!filterMonth ? 'all-months' : ''}`}
                                />
                                {filterMonth && (
                                    <button
                                        className="tx-month-clear"
                                        onClick={() => setFilterMonth('')}
                                        title="Mostrar todos os meses"
                                    >
                                        <X size={14} />
                                    </button>
                                )}
                                {!filterMonth && (
                                    <div className="tx-month-placeholder">Todos</div>
                                )}
                            </div>
                        </div>

                        <div className="tx-date-range-group">
                            {/* Custom Range */}
                            <div className="tx-filter-group tx-filter-date">
                                <label className="tx-filter-label">Intervalo Personalizado</label>
                                <div className="tx-date-inputs">
                                    <div className="tx-date-field">
                                        <Calendar size={12} className="tx-date-icon-mini" />
                                        <input
                                            type="date"
                                            className="input-field mini"
                                            value={dateStart}
                                            onChange={e => setDateStart(e.target.value)}
                                            placeholder="Início"
                                        />
                                    </div>
                                    <div className="tx-date-range-sep">—</div>
                                    <div className="tx-date-field">
                                        <Calendar size={12} className="tx-date-icon-mini" />
                                        <input
                                            type="date"
                                            className="input-field mini"
                                            value={dateEnd}
                                            onChange={e => setDateEnd(e.target.value)}
                                            placeholder="Fim"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Reset Action */}
                    <div className="tx-filter-group clear-action">
                        <label className="tx-filter-label">&nbsp;</label>
                        <button
                            className={`tx-clear-btn-premium ${hasActiveFilters ? 'active' : ''}`}
                            onClick={clearAllFilters}
                            disabled={!hasActiveFilters}
                            title="Limpar todos os filtros ativos"
                        >
                            <RefreshCcw size={14} />
                            <span>Redefinir</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Period active indicator */}
            {isPeriodActive && (
                <div className="tx-period-notice">
                    <Calendar size={14} />
                    <span>Período personalizado ativo — filtro de mês desabilitado</span>
                </div>
            )}

            {/* ── Active Filter Chips ── */}
            {
                activeChips.length > 0 && (
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
                )
            }

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
                                <span className="tx-header-col tx-centered">ID</span>
                                <button className="tx-header-col sortable" onClick={() => handleSort('description')}>
                                    Descrição <SortIcon column="description" />
                                </button>
                                <button className="tx-header-col sortable tx-centered" onClick={() => handleSort('category')}>
                                    Categoria <SortIcon column="category" />
                                </button>
                                <button className="tx-header-col sortable tx-centered" onClick={() => handleSort('date')}>
                                    Data <SortIcon column="date" />
                                </button>
                                <button className="tx-header-col sortable tx-align-right" onClick={() => handleSort('amount')}>
                                    Valor <SortIcon column="amount" />
                                </button>
                                <button className="tx-header-col sortable tx-centered" onClick={() => handleSort('method')}>
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
                                                <div className="tx-desc-content">
                                                    <div className="tx-desc-main">
                                                        <span className="tx-description-text" title={tx.description}>
                                                            {tx.description}
                                                        </span>
                                                        {tx.isFixed && <Anchor size={12} className="tx-fixed-icon" style={{ marginLeft: '4px', color: 'var(--color-primary)', opacity: 0.7 }} />}
                                                        {tx.attachments && tx.attachments.length > 0 && (
                                                            <button
                                                                className="tx-att-indicator"
                                                                onClick={(e) => { e.stopPropagation(); setViewingAttachments(tx.attachments!); }}
                                                                title={`${tx.attachments.length} anexo(s)`}
                                                            >
                                                                <Paperclip size={12} />
                                                            </button>
                                                        )}
                                                    </div>
                                                    {tx.supplierId && (
                                                        <span className="tx-supplier-under">
                                                            {supplierMap.get(tx.supplierId)}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            {/* Column: Category */}
                                            <div className="tx-col-category tx-centered">
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
                                            <div className="tx-col-date tx-centered">
                                                {formatDate(tx.date)}
                                            </div>

                                            {/* Column: Amount */}
                                            <div className={`tx-col-amount ${isExpense ? 'expense' : 'income'}`}>
                                                {isExpense ? '- ' : '+ '}{formatCurrency(tx.amount)}
                                            </div>

                                            {/* Column: Method */}
                                            <div className="tx-col-method tx-centered">
                                                {(() => {
                                                    const method = tx.paymentMethodId ? paymentMethodMap.get(tx.paymentMethodId) : null;
                                                    const mName = method?.name || 'Geral';
                                                    return (
                                                        <span className="tx-method-badge">
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
                                                            <Edit2 size={18} />
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
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                                        <span className="tx-card-description">{tx.description}</span>
                                                        {tx.supplierId && (
                                                            <span className="tx-supplier-text-mini">
                                                                {supplierMap.get(tx.supplierId)}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <span
                                                        className="tx-category-badge-mini"
                                                        style={{
                                                            color: catColor,
                                                            backgroundColor: `${catColor}15`,
                                                            borderColor: `${catColor}40`,
                                                            border: '1px solid'
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
                                                                <span className="tx-method-badge-mini">
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
                                                                <Edit2 size={18} />
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
        </div >
    );
};

import React, { useState, useMemo, useEffect } from 'react';
import { useData } from '../contexts/DataContext';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { CommitmentForm } from '../components/forms/CommitmentForm';
import { PayCommitmentModal } from '../components/modals/PayCommitmentModal';
import { AttachmentViewer } from '../components/ui/AttachmentViewer';
import { Attachment } from '../models/types';
import {
    Calendar, AlertCircle, CheckCircle2,
    Plus, Search, Trash2,
    Edit, CreditCard, Clock, Paperclip,
    ArrowUpDown, ArrowUp, ArrowDown,
    BrainCircuit, Sparkles, Zap, TrendingDown,
    ShieldCheck
} from 'lucide-react';
import { formatCurrency, formatDate } from '../utils/format';
import { isToday, isBefore, parseISO, startOfDay } from 'date-fns';
import './Commitments.css';

import { Pagination } from '../components/ui/Pagination';

export const Commitments: React.FC = () => {
    const { data, deleteCommitment } = useData();
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [supplierFilter, setSupplierFilter] = useState('ALL');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingCommitment, setEditingCommitment] = useState<any>(null);
    const [payingCommitment, setPayingCommitment] = useState<any>(null);
    const [viewingAttachments, setViewingAttachments] = useState<Attachment[] | null>(null);
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({
        key: 'dueDate',
        direction: 'asc'
    });

    // ── Pagination State ──
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 20;

    // Reset page to 1 on filter changes
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, statusFilter, supplierFilter, startDate, endDate]);

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

    const commitments = data.commitments || [];

    const handleSort = (key: string) => {
        setSortConfig(prev => ({
            key,
            direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
        }));
    };

    const getSortIcon = (key: string) => {
        if (sortConfig.key !== key) return <ArrowUpDown size={14} className="opacity-30" />;
        return sortConfig.direction === 'asc'
            ? <ArrowUp size={14} className="text-primary" />
            : <ArrowDown size={14} className="text-primary" />;
    };

    // Filtered data
    const filteredCommitments = useMemo(() => {
        let result = commitments.filter(c => {
            const matchesSearch = c.description.toLowerCase().includes(searchTerm.toLowerCase());

            // Status filter logic
            let matchesStatus = true;
            if (statusFilter !== 'ALL') {
                const dueDate = parseISO(c.dueDate);
                const today = startOfDay(new Date());
                const isOverdue = c.status === 'PENDING' && isBefore(dueDate, today);

                if (statusFilter === 'PAID') matchesStatus = c.status === 'PAID';
                else if (statusFilter === 'PENDING') matchesStatus = c.status === 'PENDING' && !isOverdue;
                else if (statusFilter === 'OVERDUE') matchesStatus = isOverdue;
            }

            // Supplier filter
            const matchesSupplier = supplierFilter === 'ALL' || c.supplierId === supplierFilter;

            // Date filter
            let matchesDate = true;
            if (startDate || endDate) {
                const cDate = parseISO(c.dueDate);
                if (startDate && isBefore(cDate, startOfDay(parseISO(startDate)))) matchesDate = false;
                if (endDate && isBefore(startOfDay(parseISO(endDate)), cDate)) matchesDate = false;
            }

            return matchesSearch && matchesStatus && matchesSupplier && matchesDate;
        });


        return result.sort((a, b) => {
            let valA: any, valB: any;

            switch (sortConfig.key) {
                case 'description':
                    valA = a.description.toLowerCase();
                    valB = b.description.toLowerCase();
                    break;
                case 'dueDate':
                    valA = new Date(a.dueDate).getTime();
                    valB = new Date(b.dueDate).getTime();
                    break;
                case 'amount':
                    valA = a.amount;
                    valB = b.amount;
                    break;
                case 'status':
                    valA = a.status;
                    valB = b.status;
                    break;
                case 'paymentMethod':
                    valA = data.paymentMethods.find(m => m.id === a.paymentMethodId)?.name.toLowerCase() || '';
                    valB = data.paymentMethods.find(m => m.id === b.paymentMethodId)?.name.toLowerCase() || '';
                    break;
                case 'paymentDate':
                    valA = a.paymentDate ? new Date(a.paymentDate).getTime() : 0;
                    valB = b.paymentDate ? new Date(b.paymentDate).getTime() : 0;
                    break;
                default:
                    valA = 0;
                    valB = 0;
            }

            if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
            if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
    }, [commitments, searchTerm, statusFilter, supplierFilter, startDate, endDate, sortConfig, data.paymentMethods]);

    // Pagination Logic
    const totalPages = Math.ceil(filteredCommitments.length / ITEMS_PER_PAGE);
    const displayedCommitments = useMemo(() => {
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        return filteredCommitments.slice(startIndex, startIndex + ITEMS_PER_PAGE);
    }, [filteredCommitments, currentPage]);

    const clearFilters = () => {
        setSearchTerm('');
        setStatusFilter('ALL');
        setSupplierFilter('ALL');
        setStartDate('');
        setEndDate('');
        setCurrentPage(1);
    };

    // Stats - Dynamic based on ALL filteredCommitments
    const stats = useMemo(() => {
        const actualPendingOnly = filteredCommitments.filter(c => c.status === 'PENDING');
        const paid = filteredCommitments.filter(c => c.status === 'PAID');
        const dueToday = actualPendingOnly.filter(c => isToday(parseISO(c.dueDate)));

        return {
            totalPending: actualPendingOnly.reduce((acc, c) => acc + c.amount, 0),
            totalPaid: paid.reduce((acc, c) => acc + c.amount, 0),
            countToday: dueToday.length,
            amountToday: dueToday.reduce((acc, c) => acc + c.amount, 0)
        };
    }, [filteredCommitments]);

    const aiInsights = useMemo(() => {
        const pending = commitments.filter(c => c.status === 'PENDING');
        const today = startOfDay(new Date());
        const overdue = pending.filter(c => isBefore(parseISO(c.dueDate), today));
        const next7Days = pending.filter(c => {
            const d = parseISO(c.dueDate);
            const diff = Math.ceil((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
            return diff >= 0 && diff <= 7;
        });

        const insights = [];

        if (overdue.length > 0) {
            const totalOverdue = overdue.reduce((acc, c) => acc + c.amount, 0);
            insights.push({
                type: 'warning',
                icon: <AlertCircle size={18} />,
                title: 'Alerta de Inadimplência',
                desc: `Você tem ${overdue.length} ${overdue.length === 1 ? 'boleto vencido' : 'boletos vencidos'} somando ${formatCurrency(totalOverdue)}. Pague o quanto antes para evitar juros crescentes.`,
                badge: 'Crítico'
            });
        }

        if (next7Days.length > 0) {
            const totalNext = next7Days.reduce((acc, c) => acc + c.amount, 0);
            insights.push({
                type: 'info',
                icon: <Zap size={18} />,
                title: 'Fluxo Próxima Semana',
                desc: `${next7Days.length} compromissos vencem nos próximos 7 dias. Prepare sua reserva de ${formatCurrency(totalNext)} para manter a pontualidade.`,
                badge: 'Atenção'
            });
        }

        // Category concentration
        const catCounts: Record<string, number> = {};
        pending.forEach(c => {
            catCounts[c.categoryId] = (catCounts[c.categoryId] || 0) + c.amount;
        });
        const topCatId = Object.entries(catCounts).sort((a, b) => b[1] - a[1])[0]?.[0];
        if (topCatId) {
            const catName = categoryMap.get(topCatId)?.name || 'nesta categoria';
            insights.push({
                type: 'success',
                icon: <TrendingDown size={18} />,
                title: 'Otimização de Custos',
                desc: `Sua maior concentração de contas pendentes está em "${catName}". Revise se há serviços redundantes ou possibilidade de negociação nestes contratos.`,
                badge: 'Dica Elite'
            });
        }

        if (insights.length === 0) {
            insights.push({
                type: 'success',
                icon: <ShieldCheck size={18} />,
                title: 'Saúde Financeira Impecável',
                desc: 'Nenhum boleto vencido ou próximo do vencimento detectado. Sua gestão de compromissos está em nível de elite.',
                badge: 'Excelente'
            });
        }

        return insights.slice(0, 3);
    }, [commitments, categoryMap]);

    const handleEdit = (c: any) => {
        setEditingCommitment(c);
        setIsFormOpen(true);
    };

    const handleDelete = (id: string) => {
        if (confirm('Deseja excluir este compromisso?')) {
            deleteCommitment(id);
        }
    };

    const getStatusLabel = (c: any) => {
        if (c.status === 'PAID') {
            return (
                <span className="cm-status-badge paid">
                    PAGO
                </span>
            );
        }
        const dueDate = parseISO(c.dueDate);
        const today = startOfDay(new Date());
        if (isBefore(dueDate, today)) return <span className="cm-status-badge overdue">Vencido</span>;
        return <span className="cm-status-badge pending">Pendente</span>;
    };

    return (
        <div className="cm-page">
            <header className="cm-header">
                <div className="cm-header-left">
                    <h1 className="flex items-center gap-3">
                        <Calendar size={32} className="text-primary" />
                        Compromissos
                    </h1>
                    <span className="cm-counter">{filteredCommitments.length} compromissos no total</span>
                </div>
                <Button onClick={() => setIsFormOpen(true)} variant="primary" className="shadow-3d rounded-2xl py-3 px-6 font-bold flex gap-2">
                    <Plus size={20} />
                    Novo Compromisso
                </Button>
            </header>

            <div className="cm-summary-grid">
                <div className="cm-summary-card pending">
                    <div className="cm-summ-icon"><Clock size={24} /></div>
                    <span className="cm-summ-label">Total Pendente</span>
                    <span className="cm-summ-value">{formatCurrency(stats.totalPending)}</span>
                    <div className="cm-summ-indicator"></div>
                </div>
                <div className="cm-summary-card today">
                    <div className="cm-summ-icon"><AlertCircle size={24} /></div>
                    <span className="cm-summ-label">Vencendo Hoje</span>
                    <span className="cm-summ-value">{formatCurrency(stats.amountToday)}</span>
                    <div className="cm-summ-indicator"></div>
                </div>
                <div className="cm-summary-card paid">
                    <div className="cm-summ-icon"><CheckCircle2 size={24} /></div>
                    <span className="cm-summ-label">Total Pago</span>
                    <span className="cm-summ-value">{formatCurrency(stats.totalPaid)}</span>
                    <div className="cm-summ-indicator"></div>
                </div>
            </div>

            <div className="cm-ai-card-premium shadow-3d mb-2">
                <div className="cm-ai-card-header">
                    <div className="flex items-center gap-3">
                        <div className="cm-ai-icon-pulse">
                            <BrainCircuit size={24} className="text-primary" />
                        </div>
                        <div>
                            <h2 className="cm-ai-title">Centro de Inteligência de Boletos</h2>
                            <p className="cm-ai-subtitle">Análise preditiva de compromissos e fluxo de caixa</p>
                        </div>
                    </div>
                    <div className="cm-ai-badge-elite">
                        <Sparkles size={14} />
                        Insight I.A.
                    </div>
                </div>

                <div className="cm-ai-grid-modern">
                    {aiInsights.map((insight, idx) => (
                        <div key={idx} className={`cm-ai-item-elite ${insight.type}`}>
                            <div className="cm-ai-item-head">
                                <div className="cm-ai-item-icon">{insight.icon}</div>
                                <span className="cm-ai-item-badge">{insight.badge}</span>
                            </div>
                            <h3 className="cm-ai-item-title">{insight.title}</h3>
                            <p className="cm-ai-item-desc">{insight.desc}</p>
                        </div>
                    ))}
                </div>
            </div>

            <div className="cm-filter-wrapper">
                <div className="cm-filter-bar">
                    <div className="cm-search-wrapper">
                        <Search size={18} className="cm-search-icon" />
                        <input
                            type="text"
                            placeholder="Buscar por descrição..."
                            className="cm-search-input"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <div className="cm-filters-row">
                        <div className="cm-filter-group">
                            <label>Status</label>
                            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                                <option value="ALL">Todos os Status</option>
                                <option value="PENDING">Pendentes</option>
                                <option value="PAID">Pagos</option>
                                <option value="OVERDUE">Vencidos</option>
                            </select>
                        </div>

                        <div className="cm-filter-group">
                            <label>Fornecedor</label>
                            <select value={supplierFilter} onChange={e => setSupplierFilter(e.target.value)}>
                                <option value="ALL">Todos os Fornecedores</option>
                                {data.suppliers.map(s => (
                                    <option key={s.id} value={s.id}>{s.name}</option>
                                ))}
                            </select>
                        </div>

                        <div className="cm-filter-group">
                            <label>Período</label>
                            <div className="cm-date-range">
                                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
                                <span>até</span>
                                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
                            </div>
                        </div>

                        {(searchTerm || statusFilter !== 'ALL' || supplierFilter !== 'ALL' || startDate || endDate) && (
                            <button className="cm-clear-btn" onClick={clearFilters} title="Limpar Filtros">
                                <Trash2 size={16} />
                            </button>
                        )}
                    </div>
                </div>
            </div>

            <div className="cm-list-card">
                <div className="cm-list-body">
                    {filteredCommitments.length === 0 ? (
                        <div className="p-10 text-center text-text-light font-medium opacity-60">
                            Nenhum compromisso encontrado com esses filtros.
                        </div>
                    ) : (
                        <>
                            <div className="cm-grid-row header">
                                <div className="cm-col-id">ID</div>
                                <div className="cm-col-name sortable" onClick={() => handleSort('description')}>
                                    Nome {getSortIcon('description')}
                                </div>
                                <div className="cm-col-date sortable" onClick={() => handleSort('dueDate')}>
                                    Vencimento {getSortIcon('dueDate')}
                                </div>
                                <div className="cm-col-value sortable" onClick={() => handleSort('amount')}>
                                    Valor {getSortIcon('amount')}
                                </div>
                                <div className="cm-col-status sortable" onClick={() => handleSort('status')}>
                                    Status {getSortIcon('status')}
                                </div>
                                <div className="cm-col-method sortable" onClick={() => handleSort('paymentMethod')}>
                                    Pagamento {getSortIcon('paymentMethod')}
                                </div>
                                <div className="cm-col-paydate sortable" onClick={() => handleSort('paymentDate')}>
                                    Pago em {getSortIcon('paymentDate')}
                                </div>
                                <div className="cm-col-edit">Ações</div>
                            </div>

                            {displayedCommitments.map(c => {
                                const shortId = c.id.substring(0, 6).toUpperCase();
                                const cat = categoryMap.get(c.categoryId);
                                const catColor = cat?.color || '#94a3b8';

                                return (
                                    <div key={c.id} className={`cm-grid-row ${c.status === 'PAID' ? 'paid' : ''}`}>
                                        <div className="cm-col-id">
                                            <span className="cm-id-text">#{shortId}</span>
                                        </div>
                                        <div className="cm-col-name">
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '2px' }}>
                                                <div className="cm-status-indicator" style={{ backgroundColor: catColor }} />
                                                <div className="cm-name-text">{c.description}</div>
                                                {c.attachments && c.attachments.length > 0 && (
                                                    <button
                                                        className="tx-att-indicator"
                                                        onClick={(e) => { e.stopPropagation(); setViewingAttachments(c.attachments!); }}
                                                        title={`${c.attachments.length} anexo(s)`}
                                                    >
                                                        <Paperclip size={11} />
                                                    </button>
                                                )}
                                            </div>
                                            <span className="cm-supplier-text">
                                                {c.supplierId ? (data.suppliers.find(s => s.id === c.supplierId)?.name || '') : ''}
                                            </span>
                                        </div>
                                        <div className="cm-col-date font-bold text-text-light text-sm">
                                            {formatDate(c.dueDate)}
                                        </div>
                                        <div className="cm-col-value">{formatCurrency(c.amount)}</div>
                                        <div className="cm-col-status">{getStatusLabel(c)}</div>
                                        <div className="cm-col-method">
                                            {(() => {
                                                const method = c.paymentMethodId ? paymentMethodMap.get(c.paymentMethodId) : null;
                                                const mName = method?.name || '-';
                                                const mColor = method?.color || '#94a3b8';
                                                if (!c.paymentMethodId) return <span className="text-text-light opacity-40">-</span>;
                                                return (
                                                    <span
                                                        className="cm-method-badge"
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
                                        <div className="cm-col-paydate">
                                            {c.paymentDate ? (
                                                <div className="cm-paid-at">
                                                    <CheckCircle2 size={12} className="text-success" />
                                                    <span>{formatDate(c.paymentDate)}</span>
                                                </div>
                                            ) : (
                                                <span className="text-text-light opacity-30">-</span>
                                            )}
                                        </div>
                                        <div className="cm-col-edit flex gap-2">
                                            {c.status === 'PENDING' && (
                                                <button className="cm-mini-pay-btn" onClick={() => setPayingCommitment(c)} title="Pagar">
                                                    <CreditCard size={14} />
                                                </button>
                                            )}
                                            <button onClick={() => handleEdit(c)} className="p-2 hover:bg-gray-100 rounded-lg text-text-light" title="Editar">
                                                <Edit size={16} />
                                            </button>
                                            <button onClick={() => handleDelete(c.id)} className="p-2 hover:bg-red-50 rounded-lg text-danger" title="Excluir">
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}

                            <Pagination
                                currentPage={currentPage}
                                totalPages={totalPages}
                                onPageChange={setCurrentPage}
                                totalItems={filteredCommitments.length}
                                itemsPerPage={ITEMS_PER_PAGE}
                            />
                        </>
                    )}
                </div>
            </div>

            <Modal
                isOpen={isFormOpen}
                onClose={() => { setIsFormOpen(false); setEditingCommitment(null); }}
                title={editingCommitment ? 'Editar Compromisso' : 'Novo Compromisso'}
            >
                <CommitmentForm
                    onClose={() => { setIsFormOpen(false); setEditingCommitment(null); }}
                    editingCommitment={editingCommitment}
                />
            </Modal>

            <Modal
                isOpen={!!payingCommitment}
                onClose={() => setPayingCommitment(null)}
                title="Pagar Compromisso"
            >
                {payingCommitment && (
                    <PayCommitmentModal
                        commitment={payingCommitment}
                        onClose={() => setPayingCommitment(null)}
                    />
                )}
            </Modal>

            <AttachmentViewer
                isOpen={!!viewingAttachments}
                onClose={() => setViewingAttachments(null)}
                attachments={viewingAttachments || []}
            />
        </div>
    );
};

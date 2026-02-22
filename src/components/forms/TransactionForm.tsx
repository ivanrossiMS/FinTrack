import React, { useState, useEffect } from 'react';
import { useData } from '../../contexts/DataContext';
import { Transaction, TransactionType } from '../../models/types';
import { Button } from '../ui/Button';
import { Input, Select } from '../ui/Input';
import { format } from 'date-fns';
import { Tag, DollarSign, Calendar, Layers, Building2, CreditCard, ArrowUpRight, ArrowDownLeft, Repeat, Plus, Palette } from 'lucide-react';
import { formatCurrency } from '../../utils/format';
import { AttachmentManager } from '../ui/AttachmentManager';
import { Attachment } from '../../models/types';

interface TransactionFormProps {
    onClose: () => void;
    initialData?: Partial<Transaction>;
}

export const TransactionForm: React.FC<TransactionFormProps> = ({ onClose, initialData }) => {
    const { data, addTransaction, updateTransaction, addCategory, addSupplier } = useData();

    const [type, setType] = useState<TransactionType>(initialData?.type || 'EXPENSE');
    const [amount, setAmount] = useState(initialData?.amount?.toString() || '');
    const [description, setDescription] = useState(initialData?.description || '');
    const [date, setDate] = useState(initialData?.date ? initialData.date.split('T')[0] : format(new Date(), 'yyyy-MM-dd'));
    const [categoryId, setCategoryId] = useState(initialData?.categoryId || '');
    const [supplierId, setSupplierId] = useState(initialData?.supplierId || '');
    const [paymentMethodId, setPaymentMethodId] = useState(initialData?.paymentMethodId || '');
    const [isFixed, setIsFixed] = useState(initialData?.isFixed || false);
    const [installments, setInstallments] = useState('1');
    const [isRecurring, setIsRecurring] = useState(initialData?.isRecurring || false);
    const [recurrenceCount, setRecurrenceCount] = useState(initialData?.recurrenceCount?.toString() || '2');
    const [attachments, setAttachments] = useState<Attachment[]>(initialData?.attachments || []);

    // Inline Creation States
    const [isCreatingCategory, setIsCreatingCategory] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState('');
    const [newCategoryColor, setNewCategoryColor] = useState('#3b82f6');
    const [isCreatingSupplier, setIsCreatingSupplier] = useState(false);
    const [newSupplierName, setNewSupplierName] = useState('');

    const availableCategories = data.categories.filter(c => c.type === type || c.type === 'BOTH');

    useEffect(() => {
        if (!categoryId && availableCategories.length > 0) {
            setCategoryId(availableCategories[0].id);
        }
    }, [type]);

    useEffect(() => {
        if (!paymentMethodId && data.paymentMethods.length > 0) {
            setPaymentMethodId(data.paymentMethods[0].id);
        }
    }, [data.paymentMethods]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const val = parseFloat(amount.replace(',', '.'));
        if (isNaN(val) || val <= 0) return;
        if (!description.trim()) return;

        let finalCategoryId = categoryId;
        let finalSupplierId = supplierId;

        // 1. Handle Inline Category Creation
        if (isCreatingCategory && newCategoryName.trim()) {
            finalCategoryId = await addCategory({
                name: newCategoryName.trim(),
                type: type as 'INCOME' | 'EXPENSE',
                color: newCategoryColor,
                isDefault: false
            });
        }

        // 2. Handle Inline Supplier Creation
        if (isCreatingSupplier && newSupplierName.trim()) {
            finalSupplierId = await addSupplier({
                name: newSupplierName.trim()
            });
        }

        const payload = {
            type,
            amount: val,
            description,
            date,
            categoryId: finalCategoryId,
            supplierId: finalSupplierId || undefined,
            paymentMethodId: paymentMethodId || undefined,
            isFixed,
            isRecurring: type === 'INCOME' ? isRecurring : false,
            installments: parseInt(installments) > 1 ? parseInt(installments) : undefined,
            recurrenceCount: (type === 'INCOME' && isRecurring) ? parseInt(recurrenceCount) : undefined,
            attachments
        };

        if (initialData && initialData.id) {
            await updateTransaction(initialData.id, payload);
        } else {
            await addTransaction(payload);
        }
        onClose();
    };

    return (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Type Switcher */}
            <div style={{ display: 'flex', padding: '4px', backgroundColor: '#f1f5f9', borderRadius: '14px' }}>
                <button
                    type="button"
                    onClick={() => setType('INCOME')}
                    style={{
                        flex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem',
                        padding: '0.65rem',
                        borderRadius: '11px',
                        fontWeight: 700,
                        fontSize: '0.875rem',
                        transition: 'all 0.2s',
                        backgroundColor: type === 'INCOME' ? '#38a169' : 'transparent',
                        color: type === 'INCOME' ? 'white' : '#64748b',
                        boxShadow: type === 'INCOME' ? '0 2px 8px rgba(56,161,105,0.3)' : 'none',
                    }}
                >
                    <ArrowUpRight size={16} />
                    Receita
                </button>
                <button
                    type="button"
                    onClick={() => setType('EXPENSE')}
                    style={{
                        flex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem',
                        padding: '0.65rem',
                        borderRadius: '11px',
                        fontWeight: 700,
                        fontSize: '0.875rem',
                        transition: 'all 0.2s',
                        backgroundColor: type === 'EXPENSE' ? '#e53e3e' : 'transparent',
                        color: type === 'EXPENSE' ? 'white' : '#64748b',
                        boxShadow: type === 'EXPENSE' ? '0 2px 8px rgba(229,62,62,0.3)' : 'none',
                    }}
                >
                    <ArrowDownLeft size={16} />
                    Despesa
                </button>
            </div>

            {/* Form Fields - Clean vertical stack */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <Input
                    label="Descrição"
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    placeholder="Ex: Supermercado, Salário..."
                    required
                    icon={<Tag size={16} />}
                />

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <Input
                        label="Valor (R$)"
                        type="number"
                        step="0.01"
                        value={amount}
                        onChange={e => setAmount(e.target.value)}
                        placeholder="0,00"
                        required
                        icon={<DollarSign size={16} />}
                    />
                    <Input
                        label="Data"
                        type="date"
                        value={date}
                        onChange={e => setDate(e.target.value)}
                        required
                        icon={<Calendar size={16} />}
                    />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <Select
                            label="Categoria"
                            value={isCreatingCategory ? 'CREATE_NEW' : categoryId}
                            onChange={e => {
                                if (e.target.value === 'CREATE_NEW') {
                                    setIsCreatingCategory(true);
                                    setCategoryId('');
                                } else {
                                    setIsCreatingCategory(false);
                                    setCategoryId(e.target.value);
                                }
                            }}
                            icon={<Layers size={16} />}
                            options={[
                                ...availableCategories.map(c => ({ value: c.id, label: c.name })),
                                { value: 'CREATE_NEW', label: '✨ CRIAR nova categoria...' }
                            ]}
                        />
                        {isCreatingCategory && (
                            <div style={{
                                padding: '1rem',
                                backgroundColor: '#fcf8ff',
                                borderRadius: '12px',
                                border: '1.5px dashed #d8b4fe',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '0.75rem',
                                animation: 'fadeIn 0.3s ease-out'
                            }}>
                                <Input
                                    label="Nome da Categoria"
                                    value={newCategoryName}
                                    onChange={e => setNewCategoryName(e.target.value)}
                                    placeholder="Ex: Presentes, Obra..."
                                    required
                                    icon={<Plus size={14} color="#9333ea" />}
                                />
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                    <Palette size={14} color="#9333ea" />
                                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#6b21a8' }}>Cor:</span>
                                    <input
                                        type="color"
                                        value={newCategoryColor}
                                        onChange={e => setNewCategoryColor(e.target.value)}
                                        style={{ width: '40px', height: '20px', border: 'none', padding: 0, cursor: 'pointer', borderRadius: '4px' }}
                                    />
                                    <span style={{ fontSize: '0.7rem', color: '#9333ea', fontWeight: 700 }}>{newCategoryColor.toUpperCase()}</span>
                                </div>
                            </div>
                        )}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <Select
                            label="Pagamento"
                            value={paymentMethodId}
                            onChange={e => setPaymentMethodId(e.target.value)}
                            icon={<CreditCard size={16} />}
                            options={data.paymentMethods.map(m => ({ value: m.id, label: m.name }))}
                        />
                    </div>
                </div>

                {/* Parcelamento - Só aparece se for Cartão de Crédito */}
                {(() => {
                    const method = data.paymentMethods.find(m => m.id === paymentMethodId);
                    const isCreditCard = method?.name.toLowerCase().includes('cartão de crédito') || method?.name.toLowerCase().includes('credito');

                    if (!isCreditCard) return null;

                    return (
                        <div style={{
                            backgroundColor: '#f8fafc',
                            padding: '1rem',
                            borderRadius: '12px',
                            border: '1px dashed #e2e8f0',
                            animation: 'fadeIn 0.3s ease-out'
                        }}>
                            <Select
                                label="Número de Parcelas"
                                value={installments}
                                onChange={e => setInstallments(e.target.value)}
                                icon={<Layers size={16} />}
                                options={[
                                    { value: '1', label: 'À vista' },
                                    { value: '2', label: '2x' },
                                    { value: '3', label: '3x' },
                                    { value: '4', label: '4x' },
                                    { value: '5', label: '5x' },
                                    { value: '6', label: '6x' },
                                    { value: '7', label: '7x' },
                                    { value: '8', label: '8x' },
                                    { value: '9', label: '9x' },
                                    { value: '10', label: '10x' },
                                    { value: '11', label: '11x' },
                                    { value: '12', label: '12x' },
                                ]}
                            />
                            <p style={{ fontSize: '0.6875rem', color: '#64748b', marginTop: '0.5rem', fontWeight: 500 }}>
                                * O valor unitário de cada parcela será de <strong>{formatCurrency(parseFloat(amount.replace(',', '.')) || 0)}</strong>.
                                <br />* Serão gerados {installments} lançamentos mensais automáticos.
                            </p>
                        </div>
                    );
                })()}

                {/* ── Receita Recorrente ── */}
                {type === 'INCOME' && (
                    <div style={{
                        borderRadius: '14px',
                        border: isRecurring ? '1.5px solid #34d399' : '1.5px solid #e2e8f0',
                        background: isRecurring ? 'rgba(16, 185, 129, 0.04)' : '#ffffff',
                        overflow: 'hidden',
                        transition: 'all 0.25s ease',
                        animation: 'fadeIn 0.3s ease-out',
                    }}>
                        <div
                            onClick={() => setIsRecurring(!isRecurring)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '0.85rem 1rem',
                                cursor: 'pointer',
                                userSelect: 'none' as const,
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <div style={{
                                    width: '36px', height: '36px', borderRadius: '10px',
                                    background: isRecurring ? 'linear-gradient(135deg, #059669, #10b981)' : '#f1f5f9',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    transition: 'all 0.25s ease',
                                }}>
                                    <Repeat size={16} color={isRecurring ? 'white' : '#94a3b8'} strokeWidth={2.5} />
                                </div>
                                <div>
                                    <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#1e293b', display: 'block' }}>
                                        Receita Recorrente
                                    </span>
                                    <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 500 }}>
                                        Gera múltiplos lançamentos automáticos
                                    </span>
                                </div>
                            </div>
                            <div style={{
                                width: '48px', height: '26px',
                                borderRadius: '999px',
                                backgroundColor: isRecurring ? '#10b981' : '#e2e8f0',
                                position: 'relative',
                                transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
                                boxShadow: isRecurring ? '0 0 12px rgba(16, 185, 129, 0.3)' : 'none',
                                flexShrink: 0,
                            }}>
                                <div style={{
                                    width: '20px', height: '20px',
                                    borderRadius: '50%',
                                    backgroundColor: '#ffffff',
                                    position: 'absolute',
                                    top: '3px',
                                    left: isRecurring ? '25px' : '3px',
                                    transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
                                    boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
                                }} />
                            </div>
                        </div>

                        {isRecurring && (
                            <div style={{
                                marginTop: '1rem',
                                paddingTop: '0.85rem',
                                borderTop: '1px dashed rgba(56, 161, 105, 0.2)',
                                animation: 'fadeIn 0.3s ease-out',
                            }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.75rem' }}>
                                    {['2', '3', '6', '12'].map(n => (
                                        <button
                                            key={n}
                                            type="button"
                                            onClick={() => setRecurrenceCount(n)}
                                            style={{
                                                padding: '0.5rem',
                                                borderRadius: '10px',
                                                fontWeight: 700,
                                                fontSize: '0.8rem',
                                                border: recurrenceCount === n ? '2px solid #38a169' : '1px solid #e2e8f0',
                                                background: recurrenceCount === n ? 'rgba(56, 161, 105, 0.08)' : 'white',
                                                color: recurrenceCount === n ? '#38a169' : '#64748b',
                                                cursor: 'pointer',
                                                transition: 'all 0.2s',
                                            }}
                                        >
                                            {n}x meses
                                        </button>
                                    ))}
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', whiteSpace: 'nowrap' }}>Personalizar:</span>
                                    <input
                                        type="number"
                                        min="2"
                                        max="48"
                                        value={recurrenceCount}
                                        onChange={e => setRecurrenceCount(e.target.value)}
                                        style={{
                                            flex: 1,
                                            padding: '0.45rem 0.75rem',
                                            borderRadius: '10px',
                                            border: '1px solid #e2e8f0',
                                            fontSize: '0.8rem',
                                            fontWeight: 700,
                                            textAlign: 'center',
                                            outline: 'none',
                                        }}
                                    />
                                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>meses</span>
                                </div>
                                <p style={{
                                    fontSize: '0.7rem',
                                    color: '#38a169',
                                    fontWeight: 600,
                                    marginTop: '0.65rem',
                                    padding: '0.5rem 0.75rem',
                                    background: 'rgba(56, 161, 105, 0.06)',
                                    borderRadius: '8px',
                                    margin: '0.65rem 0 0 0',
                                }}>
                                    ✨ Serão gerados <strong>{recurrenceCount}</strong> lançamentos de <strong>{formatCurrency(parseFloat(amount.replace(',', '.')) || 0)}</strong> cada, mensalmente.
                                </p>
                            </div>
                        )}
                    </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <Select
                        label="Fornecedor (Opcional)"
                        value={isCreatingSupplier ? 'CREATE_NEW' : supplierId}
                        onChange={e => {
                            if (e.target.value === 'CREATE_NEW') {
                                setIsCreatingSupplier(true);
                                setSupplierId('');
                            } else {
                                setIsCreatingSupplier(false);
                                setSupplierId(e.target.value);
                            }
                        }}
                        icon={<Building2 size={16} />}
                        options={[
                            { value: '', label: 'Nenhum' },
                            ...data.suppliers.map(s => ({ value: s.id, label: s.name })),
                            { value: 'CREATE_NEW', label: '✨ CRIAR novo fornecedor...' }
                        ]}
                    />
                    {isCreatingSupplier && (
                        <div style={{
                            padding: '1rem',
                            backgroundColor: '#f0f9ff',
                            borderRadius: '12px',
                            border: '1.5px dashed #7dd3fc',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.75rem',
                            animation: 'fadeIn 0.3s ease-out'
                        }}>
                            <Input
                                label="Nome do Fornecedor"
                                value={newSupplierName}
                                onChange={e => setNewSupplierName(e.target.value)}
                                placeholder="Ex: Amazon, Mercado Livre..."
                                required
                                icon={<Plus size={14} color="#0369a1" />}
                            />
                        </div>
                    )}
                </div>

                <div
                    onClick={() => setIsFixed(!isFixed)}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.85rem 1rem',
                        borderRadius: '14px',
                        border: isFixed ? '1.5px solid #818cf8' : '1.5px solid #e2e8f0',
                        background: isFixed ? 'rgba(99, 102, 241, 0.04)' : '#ffffff',
                        cursor: 'pointer',
                        transition: 'all 0.25s ease',
                        userSelect: 'none' as const,
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{
                            width: '36px', height: '36px', borderRadius: '10px',
                            background: isFixed ? 'linear-gradient(135deg, #6366f1, #818cf8)' : '#f1f5f9',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            transition: 'all 0.25s ease',
                        }}>
                            <Calendar size={16} color={isFixed ? 'white' : '#94a3b8'} strokeWidth={2.5} />
                        </div>
                        <div>
                            <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#1e293b', display: 'block' }}>
                                Lançamento Fixo
                            </span>
                            <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 500 }}>
                                Repete todo mês automaticamente
                            </span>
                        </div>
                    </div>
                    <div style={{
                        width: '48px', height: '26px',
                        borderRadius: '999px',
                        backgroundColor: isFixed ? '#6366f1' : '#e2e8f0',
                        position: 'relative',
                        transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
                        boxShadow: isFixed ? '0 0 12px rgba(99, 102, 241, 0.3)' : 'none',
                        flexShrink: 0,
                    }}>
                        <div style={{
                            width: '20px', height: '20px',
                            borderRadius: '50%',
                            backgroundColor: '#ffffff',
                            position: 'absolute',
                            top: '3px',
                            left: isFixed ? '25px' : '3px',
                            transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
                        }} />
                    </div>
                </div>

                <AttachmentManager attachments={attachments} onChange={setAttachments} />
            </div>

            {/* Footer */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.75rem', borderTop: '1px solid #f1f5f9' }}>
                <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
                <Button type="submit" variant="primary">{initialData && (initialData as any).id ? 'Salvar' : 'Confirmar'}</Button>
            </div>
        </form>
    );
};

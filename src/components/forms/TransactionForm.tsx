import React, { useState, useEffect } from 'react';
import { useData } from '../../contexts/DataContext';
import { Transaction, TransactionType } from '../../models/types';
import { Button } from '../ui/Button';
import { Input, Select } from '../ui/Input';
import { format } from 'date-fns';
import { Tag, DollarSign, Calendar, Layers, Building2, CreditCard, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { formatCurrency } from '../../utils/format';
import { AttachmentManager } from '../ui/AttachmentManager';
import { Attachment } from '../../models/types';

interface TransactionFormProps {
    onClose: () => void;
    initialData?: Partial<Transaction>;
}

export const TransactionForm: React.FC<TransactionFormProps> = ({ onClose, initialData }) => {
    const { data, addTransaction, updateTransaction } = useData();

    const [type, setType] = useState<TransactionType>(initialData?.type || 'EXPENSE');
    const [amount, setAmount] = useState(initialData?.amount?.toString() || '');
    const [description, setDescription] = useState(initialData?.description || '');
    const [date, setDate] = useState(initialData?.date ? initialData.date.split('T')[0] : format(new Date(), 'yyyy-MM-dd'));
    const [categoryId, setCategoryId] = useState(initialData?.categoryId || '');
    const [supplierId, setSupplierId] = useState(initialData?.supplierId || '');
    const [paymentMethodId, setPaymentMethodId] = useState(initialData?.paymentMethodId || '');
    const [isFixed, setIsFixed] = useState(initialData?.isFixed || false);
    const [installments, setInstallments] = useState('1');
    const [attachments, setAttachments] = useState<Attachment[]>(initialData?.attachments || []);

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

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const val = parseFloat(amount.replace(',', '.'));
        if (isNaN(val) || val <= 0) return;
        if (!description.trim()) return;

        const payload = {
            type,
            amount: val,
            description,
            date,
            categoryId,
            supplierId: supplierId || undefined,
            paymentMethodId: paymentMethodId || undefined,
            isFixed,
            installments: parseInt(installments) > 1 ? parseInt(installments) : undefined,
            attachments
        };

        if (initialData && initialData.id) {
            updateTransaction(initialData.id, payload);
        } else {
            addTransaction(payload);
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
                    <Select
                        label="Categoria"
                        value={categoryId}
                        onChange={e => setCategoryId(e.target.value)}
                        icon={<Layers size={16} />}
                        options={availableCategories.map(c => ({ value: c.id, label: c.name }))}
                    />
                    <Select
                        label="Pagamento"
                        value={paymentMethodId}
                        onChange={e => setPaymentMethodId(e.target.value)}
                        icon={<CreditCard size={16} />}
                        options={data.paymentMethods.map(m => ({ value: m.id, label: m.name }))}
                    />
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

                <Select
                    label="Fornecedor (Opcional)"
                    value={supplierId}
                    onChange={e => setSupplierId(e.target.value)}
                    icon={<Building2 size={16} />}
                    options={[
                        { value: '', label: 'Nenhum' },
                        ...data.suppliers.map(s => ({ value: s.id, label: s.name }))
                    ]}
                />

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem 0' }}>
                    <div style={{ position: 'relative' }}>
                        <input
                            type="checkbox"
                            id="isFixed"
                            checked={isFixed}
                            onChange={e => setIsFixed(e.target.checked)}
                            style={{
                                width: '40px',
                                height: '22px',
                                appearance: 'none',
                                backgroundColor: isFixed ? 'var(--color-primary)' : '#e2e8f0',
                                borderRadius: '999px',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                position: 'relative',
                            }}
                        />
                    </div>
                    <label htmlFor="isFixed" style={{ fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer' }}>
                        Lançamento fixo (mensal)
                    </label>
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

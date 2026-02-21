import React, { useState } from 'react';
import { Button } from '../ui/Button';
import { Select } from '../ui/Input';
import { useData } from '../../contexts/DataContext';
import { Commitment } from '../../models/types';
import { CreditCard, CheckCircle, Layers } from 'lucide-react';
import { formatCurrency, formatDate } from '../../utils/format';

interface PayCommitmentModalProps {
    commitment: Commitment;
    onClose: () => void;
}

export const PayCommitmentModal: React.FC<PayCommitmentModalProps> = ({ commitment, onClose }) => {
    const { data, payCommitment } = useData();
    const [paymentMethodId, setPaymentMethodId] = useState('');
    const [installments, setInstallments] = useState('1');
    const [error, setError] = useState('');

    const handleConfirm = () => {
        if (!paymentMethodId) {
            setError('Selecione o método de pagamento para continuar.');
            return;
        }
        payCommitment(commitment.id, paymentMethodId, parseInt(installments) > 1 ? parseInt(installments) : undefined);
        onClose();
    };

    const supplier = commitment.supplierId
        ? data.suppliers.find(s => s.id === commitment.supplierId)?.name
        : null;

    return (
        <form onSubmit={e => { e.preventDefault(); handleConfirm(); }} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {error && (
                <div style={{
                    backgroundColor: '#fff5f5',
                    color: '#e53e3e',
                    padding: '0.75rem 1rem',
                    borderRadius: '12px',
                    fontSize: '0.8125rem',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                }}>
                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#e53e3e' }} />
                    {error}
                </div>
            )}

            {/* Commitment Info Card */}
            <div style={{
                backgroundColor: '#f8fafc',
                padding: '1.25rem',
                borderRadius: '14px',
                border: '1px dashed #e2e8f0',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem'
            }}>
                <span style={{ fontSize: '0.6875rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#94a3b8' }}>
                    Confirmação de Pagamento
                </span>
                <span style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--color-text)' }}>
                    {commitment.description}
                </span>
                <span style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--color-primary)' }}>
                    {formatCurrency(commitment.amount)}
                </span>
                <div style={{ display: 'flex', gap: '1rem', marginTop: '0.25rem', fontSize: '0.75rem', color: '#94a3b8', fontWeight: 500 }}>
                    <span>Vencimento: {formatDate(commitment.dueDate)}</span>
                    {supplier && <span>Fornecedor: {supplier}</span>}
                </div>
            </div>

            {/* Payment Method */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <Select
                    label="Método de Pagamento"
                    value={paymentMethodId}
                    onChange={e => setPaymentMethodId(e.target.value)}
                    required
                    icon={<CreditCard size={16} />}
                    options={[
                        { value: '', label: 'Selecione o método' },
                        ...data.paymentMethods.map(m => ({ value: m.id, label: m.name }))
                    ]}
                />

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
                            border: '1px dashed var(--color-primary-light)',
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
                                * O valor unitário de cada parcela será de <strong>{formatCurrency(commitment.amount)}</strong>.
                                <br />* Serão gerados {installments} lançamentos mensais automáticos.
                            </p>
                        </div>
                    );
                })()}
            </div>

            {/* Note */}
            <p style={{ fontSize: '0.6875rem', color: '#a0aec0', fontWeight: 500, fontStyle: 'italic', lineHeight: 1.5 }}>
                Ao confirmar, esta conta será marcada como paga e um lançamento de saída será criado automaticamente.
            </p>

            {/* Footer */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', paddingTop: '0.75rem', borderTop: '1px solid #f1f5f9', gap: '0.75rem' }}>
                <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
                <Button type="submit" variant="primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <CheckCircle size={16} />
                    Confirmar Pagamento
                </Button>
            </div>
        </form>
    );
};

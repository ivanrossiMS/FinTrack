import React, { useState } from 'react';
import { Button } from '../ui/Button';
import { Input, Select } from '../ui/Input';
import { useData } from '../../contexts/DataContext';
import { Commitment, Attachment } from '../../models/types';
import { Calendar, DollarSign, Tag, Building2, Layers } from 'lucide-react';
import { AttachmentManager } from '../ui/AttachmentManager';

interface CommitmentFormProps {
    onClose: () => void;
    editingCommitment?: Commitment;
}

export const CommitmentForm: React.FC<CommitmentFormProps> = ({ onClose, editingCommitment }) => {
    const { data, addCommitment, updateCommitment } = useData();

    const [description, setDescription] = useState(editingCommitment?.description || '');
    const [amount, setAmount] = useState(editingCommitment?.amount?.toString() || '');
    const [dueDate, setDueDate] = useState(editingCommitment?.dueDate || new Date().toISOString().split('T')[0]);
    const [supplierId, setSupplierId] = useState(editingCommitment?.supplierId || '');
    const [categoryId, setCategoryId] = useState(editingCommitment?.categoryId || '');
    const [installments, setInstallments] = useState(editingCommitment?.totalInstallments?.toString() || '1');
    const [attachments, setAttachments] = useState<Attachment[]>(editingCommitment?.attachments || []);
    const [error, setError] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!description || !amount || !dueDate || !categoryId) {
            setError('Por favor, preencha todos os campos obrigatórios.');
            return;
        }

        const payload = {
            description,
            amount: parseFloat(amount),
            dueDate,
            supplierId: supplierId || undefined,
            categoryId,
            installments: parseInt(installments) > 1 ? parseInt(installments) : undefined,
            attachments
        };

        // Update only if there's an existing id; voice-prefill has no id, so creates new
        if (editingCommitment?.id) {
            updateCommitment(editingCommitment.id, payload);
        } else {
            addCommitment(payload);
        }

        onClose();
    };

    return (
        <form onSubmit={handleSubmit} id="commitment-form" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
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

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <Input
                    label="Nome do Compromisso"
                    placeholder="Ex: Aluguel, Internet, etc."
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    required
                    icon={<Tag size={16} />}
                />

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <Input
                        label="Valor"
                        type="number"
                        step="0.01"
                        placeholder="R$ 0,00"
                        value={amount}
                        onChange={e => setAmount(e.target.value)}
                        required
                        icon={<DollarSign size={16} />}
                    />
                    <Input
                        label="Vencimento"
                        type="date"
                        value={dueDate}
                        onChange={e => setDueDate(e.target.value)}
                        required
                        icon={<Calendar size={16} />}
                    />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
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
                    <Select
                        label="Categoria"
                        value={categoryId}
                        onChange={e => setCategoryId(e.target.value)}
                        required
                        icon={<Layers size={16} />}
                        options={[
                            { value: '', label: 'Selecione...' },
                            ...data.categories
                                .filter(c => c.type === 'EXPENSE' || c.type === 'BOTH')
                                .map(c => ({ value: c.id, label: c.name }))
                        ]}
                    />
                </div>

                {/* Parcelamento - Para compromissos também é útil */}
                {!editingCommitment && (
                    <div style={{
                        backgroundColor: '#f8fafc',
                        padding: '1rem',
                        borderRadius: '12px',
                        border: '1px solid #f1f5f9',
                        fontSize: '0.75rem',
                    }}>
                        <Select
                            label="Este compromisso é parcelado?"
                            value={installments}
                            onChange={e => setInstallments(e.target.value)}
                            icon={<Layers size={16} />}
                            options={[
                                { value: '1', label: 'Não (Lançamento único)' },
                                { value: '2', label: 'Sim, em 2x' },
                                { value: '3', label: 'Sim, em 3x' },
                                { value: '4', label: 'Sim, em 4x' },
                                { value: '5', label: 'Sim, em 5x' },
                                { value: '6', label: 'Sim, em 6x' },
                                { value: '7', label: 'Sim, em 7x' },
                                { value: '8', label: 'Sim, em 8x' },
                                { value: '9', label: 'Sim, em 9x' },
                                { value: '10', label: 'Sim, em 10x' },
                                { value: '11', label: 'Sim, em 11x' },
                                { value: '12', label: 'Sim, em 12x' },
                            ]}
                        />
                        {parseInt(installments) > 1 && (
                            <p style={{ fontSize: '0.6875rem', color: '#64748b', marginTop: '0.5rem', fontWeight: 500 }}>
                                * O valor total será dividido em {installments} parcelas mensais.
                            </p>
                        )}
                    </div>
                )}

                <AttachmentManager attachments={attachments} onChange={setAttachments} />
            </div>

            {/* Footer */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', paddingTop: '0.75rem', borderTop: '1px solid #f1f5f9', gap: '0.75rem' }}>
                <p style={{ fontSize: '0.6875rem', color: '#a0aec0', fontWeight: 500 }}>* Fornecedor é opcional</p>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
                    <Button type="submit" variant="primary">{editingCommitment ? 'Salvar' : 'Criar'}</Button>
                </div>
            </div>
        </form>
    );
};

import React, { useState } from 'react';
import { Button } from '../ui/Button';
import { Input, Select } from '../ui/Input';
import { useData } from '../../contexts/DataContext';
import { Commitment, Attachment } from '../../models/types';
import { Calendar, DollarSign, Tag, Building2, Layers, Plus, Palette } from 'lucide-react';
import { AttachmentManager } from '../ui/AttachmentManager';

interface CommitmentFormProps {
    onClose: () => void;
    editingCommitment?: Commitment;
}

export const CommitmentForm: React.FC<CommitmentFormProps> = ({ onClose, editingCommitment }) => {
    const { data, addCommitment, updateCommitment, addCategory, addSupplier } = useData();

    const [description, setDescription] = useState(editingCommitment?.description || '');
    const [amount, setAmount] = useState(editingCommitment?.amount?.toString() || '');
    const [dueDate, setDueDate] = useState(editingCommitment?.dueDate || new Date().toISOString().split('T')[0]);
    const [supplierId, setSupplierId] = useState(editingCommitment?.supplierId || '');
    const [categoryId, setCategoryId] = useState(editingCommitment?.categoryId || '');
    const [installments, setInstallments] = useState(editingCommitment?.totalInstallments?.toString() || '1');
    const [attachments, setAttachments] = useState<Attachment[]>(editingCommitment?.attachments || []);
    const [error, setError] = useState('');

    // Inline Creation States
    const [isCreatingCategory, setIsCreatingCategory] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState('');
    const [newCategoryColor, setNewCategoryColor] = useState('#3b82f6');
    const [isCreatingSupplier, setIsCreatingSupplier] = useState(false);
    const [newSupplierName, setNewSupplierName] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!description || !amount || (!categoryId && !isCreatingCategory)) {
            setError('Por favor, preencha todos os campos obrigatórios.');
            return;
        }

        let finalCategoryId = categoryId;
        let finalSupplierId = supplierId;

        // 1. Handle Inline Category Creation
        if (isCreatingCategory && newCategoryName.trim()) {
            finalCategoryId = await addCategory({
                name: newCategoryName.trim(),
                type: 'EXPENSE',
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
            description,
            amount: parseFloat(amount),
            dueDate,
            supplierId: finalSupplierId || undefined,
            categoryId: finalCategoryId,
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
                            required
                            icon={<Layers size={16} />}
                            options={[
                                { value: '', label: 'Selecione...' },
                                ...data.categories
                                    .filter(c => c.type === 'EXPENSE' || c.type === 'BOTH')
                                    .map(c => ({ value: c.id, label: c.name })),
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

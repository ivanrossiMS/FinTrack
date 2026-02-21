import * as React from 'react';
import { useState } from 'react';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { useData } from '../../contexts/DataContext';
import { Supplier } from '../../models/types';
import { Building2, Phone, FileText, Info } from 'lucide-react';

interface SupplierFormProps {
    onClose: () => void;
    initialData?: Supplier;
}

export const SupplierForm: React.FC<SupplierFormProps> = ({ onClose, initialData }) => {
    const { addSupplier, updateSupplier } = useData();
    const [name, setName] = useState(initialData?.name || '');
    const [document, setDocument] = useState(initialData?.contact?.split(' | ')[1] || '');
    const [phone, setPhone] = useState(initialData?.contact?.split(' | ')[0] || '');
    const [notes, setNotes] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const combinedContact = `${phone}${document ? ` | ${document}` : ''}`;

        if (initialData) {
            updateSupplier(initialData.id, { name, contact: combinedContact });
        } else {
            addSupplier({ name, contact: combinedContact });
        }
        onClose();
    };

    return (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <Input
                    label="Nome do Fornecedor"
                    value={name}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
                    required
                    autoFocus
                    placeholder="Ex: Supermercado Central, Distribuidora X..."
                    icon={<Building2 size={16} />}
                />

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <Input
                        label="Documento / CPF / CNPJ"
                        value={document}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDocument(e.target.value)}
                        placeholder="00.000.000/0000-00"
                        icon={<FileText size={16} />}
                    />
                    <Input
                        label="Telefone / Contato"
                        value={phone}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPhone(e.target.value)}
                        placeholder="(00) 00000-0000"
                        icon={<Phone size={16} />}
                    />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                    <label style={{
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        color: '#94a3b8',
                        textTransform: 'uppercase' as const,
                        letterSpacing: '0.04em',
                        marginLeft: '0.125rem',
                    }}>
                        Observações Adicionais
                    </label>
                    <textarea
                        placeholder="Notas importantes sobre este fornecedor..."
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        style={{
                            width: '100%',
                            padding: '0.75rem 1rem',
                            borderRadius: '12px',
                            border: '1.5px solid #e2e8f0',
                            backgroundColor: '#ffffff',
                            color: '#1e293b',
                            fontSize: '0.9375rem',
                            fontWeight: 500,
                            minHeight: '90px',
                            resize: 'none' as const,
                            outline: 'none',
                            fontFamily: 'inherit',
                            transition: 'all 0.2s ease',
                        }}
                        onFocus={e => { e.target.style.borderColor = '#818cf8'; e.target.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.08)'; }}
                        onBlur={e => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none'; }}
                    />
                </div>

                <div style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '0.65rem',
                    padding: '0.85rem 1rem',
                    borderRadius: '12px',
                    backgroundColor: '#f0f9ff',
                    border: '1px solid #bae6fd',
                }}>
                    <Info size={16} color="#0ea5e9" style={{ flexShrink: 0, marginTop: '1px' }} />
                    <p style={{ fontSize: '0.75rem', color: '#0369a1', fontWeight: 500, margin: 0, lineHeight: 1.5 }}>
                        Telefone e documento são combinados no campo "Contato" deste fornecedor.
                    </p>
                </div>
            </div>

            {/* Footer */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.75rem', borderTop: '1px solid #f1f5f9' }}>
                <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
                <Button type="submit" variant="primary">{initialData ? 'Salvar Alterações' : 'Criar Fornecedor'}</Button>
            </div>
        </form>
    );
};

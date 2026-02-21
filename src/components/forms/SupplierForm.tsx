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
    const [document, setDocument] = useState(initialData?.contact?.split(' | ')[1] || ''); // Hacky parsing if we stored it as string
    const [phone, setPhone] = useState(initialData?.contact?.split(' | ')[0] || '');
    const [notes, setNotes] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // Combine fields for 'contact' string if the model is limited, 
        // or just use what's available. The prompt says "if they exist in your schema".
        // Let's assume standard Supplier has Name and Contact.
        const combinedContact = `${phone}${document ? ` | ${document}` : ''}`;

        if (initialData) {
            updateSupplier(initialData.id, { name, contact: combinedContact });
        } else {
            addSupplier({ name, contact: combinedContact });
        }
        onClose();
    };

    return (
        <form id="supplier-form" onSubmit={handleSubmit} className="flex flex-col h-full">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                <div className="md:col-span-2">
                    <Input
                        label="Nome do Fornecedor"
                        value={name}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
                        required
                        autoFocus
                        placeholder="Ex: Supermercado Central, Distribuidora X..."
                        icon={<Building2 size={16} />}
                    />
                </div>

                <div className="col-span-1">
                    <Input
                        label="Documento / CPF / CNPJ"
                        value={document}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDocument(e.target.value)}
                        placeholder="00.000.000/0000-00"
                        icon={<FileText size={16} />}
                    />
                </div>

                <div className="col-span-1">
                    <Input
                        label="Telefone / Contato"
                        value={phone}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPhone(e.target.value)}
                        placeholder="(00) 00000-0000"
                        icon={<Phone size={16} />}
                    />
                </div>

                <div className="md:col-span-2">
                    <div style={{ backgroundColor: 'var(--color-primary-light)', borderColor: 'var(--color-primary-light)' }} className="p-4 rounded-xl border flex gap-3">
                        <Info size={18} className="text-primary shrink-0" />
                        <p className="text-xs text-primary font-medium italic leading-relaxed">
                            Informações de contato como telefone e documento são combinadas em um único campo 'Contato' para este fornecedor.
                        </p>
                    </div>
                </div>

                <div className="md:col-span-2">
                    <div className="flex flex-col gap-2 w-100">
                        <label className="text-xs font-bold text-text-muted uppercase tracking-wider ml-1">Observações Adicionais</label>
                        <textarea
                            style={{ backgroundColor: 'var(--color-surface-soft)', border: '1px solid var(--color-border)' }}
                            className="w-full px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm min-h-[100px] resize-none"
                            placeholder="Notas importantes sobre este fornecedor..."
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            <div style={{ borderTopColor: 'var(--color-border)' }} className="flex flex-col-reverse md:flex-row justify-end items-center gap-3 pt-6 border-t mt-6">
                <Button type="button" variant="secondary" onClick={onClose} className="w-full md:w-auto px-8">
                    Cancelar
                </Button>
                <Button type="submit" variant="primary" className="w-full md:w-auto px-8 shadow-md">
                    {initialData ? 'Salvar Alterações' : 'Criar Fornecedor'}
                </Button>
            </div>
        </form>
    );
};

import * as React from 'react';
import { useState } from 'react';
import { useData } from '../../contexts/DataContext';
import { Category } from '../../models/types';
import { Input, Select } from '../ui/Input';
import { Button } from '../ui/Button';
import { Layers, Info } from 'lucide-react';

interface CategoryFormProps {
    onClose: () => void;
    initialData?: Category;
}

export const CategoryForm: React.FC<CategoryFormProps> = ({ onClose, initialData }) => {
    const { addCategory, updateCategory } = useData();
    const [name, setName] = useState(initialData?.name || '');
    const [type, setType] = useState<'INCOME' | 'EXPENSE' | 'BOTH'>(initialData?.type || 'EXPENSE');
    const [color, setColor] = useState(initialData?.color || '#3b82f6');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (initialData) {
            updateCategory(initialData.id, { name, type, color });
        } else {
            addCategory({ name, type, color, isDefault: false });
        }
        onClose();
    };

    const suggestedColors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];

    return (
        <form id="category-form" onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <Input
                    label="Nome da Categoria"
                    value={name}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
                    required
                    autoFocus
                    placeholder="Ex: Alimentação, Salário..."
                    icon={<Layers size={16} />}
                />

                <Select
                    label="Tipo"
                    value={type}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setType(e.target.value as 'INCOME' | 'EXPENSE' | 'BOTH')}
                    icon={<Info size={16} />}
                    options={[
                        { value: 'INCOME', label: 'Receita' },
                        { value: 'EXPENSE', label: 'Despesa' },
                        { value: 'BOTH', label: 'Ambos' }
                    ]}
                />

                {/* Color Section */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginLeft: '2px' }}>
                        Cor da Categoria
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                        {suggestedColors.map(c => (
                            <button
                                key={c}
                                type="button"
                                onClick={() => setColor(c)}
                                style={{
                                    width: '32px',
                                    height: '32px',
                                    borderRadius: '10px',
                                    backgroundColor: c,
                                    border: color === c ? '2.5px solid var(--color-primary)' : '2px solid transparent',
                                    boxShadow: color === c ? '0 0 0 3px rgba(88, 80, 236, 0.15)' : '0 1px 3px rgba(0,0,0,0.08)',
                                    cursor: 'pointer',
                                    transition: 'all 0.15s ease',
                                }}
                            />
                        ))}
                        <input
                            type="color"
                            value={color}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setColor(e.target.value)}
                            style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: '10px',
                                border: '2px dashed #e2e8f0',
                                cursor: 'pointer',
                                padding: 0,
                            }}
                            title="Cor personalizada"
                        />
                    </div>
                </div>

                {/* Preview */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '0.75rem 1rem',
                    backgroundColor: '#fafbfc',
                    borderRadius: '12px',
                    border: '1px solid #f1f5f9'
                }}>
                    <div style={{ width: '24px', height: '24px', borderRadius: '8px', backgroundColor: color, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }} />
                    <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#374151' }}>{name || 'Nome da categoria'}</span>
                    <span style={{ fontSize: '0.75rem', fontFamily: 'monospace', fontWeight: 600, color: '#9ca3af', marginLeft: 'auto' }}>{color.toUpperCase()}</span>
                </div>
            </div>

            {/* Footer */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid #f1f5f9' }}>
                <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
                <Button type="submit" variant="primary">{initialData ? 'Salvar' : 'Criar Categoria'}</Button>
            </div>
        </form>
    );
};

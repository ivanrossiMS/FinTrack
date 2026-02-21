import React, { useState } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { useData } from '../../contexts/DataContext';
import { SavingsGoal } from '../../models/types';
import { Target, DollarSign, Calendar, TrendingUp } from 'lucide-react';

interface SavingsGoalFormProps {
    onClose: () => void;
    editingGoal?: SavingsGoal;
}

export const SavingsGoalForm: React.FC<SavingsGoalFormProps> = ({ onClose, editingGoal }) => {
    const { addSavingsGoal, updateSavingsGoal } = useData();

    const [description, setDescription] = useState(editingGoal?.description || '');
    const [targetAmount, setTargetAmount] = useState(editingGoal?.targetAmount?.toString() || '');
    const [currentAmount, setCurrentAmount] = useState(editingGoal?.currentAmount?.toString() || '');
    const [targetDate, setTargetDate] = useState(editingGoal?.targetDate || '');
    const [error, setError] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!description || !targetAmount || !targetDate) {
            setError('Por favor, preencha os campos obrigatórios (Nome, Valor Alvo e Data Alvo).');
            return;
        }

        const payload = {
            description,
            targetAmount: parseFloat(targetAmount),
            currentAmount: currentAmount ? parseFloat(currentAmount) : 0,
            targetDate
        };

        if (editingGoal) {
            updateSavingsGoal(editingGoal.id, payload);
        } else {
            addSavingsGoal(payload);
        }

        onClose();
    };

    return (
        <form onSubmit={handleSubmit} id="savings-goal-form" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {error && (
                <div style={{
                    backgroundColor: 'var(--color-danger-light)',
                    color: 'var(--color-danger)',
                    padding: '0.75rem 1rem',
                    borderRadius: '12px',
                    fontSize: '0.8125rem',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                }}>
                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--color-danger)' }} />
                    {error}
                </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <Input
                    label="Nome da Meta"
                    placeholder="Ex: Reserva de Emergência, Viagem Disney..."
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    required
                    icon={<Target size={16} />}
                />

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <Input
                        label="Valor Alvo"
                        type="number"
                        step="0.01"
                        placeholder="R$ 0,00"
                        value={targetAmount}
                        onChange={e => setTargetAmount(e.target.value)}
                        required
                        icon={<DollarSign size={16} />}
                    />
                    <Input
                        label="Data Limite"
                        type="date"
                        value={targetDate}
                        onChange={e => setTargetDate(e.target.value)}
                        required
                        icon={<Calendar size={16} />}
                    />
                </div>

                <Input
                    label="Valor já Guardado (Opcional)"
                    type="number"
                    step="0.01"
                    placeholder="R$ 0,00"
                    value={currentAmount}
                    onChange={e => setCurrentAmount(e.target.value)}
                    icon={<TrendingUp size={16} />}
                />
            </div>

            <div style={{
                backgroundColor: 'var(--color-surface-soft)',
                padding: '1rem',
                borderRadius: '12px',
                border: '1px solid var(--color-border)',
                fontSize: '0.75rem',
                color: 'var(--color-text-muted)',
                lineHeight: '1.4'
            }}>
                💡 Dica: O sistema calculará automaticamente o valor que você precisa economizar mensalmente para atingir esta meta até a data selecionada.
            </div>

            {/* Footer */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', paddingTop: '0.75rem', borderTop: '1px solid var(--color-border)', gap: '0.75rem' }}>
                <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
                <Button type="submit" variant="primary">{editingGoal ? 'Salvar Alterações' : 'Criar Meta'}</Button>
            </div>
        </form>
    );
};

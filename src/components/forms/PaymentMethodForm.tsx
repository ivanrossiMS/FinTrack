import * as React from 'react';
import { useState } from 'react';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { useData } from '../../contexts/DataContext';
import { PaymentMethod } from '../../models/types';
import { CreditCard, Info } from 'lucide-react';

interface PaymentMethodFormProps {
    onClose: () => void;
    initialData?: PaymentMethod;
}

export const PaymentMethodForm: React.FC<PaymentMethodFormProps> = ({ onClose, initialData }) => {
    const { addPaymentMethod, updatePaymentMethod } = useData();
    const [name, setName] = useState(initialData?.name || '');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (initialData) {
            updatePaymentMethod(initialData.id, { name });
        } else {
            addPaymentMethod({ name });
        }
        onClose();
    };

    return (
        <form id="method-form" onSubmit={handleSubmit} className="flex flex-col h-full">
            <div className="grid grid-cols-1 gap-y-5">
                <Input
                    label="Nome do Método de Pagamento"
                    value={name}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
                    required
                    autoFocus
                    placeholder="Ex: Cartão de Crédito, Pix, Dinheiro..."
                    icon={<CreditCard size={16} />}
                />

                <div className="bg-primary/5 p-4 rounded-xl border border-primary/10 flex gap-3">
                    <Info size={18} className="text-primary shrink-0" />
                    <p className="text-xs text-primary font-medium italic leading-relaxed">
                        Este nome será exibido na seleção de pagamentos durante os lançamentos. Escolha um nome claro para sua organização.
                    </p>
                </div>
            </div>

            <div className="flex flex-col-reverse md:flex-row justify-end items-center gap-3 pt-6 border-t border-gray-100 mt-6">
                <Button type="button" variant="secondary" onClick={onClose} className="w-full md:w-auto px-8">
                    Cancelar
                </Button>
                <Button type="submit" variant="primary" className="w-full md:w-auto px-8 shadow-md">
                    {initialData ? 'Salvar Alterações' : 'Criar Método'}
                </Button>
            </div>
        </form>
    );
};

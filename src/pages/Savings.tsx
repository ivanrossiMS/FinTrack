import React, { useState, useMemo } from 'react';
import { useData } from '../contexts/DataContext';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { SavingsGoalForm } from '../components/forms/SavingsGoalForm';
import {
    Target, Plus, TrendingUp, Calendar,
    Edit, Trash2, CheckCircle2,
    ArrowRightCircle
} from 'lucide-react';
import { formatCurrency, formatDate } from '../utils/format';
import { differenceInMonths, parseISO, startOfMonth } from 'date-fns';
import './Savings.css';

export const Savings: React.FC = () => {
    const { data, deleteSavingsGoal } = useData();
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingGoal, setEditingGoal] = useState<any>(null);

    const goals = data.savingsGoals || [];

    // Stats
    const stats = useMemo(() => {
        const totalTarget = goals.reduce((acc, g) => acc + g.targetAmount, 0);
        const totalSaved = goals.reduce((acc, g) => acc + g.currentAmount, 0);

        let totalMonthlyNeeded = 0;
        goals.forEach(g => {
            const remaining = g.targetAmount - g.currentAmount;
            if (remaining > 0) {
                const targetDate = parseISO(g.targetDate);
                const today = startOfMonth(new Date());
                const months = Math.max(1, differenceInMonths(targetDate, today));
                totalMonthlyNeeded += remaining / months;
            }
        });

        return {
            totalTarget,
            totalSaved,
            totalMonthlyNeeded,
            count: goals.length
        };
    }, [goals]);

    const handleEdit = (goal: any) => {
        setEditingGoal(goal);
        setIsFormOpen(true);
    };

    const handleDelete = (id: string) => {
        if (confirm('Deseja excluir esta meta de economia?')) {
            deleteSavingsGoal(id);
        }
    };

    const calculateMonthlyNeeded = (goal: any) => {
        const remaining = goal.targetAmount - goal.currentAmount;
        if (remaining <= 0) return 0;

        const targetDate = parseISO(goal.targetDate);
        const today = startOfMonth(new Date());
        const months = Math.max(1, differenceInMonths(targetDate, today));

        return remaining / months;
    };

    return (
        <div className="sav-page">
            <header className="sav-header">
                <div className="sav-header-left">
                    <h1 className="flex items-center gap-3">
                        <Target size={32} className="text-primary" />
                        Economia
                    </h1>
                    <span className="sav-counter">Minhas Metas de Poupança</span>
                </div>
                <Button onClick={() => setIsFormOpen(true)} variant="primary" className="shadow-3d rounded-2xl py-3 px-6 font-bold flex gap-2">
                    <Plus size={20} />
                    Nova Meta
                </Button>
            </header>

            <div className="sav-summary-grid">
                <div className="sav-summary-card total">
                    <div className="sav-summ-icon"><TrendingUp size={24} /></div>
                    <span className="sav-summ-label">Total Já Guardado</span>
                    <span className="sav-summ-value">{formatCurrency(stats.totalSaved)}</span>
                </div>
                <div className="sav-summary-card needed">
                    <div className="sav-summ-icon"><ArrowRightCircle size={24} /></div>
                    <span className="sav-summ-label">Necessário p/ Mês</span>
                    <span className="sav-summ-value">{formatCurrency(stats.totalMonthlyNeeded)}</span>
                </div>
                <div className="sav-summary-card goals">
                    <div className="sav-summ-icon"><CheckCircle2 size={24} /></div>
                    <span className="sav-summ-label">Metas Ativas</span>
                    <span className="sav-summ-value">{stats.count}</span>
                </div>
            </div>

            <div className="sav-goals-grid">
                {goals.length === 0 ? (
                    <div className="sav-empty-state col-span-full">
                        <Target size={64} opacity={0.2} />
                        <p className="text-xl font-bold">Você ainda não definiu metas!</p>
                        <p className="max-w-md">Ter metas claras ajuda você a economizar mais e realizar seus sonhos com segurança financeira.</p>
                        <Button onClick={() => setIsFormOpen(true)} variant="secondary" className="mt-4">
                            Criar minha primeira meta
                        </Button>
                    </div>
                ) : (
                    goals.map(goal => {
                        const percent = Math.min(100, Math.round((goal.currentAmount / goal.targetAmount) * 100));
                        const monthlyNeeded = calculateMonthlyNeeded(goal);

                        return (
                            <div key={goal.id} className="sav-goal-card">
                                <div className="sav-goal-header">
                                    <div className="sav-goal-info">
                                        <h3 className="sav-goal-title">{goal.description}</h3>
                                        <div className="sav-goal-date">
                                            <Calendar size={14} />
                                            Meta para {formatDate(goal.targetDate)}
                                        </div>
                                    </div>
                                    <div className="sav-goal-actions">
                                        <button onClick={() => handleEdit(goal)} className="sav-goal-btn" title="Editar">
                                            <Edit size={16} />
                                        </button>
                                        <button onClick={() => handleDelete(goal.id)} className="sav-goal-btn delete" title="Excluir">
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>

                                <div className="sav-progress-section">
                                    <div className="sav-progress-container">
                                        <div className="sav-progress-row">
                                            <span className="sav-progress-current">{formatCurrency(goal.currentAmount)}</span>
                                            <span className="sav-progress-target">Meta: {formatCurrency(goal.targetAmount)}</span>
                                        </div>
                                        <div className="sav-progress-bar-bg">
                                            <div
                                                className="sav-progress-bar-fill"
                                                style={{ width: `${percent}%` }}
                                            />
                                        </div>
                                        <div className="flex justify-between items-center mt-1">
                                            <span className="sav-progress-percent">{percent}% concluído</span>
                                            <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                                                Faltam {formatCurrency(goal.targetAmount - goal.currentAmount)}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="sav-advice-card">
                                    <span className="sav-advice-title">Planejamento</span>
                                    {goal.currentAmount >= goal.targetAmount ? (
                                        <div className="sav-advice-value" style={{ color: '#10b981' }}>
                                            🎉 <strong>Parabéns!</strong> Você atingiu sua meta!
                                        </div>
                                    ) : (
                                        <div className="sav-advice-value">
                                            Guardar <strong>{formatCurrency(monthlyNeeded)}</strong> por mês
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            <Modal
                isOpen={isFormOpen}
                onClose={() => { setIsFormOpen(false); setEditingGoal(null); }}
                title={editingGoal ? 'Editar Meta' : 'Nova Meta de Economia'}
            >
                <SavingsGoalForm
                    onClose={() => { setIsFormOpen(false); setEditingGoal(null); }}
                    editingGoal={editingGoal}
                />
            </Modal>
        </div>
    );
};

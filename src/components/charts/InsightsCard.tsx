import React, { useMemo } from 'react';
import { DashboardStats, CategoryExpense } from '../../utils/statistics';
import { formatCurrency } from '../../utils/format';
import {
    TrendingUp, ShieldCheck, AlertTriangle,
    PiggyBank, Sparkles, Target, Flame, Lightbulb, Award,
    BarChart3
} from 'lucide-react';

interface InsightsCardProps {
    stats: DashboardStats;
    categoryExpenses: CategoryExpense[];
    transactionCount: number;
}

interface Insight {
    icon: React.ReactNode;
    title: string;
    message: string;
    color: string;
    bgColor: string;
    borderColor: string;
}

export const InsightsCard: React.FC<InsightsCardProps> = ({ stats, categoryExpenses, transactionCount }) => {
    const insights = useMemo(() => {
        const result: Insight[] = [];

        // No data state
        if (transactionCount === 0) {
            result.push({
                icon: <Sparkles size={20} />,
                title: 'Comece sua jornada!',
                message: 'Adicione sua primeira transação para receber insights personalizados sobre suas finanças.',
                color: '#6366f1',
                bgColor: 'rgba(99, 102, 241, 0.06)',
                borderColor: 'rgba(99, 102, 241, 0.15)',
            });
            return result;
        }

        const { income, expense, balance, fixedExpense, variableExpense } = stats;

        // ── Balance Insight (always first) ──
        if (balance > 0) {
            const savingsRate = income > 0 ? ((balance / income) * 100).toFixed(0) : '0';
            result.push({
                icon: <ShieldCheck size={20} />,
                title: 'Saldo Positivo',
                message: `Você está economizando ${savingsRate}% da sua renda neste período. Ótimo trabalho! Saldo de ${formatCurrency(balance)} disponível.`,
                color: '#059669',
                bgColor: 'rgba(16, 185, 129, 0.06)',
                borderColor: 'rgba(16, 185, 129, 0.18)',
            });
        } else if (balance < 0) {
            result.push({
                icon: <AlertTriangle size={20} />,
                title: 'Atenção: Saldo Negativo',
                message: `Suas despesas superaram suas receitas em ${formatCurrency(Math.abs(balance))}. Revise seus gastos variáveis para equilibrar o orçamento.`,
                color: '#dc2626',
                bgColor: 'rgba(239, 68, 68, 0.06)',
                borderColor: 'rgba(239, 68, 68, 0.18)',
            });
        } else if (income > 0 && balance === 0) {
            result.push({
                icon: <Target size={20} />,
                title: 'Equilíbrio Perfeito',
                message: 'Receitas e despesas estão equilibradas. Considere criar uma reserva de emergência reduzindo gastos variáveis.',
                color: '#d97706',
                bgColor: 'rgba(245, 158, 11, 0.06)',
                borderColor: 'rgba(245, 158, 11, 0.18)',
            });
        }

        // ── Income vs Expense ratio ──
        if (income > 0 && expense > 0) {
            const ratio = expense / income;
            if (ratio > 0.9) {
                result.push({
                    icon: <Flame size={20} />,
                    title: 'Gastos Elevados',
                    message: `Você está consumindo ${(ratio * 100).toFixed(0)}% da sua renda. O ideal é manter abaixo de 70% para construir patrimônio.`,
                    color: '#ea580c',
                    bgColor: 'rgba(234, 88, 12, 0.06)',
                    borderColor: 'rgba(234, 88, 12, 0.18)',
                });
            } else if (ratio <= 0.5) {
                result.push({
                    icon: <Award size={20} />,
                    title: 'Excelente Controle!',
                    message: `Seus gastos representam apenas ${(ratio * 100).toFixed(0)}% da renda. Você tem uma margem saudável para investimentos e reservas.`,
                    color: '#059669',
                    bgColor: 'rgba(16, 185, 129, 0.06)',
                    borderColor: 'rgba(16, 185, 129, 0.18)',
                });
            }
        }

        // ── Fixed vs Variable Expenses ──
        if (expense > 0) {
            const fixedPct = (fixedExpense / expense) * 100;
            if (fixedPct > 70) {
                result.push({
                    icon: <BarChart3 size={20} />,
                    title: 'Gastos Fixos Dominam',
                    message: `${fixedPct.toFixed(0)}% das suas despesas são fixas. Renegocie contratos ou cancele serviços não essenciais para aumentar flexibilidade.`,
                    color: '#7c3aed',
                    bgColor: 'rgba(124, 58, 237, 0.06)',
                    borderColor: 'rgba(124, 58, 237, 0.18)',
                });
            } else if (variableExpense > fixedExpense) {
                result.push({
                    icon: <Lightbulb size={20} />,
                    title: 'Gastos Variáveis Altos',
                    message: `Gastos variáveis (${formatCurrency(variableExpense)}) superam os fixos (${formatCurrency(fixedExpense)}). Estes são os mais fáceis de otimizar.`,
                    color: '#d97706',
                    bgColor: 'rgba(245, 158, 11, 0.06)',
                    borderColor: 'rgba(245, 158, 11, 0.18)',
                });
            }
        }

        // ── Top Category Insight ──
        if (categoryExpenses.length > 0) {
            const top = categoryExpenses[0];
            const pct = expense > 0 ? ((top.value / expense) * 100).toFixed(0) : '0';
            result.push({
                icon: <PiggyBank size={20} />,
                title: `Maior Gasto: ${top.name}`,
                message: `A categoria "${top.name}" representa ${pct}% das suas despesas (${formatCurrency(top.value)}). ${Number(pct) > 40 ? 'Considere diversificar ou reduzir.' : 'Distribuição saudável.'}`,
                color: top.color || '#6366f1',
                bgColor: `${top.color || '#6366f1'}10`,
                borderColor: `${top.color || '#6366f1'}25`,
            });
        }

        // ── Income Growth Motivation ──
        if (income === 0 && expense > 0) {
            result.push({
                icon: <TrendingUp size={20} />,
                title: 'Sem Receitas Registradas',
                message: 'Nenhuma receita lançada neste período. Registre seus recebimentos para ter uma visão completa do seu fluxo de caixa.',
                color: '#0ea5e9',
                bgColor: 'rgba(14, 165, 233, 0.06)',
                borderColor: 'rgba(14, 165, 233, 0.18)',
            });
        }

        return result.slice(0, 4); // Max 4 insights
    }, [stats, categoryExpenses, transactionCount]);

    return (
        <div style={{
            background: '#ffffff',
            borderRadius: '20px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 4px 16px -4px rgba(0, 0, 0, 0.06)',
            overflow: 'hidden',
        }}>
            {/* Header */}
            <div style={{
                padding: '1.25rem 1.5rem',
                borderBottom: '1px solid #f1f5f9',
                display: 'flex',
                alignItems: 'center',
                gap: '0.65rem',
            }}>
                <div style={{
                    width: '34px',
                    height: '34px',
                    borderRadius: '10px',
                    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                }}>
                    <Sparkles size={18} />
                </div>
                <div>
                    <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#1e293b', letterSpacing: '-0.01em' }}>
                        Insights Financeiros
                    </h3>
                    <p style={{ margin: 0, fontSize: '0.7rem', color: '#94a3b8', fontWeight: 500 }}>
                        Análise inteligente do seu período
                    </p>
                </div>
            </div>

            {/* Insights List */}
            <div style={{ padding: '1rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {insights.map((insight, i) => (
                    <div
                        key={i}
                        style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '0.85rem',
                            padding: '1rem',
                            borderRadius: '14px',
                            background: insight.bgColor,
                            border: `1px solid ${insight.borderColor}`,
                            transition: 'all 0.2s ease',
                        }}
                    >
                        <div style={{
                            width: '38px',
                            height: '38px',
                            borderRadius: '10px',
                            background: `${insight.color}15`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: insight.color,
                            flexShrink: 0,
                        }}>
                            {insight.icon}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{
                                margin: '0 0 0.25rem 0',
                                fontWeight: 700,
                                fontSize: '0.85rem',
                                color: '#1e293b',
                            }}>
                                {insight.title}
                            </p>
                            <p style={{
                                margin: 0,
                                fontSize: '0.8rem',
                                color: '#64748b',
                                lineHeight: 1.5,
                                fontWeight: 500,
                            }}>
                                {insight.message}
                            </p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

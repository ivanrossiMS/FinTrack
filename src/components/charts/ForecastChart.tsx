import React from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { ForecastPoint } from '../../utils/statistics';
import { Card } from '../ui/Card';
import { formatCurrency } from '../../utils/format';

interface Props {
    data: ForecastPoint[];
}

export const ForecastChart: React.FC<Props> = ({ data }) => {
    return (
        <Card title="Projeção de Fluxo de Caixa" className="chart-card h-full">
            <div className="px-2">
                <p className="text-sm font-medium text-text-muted mb-6">
                    Expectativa de saldo para os próximos 30 dias baseado em compromissos e média de renda.
                </p>
            </div>
            <div style={{ width: '100%', height: 280 }}>
                <ResponsiveContainer>
                    <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis
                            dataKey="date"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }}
                            minTickGap={20}
                        />
                        <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }}
                            tickFormatter={(value) => `R$${Math.abs(value) >= 1000 ? (value / 1000).toFixed(1) + 'k' : value}`}
                        />
                        <Tooltip
                            contentStyle={{
                                borderRadius: '16px',
                                border: '1px solid var(--color-border)',
                                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                                backgroundColor: 'rgba(255, 255, 255, 0.9)',
                            }}
                            formatter={(value: number) => [formatCurrency(value), 'Saldo Projetado']}
                            labelStyle={{ fontWeight: 900, color: 'var(--color-primary)', marginBottom: '4px' }}
                        />
                        <Line
                            type="monotone"
                            dataKey="balance"
                            stroke="var(--color-primary)"
                            strokeWidth={3}
                            dot={{ r: 0 }}
                            activeDot={{ r: 6, stroke: '#fff', strokeWidth: 2 }}
                            strokeDasharray="5 5"
                            animationDuration={2000}
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>
            <div className="flex items-center gap-3 mt-4 pt-4 border-t border-border/50">
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-primary/20 flex items-center justify-center">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                    </div>
                    <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Tendência de Saldo</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-6 h-[2px]" style={{ borderTop: '2px dashed var(--color-primary)', opacity: 0.5 }} />
                    <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Projeção 30d</span>
                </div>
            </div>
        </Card>
    );
};

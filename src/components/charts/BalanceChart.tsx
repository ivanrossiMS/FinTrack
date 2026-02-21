import React from 'react';
import {
    ResponsiveContainer, ComposedChart, Bar, Line,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend
} from 'recharts';
import { DayBalance } from '../../utils/statistics';
import { Card } from '../ui/Card';
import { formatCurrency } from '../../utils/format';

interface Props {
    data: DayBalance[];
}

const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
        <div style={{
            background: '#ffffff',
            borderRadius: '14px',
            padding: '0.85rem 1rem',
            boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)',
            border: '1px solid #f1f5f9',
            minWidth: '180px',
        }}>
            <p style={{ fontWeight: 700, fontSize: '0.8rem', color: '#475569', margin: '0 0 0.5rem 0' }}>{label}</p>
            {payload.map((p: any, i: number) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', padding: '2px 0' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: p.color, display: 'inline-block' }} />
                        {p.name}
                    </span>
                    <span style={{ fontWeight: 800, fontSize: '0.8rem', color: '#1e293b', fontFamily: 'monospace' }}>
                        {formatCurrency(p.value)}
                    </span>
                </div>
            ))}
        </div>
    );
};

export const BalanceChart: React.FC<Props> = ({ data }) => {
    return (
        <Card title="Fluxo de Caixa" className="h-[300px]">
            <div style={{ width: '100%', height: 300 }}>
                <ResponsiveContainer>
                    <ComposedChart data={data} barGap={2}>
                        <defs>
                            <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.6} />
                                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis
                            dataKey="date"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#64748b', fontSize: 11, fontWeight: 600 }}
                            minTickGap={30}
                        />
                        <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#64748b', fontSize: 10 }}
                            tickFormatter={(value) => {
                                if (Math.abs(value) >= 1000) return `R$ ${(value / 1000).toFixed(0)}k`;
                                return `R$ ${value.toLocaleString('pt-BR')}`;
                            }}
                            width={75}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend
                            verticalAlign="top"
                            height={36}
                            iconType="circle"
                            iconSize={8}
                            formatter={(value: string) => (
                                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>{value}</span>
                            )}
                        />
                        <Bar
                            dataKey="income"
                            name="Receitas"
                            fill="#10b981"
                            radius={[4, 4, 0, 0]}
                            maxBarSize={20}
                            opacity={0.85}
                        />
                        <Bar
                            dataKey="expense"
                            name="Despesas"
                            fill="#ef4444"
                            radius={[4, 4, 0, 0]}
                            maxBarSize={20}
                            opacity={0.75}
                        />
                        <Line
                            type="monotone"
                            dataKey="balance"
                            name="Saldo"
                            stroke="#6366f1"
                            strokeWidth={3}
                            dot={false}
                            activeDot={{ r: 5, fill: '#6366f1', stroke: '#fff', strokeWidth: 2 }}
                        />
                    </ComposedChart>
                </ResponsiveContainer>
            </div>
        </Card>
    );
};

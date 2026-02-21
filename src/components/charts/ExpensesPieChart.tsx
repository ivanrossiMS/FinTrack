import React, { useMemo } from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';
import { CategoryExpense } from '../../utils/statistics';
import { formatCurrency } from '../../utils/format';

interface Props {
    data: CategoryExpense[];
    onSliceClick?: (categoryId: string) => void;
}

const RADIAN = Math.PI / 180;

const renderCustomLabel = ({ cx, cy, midAngle, outerRadius, percent }: any) => {
    if (percent < 0.05) return null; // Don't render labels for slices < 5%

    const radius = outerRadius + 22;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
        <text
            x={x}
            y={y}
            fill="#475569"
            textAnchor={x > cx ? 'start' : 'end'}
            dominantBaseline="central"
            style={{ fontSize: '11px', fontWeight: 700 }}
        >
            {`${(percent * 100).toFixed(0)}%`}
        </text>
    );
};

const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const entry = payload[0];
    const total = entry.payload?.total || 0;
    const pct = total > 0 ? ((entry.value / total) * 100).toFixed(1) : '0';

    return (
        <div style={{
            background: '#ffffff',
            borderRadius: '12px',
            padding: '0.7rem 0.9rem',
            boxShadow: '0 10px 20px -5px rgba(0,0,0,0.1)',
            border: '1px solid #f1f5f9',
            minWidth: '160px',
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: entry.payload?.color || '#6366f1', display: 'inline-block' }} />
                <span style={{ fontWeight: 700, fontSize: '0.8rem', color: '#1e293b' }}>{entry.name}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
                <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#1e293b', fontFamily: 'monospace' }}>
                    {formatCurrency(entry.value)}
                </span>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#6366f1' }}>
                    {pct}%
                </span>
            </div>
        </div>
    );
};

export const ExpensesPieChart: React.FC<Props> = ({ data, onSliceClick }) => {
    // Add total to each entry so the tooltip can calculate percentages
    const total = useMemo(() => data.reduce((acc, d) => acc + d.value, 0), [data]);
    const enrichedData = useMemo(() => data.map(d => ({ ...d, total })), [data, total]);

    return (
        <div style={{ width: '100%', height: 320, minWidth: 280 }}>
            <ResponsiveContainer>
                <PieChart>
                    <Pie
                        data={enrichedData}
                        cx="50%"
                        cy="50%"
                        innerRadius={75}
                        outerRadius={100}
                        paddingAngle={4}
                        dataKey="value"
                        label={renderCustomLabel}
                        labelLine={false}
                        animationBegin={0}
                        animationDuration={1200}
                        onClick={(entry) => onSliceClick && onSliceClick(entry.id)}
                    >
                        {enrichedData.map((entry, index) => (
                            <Cell
                                key={`cell-${index}`}
                                fill={entry.color}
                                stroke="none"
                                style={{ outline: 'none', cursor: onSliceClick ? 'pointer' : 'default' }}
                            />
                        ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                    <Legend
                        layout="horizontal"
                        align="center"
                        verticalAlign="bottom"
                        iconType="circle"
                        iconSize={8}
                        wrapperStyle={{
                            paddingTop: '20px',
                            fontSize: '11px',
                            fontWeight: '600',
                            letterSpacing: '0.02em',
                            color: '#64748b'
                        }}
                        formatter={(value: string, _entry: any) => {
                            const item = data.find(d => d.name === value);
                            const pct = item && total > 0 ? ((item.value / total) * 100).toFixed(0) : '0';
                            return (
                                <span style={{ color: '#475569', fontWeight: 600 }}>
                                    {value} <span style={{ color: '#94a3b8', fontWeight: 700 }}>({pct}%)</span>
                                </span>
                            );
                        }}
                    />
                </PieChart>
            </ResponsiveContainer>
        </div>
    );
};

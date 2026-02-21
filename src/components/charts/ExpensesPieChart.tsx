import React from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';
import { CategoryExpense } from '../../utils/statistics';

interface Props {
    data: CategoryExpense[];
    onSliceClick?: (categoryId: string) => void;
}

export const ExpensesPieChart: React.FC<Props> = ({ data, onSliceClick }) => {
    return (
        <div style={{ width: '100%', height: 320, minWidth: 280 }}>
            <ResponsiveContainer>
                <PieChart>
                    <Pie
                        data={data}
                        cx="50%"
                        cy="50%"
                        innerRadius={80}
                        outerRadius={105}
                        paddingAngle={4}
                        dataKey="value"
                        animationBegin={0}
                        animationDuration={1200}
                        onClick={(entry) => onSliceClick && onSliceClick(entry.id)}
                    >
                        {data.map((entry, index) => (
                            <Cell
                                key={`cell-${index}`}
                                fill={entry.color}
                                stroke="none"
                                style={{ outline: 'none', cursor: onSliceClick ? 'pointer' : 'default' }}
                            />
                        ))}
                    </Pie>
                    <Tooltip
                        contentStyle={{
                            borderRadius: '12px',
                            border: 'none',
                            boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
                            fontSize: '12px',
                            fontWeight: 'bold'
                        }}
                        formatter={(value: number) => `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                    />
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
                            textTransform: 'uppercase',
                            letterSpacing: '0.02em',
                            color: '#64748b'
                        }}
                    />
                </PieChart>
            </ResponsiveContainer>
        </div>
    );
};


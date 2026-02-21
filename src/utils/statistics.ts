import { Transaction, Category, Commitment } from '../models/types';
import { isWithinInterval, startOfDay, endOfDay, eachDayOfInterval, format, isSameDay, subDays, addDays } from 'date-fns';

export interface DashboardStats {
    income: number;
    expense: number;
    balance: number;
    budgetUsage: number;
    fixedExpense: number;
    variableExpense: number;
}

export interface DayBalance {
    date: string; // formatted date
    balance: number;
    income: number;
    expense: number;
}

export interface CategoryExpense {
    id: string;
    name: string;
    value: number;
    color: string;
}

export interface ForecastPoint {
    date: string;
    balance: number;
}

// Helper to normalize UTC ISO strings or other date strings to local Date at 00:00:00
const toLocalDate = (dateStr: string): Date => {
    // If it's a full ISO string (2026-02-19T00:00:00.000Z), extract just the date part
    const datePart = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
    const [year, month, day] = datePart.split('-').map(Number);
    // month is 0-indexed in Date constructor
    return new Date(year, month - 1, day, 0, 0, 0, 0);
};

export const calculateStats = (transactions: Transaction[], startDate: Date, endDate: Date): DashboardStats => {
    const start = startOfDay(startDate);
    const end = endOfDay(endDate);

    const filtered = transactions.filter(t => {
        const txDate = toLocalDate(t.date);
        return isWithinInterval(txDate, { start, end });
    });

    const income = filtered
        .filter(t => t.type === 'INCOME')
        .reduce((acc, t) => acc + t.amount, 0);

    const expenses = filtered.filter(t => t.type === 'EXPENSE');
    const totalExpense = expenses.reduce((acc, t) => acc + t.amount, 0);
    const fixedExpense = expenses.filter(t => t.isFixed).reduce((acc, t) => acc + t.amount, 0);
    const variableExpense = totalExpense - fixedExpense;

    return {
        income,
        expense: totalExpense,
        balance: income - totalExpense,
        budgetUsage: 0,
        fixedExpense,
        variableExpense
    };
};

export const getDailyBalance = (transactions: Transaction[], startDate: Date, endDate: Date): DayBalance[] => {
    const allDays = eachDayOfInterval({ start: startDate, end: endDate });
    const periodStart = startOfDay(startDate);

    // Calculate the cumulative balance from ALL transactions BEFORE the period starts
    let currentBalance = transactions.reduce((acc, t) => {
        const txDate = toLocalDate(t.date);
        if (txDate < periodStart) {
            return t.type === 'INCOME' ? acc + t.amount : acc - t.amount;
        }
        return acc;
    }, 0);

    const results: DayBalance[] = allDays.map(day => {
        const targetDay = startOfDay(day);
        const dayTransactions = transactions.filter(t => {
            const txDate = toLocalDate(t.date);
            return isSameDay(txDate, targetDay);
        });

        const dayIncome = dayTransactions.filter(t => t.type === 'INCOME').reduce((acc, t) => acc + t.amount, 0);
        const dayExpense = dayTransactions.filter(t => t.type === 'EXPENSE').reduce((acc, t) => acc + t.amount, 0);

        currentBalance += (dayIncome - dayExpense);

        return {
            date: format(day, 'dd/MM'),
            balance: currentBalance,
            income: dayIncome,
            expense: dayExpense,
        };
    });

    // If we only have one day (e.g., "Today" filter), AreaChart needs a point of origin to render a line/area.
    if (results.length === 1) {
        return [
            { date: 'Início', balance: currentBalance - (results[0].income - results[0].expense), income: 0, expense: 0 },
            ...results
        ];
    }

    return results;
};

export const getCategoryExpenses = (transactions: Transaction[], categories: Category[], startDate: Date, endDate: Date): CategoryExpense[] => {
    const start = startOfDay(startDate);
    const end = endOfDay(endDate);

    const filtered = transactions.filter(t => {
        if (t.type !== 'EXPENSE') return false;
        const txDate = toLocalDate(t.date);
        return isWithinInterval(txDate, { start, end });
    });

    const stats: Record<string, number> = {};

    filtered.forEach(t => {
        stats[t.categoryId] = (stats[t.categoryId] || 0) + t.amount;
    });

    return Object.entries(stats).map(([catId, value]) => {
        const category = categories.find(c => c.id === catId);
        return {
            id: catId,
            name: category?.name || 'Desconhecido',
            value,
            color: category?.color || '#9ca3af'
        };
    }).sort((a, b) => b.value - a.value);
};

export const getForecastData = (transactions: Transaction[], commitments: Commitment[]): ForecastPoint[] => {
    const today = startOfDay(new Date());

    // 1. Calculate Current Total Balance (Absolute)
    const currentBalance = transactions.reduce((acc, t) => {
        return t.type === 'INCOME' ? acc + t.amount : acc - t.amount;
    }, 0);

    // 2. Average Daily Income (last 90 days or since first transaction)
    const ninetyDaysAgo = subDays(today, 90);
    const recentIncomeTotal = transactions
        .filter(t => t.type === 'INCOME' && toLocalDate(t.date) >= ninetyDaysAgo)
        .reduce((acc, t) => acc + t.amount, 0);

    const firstTxDate = transactions.length > 0
        ? toLocalDate(transactions.reduce((min, t) => t.date < min ? t.date : min, transactions[0].date))
        : today;
    const daysInPeriod = Math.min(90, Math.max(1, Math.ceil((today.getTime() - firstTxDate.getTime()) / (1000 * 60 * 60 * 24))));
    const avgDailyIncome = recentIncomeTotal / daysInPeriod;

    // 3. Project for the next 30 days
    const forecast: ForecastPoint[] = [];
    let projectedBalance = currentBalance;

    for (let i = 1; i <= 30; i++) {
        const targetDay = addDays(today, i);

        // Add projected income
        projectedBalance += avgDailyIncome;

        // Subtract commitments due this day
        const dayCommitments = (commitments || [])
            .filter(c => c.status === 'PENDING' && isSameDay(toLocalDate(c.dueDate), targetDay))
            .reduce((acc, c) => acc + c.amount, 0);

        projectedBalance -= dayCommitments;

        forecast.push({
            date: format(targetDay, 'dd/MM'),
            balance: Math.round(projectedBalance * 100) / 100
        });
    }

    return forecast;
};

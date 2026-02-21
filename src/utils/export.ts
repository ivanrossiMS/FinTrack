import { Transaction, Category, Supplier, PaymentMethod, Commitment } from '../models/types';
import { format } from 'date-fns';

// UTF-8 BOM for Excel compatibility
const BOM = '\uFEFF';

const escapeCSV = (value: string): string => {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
        return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
};

export const exportToCSV = (
    transactions: Transaction[],
    categories: Category[],
    suppliers: Supplier[],
    paymentMethods: PaymentMethod[],
    commitments?: Commitment[]
) => {
    const lines: string[] = [];

    // ── Transactions Section ──
    lines.push('=== LANÇAMENTOS ===');
    lines.push('');

    const txHeaders = ['Data', 'Tipo', 'Descrição', 'Valor', 'Categoria', 'Fornecedor', 'Método de Pagamento', 'Fixo'];
    lines.push(txHeaders.join(';'));

    const catMap = new Map(categories.map(c => [c.id, c.name]));
    const supMap = new Map(suppliers.map(s => [s.id, s.name]));
    const pmMap = new Map(paymentMethods.map(m => [m.id, m.name]));

    let totalIncome = 0;
    let totalExpense = 0;

    transactions.forEach(t => {
        const catName = catMap.get(t.categoryId) || 'Geral';
        const supName = t.supplierId ? (supMap.get(t.supplierId) || '') : '';
        const pmName = t.paymentMethodId ? (pmMap.get(t.paymentMethodId) || '') : '';
        const isFixed = t.isFixed ? 'Sim' : 'Não';

        if (t.type === 'INCOME') totalIncome += t.amount;
        else totalExpense += t.amount;

        lines.push([
            format(new Date(t.date), 'dd/MM/yyyy'),
            t.type === 'INCOME' ? 'Receita' : 'Despesa',
            escapeCSV(t.description),
            t.amount.toFixed(2).replace('.', ','),
            escapeCSV(catName),
            escapeCSV(supName),
            escapeCSV(pmName),
            isFixed
        ].join(';'));
    });

    // Summary
    lines.push('');
    lines.push(`Total Receitas:;${totalIncome.toFixed(2).replace('.', ',')}`);
    lines.push(`Total Despesas:;${totalExpense.toFixed(2).replace('.', ',')}`);
    lines.push(`Resultado:;${(totalIncome - totalExpense).toFixed(2).replace('.', ',')}`);

    // ── Commitments Section ──
    if (commitments && commitments.length > 0) {
        lines.push('');
        lines.push('');
        lines.push('=== COMPROMISSOS ===');
        lines.push('');

        const cmHeaders = ['Descrição', 'Vencimento', 'Valor', 'Status', 'Categoria', 'Fornecedor', 'Data Pagamento'];
        lines.push(cmHeaders.join(';'));

        commitments.forEach(c => {
            const catName = catMap.get(c.categoryId) || 'Geral';
            const supName = c.supplierId ? (supMap.get(c.supplierId) || '') : '';
            const statusLabel = c.status === 'PAID' ? 'Pago' : 'Pendente';
            const payDate = c.paymentDate ? format(new Date(c.paymentDate), 'dd/MM/yyyy') : '';

            lines.push([
                escapeCSV(c.description),
                format(new Date(c.dueDate), 'dd/MM/yyyy'),
                c.amount.toFixed(2).replace('.', ','),
                statusLabel,
                escapeCSV(catName),
                escapeCSV(supName),
                payDate
            ].join(';'));
        });

        const totalPaid = commitments.filter(c => c.status === 'PAID').reduce((a, c) => a + c.amount, 0);
        const totalPending = commitments.filter(c => c.status === 'PENDING').reduce((a, c) => a + c.amount, 0);

        lines.push('');
        lines.push(`Total Pago:;${totalPaid.toFixed(2).replace('.', ',')}`);
        lines.push(`Total Pendente:;${totalPending.toFixed(2).replace('.', ',')}`);
    }

    const csvContent = BOM + lines.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `finance_plus_${format(new Date(), 'yyyyMMdd_HHmm')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};

export const printReport = () => {
    window.print();
};

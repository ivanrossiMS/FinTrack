import type { AppData, Category, Transaction, PaymentMethod } from '../models/types';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../lib/supabaseClient';

const INITIAL_DATA: AppData = {
    transactions: [],
    categories: [],
    suppliers: [],
    paymentMethods: [],
    budgets: [],
    commitments: [],
    savingsGoals: []
};

const DEFAULT_CATEGORIES: Category[] = [
    { id: 'cat_contas_casa', name: 'Contas da Casa', type: 'EXPENSE', color: '#6366f1', icon: 'Home', isDefault: true },
    { id: 'cat_impostos', name: 'Impostos & Taxas', type: 'EXPENSE', color: '#64748b', icon: 'FileText', isDefault: true },
    { id: 'cat_seguros', name: 'Seguros', type: 'EXPENSE', color: '#475569', icon: 'Shield', isDefault: true },
    { id: 'cat_dividas', name: 'Dívidas & Empréstimos', type: 'EXPENSE', color: '#ef4444', icon: 'TrendingDown', isDefault: true },
    { id: 'cat_cartao', name: 'Cartão de Crédito', type: 'EXPENSE', color: '#f43f5e', icon: 'CreditCard', isDefault: true },
    { id: 'cat_mercado', name: 'Compras / Mercado Extra', type: 'EXPENSE', color: '#10b981', icon: 'ShoppingBag', isDefault: true },
    { id: 'cat_vestuario', name: 'Vestuário', type: 'EXPENSE', color: '#ec4899', icon: 'Shirt', isDefault: true },
    { id: 'cat_beleza', name: 'Beleza & Autocuidado', type: 'EXPENSE', color: '#f472b6', icon: 'Sparkles', isDefault: true },
    { id: 'cat_casa_manut', name: 'Casa & Manutenção', type: 'EXPENSE', color: '#06b6d4', icon: 'Hammer', isDefault: true },
    { id: 'cat_tecnologia', name: 'Tecnologia', type: 'EXPENSE', color: '#3b82f6', icon: 'Cpu', isDefault: true },
    { id: 'cat_viagens', name: 'Viagens', type: 'EXPENSE', color: '#8b5cf6', icon: 'Plane', isDefault: true },
    { id: 'cat_presentes', name: 'Presentes & Doações', type: 'EXPENSE', color: '#d946ef', icon: 'Gift', isDefault: true },
    { id: 'cat_assinaturas', name: 'Assinaturas', type: 'EXPENSE', color: '#0ea5e9', icon: 'RefreshCw', isDefault: true },
    { id: 'cat_educacao', name: 'Educação & Livros', type: 'EXPENSE', color: '#f59e0b', icon: 'BookOpen', isDefault: true },
    { id: 'cat_pets', name: 'Pets & Cuidado', type: 'EXPENSE', color: '#14b8a6', icon: 'Dog', isDefault: true },
    { id: 'cat_transporte', name: 'Transporte / Manutenção Véiculo', type: 'EXPENSE', color: '#f97316', icon: 'Car', isDefault: true },
    { id: 'cat_alimentacao', name: 'Alimentação', type: 'EXPENSE', color: '#fb7185', icon: 'Utensils', isDefault: true },
    { id: 'cat_lazer', name: 'Lazer', type: 'EXPENSE', color: '#a855f7', icon: 'Gamepad2', isDefault: true },
    { id: 'cat_saude', name: 'Saúde', type: 'EXPENSE', color: '#f43f5e', icon: 'Activity', isDefault: true },
    { id: 'cat_investimentos', name: 'Investimentos', type: 'EXPENSE', color: '#06b6d4', icon: 'TrendingUp', isDefault: true },
    { id: 'cat_extras', name: 'Extras', type: 'EXPENSE', color: '#94a3b8', icon: 'MoreHorizontal', isDefault: true },
    { id: 'cat_salario', name: 'Salário', type: 'INCOME', color: '#22c55e', icon: 'Wallet', isDefault: true },
    { id: 'cat_bonus', name: 'Bônus / 13º', type: 'INCOME', color: '#16a34a', icon: 'Coins', isDefault: true },
    { id: 'cat_comissoes', name: 'Comissões', type: 'INCOME', color: '#10b981', icon: 'Percentage', isDefault: true },
    { id: 'cat_aluguel', name: 'Renda de Aluguel', type: 'INCOME', color: '#0d9488', icon: 'Key', isDefault: true },
    { id: 'cat_rendimentos', name: 'Rendimentos', type: 'INCOME', color: '#06b6d4', icon: 'TrendingUp', isDefault: true },
    { id: 'cat_reembolsos', name: 'Reembolsos', type: 'INCOME', color: '#38bdf8', icon: 'ArrowLeftRight', isDefault: true },
    { id: 'cat_restituicao', name: 'Restituição / Devoluções', type: 'INCOME', color: '#4ade80', icon: 'Undo2', isDefault: true },
    { id: 'cat_premios', name: 'Prêmios / Sorteios', type: 'INCOME', color: '#fbbf24', icon: 'Trophy', isDefault: true },
    { id: 'cat_servicos', name: 'Serviços / Consultorias', type: 'INCOME', color: '#3b82f6', icon: 'Briefcase', isDefault: true },
    { id: 'cat_vendas', name: 'Vendas', type: 'INCOME', color: '#4f46e5', icon: 'ShoppingBag', isDefault: true },
];

const DEFAULT_METHODS: PaymentMethod[] = [
    { id: 'pm_dinheiro', name: 'Dinheiro', color: '#10b981' },
    { id: 'pm_pix', name: 'Pix', color: '#06b6d4' },
    { id: 'pm_credito', name: 'Cartão de Crédito', color: '#6366f1' },
    { id: 'pm_debito', name: 'Cartão de Débito', color: '#3b82f6' },
    { id: 'pm_permuta', name: 'Permuta', color: '#8b5cf6' },
];

export const StorageService = {
    async load(userId?: string): Promise<AppData> {
        if (!userId) return INITIAL_DATA;

        try {
            const [
                { data: transactions },
                { data: categories },
                { data: methods },
                { data: commitments },
                { data: goals }
            ] = await Promise.all([
                supabase.from('transactions').select('*').eq('user_id', userId).order('date', { ascending: false }),
                supabase.from('categories').select('*').eq('user_id', userId),
                supabase.from('payment_methods').select('*').eq('user_id', userId),
                supabase.from('commitments').select('*').eq('user_id', userId),
                supabase.from('savings_goals').select('*').eq('user_id', userId)
            ]);

            return {
                transactions: (transactions || []).map(t => ({
                    ...t,
                    categoryId: t.category_id,
                    paymentMethodId: t.payment_method_id,
                    supplierId: t.supplier_id
                })),
                categories: categories && categories.length > 0 ? categories : DEFAULT_CATEGORIES,
                suppliers: [],
                paymentMethods: methods && methods.length > 0 ? methods : DEFAULT_METHODS,
                budgets: [],
                commitments: (commitments || []).map(c => ({
                    ...c,
                    categoryId: c.category_id,
                    paymentMethodId: c.payment_method_id,
                    dueDate: c.due_date,
                    paymentDate: c.payment_date
                })),
                savingsGoals: (goals || []).map(g => ({
                    ...g,
                    targetAmount: g.target_amount,
                    currentAmount: g.current_amount,
                    targetDate: g.target_date
                }))
            };
        } catch (e) {
            console.error('Error loading from Supabase:', e);
            return INITIAL_DATA;
        }
    },

    async saveTransaction(transaction: Transaction, userId: string) {
        const { error } = await supabase.from('transactions').upsert({
            id: transaction.id,
            user_id: userId,
            type: transaction.type,
            amount: transaction.amount,
            description: transaction.description,
            date: transaction.date,
            category_id: transaction.categoryId,
            payment_method_id: transaction.paymentMethodId,
            supplier_id: transaction.supplierId,
            updated_at: new Date().toISOString()
        });
        if (error) throw error;
    },

    async deleteTransaction(id: string) {
        const { error } = await supabase.from('transactions').delete().eq('id', id);
        if (error) throw error;
    },

    async saveCategory(category: Category, userId: string) {
        const { error } = await supabase.from('categories').upsert({
            id: category.id,
            user_id: userId,
            name: category.name,
            type: category.type,
            color: category.color,
            icon: category.icon,
            is_default: category.isDefault
        });
        if (error) throw error;
    },

    async deleteCategory(id: string) {
        const { error } = await supabase.from('categories').delete().eq('id', id);
        if (error) throw error;
    },

    async savePaymentMethod(method: PaymentMethod, userId: string) {
        const { error } = await supabase.from('payment_methods').upsert({
            id: method.id,
            user_id: userId,
            name: method.name,
            color: method.color
        });
        if (error) throw error;
    },

    async deletePaymentMethod(id: string) {
        const { error } = await supabase.from('payment_methods').delete().eq('id', id);
        if (error) throw error;
    },

    async clear(userId?: string) {
        if (!userId) return;
        await Promise.all([
            supabase.from('transactions').delete().eq('user_id', userId),
            supabase.from('categories').delete().eq('user_id', userId),
            supabase.from('payment_methods').delete().eq('user_id', userId),
            supabase.from('commitments').delete().eq('user_id', userId),
            supabase.from('savings_goals').delete().eq('user_id', userId)
        ]);
    },

    async clearGlobals() {
        // No-op for now
    },

    async seedDemoData(userId?: string) {
        if (!userId) return;
        await this.clear(userId);

        await Promise.all(DEFAULT_CATEGORIES.map(cat => this.saveCategory(cat, userId)));
        await Promise.all(DEFAULT_METHODS.map(m => this.savePaymentMethod(m, userId)));

        const demoTransactions: Transaction[] = [
            { id: uuidv4(), type: 'EXPENSE', amount: 150.50, description: 'Supermercado Mensal', date: new Date().toISOString(), categoryId: 'cat_mercado', paymentMethodId: 'pm_debito', createdAt: Date.now(), updatedAt: Date.now() },
            { id: uuidv4(), type: 'INCOME', amount: 5000.00, description: 'Salário Base', date: new Date().toISOString(), categoryId: 'cat_salario', paymentMethodId: 'pm_pix', createdAt: Date.now(), updatedAt: Date.now() },
        ];

        await Promise.all(demoTransactions.map(tx => this.saveTransaction(tx, userId)));
    },

    async save(data: AppData, userId?: string) {
        if (!userId) return;
        if (data.categories.length > 0) {
            await Promise.all(data.categories.map(cat => this.saveCategory(cat, userId)));
        }
        if (data.paymentMethods.length > 0) {
            await Promise.all(data.paymentMethods.map(m => this.savePaymentMethod(m, userId)));
        }
    }
};

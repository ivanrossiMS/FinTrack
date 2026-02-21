import { AppData, Category, Transaction, PaymentMethod } from '../models/types';
import { v4 as uuidv4 } from 'uuid';

const STORAGE_KEY = 'fintrack_data_v1';
const GLOBAL_CATEGORIES_KEY = 'fintrack_global_categories';
const GLOBAL_METHODS_KEY = 'fintrack_global_payment_methods';

const DEFAULT_CATEGORIES: Category[] = [
    { id: 'cat_salario', name: 'Salário', type: 'INCOME', color: '#10b981', isDefault: true },
    { id: 'cat_alimentacao', name: 'Alimentação', type: 'EXPENSE', color: '#ef4444', isDefault: true },
    { id: 'cat_transporte', name: 'Transporte', type: 'EXPENSE', color: '#f59e0b', isDefault: true },
    { id: 'cat_moradia', name: 'Moradia', type: 'EXPENSE', color: '#6366f1', isDefault: true },
    { id: 'cat_lazer', name: 'Lazer', type: 'EXPENSE', color: '#8b5cf6', isDefault: true },
    { id: 'cat_saude', name: 'Saúde', type: 'EXPENSE', color: '#ec4899', isDefault: true },
    { id: 'cat_extras', name: 'Extras', type: 'EXPENSE', color: '#64748b', isDefault: true },
];

const DEFAULT_METHODS: PaymentMethod[] = [
    { id: 'pm_dinheiro', name: 'Dinheiro', color: '#10b981' },
    { id: 'pm_pix', name: 'Pix', color: '#06b6d4' },
    { id: 'pm_credito', name: 'Cartão de Crédito', color: '#6366f1' },
    { id: 'pm_debito', name: 'Cartão de Débito', color: '#3b82f6' },
    { id: 'pm_permuta', name: 'Permuta', color: '#8b5cf6' },
];

const INITIAL_DATA: AppData = {
    transactions: [],
    categories: DEFAULT_CATEGORIES,
    suppliers: [],
    paymentMethods: DEFAULT_METHODS,
    budgets: [],
    commitments: [],
    savingsGoals: []
};

export const StorageService = {
    save(data: AppData, userEmail?: string) {
        const key = userEmail ? `${STORAGE_KEY}_${userEmail}` : STORAGE_KEY;
        localStorage.setItem(key, JSON.stringify(data));
    },

    saveGlobalCategories(categories: Category[]) {
        localStorage.setItem(GLOBAL_CATEGORIES_KEY, JSON.stringify(categories));
    },

    saveGlobalMethods(methods: PaymentMethod[]) {
        localStorage.setItem(GLOBAL_METHODS_KEY, JSON.stringify(methods));
    },

    loadGlobalCategories(): Category[] | null {
        const raw = localStorage.getItem(GLOBAL_CATEGORIES_KEY);
        return raw ? JSON.parse(raw) : null;
    },

    loadGlobalMethods(): PaymentMethod[] | null {
        const raw = localStorage.getItem(GLOBAL_METHODS_KEY);
        return raw ? JSON.parse(raw) : null;
    },

    load(userEmail?: string): AppData {
        const key = userEmail ? `${STORAGE_KEY}_${userEmail}` : STORAGE_KEY;
        const raw = localStorage.getItem(key);

        const globalCats = this.loadGlobalCategories();
        const globalMethods = this.loadGlobalMethods();

        if (!raw) {
            // Seed initial data
            const baseData = { ...INITIAL_DATA };
            if (globalCats) baseData.categories = globalCats;
            if (globalMethods) baseData.paymentMethods = globalMethods;

            if (userEmail) {
                this.save(baseData, userEmail);
                return baseData;
            }
            this.save(baseData);
            return baseData;
        }

        try {
            const data = JSON.parse(raw) as AppData;

            // Merge global data into loaded data
            // Any items from global that are not in local or have been updated globally
            // For now, we simple override categories and methods if global exists to ensure sync
            if (globalCats) data.categories = globalCats;
            if (globalMethods) data.paymentMethods = globalMethods;

            return data;
        } catch (e) {
            console.error('Falha ao carregar dados', e);
            return INITIAL_DATA;
        }
    },

    seedDemoData(): AppData {
        const today = new Date();
        const categories = DEFAULT_CATEGORIES;
        const methods = DEFAULT_METHODS;

        // Gerar transações para os últimos 30 dias
        const transactions: Transaction[] = [];

        // Salário
        transactions.push({
            id: uuidv4(),
            type: 'INCOME',
            amount: 5000,
            description: 'Salário Mensal',
            date: new Date(today.getFullYear(), today.getMonth(), 5).toISOString(),
            categoryId: categories.find(c => c.name === 'Salário')?.id || '',
            paymentMethodId: methods.find(m => m.name === 'Pix')?.id,
            createdAt: Date.now(),
            updatedAt: Date.now()
        });

        // Despesas Variadas
        const expenses = [
            { desc: 'Supermercado Mensal', val: 850, cat: 'Alimentação', day: 2 },
            { desc: 'Uber para o trabalho', val: 24.90, cat: 'Transporte', day: 3 },
            { desc: 'Netflix', val: 55.90, cat: 'Lazer', day: 10 },
            { desc: 'Aluguel', val: 1500, cat: 'Moradia', day: 5 },
            { desc: 'Farmácia', val: 120, cat: 'Saúde', day: 12 },
            { desc: 'Jantar Fora', val: 180, cat: 'Lazer', day: 15 },
            { desc: 'Combustível', val: 250, cat: 'Transporte', day: 18 },
            { desc: 'Padaria', val: 35.50, cat: 'Alimentação', day: 20 },
            { desc: 'Internet', val: 110, cat: 'Moradia', day: 25 },
            { desc: 'Ifood', val: 65, cat: 'Alimentação', day: 28 },
        ];

        expenses.forEach(ex => {
            transactions.push({
                id: uuidv4(),
                type: 'EXPENSE',
                amount: ex.val,
                description: ex.desc,
                date: new Date(today.getFullYear(), today.getMonth(), ex.day).toISOString(),
                categoryId: categories.find(c => c.name === ex.cat)?.id || '',
                paymentMethodId: methods[Math.floor(Math.random() * methods.length)].id,
                createdAt: Date.now(),
                updatedAt: Date.now()
            });
        });

        // Adicionar algumas do mês passado também para histórico
        transactions.push({
            id: uuidv4(),
            type: 'EXPENSE',
            amount: 1450,
            description: 'Aluguel',
            date: new Date(today.getFullYear(), today.getMonth() - 1, 5).toISOString(),
            categoryId: categories.find(c => c.name === 'Moradia')?.id || '',
            updatedAt: Date.now(), createdAt: Date.now()
        });

        const newData: AppData = {
            ...INITIAL_DATA,
            transactions,
            categories // Garantir que categorias padrão existam
        };

        this.save(newData);
        return newData;
    },
    clear() {
        localStorage.removeItem(STORAGE_KEY);
        window.location.reload();
    },

    renameUserKey(oldEmail: string, newEmail: string) {
        const oldKey = `${STORAGE_KEY}_${oldEmail}`;
        const newKey = `${STORAGE_KEY}_${newEmail}`;
        const data = localStorage.getItem(oldKey);
        if (data) {
            localStorage.setItem(newKey, data);
            localStorage.removeItem(oldKey);
        }
    }
};

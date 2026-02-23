import { AppData, Category, Transaction, PaymentMethod, Commitment, SavingsGoal } from '../models/types';
import { v4 as uuidv4 } from 'uuid';

const STORAGE_KEY = 'fintrack_data_v1';
const GLOBAL_CATEGORIES_KEY = 'fintrack_global_categories';
const GLOBAL_METHODS_KEY = 'fintrack_global_payment_methods';

const DEFAULT_CATEGORIES: Category[] = [
    // --- DESPESAS (Elite Palette: Sleek, Modern, Categorized) ---
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

    // --- RECEITAS (Elite Palette: Growth, Success, Vibrant) ---
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
    { id: 'pm_dinheiro', name: 'Dinheiro', color: '#10b981', isDefault: true },
    { id: 'pm_pix', name: 'Pix', color: '#06b6d4', isDefault: true },
    { id: 'pm_credito', name: 'Cartão de Crédito', color: '#6366f1', isDefault: true },
    { id: 'pm_debito', name: 'Cartão de Débito', color: '#3b82f6', isDefault: true },
    { id: 'pm_permuta', name: 'Permuta', color: '#8b5cf6', isDefault: true },
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
    DEFAULT_CATEGORIES_SOURCE: DEFAULT_CATEGORIES,
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

            // BUG FIX: Only override IF the loaded data is empty (first time load for a new user with existing globals)
            // If the user already has data (like after seeding demo), don't force global override
            if (globalCats && (!data.categories || data.categories.length === 0)) {
                data.categories = globalCats;
            }
            if (globalMethods && (!data.paymentMethods || data.paymentMethods.length === 0)) {
                data.paymentMethods = globalMethods;
            }

            return data;
        } catch (e) {
            console.error('Falha ao carregar dados', e);
            return INITIAL_DATA;
        }
    },

    seedDemoData(userEmail?: string): AppData {
        const existingData = this.load(userEmail);
        const today = new Date();
        const methods = existingData.paymentMethods.length > 0 ? existingData.paymentMethods : DEFAULT_METHODS;

        // 1. Categorias Expandidas e Criativas
        const newDemoCats: Category[] = [
            { id: uuidv4(), name: 'Investimentos', type: 'EXPENSE', color: '#06b6d4' },
            { id: uuidv4(), name: 'Hobbies & Games', type: 'EXPENSE', color: '#f43f5e' },
            { id: uuidv4(), name: 'Assinaturas Cloud', type: 'EXPENSE', color: '#3b82f6' },
            { id: uuidv4(), name: 'Vendas Online', type: 'INCOME', color: '#14b8a6' },
        ];

        const updatedCategories = [...existingData.categories];
        newDemoCats.forEach(cat => {
            if (!updatedCategories.find(c => c.name === cat.name)) {
                updatedCategories.push(cat);
            }
        });

        const categories = updatedCategories;

        // 1. Pool de descrições para aleatoriedade "inteligente" (Mapeada para Categorias de Elite)
        const expensePool = [
            { desc: 'Almoço Executivo', catId: 'cat_alimentacao', min: 35, max: 85 },
            { desc: 'Jantar Gourmet', catId: 'cat_alimentacao', min: 120, max: 350 },
            { desc: 'Mercado Mensal', catId: 'cat_mercado', min: 400, max: 1200 },
            { desc: 'Café de Especialidade', catId: 'cat_alimentacao', min: 15, max: 60 },
            { desc: 'Uber Viagem VIP', catId: 'cat_transporte', min: 18, max: 65 },
            { desc: 'Abastecimento Completo', catId: 'cat_transporte', min: 150, max: 400 },
            { desc: 'Assinatura Netflix Premium', catId: 'cat_assinaturas', min: 34.90, max: 55.90 },
            { desc: 'Internet Fibra 1GB', catId: 'cat_contas_casa', min: 99, max: 180 },
            { desc: 'Farmácia de Manipulação', catId: 'cat_saude', min: 45, max: 250 },
            { desc: 'Cinema IMAX', catId: 'cat_lazer', min: 60, max: 140 },
            { desc: 'Manutenção Hidráulica', catId: 'cat_casa_manut', min: 100, max: 500 },
            { desc: 'Gadget Tecnologia', catId: 'cat_tecnologia', min: 80, max: 450 },
            { desc: 'Parcela Seguro Carro', catId: 'cat_seguros', min: 120, max: 300 },
            { desc: 'Presente Aniversário', catId: 'cat_presentes', min: 50, max: 300 },
        ];

        const incomePool = [
            { desc: 'Salário de Elite', catId: 'cat_salario', min: 8000, max: 15000 },
            { desc: 'Consultoria Estratégica', catId: 'cat_servicos', min: 1500, max: 5000 },
            { desc: 'Rendimento Dividendos', catId: 'cat_rendimentos', min: 200, max: 800 },
            { desc: 'Bônus Performance', catId: 'cat_bonus', min: 2000, max: 6000 },
        ];

        const demoSuppliers = [
            'Apple Store', 'Amazon Brasil', 'Mercado Livre', 'Burger King', 'Posto Ipiranga',
            'Unimed', 'Starbucks', 'Pague Menos', 'Zara Home', 'Petz', 'Decathlon'
        ];

        // 2. Garantir que fornecedores básicos existam sem duplicar
        const updatedSuppliers = [...existingData.suppliers];
        demoSuppliers.forEach(name => {
            if (!updatedSuppliers.find(s => s.name === name)) {
                updatedSuppliers.push({ id: uuidv4(), name });
            }
        });

        // 3. Gerar um bloco de novas transações aleatórias (Ex: 15 a 25 novas transações)
        const numNewTransactions = Math.floor(Math.random() * 10) + 15;
        const newTransactions: Transaction[] = [];

        for (let i = 0; i < numNewTransactions; i++) {
            const isIncome = Math.random() > 0.85; // 15% chance de ser renda
            const pool = isIncome ? incomePool : expensePool;
            const item = pool[Math.floor(Math.random() * pool.length)];

            // Data aleatória nos últimos 60 dias
            const randomDayOffset = Math.floor(Math.random() * 60);
            const date = new Date(today);
            date.setDate(today.getDate() - randomDayOffset);

            const cat = categories.find(c => c.id === item.catId) || categories[0];
            const amount = Math.floor(Math.random() * (item.max - item.min) + item.min);

            newTransactions.push({
                id: uuidv4(),
                type: isIncome ? 'INCOME' : 'EXPENSE',
                amount: amount,
                description: `${item.desc} #${Math.floor(Math.random() * 999)}`,
                date: date.toISOString(),
                categoryId: cat.id,
                supplierId: !isIncome && Math.random() > 0.3
                    ? updatedSuppliers[Math.floor(Math.random() * updatedSuppliers.length)].id
                    : undefined,
                paymentMethodId: methods[Math.floor(Math.random() * methods.length)].id,
                createdAt: Date.now(),
                updatedAt: Date.now()
            });
        }

        // 4. Compromissos Variados (Alguns já baixados)
        const commitmentPool = [
            { desc: 'Parcela Notebook Gamer', amt: 850, catId: 'cat_tecnologia' },
            { desc: 'Internet Fibra Óptica', amt: 129.90, catId: 'cat_contas_casa' },
            { desc: 'Condomínio Residencial', amt: 450, catId: 'cat_contas_casa' },
            { desc: 'Mensalidade Academia', amt: 119, catId: 'cat_saude' },
            { desc: 'Conta de Energia', amt: 215, catId: 'cat_contas_casa' },
            { desc: 'Assinatura Adobe CC', amt: 124, catId: 'cat_assinaturas' },
        ];

        const updatedCommitments: Commitment[] = [...(existingData.commitments || [])];
        commitmentPool.forEach(item => {
            const isPaid = Math.random() > 0.5;
            const date = new Date(today);

            if (isPaid) {
                date.setDate(today.getDate() - Math.floor(Math.random() * 10) - 1); // Pago nos últimos 10 dias
            } else {
                date.setDate(today.getDate() + Math.floor(Math.random() * 20) + 1); // Vence nos próximos 20 dias
            }

            const cat = categories.find(c => c.id === item.catId) || categories[0];

            updatedCommitments.push({
                id: uuidv4(),
                description: item.desc,
                dueDate: date.toISOString(),
                amount: item.amt,
                status: isPaid ? 'PAID' : 'PENDING',
                paymentDate: isPaid ? date.toISOString().split('T')[0] : undefined,
                paymentMethodId: isPaid ? methods[Math.floor(Math.random() * methods.length)].id : undefined,
                categoryId: cat.id,
                createdAt: Date.now(),
                updatedAt: Date.now()
            });
        });

        // 5. Três Metas em Economia (Savings Goals)
        const goals: SavingsGoal[] = [
            {
                id: uuidv4(),
                description: 'Viagem para o Japão',
                targetAmount: 35000,
                currentAmount: 12400,
                targetDate: new Date(today.getFullYear() + 1, 10, 15).toISOString(),
                color: '#ef4444',
                icon: 'Plane',
                createdAt: Date.now(),
                updatedAt: Date.now()
            },
            {
                id: uuidv4(),
                description: 'Reserva de Emergência',
                targetAmount: 20000,
                currentAmount: 18500,
                targetDate: new Date(today.getFullYear(), today.getMonth() + 4, 1).toISOString(),
                color: '#10b981',
                icon: 'Shield',
                createdAt: Date.now(),
                updatedAt: Date.now()
            },
            {
                id: uuidv4(),
                description: 'Troca de Carro',
                targetAmount: 85000,
                currentAmount: 15000,
                targetDate: new Date(today.getFullYear() + 2, 5, 20).toISOString(),
                color: '#3b82f6',
                icon: 'Car',
                createdAt: Date.now(),
                updatedAt: Date.now()
            }
        ];

        const newData: AppData = {
            ...existingData,
            suppliers: updatedSuppliers,
            categories: updatedCategories,
            transactions: [...existingData.transactions, ...newTransactions],
            commitments: updatedCommitments,
            savingsGoals: goals // Sobrescreve com as 3 metas solicitadas
        };

        this.save(newData, userEmail);
        return newData;
    },
    clear(userEmail?: string) {
        const key = userEmail ? `${STORAGE_KEY}_${userEmail}` : STORAGE_KEY;
        localStorage.removeItem(key);
        window.location.reload();
    },

    clearGlobals() {
        localStorage.removeItem(GLOBAL_CATEGORIES_KEY);
        localStorage.removeItem(GLOBAL_METHODS_KEY);
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

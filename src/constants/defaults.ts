import { Category, PaymentMethod } from '../models/types';

export const DEFAULT_CATEGORIES: Category[] = [
    // --- DESPESAS ---
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

    // --- RECEITAS ---
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

export const DEFAULT_METHODS: PaymentMethod[] = [
    { id: 'pm_dinheiro', name: 'Dinheiro', color: '#10b981', isDefault: true },
    { id: 'pm_pix', name: 'Pix', color: '#06b6d4', isDefault: true },
    { id: 'pm_credito', name: 'Cartão de Crédito', color: '#6366f1', isDefault: true },
    { id: 'pm_debito', name: 'Cartão de Débito', color: '#3b82f6', isDefault: true },
    { id: 'pm_permuta', name: 'Permuta', color: '#8b5cf6', isDefault: true },
];

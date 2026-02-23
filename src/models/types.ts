export type TransactionType = 'INCOME' | 'EXPENSE';

export interface Attachment {
    id: string;
    name: string;
    type: string;
    url: string; // Base64 for now
    size: number;
}

export interface Category {
    id: string;
    name: string;
    type: 'INCOME' | 'EXPENSE' | 'BOTH';
    color?: string;
    icon?: string;
    isDefault?: boolean;
}

export interface Supplier {
    id: string;
    name: string;
    contact?: string;
    notes?: string;
}

export interface PaymentMethod {
    id: string;
    name: string;
    color?: string;
    isDefault?: boolean;
}

export interface Transaction {
    id: string;
    type: TransactionType;
    date: string; // ISO Date String
    amount: number;
    description: string;
    categoryId: string;
    supplierId?: string;
    paymentMethodId?: string;
    isRecurring?: boolean;
    recurrenceCount?: number;
    isFixed?: boolean;
    installmentId?: string;
    installmentNumber?: number;
    totalInstallments?: number;
    tags?: string[];
    attachments?: Attachment[];
    createdAt: number;
    updatedAt: number;
}

export interface Budget {
    id: string;
    categoryId: string;
    limitAmount: number;
    period: 'MONTHLY'; // Por enquanto, suporte apenas mensal
    alertPercent: number; // ex: 80
}

export interface UserProfile {
    name: string;
    email: string;
    phone?: string;
    profession?: string;
    avatar?: string;
    isAdmin?: boolean;
    isAuthorized?: boolean;
    plan?: 'FREE' | 'PREMIUM';
}

export interface Commitment {
    id: string;
    description: string;
    dueDate: string; // ISO Date String
    amount: number;
    supplierId?: string;
    categoryId: string;
    status: 'PENDING' | 'PAID';
    paymentMethodId?: string;
    transactionId?: string;
    paymentDate?: string; // yyyy-mm-dd
    installmentId?: string;
    installmentNumber?: number;
    totalInstallments?: number;
    attachments?: Attachment[];
    createdAt: number;
    updatedAt: number;
}

export interface SavingsGoal {
    id: string;
    description: string;
    targetAmount: number;
    currentAmount: number;
    targetDate: string; // ISO Date String
    color?: string;
    icon?: string;
    createdAt: number;
    updatedAt: number;
}

export interface AppData {
    categories: Category[];
    suppliers: Supplier[];
    paymentMethods: PaymentMethod[];
    transactions: Transaction[];
    budgets: Budget[];
    commitments?: Commitment[];
    savingsGoals?: SavingsGoal[];
    userProfile?: UserProfile;
}

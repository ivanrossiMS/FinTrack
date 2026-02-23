import React, { createContext, useContext, useEffect, useState } from 'react';
import { AppData, Transaction, Category, Supplier, PaymentMethod, UserProfile, Commitment, SavingsGoal } from '../models/types';
import { StorageService } from '../services/storage';
import { v4 as uuidv4 } from 'uuid';
import { useAuth } from './AuthContext';
import { addMonths, parseISO } from 'date-fns';

interface DataContextType {
    data: AppData;
    addTransaction: (tx: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'> & { installments?: number; recurrenceCount?: number }) => Promise<void>;
    updateTransaction: (id: string, tx: Partial<Transaction>) => Promise<void>;
    deleteTransaction: (id: string) => Promise<void>;
    addCategory: (cat: Omit<Category, 'id'>) => Promise<string>;
    updateCategory: (id: string, cat: Partial<Category>) => Promise<void>;
    deleteCategory: (id: string) => Promise<void>;
    addSupplier: (supplier: Omit<Supplier, 'id'>) => Promise<string>;
    updateSupplier: (id: string, supplier: Partial<Supplier>) => Promise<void>;
    deleteSupplier: (id: string) => Promise<void>;
    addPaymentMethod: (method: Omit<PaymentMethod, 'id'>) => Promise<void>;
    updatePaymentMethod: (id: string, method: Partial<PaymentMethod>) => Promise<void>;
    deletePaymentMethod: (id: string) => Promise<void>;
    updateProfile: (profile: UserProfile) => Promise<void>;
    addCommitment: (commitment: Omit<Commitment, 'id' | 'status' | 'createdAt' | 'updatedAt'> & { installments?: number }) => Promise<void>;
    updateCommitment: (id: string, updates: Partial<Commitment>) => Promise<void>;
    deleteCommitment: (id: string) => Promise<void>;
    payCommitment: (id: string, paymentMethodId: string, installments?: number) => Promise<void>;
    refresh: () => Promise<void>;
    addSavingsGoal: (goal: Omit<SavingsGoal, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
    updateSavingsGoal: (id: string, updates: Partial<SavingsGoal>) => Promise<void>;
    deleteSavingsGoal: (id: string) => Promise<void>;
    resetCategories: () => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user } = useAuth();
    const [data, setData] = useState<AppData>({
        transactions: [],
        categories: [],
        suppliers: [],
        paymentMethods: [],
        budgets: [],
        commitments: [],
        savingsGoals: []
    });

    // Reload data when user changes
    useEffect(() => {
        if (!user?.id) return;

        const loadData = async () => {
            const loadedData = await StorageService.load(user.id);
            setData(loadedData);
        };

        loadData();
    }, [user?.id]);

    useEffect(() => {
        // --- AUTO-SYNC FIXED CATEGORIES ---
        // Ensures all 30 elite categories from DEFAULT_CATEGORIES are present in the user's profile.
        // Or just use the imported list if shared
        // If StorageService.loadGlobalCategories() is null, we can fall back to the one in storage.ts
        // Actually, it's safer to compare with the source of truth from storage.ts if accessible, 
        // but here we can just use a helper to get them.

        const currentCats = data.categories;
        const missingDefaults = (StorageService as any).DEFAULT_CATEGORIES_SOURCE?.filter((def: Category) =>
            !currentCats.find(c => c.id === def.id || c.name.toLowerCase() === def.name.toLowerCase())
        ) || [];

        if (missingDefaults.length > 0) {
            setData(prev => ({
                ...prev,
                categories: [...prev.categories, ...missingDefaults]
            }));
        }
    }, [data.categories.length]); // Track length to avoid infinite loops but catch additions

    const refresh = async () => {
        if (user?.id) {
            setData(await StorageService.load(user.id));
        }
    };

    const addTransaction = async (tx: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'> & { installments?: number; recurrenceCount?: number }) => {
        if (!user?.id) return;
        const { installments, recurrenceCount, ...baseTx } = tx;

        const count = (baseTx.isRecurring && recurrenceCount && recurrenceCount > 1)
            ? recurrenceCount
            : (installments || 1);

        const groupId = count > 1 ? uuidv4() : undefined;
        const baseDate = parseISO(baseTx.date);

        for (let i = 0; i < count; i++) {
            const date = addMonths(baseDate, i).toISOString();
            const description = count > 1 ? `${baseTx.description} [${i + 1}/${count}]` : baseTx.description;
            const installmentAmount = (!baseTx.isRecurring && count > 1)
                ? Math.round((baseTx.amount / count) * 100) / 100
                : baseTx.amount;

            const newTx: Transaction = {
                ...baseTx,
                id: uuidv4(),
                date,
                amount: installmentAmount,
                description,
                installmentId: groupId,
                installmentNumber: i + 1,
                totalInstallments: count > 1 ? count : undefined,
                isRecurring: baseTx.isRecurring || false,
                recurrenceCount: baseTx.isRecurring ? count : undefined,
                createdAt: Date.now(),
                updatedAt: Date.now()
            };

            await StorageService.saveTransaction(newTx, user.id);
        }

        refresh();
    };

    const updateTransaction = async (id: string, updates: Partial<Transaction>) => {
        if (!user?.id) return;
        const currentTx = data.transactions.find(t => t.id === id);
        if (!currentTx) return;

        const updatedTx = { ...currentTx, ...updates, updatedAt: Date.now() };
        await StorageService.saveTransaction(updatedTx, user.id);
        refresh();
    };

    const deleteTransaction = async (id: string) => {
        await StorageService.deleteTransaction(id);
        refresh();
    };

    const addCategory = async (cat: Omit<Category, 'id'>) => {
        if (!user?.id) return '';
        const id = uuidv4();
        const newCat: Category = { ...cat, id };
        await StorageService.saveCategory(newCat, user.id);
        refresh();
        return id;
    };

    const updateCategory = async (id: string, updates: Partial<Category>) => {
        if (!user?.id) return;
        const currentCat = data.categories.find(c => c.id === id);
        if (!currentCat) return;

        const updatedCat = { ...currentCat, ...updates };
        await StorageService.saveCategory(updatedCat, user.id);
        refresh();
    };

    const deleteCategory = async (id: string) => {
        await StorageService.deleteCategory(id);
        refresh();
    };

    const addSupplier = async (supplier: Omit<Supplier, 'id'>) => {
        if (!user?.id) return '';
        const id = uuidv4();
        const newSupplier: Supplier = { ...supplier, id };
        await StorageService.saveSupplier(newSupplier, user.id);
        refresh();
        return id;
    };

    const updateSupplier = async (id: string, updates: Partial<Supplier>) => {
        if (!user?.id) return;
        const current = data.suppliers.find(s => s.id === id);
        if (!current) return;
        const updated = { ...current, ...updates };
        await StorageService.saveSupplier(updated, user.id);
        refresh();
    };

    const deleteSupplier = async (id: string) => {
        if (!user?.id) return;
        await StorageService.deleteSupplier(id);
        refresh();
    };

    const addPaymentMethod = async (method: Omit<PaymentMethod, 'id'>) => {
        if (!user?.id) return;
        const newMethod: PaymentMethod = { ...method, id: uuidv4() };
        await StorageService.savePaymentMethod(newMethod, user.id);
        refresh();
    };

    const updatePaymentMethod = async (id: string, updates: Partial<PaymentMethod>) => {
        if (!user?.id) return;
        const current = data.paymentMethods.find(m => m.id === id);
        if (!current) return;
        const updated = { ...current, ...updates };
        await StorageService.savePaymentMethod(updated, user.id);
        refresh();
    };

    const deletePaymentMethod = async (id: string) => {
        await StorageService.deletePaymentMethod(id);
        refresh();
    };

    const updateProfile = async (profile: UserProfile) => {
        setData(prev => ({ ...prev, userProfile: profile }));
    };

    const addCommitment = async (commitment: Omit<Commitment, 'id' | 'status' | 'createdAt' | 'updatedAt'> & { installments?: number }) => {
        if (!user?.id) return;
        const { installments, ...baseComm } = commitment;
        const count = installments || 1;
        const installmentId = count > 1 ? uuidv4() : undefined;
        const baseDate = parseISO(baseComm.dueDate);

        for (let i = 0; i < count; i++) {
            const dueDate = addMonths(baseDate, i).toISOString();
            const description = count > 1 ? `${baseComm.description} [${i + 1}/${count}]` : baseComm.description;
            const installmentAmount = count > 1 ? Math.round((baseComm.amount / count) * 100) / 100 : baseComm.amount;

            const newComm: Commitment = {
                ...baseComm,
                id: uuidv4(),
                amount: installmentAmount,
                dueDate,
                description,
                status: 'PENDING',
                installmentId,
                installmentNumber: i + 1,
                totalInstallments: count > 1 ? count : undefined,
                createdAt: Date.now(),
                updatedAt: Date.now()
            };

            await StorageService.saveCommitment(newComm, user.id);
        }
        refresh();
    };

    const updateCommitment = async (id: string, updates: Partial<Commitment>) => {
        if (!user?.id) return;
        const current = data.commitments?.find(c => c.id === id);
        if (!current) return;

        const updated = { ...current, ...updates, updatedAt: Date.now() };
        await StorageService.saveCommitment(updated, user.id);

        if (current.transactionId) {
            const tx = data.transactions.find(t => t.id === current.transactionId);
            if (tx) {
                await StorageService.saveTransaction({
                    ...tx,
                    amount: updates.amount !== undefined ? updates.amount : tx.amount,
                    description: updates.description !== undefined ? `PAGTO: ${updates.description}` : tx.description,
                    categoryId: updates.categoryId !== undefined ? updates.categoryId : tx.categoryId,
                    supplierId: updates.supplierId !== undefined ? updates.supplierId : tx.supplierId,
                    updatedAt: Date.now()
                }, user.id);
            }
        }
        refresh();
    };

    const deleteCommitment = async (id: string) => {
        if (!user?.id) return;
        const commitment = data.commitments?.find(c => c.id === id);
        if (commitment?.transactionId) {
            await StorageService.deleteTransaction(commitment.transactionId);
        }
        await StorageService.deleteCommitment(id);
        refresh();
    };

    const payCommitment = async (id: string, paymentMethodId: string, installments?: number) => {
        if (!user?.id) return;
        const commitment = data.commitments?.find(c => c.id === id);
        if (!commitment || commitment.status === 'PAID') return;

        const count = installments || 1;
        const installmentId = count > 1 ? uuidv4() : undefined;
        const paymentDateStr = new Date().toISOString().split('T')[0];
        const baseDate = parseISO(paymentDateStr);

        for (let i = 0; i < count; i++) {
            const date = addMonths(baseDate, i).toISOString();
            const description = count > 1
                ? `PAGTO: ${commitment.description} [${i + 1}/${count}]`
                : `PAGTO: ${commitment.description}`;

            const installmentAmount = count > 1 ? Math.round((commitment.amount / count) * 100) / 100 : commitment.amount;

            const newTx: Transaction = {
                id: i === 0 ? (commitment.transactionId || uuidv4()) : uuidv4(),
                type: 'EXPENSE',
                date,
                amount: installmentAmount,
                description,
                categoryId: commitment.categoryId,
                supplierId: commitment.supplierId,
                paymentMethodId: paymentMethodId,
                installmentId,
                installmentNumber: i + 1,
                totalInstallments: count > 1 ? count : undefined,
                createdAt: Date.now(),
                updatedAt: Date.now()
            };

            await StorageService.saveTransaction(newTx, user.id);

            if (i === 0) {
                await StorageService.saveCommitment({
                    ...commitment,
                    status: 'PAID',
                    paymentMethodId,
                    transactionId: newTx.id,
                    paymentDate: paymentDateStr,
                    updatedAt: Date.now()
                }, user.id);
            }
        }
        refresh();
    };

    const addSavingsGoal = async (goal: Omit<SavingsGoal, 'id' | 'createdAt' | 'updatedAt'>) => {
        if (!user?.id) return;
        const newGoal: SavingsGoal = {
            ...goal,
            id: uuidv4(),
            createdAt: Date.now(),
            updatedAt: Date.now()
        };
        await StorageService.saveSavingsGoal(newGoal, user.id);
        refresh();
    };

    const updateSavingsGoal = async (id: string, updates: Partial<SavingsGoal>) => {
        if (!user?.id) return;
        const current = data.savingsGoals?.find(g => g.id === id);
        if (!current) return;
        const updated = { ...current, ...updates, updatedAt: Date.now() };
        await StorageService.saveSavingsGoal(updated, user.id);
        refresh();
    };

    const deleteSavingsGoal = async (id: string) => {
        if (!user?.id) return;
        await StorageService.deleteSavingsGoal(id);
        refresh();
    };

    /**
     * Resets categories to the new standardized Finance+ list.
     * Merges current categories with defaults, ensuring all defaults are present and marked.
     */
    const resetCategories = async () => {
        if (!user?.id) return;
        const defaults = StorageService.DEFAULT_CATEGORIES_SOURCE;
        await Promise.all(defaults.map(cat => StorageService.saveCategory(cat, user.id)));
        refresh();
    };

    return (
        <DataContext.Provider value={{
            data,
            addTransaction,
            updateTransaction,
            deleteTransaction,
            addCategory,
            updateCategory,
            deleteCategory,
            addSupplier,
            updateSupplier,
            deleteSupplier,
            addPaymentMethod,
            updatePaymentMethod,
            deletePaymentMethod,
            updateProfile,
            addCommitment,
            updateCommitment,
            deleteCommitment,
            payCommitment,
            refresh,
            addSavingsGoal,
            updateSavingsGoal,
            deleteSavingsGoal,
            resetCategories
        }}>
            {children}
        </DataContext.Provider>
    );
};

export const useData = () => {
    const context = useContext(DataContext);
    if (!context) throw new Error('useData must be used within a DataProvider');
    return context;
};

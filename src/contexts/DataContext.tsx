import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { AppData, UserProfile } from '../models/types';
import { SupabaseDataService } from '../services/supabaseData';
import { useAuth } from './AuthContext';
import { DEFAULT_CATEGORIES, DEFAULT_METHODS } from '../constants/defaults';

interface DataContextType {
    data: AppData;
    loading: boolean;
    addTransaction: (tx: any) => Promise<void>;
    updateTransaction: (id: string, updates: any) => Promise<void>;
    deleteTransaction: (id: string) => Promise<void>;
    addCategory: (cat: any) => Promise<string>;
    updateCategory: (id: string, updates: any) => Promise<void>;
    deleteCategory: (id: string) => Promise<void>;
    addSupplier: (supplier: any) => Promise<string>;
    updateSupplier: (id: string, updates: any) => Promise<void>;
    deleteSupplier: (id: string) => Promise<void>;
    addPaymentMethod: (method: any) => Promise<void>;
    updatePaymentMethod: (id: string, updates: any) => Promise<void>;
    deletePaymentMethod: (id: string) => Promise<void>;
    updateProfile: (profile: UserProfile) => Promise<void>;
    addCommitment: (commitment: any) => Promise<void>;
    updateCommitment: (id: string, updates: any) => Promise<void>;
    deleteCommitment: (id: string) => Promise<void>;
    payCommitment: (id: string, paymentMethodId: string, installments?: number) => Promise<void>;
    resetCategories: () => Promise<void>;
    refresh: () => Promise<void>;
    addSavingsGoal: (goal: any) => Promise<void>;
    updateSavingsGoal: (id: string, updates: any) => Promise<void>;
    deleteSavingsGoal: (id: string) => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

const INITIAL_DATA: AppData = {
    transactions: [],
    categories: [],
    suppliers: [],
    paymentMethods: [],
    commitments: [],
    savingsGoals: [],
    budgets: [],
    userProfile: undefined
};

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user, loading: authLoading } = useAuth();
    const [data, setData] = useState<AppData>(INITIAL_DATA);
    const [loading, setLoading] = useState(true);

    const loadData = useCallback(async () => {
        // Wait for Auth to settle before making decisions
        if (authLoading) return;

        if (!user) {
            setData(INITIAL_DATA);
            setLoading(false);
            return;
        }

        setLoading(true);
        try {
            const [
                transactions,
                categories,
                suppliers,
                paymentMethods,
                commitments,
                savingsGoals,
                userProfile
            ] = await Promise.all([
                SupabaseDataService.getTransactions(user.id),
                SupabaseDataService.getCategories(user.id),
                SupabaseDataService.getSuppliers(user.id),
                SupabaseDataService.getPaymentMethods(user.id),
                SupabaseDataService.getCommitments(user.id),
                SupabaseDataService.getSavingsGoals(user.id),
                SupabaseDataService.getProfile(user.id)
            ]);

            setData({
                transactions: transactions || [],
                categories: categories || [],
                suppliers: suppliers || [],
                paymentMethods: paymentMethods || [],
                commitments: commitments || [],
                savingsGoals: savingsGoals || [],
                budgets: [], // To be implemented if needed
                userProfile: userProfile || undefined
            });

            // Safety net: Ensure all defaults are present
            const missingCategories = DEFAULT_CATEGORIES.some(def => !categories.find(c => c.id === def.id));
            const missingMethods = DEFAULT_METHODS.some(def => !paymentMethods.find(m => m.id === def.id));

            if (missingCategories || missingMethods) {
                console.info('🚩 Missing default categories or payment methods. Triggering sync...');
                await SupabaseDataService.syncUserToProfile(user);
                // Refresh to get seeded data
                await refresh();
            }
        } catch (error: any) {
            console.error('Error loading data from Supabase:', error);
            // Don't leave loading true on error
            setLoading(false);
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const refresh = async () => {
        await loadData();
    };

    const addTransaction = useCallback(async (tx: any) => {
        if (!user) return;
        try {
            await SupabaseDataService.addTransaction(user.id, tx);
            await loadData();
        } catch (err) {
            console.error('Error adding transaction:', err);
            throw err;
        }
    }, [user, loadData]);

    const updateTransaction = async (id: string, updates: any) => {
        if (!user) return;
        await SupabaseDataService.upsertTransaction({ ...updates, id, user_id: user.id });
        await refresh();
    };

    const deleteTransaction = async (id: string) => {
        await SupabaseDataService.deleteTransaction(id);
        await refresh();
    };

    const addCategory = async (cat: any) => {
        if (!user) return cat.id;
        const { data: newCat } = await SupabaseDataService.upsertCategory({ ...cat, user_id: user.id });
        await refresh();
        return (newCat as any)?.[0]?.id || cat.id;
    };

    const updateCategory = async (id: string, updates: any) => {
        if (!user) return;
        await SupabaseDataService.upsertCategory({ ...updates, id, user_id: user.id });
        await refresh();
    };

    const deleteCategory = async (id: string) => {
        await SupabaseDataService.deleteCategory(id);
        await refresh();
    };

    const addSupplier = async (supplier: any) => {
        if (!user) return supplier.id;
        const { data: newSupplier } = await SupabaseDataService.upsertSupplier({ ...supplier, user_id: user.id });
        await refresh();
        return (newSupplier as any)?.[0]?.id || supplier.id;
    };

    const updateSupplier = async (id: string, updates: any) => {
        if (!user) return;
        await SupabaseDataService.upsertSupplier({ ...updates, id, user_id: user.id });
        await refresh();
    };

    const deleteSupplier = async (id: string) => {
        await SupabaseDataService.deleteSupplier(id);
        await refresh();
    };

    const addPaymentMethod = async (method: any) => {
        if (!user) return;
        await SupabaseDataService.upsertPaymentMethod({ ...method, user_id: user.id });
        await refresh();
    };

    const updatePaymentMethod = async (id: string, updates: any) => {
        if (!user) return;
        await SupabaseDataService.upsertPaymentMethod({ ...updates, id, user_id: user.id });
        await refresh();
    };

    const deletePaymentMethod = async (id: string) => {
        await SupabaseDataService.deletePaymentMethod(id);
        await refresh();
    };

    const updateProfile = async (profileUpdate: UserProfile) => {
        if (!user) return;
        await SupabaseDataService.updateProfile(user.id, profileUpdate);
        await refresh();
    };

    const addCommitment = async (commitment: any) => {
        if (!user) return;
        await SupabaseDataService.upsertCommitment({ ...commitment, user_id: user.id });
        await refresh();
    };

    const updateCommitment = async (id: string, updates: any) => {
        if (!user) return;
        await SupabaseDataService.upsertCommitment({ ...updates, id, user_id: user.id });
        await refresh();
    };

    const deleteCommitment = async (id: string) => {
        await SupabaseDataService.deleteCommitment(id);
        await refresh();
    };

    const payCommitment = async (id: string, paymentMethodId: string, installments?: number) => {
        const commitments = data.commitments || [];
        const commitment = commitments.find(c => c.id === id);
        if (!commitment) return;

        await SupabaseDataService.upsertCommitment({
            ...commitment,
            status: 'PAID',
            paymentMethodId,
            totalInstallments: installments,
            paymentDate: new Date().toISOString().split('T')[0],
        });
        await refresh();
    };

    const resetCategories = async () => {
        if (!user) return;
        setLoading(true);
        try {
            await SupabaseDataService.syncUserToProfile(user);
            await refresh();
        } finally {
            setLoading(false);
        }
    };

    const addSavingsGoal = async (goal: any) => {
        if (!user) return;
        await SupabaseDataService.upsertSavingsGoal({ ...goal, user_id: user.id });
        await refresh();
    };

    const updateSavingsGoal = async (id: string, updates: any) => {
        if (!user) return;
        await SupabaseDataService.upsertSavingsGoal({ ...updates, id, user_id: user.id });
        await refresh();
    };

    const deleteSavingsGoal = async (id: string) => {
        await SupabaseDataService.deleteSavingsGoal(id);
        await refresh();
    };

    return (
        <DataContext.Provider value={{
            data,
            loading,
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
            resetCategories,
            refresh,
            addSavingsGoal,
            updateSavingsGoal,
            deleteSavingsGoal
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

import React, { createContext, useContext, useEffect, useState } from 'react';
import { AppData, Transaction, Category, Supplier, PaymentMethod, UserProfile, Commitment, SavingsGoal } from '../models/types';
import { StorageService } from '../services/storage';
import { v4 as uuidv4 } from 'uuid';
import { useAuth } from './AuthContext';
import { addMonths, parseISO } from 'date-fns';

interface DataContextType {
    data: AppData;
    addTransaction: (tx: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'> & { installments?: number }) => void;
    updateTransaction: (id: string, tx: Partial<Transaction>) => void;
    deleteTransaction: (id: string) => void;
    addCategory: (cat: Omit<Category, 'id'>) => void;
    updateCategory: (id: string, cat: Partial<Category>) => void;
    deleteCategory: (id: string) => void;
    addSupplier: (supplier: Omit<Supplier, 'id'>) => void;
    updateSupplier: (id: string, supplier: Partial<Supplier>) => void;
    deleteSupplier: (id: string) => void;
    addPaymentMethod: (method: Omit<PaymentMethod, 'id'>) => void;
    updatePaymentMethod: (id: string, method: Partial<PaymentMethod>) => void;
    deletePaymentMethod: (id: string) => void;
    updateProfile: (profile: UserProfile) => void;
    addCommitment: (commitment: Omit<Commitment, 'id' | 'status' | 'createdAt' | 'updatedAt'> & { installments?: number }) => void;
    updateCommitment: (id: string, updates: Partial<Commitment>) => void;
    deleteCommitment: (id: string) => void;
    payCommitment: (id: string, paymentMethodId: string, installments?: number) => void;
    refresh: () => void;
    addSavingsGoal: (goal: Omit<SavingsGoal, 'id' | 'createdAt' | 'updatedAt'>) => void;
    updateSavingsGoal: (id: string, updates: Partial<SavingsGoal>) => void;
    deleteSavingsGoal: (id: string) => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user } = useAuth();
    const [data, setData] = useState<AppData>(StorageService.load(user?.email));

    // Reload data when user changes
    useEffect(() => {
        const loadedData = StorageService.load(user?.email);
        setData(loadedData);

        // One-time sync: If admin, and global keys are empty, initialize them with admin's current data
        if (user?.isAdmin) {
            const hasGlobalCats = StorageService.loadGlobalCategories();
            const hasGlobalMethods = StorageService.loadGlobalMethods();

            if (!hasGlobalCats && loadedData.categories.length > 0) {
                StorageService.saveGlobalCategories(loadedData.categories);
            }
            if (!hasGlobalMethods && loadedData.paymentMethods.length > 0) {
                StorageService.saveGlobalMethods(loadedData.paymentMethods);
            }
        }
    }, [user?.email, user?.isAdmin]);

    useEffect(() => {
        // Sincronizar qualquer mudança de estado com o localStorage relativo ao usuário
        StorageService.save(data, user?.email);
    }, [data, user?.email]);

    const refresh = () => {
        setData(StorageService.load(user?.email));
    };

    const addTransaction = (tx: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'> & { installments?: number }) => {
        const { installments, ...baseTx } = tx;
        const count = installments || 1;
        const installmentId = count > 1 ? uuidv4() : undefined;

        const newTransactions: Transaction[] = [];
        const baseDate = parseISO(baseTx.date);

        for (let i = 0; i < count; i++) {
            const date = addMonths(baseDate, i).toISOString();
            const description = count > 1 ? `${baseTx.description} [${i + 1}/${count}]` : baseTx.description;

            newTransactions.push({
                ...baseTx,
                id: uuidv4(),
                date,
                description,
                installmentId,
                installmentNumber: i + 1,
                totalInstallments: count > 1 ? count : undefined,
                createdAt: Date.now(),
                updatedAt: Date.now()
            });
        }

        setData(prev => ({
            ...prev,
            transactions: [...prev.transactions, ...newTransactions]
        }));
    };

    const updateTransaction = (id: string, updates: Partial<Transaction>) => {
        setData(prev => ({
            ...prev,
            transactions: prev.transactions.map(t => t.id === id ? { ...t, ...updates, updatedAt: Date.now() } : t)
        }));
    };

    const deleteTransaction = (id: string) => {
        setData(prev => ({
            ...prev,
            transactions: prev.transactions.filter(t => t.id !== id)
        }));
    };

    const addCategory = (cat: Omit<Category, 'id'>) => {
        const newCat: Category = { ...cat, id: uuidv4() };
        setData(prev => {
            const newData = { ...prev, categories: [...prev.categories, newCat] };
            if (user?.isAdmin) {
                StorageService.saveGlobalCategories(newData.categories);
            }
            return newData;
        });
    };

    const updateCategory = (id: string, updates: Partial<Category>) => {
        setData(prev => {
            const newData = {
                ...prev,
                categories: prev.categories.map(c => c.id === id ? { ...c, ...updates } : c)
            };
            if (user?.isAdmin) {
                StorageService.saveGlobalCategories(newData.categories);
            }
            return newData;
        });
    };

    const deleteCategory = (id: string) => {
        setData(prev => {
            const newData = { ...prev, categories: prev.categories.filter(c => c.id !== id) };
            if (user?.isAdmin) {
                StorageService.saveGlobalCategories(newData.categories);
            }
            return newData;
        });
    };

    const addSupplier = (supplier: Omit<Supplier, 'id'>) => {
        const newSupplier: Supplier = { ...supplier, id: uuidv4() };
        setData(prev => ({ ...prev, suppliers: [...prev.suppliers, newSupplier] }));
    };

    const updateSupplier = (id: string, updates: Partial<Supplier>) => {
        setData(prev => ({
            ...prev,
            suppliers: prev.suppliers.map(s => s.id === id ? { ...s, ...updates } : s)
        }));
    };

    const deleteSupplier = (id: string) => {
        setData(prev => ({ ...prev, suppliers: prev.suppliers.filter(s => s.id !== id) }));
    };

    const addPaymentMethod = (method: Omit<PaymentMethod, 'id'>) => {
        const newMethod: PaymentMethod = { ...method, id: uuidv4() };
        setData(prev => {
            const newData = { ...prev, paymentMethods: [...prev.paymentMethods, newMethod] };
            if (user?.isAdmin) {
                StorageService.saveGlobalMethods(newData.paymentMethods);
            }
            return newData;
        });
    };

    const updatePaymentMethod = (id: string, updates: Partial<PaymentMethod>) => {
        setData(prev => {
            const newData = {
                ...prev,
                paymentMethods: prev.paymentMethods.map(m => m.id === id ? { ...m, ...updates } : m)
            };
            if (user?.isAdmin) {
                StorageService.saveGlobalMethods(newData.paymentMethods);
            }
            return newData;
        });
    };

    const deletePaymentMethod = (id: string) => {
        setData(prev => {
            const newData = { ...prev, paymentMethods: prev.paymentMethods.filter(m => m.id !== id) };
            if (user?.isAdmin) {
                StorageService.saveGlobalMethods(newData.paymentMethods);
            }
            return newData;
        });
    };

    const updateProfile = (profile: UserProfile) => {
        setData(prev => ({ ...prev, userProfile: profile }));
    };

    const addCommitment = (commitment: Omit<Commitment, 'id' | 'status' | 'createdAt' | 'updatedAt'> & { installments?: number }) => {
        const { installments, ...baseComm } = commitment;
        const count = installments || 1;
        const installmentId = count > 1 ? uuidv4() : undefined;

        const newCommitments: Commitment[] = [];
        const baseDate = parseISO(baseComm.dueDate);

        for (let i = 0; i < count; i++) {
            const dueDate = addMonths(baseDate, i).toISOString();
            const description = count > 1 ? `${baseComm.description} [${i + 1}/${count}]` : baseComm.description;

            newCommitments.push({
                ...baseComm,
                id: uuidv4(),
                dueDate,
                description,
                status: 'PENDING',
                installmentId,
                installmentNumber: i + 1,
                totalInstallments: count > 1 ? count : undefined,
                createdAt: Date.now(),
                updatedAt: Date.now()
            });
        }

        setData(prev => ({
            ...prev,
            commitments: [...(prev.commitments || []), ...newCommitments]
        }));
    };

    const updateCommitment = (id: string, updates: Partial<Commitment>) => {
        setData(prev => {
            const commitments = prev.commitments || [];
            const commitment = commitments.find(c => c.id === id);

            if (!commitment) return prev;

            const updatedCommitments = commitments.map(c =>
                c.id === id ? { ...c, ...updates, updatedAt: Date.now() } : c
            );

            let updatedTransactions = prev.transactions;
            if (commitment.transactionId) {
                updatedTransactions = prev.transactions.map(t => {
                    if (t.id === commitment.transactionId) {
                        return {
                            ...t,
                            amount: updates.amount !== undefined ? updates.amount : t.amount,
                            description: updates.description !== undefined ? `PAGTO: ${updates.description}` : t.description,
                            categoryId: updates.categoryId !== undefined ? updates.categoryId : t.categoryId,
                            supplierId: updates.supplierId !== undefined ? updates.supplierId : t.supplierId,
                            updatedAt: Date.now()
                        };
                    }
                    return t;
                });
            }

            return {
                ...prev,
                commitments: updatedCommitments,
                transactions: updatedTransactions
            };
        });
    };

    const deleteCommitment = (id: string) => {
        setData(prev => {
            const commitments = prev.commitments || [];
            const commitment = commitments.find(c => c.id === id);

            const updatedCommitments = commitments.filter(c => c.id !== id);
            let updatedTransactions = prev.transactions;

            if (commitment?.transactionId) {
                updatedTransactions = prev.transactions.filter(t => t.id !== commitment.transactionId);
            }

            return {
                ...prev,
                commitments: updatedCommitments,
                transactions: updatedTransactions
            };
        });
    };

    const payCommitment = (id: string, paymentMethodId: string, installments?: number) => {
        setData(prev => {
            const commitments = prev.commitments || [];
            const commitment = commitments.find(c => c.id === id);

            if (!commitment || commitment.status === 'PAID') return prev;

            const count = installments || 1;
            const installmentId = count > 1 ? uuidv4() : undefined;
            const paymentDateStr = new Date().toISOString().split('T')[0];
            const baseDate = parseISO(paymentDateStr);

            // 1. Create the transactions
            const newTransactions: Transaction[] = [];
            for (let i = 0; i < count; i++) {
                const date = addMonths(baseDate, i).toISOString();
                const description = count > 1
                    ? `PAGTO: ${commitment.description} [${i + 1}/${count}]`
                    : `PAGTO: ${commitment.description}`;

                newTransactions.push({
                    id: i === 0 ? (commitment.transactionId || uuidv4()) : uuidv4(),
                    type: 'EXPENSE',
                    date,
                    amount: commitment.amount, // Valor total por parcela (usuário quer 10 lançamentos do valor total)
                    description,
                    categoryId: commitment.categoryId,
                    supplierId: commitment.supplierId,
                    paymentMethodId: paymentMethodId,
                    installmentId,
                    installmentNumber: i + 1,
                    totalInstallments: count > 1 ? count : undefined,
                    createdAt: Date.now(),
                    updatedAt: Date.now()
                });
            }

            const mainTransactionId = newTransactions[0].id;

            // 2. Update the commitment
            const updatedCommitments = commitments.map(c =>
                c.id === id ? {
                    ...(c as Commitment),
                    status: 'PAID' as 'PAID',
                    paymentMethodId,
                    transactionId: mainTransactionId,
                    paymentDate: paymentDateStr,
                    updatedAt: Date.now()
                } : c
            );

            return {
                ...prev,
                transactions: [...prev.transactions, ...newTransactions],
                commitments: updatedCommitments
            };
        });
    };

    const addSavingsGoal = (goal: Omit<SavingsGoal, 'id' | 'createdAt' | 'updatedAt'>) => {
        const newGoal: SavingsGoal = {
            ...goal,
            id: uuidv4(),
            createdAt: Date.now(),
            updatedAt: Date.now()
        };
        setData(prev => ({
            ...prev,
            savingsGoals: [...(prev.savingsGoals || []), newGoal]
        }));
    };

    const updateSavingsGoal = (id: string, updates: Partial<SavingsGoal>) => {
        setData(prev => ({
            ...prev,
            savingsGoals: (prev.savingsGoals || []).map(g =>
                g.id === id ? { ...g, ...updates, updatedAt: Date.now() } : g
            )
        }));
    };

    const deleteSavingsGoal = (id: string) => {
        setData(prev => ({
            ...prev,
            savingsGoals: (prev.savingsGoals || []).filter(g => g.id !== id)
        }));
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

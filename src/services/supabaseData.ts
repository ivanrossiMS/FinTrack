import { supabase } from '../lib/supabaseClient';
import { Category, Transaction, PaymentMethod, Commitment, SavingsGoal, Supplier, UserProfile } from '../models/types';
import { DEFAULT_CATEGORIES, DEFAULT_METHODS } from '../constants/defaults';

export const SupabaseDataService = {
    // ─── USER PROFILES ───
    async getProfile(userId: string): Promise<UserProfile | null> {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();

        if (error) {
            console.error('Error fetching profile:', error);
            return null;
        }
        return data as UserProfile;
    },

    async updateProfile(userId: string, profile: Partial<UserProfile>) {
        const { error } = await supabase
            .from('profiles')
            .update(profile)
            .eq('id', userId);

        if (error) throw error;
    },

    async getAllProfiles(): Promise<UserProfile[]> {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .order('name');

        if (error) throw error;
        return data || [];
    },

    async deleteProfile(userId: string) {
        const { error } = await supabase
            .from('profiles')
            .delete()
            .eq('id', userId);

        if (error) throw error;
    },

    // ─── CATEGORIES ───
    async getCategories(userId?: string): Promise<Category[]> {
        let query = supabase.from('categories').select('*');
        if (userId) query = query.eq('user_id', userId);

        const { data, error } = await query.order('name');
        if (error) throw error;

        return (data || []).map(item => ({
            id: item.id,
            name: item.name,
            type: item.type,
            color: item.color,
            icon: item.icon,
            isDefault: item.is_default
        }));
    },

    async upsertCategory(category: any) {
        const { error, data } = await supabase
            .from('categories')
            .upsert({
                id: category.id,
                name: category.name,
                type: category.type,
                color: category.color,
                icon: category.icon,
                is_default: category.isDefault,
                user_id: category.user_id
            })
            .select();

        if (error) throw error;
        return { data };
    },

    async deleteCategory(id: string) {
        const { error } = await supabase
            .from('categories')
            .delete()
            .eq('id', id);

        if (error) throw error;
    },

    // ─── SUPPLIERS ───
    async getSuppliers(userId?: string): Promise<Supplier[]> {
        let query = supabase.from('suppliers').select('*');
        if (userId) query = query.eq('user_id', userId);

        const { data, error } = await query.order('name');
        if (error) throw error;
        return data || [];
    },

    async upsertSupplier(supplier: any) {
        const { error, data } = await supabase
            .from('suppliers')
            .upsert({
                id: supplier.id,
                name: supplier.name,
                contact: supplier.contact,
                notes: supplier.notes,
                user_id: supplier.user_id
            })
            .select();

        if (error) throw error;
        return { data };
    },

    async deleteSupplier(id: string) {
        const { error } = await supabase
            .from('suppliers')
            .delete()
            .eq('id', id);

        if (error) throw error;
    },

    // ─── PAYMENT METHODS ───
    async getPaymentMethods(userId?: string): Promise<PaymentMethod[]> {
        let query = supabase.from('payment_methods').select('*');
        if (userId) query = query.eq('user_id', userId);

        const { data, error } = await query.order('name');
        if (error) throw error;

        return (data || []).map(item => ({
            id: item.id,
            name: item.name,
            color: item.color,
            isDefault: item.is_default
        }));
    },

    async upsertPaymentMethod(method: any) {
        const { error, data } = await supabase
            .from('payment_methods')
            .upsert({
                id: method.id,
                name: method.name,
                color: method.color,
                is_default: method.isDefault,
                user_id: method.user_id
            })
            .select();

        if (error) throw error;
        return { data };
    },

    async deletePaymentMethod(id: string) {
        const { error } = await supabase
            .from('payment_methods')
            .delete()
            .eq('id', id);

        if (error) throw error;
    },

    // ─── TRANSACTIONS ───
    async getTransactions(userId?: string): Promise<Transaction[]> {
        let query = supabase.from('transactions').select('*');
        if (userId) query = query.eq('user_id', userId);

        const { data, error } = await query.order('date', { ascending: false });
        if (error) throw error;

        return (data || []).map(item => ({
            id: item.id,
            type: item.type,
            date: item.date,
            amount: item.amount,
            description: item.description,
            categoryId: item.category_id,
            supplierId: item.supplier_id,
            paymentMethodId: item.payment_method_id,
            isRecurring: item.is_recurring,
            recurrenceCount: item.recurrence_count,
            installmentId: item.installment_id,
            installmentNumber: item.installment_number,
            totalInstallments: item.total_installments,
            createdAt: new Date(item.created_at).getTime(),
            updatedAt: new Date(item.updated_at).getTime()
        }));
    },

    async upsertTransaction(transaction: any) {
        const { error } = await supabase
            .from('transactions')
            .upsert({
                id: transaction.id,
                type: transaction.type,
                date: transaction.date,
                amount: transaction.amount,
                description: transaction.description,
                category_id: transaction.categoryId,
                supplier_id: transaction.supplierId,
                payment_method_id: transaction.paymentMethodId,
                is_recurring: transaction.isRecurring,
                recurrence_count: transaction.recurrenceCount,
                installment_id: transaction.installmentId,
                installment_number: transaction.installmentNumber,
                total_installments: transaction.totalInstallments,
                user_id: transaction.user_id
            });

        if (error) throw error;
    },

    async deleteTransaction(id: string) {
        const { error } = await supabase
            .from('transactions')
            .delete()
            .eq('id', id);

        if (error) throw error;
    },

    // ─── COMMITMENTS ───
    async getCommitments(userId?: string): Promise<Commitment[]> {
        let query = supabase.from('commitments').select('*');
        if (userId) query = query.eq('user_id', userId);

        const { data, error } = await query.order('due_date');
        if (error) throw error;

        return (data || []).map(item => ({
            id: item.id,
            description: item.description,
            dueDate: item.due_date,
            amount: item.amount,
            supplierId: item.supplier_id,
            categoryId: item.category_id,
            status: item.status,
            paymentMethodId: item.payment_method_id,
            transactionId: item.transaction_id,
            paymentDate: item.payment_date,
            installmentId: item.installment_id,
            installmentNumber: item.installment_number,
            totalInstallments: item.total_installments,
            createdAt: new Date(item.created_at).getTime(),
            updatedAt: new Date(item.updated_at).getTime()
        }));
    },

    async upsertCommitment(commitment: any) {
        const { error } = await supabase
            .from('commitments')
            .upsert({
                id: commitment.id,
                description: commitment.description,
                due_date: commitment.dueDate,
                amount: commitment.amount,
                supplier_id: commitment.supplierId,
                category_id: commitment.categoryId,
                status: commitment.status,
                payment_method_id: commitment.paymentMethodId,
                transaction_id: commitment.transactionId,
                payment_date: commitment.paymentDate,
                installment_id: commitment.installmentId,
                installment_number: commitment.installmentNumber,
                total_installments: commitment.totalInstallments,
                user_id: commitment.user_id
            });

        if (error) throw error;
    },

    async deleteCommitment(id: string) {
        const { error } = await supabase
            .from('commitments')
            .delete()
            .eq('id', id);

        if (error) throw error;
    },

    // ─── SAVINGS GOALS ───
    async getSavingsGoals(userId?: string): Promise<SavingsGoal[]> {
        let query = supabase.from('savings_goals').select('*');
        if (userId) query = query.eq('user_id', userId);

        const { data, error } = await query.order('target_date');
        if (error) throw error;

        return (data || []).map(item => ({
            id: item.id,
            description: item.description,
            targetAmount: item.target_amount,
            currentAmount: item.current_amount,
            targetDate: item.target_date,
            color: item.color,
            icon: item.icon,
            createdAt: new Date(item.created_at).getTime(),
            updatedAt: new Date(item.updated_at).getTime()
        }));
    },

    async upsertSavingsGoal(goal: any) {
        const { error } = await supabase
            .from('savings_goals')
            .upsert({
                id: goal.id,
                description: goal.description,
                target_amount: goal.targetAmount,
                current_amount: goal.currentAmount,
                target_date: goal.targetDate,
                color: goal.color,
                icon: goal.icon,
                user_id: goal.user_id
            });

        if (error) throw error;
    },

    async deleteSavingsGoal(id: string) {
        const { error } = await supabase
            .from('savings_goals')
            .delete()
            .eq('id', id);

        if (error) throw error;
    },

    // ─── STORAGE ───
    async uploadAvatar(userId: string, file: File): Promise<string> {
        const fileExt = file.name.split('.').pop();
        const fileName = `${userId}-${Math.random()}.${fileExt}`;
        const filePath = `profiles/${fileName}`;

        const { error: uploadError } = await supabase.storage
            .from('avatars')
            .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data } = supabase.storage
            .from('avatars')
            .getPublicUrl(filePath);

        return data.publicUrl;
    },

    // ─── UTILS / MAINTENANCE ───
    async resetUserData(userId: string) {
        // RLS will handle security, but we explicitly delete from all tables
        const tables = ['transactions', 'commitments', 'savings_goals', 'suppliers', 'categories', 'payment_methods'];
        for (const table of tables) {
            const { error } = await supabase.from(table).delete().eq('user_id', userId);
            if (error) console.error(`Error resetting ${table}:`, error);
        }
    },

    async seedDemoData(userId: string) {
        // 1. First reset
        await this.resetUserData(userId);

        // 2. Inject Defaults (Categories & Methods)
        const { error: catErr } = await supabase.from('categories').insert(
            DEFAULT_CATEGORIES.map(c => ({ ...c, user_id: userId, is_default: true }))
        );
        const { error: pmErr } = await supabase.from('payment_methods').insert(
            DEFAULT_METHODS.map(m => ({ ...m, user_id: userId, is_default: true }))
        );

        if (catErr || pmErr) throw new Error('Falha ao injetar padrões');

        // 3. Inject some mock transactions
        const mockTransactions = [
            { type: 'INCOME', amount: 5000, description: 'Salário Mensal', date: new Date().toISOString(), user_id: userId },
            { type: 'EXPENSE', amount: 1200, description: 'Aluguel', date: new Date().toISOString(), user_id: userId },
            { type: 'EXPENSE', amount: 350, description: 'Supermercado', date: new Date().toISOString(), user_id: userId }
        ];

        const { error: txErr } = await supabase.from('transactions').insert(mockTransactions);
        if (txErr) throw txErr;
    },

    // ─── AUTH SYNC ───
    async syncUserToProfile(user: any) {
        if (!user) return;

        const { data: existingProfile } = await supabase
            .from('profiles')
            .select('id')
            .eq('id', user.id)
            .single();

        if (!existingProfile) {
            // 1. Create Profile
            const { error: profileError } = await supabase
                .from('profiles')
                .insert({
                    id: user.id,
                    email: user.email,
                    name: user.user_metadata?.name || user.email?.split('@')[0] || 'Usuário',
                    role: user.email === 'ivanrossi@outlook.com' ? 'ADMIN' : 'USER',
                    is_authorized: true
                });

            if (profileError) {
                console.error('Erro ao criar perfil de usuário:', profileError);
                return;
            }

            // 2. Inject Default Categories
            const { error: catError } = await supabase
                .from('categories')
                .insert(DEFAULT_CATEGORIES.map(c => ({
                    ...c,
                    user_id: user.id
                })));
            if (catError) console.error('Erro ao injetar categorias default:', catError);

            // 3. Inject Default Payment Methods
            const { error: pmError } = await supabase
                .from('payment_methods')
                .insert(DEFAULT_METHODS.map(m => ({
                    ...m,
                    user_id: user.id
                })));
            if (pmError) console.error('Erro ao injetar métodos default:', pmError);
        }
    }
};

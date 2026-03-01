import { supabase } from '../lib/supabaseClient';
import { Category, Transaction, PaymentMethod, Commitment, SavingsGoal, Supplier, UserProfile } from '../models/types';
import { DEFAULT_CATEGORIES, DEFAULT_METHODS } from '../constants/defaults';

export const SupabaseDataService = {
    // ─── INSTRUMENTATION UTILS ───
    async _wrap<T>(operation: string, promise: any): Promise<T | null> {
        console.group(`🌐 [NETWORK] ${operation}`);
        try {
            const { data, error } = await promise;
            if (error) {
                console.error(`❌ [${operation}] Failed:`, {
                    status: error.status || 'Unknown',
                    code: error.code,
                    message: error.message,
                    details: error.details
                });
                if (error.status === 401 || error.status === 403) {
                    console.warn(`🛑 [${operation}] AUTH REJECTION! Token might be invalid/expired.`);
                }
                return null;
            }
            console.log(`✅ [${operation}] Success! Data size:`, Array.isArray(data) ? data.length : 'Object');
            return data;
        } finally {
            console.groupEnd();
        }
    },

    // ─── USER PROFILES ───
    async getProfile(userId: string): Promise<UserProfile | null> {
        const data = await this._wrap('getProfile', supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single() as any);
        return data as UserProfile | null;
    },

    async updateProfile(userId: string, profile: Partial<UserProfile>) {
        console.log(`📝 [SERVICE] updateProfile for ${userId}`);
        const { error } = await supabase
            .from('profiles')
            .update(profile)
            .eq('id', userId);

        if (error) {
            console.error('❌ [updateProfile] Error:', error.message);
            throw error;
        }
    },

    async getAllProfiles(): Promise<UserProfile[]> {
        const data = await this._wrap('getAllProfiles', supabase
            .from('profiles')
            .select('*')
            .order('name') as any);
        return (data as UserProfile[]) || [];
    },

    async deleteProfile(userId: string) {
        console.log(`🚮 [SERVICE] deleteProfile (DEEP DELETE): ${userId}`);
        const { error } = await supabase.rpc('delete_user_permanently', { target_id: userId });

        if (error) {
            console.error('❌ [deleteProfile] RPC failed:', error.message);
            throw error;
        }
    },

    // ─── CATEGORIES ───
    async getCategories(userId?: string): Promise<Category[]> {
        let query = supabase.from('categories').select('*');
        if (userId) query = query.eq('user_id', userId);

        const data = await this._wrap('getCategories', query.order('name'));
        if (!data) return [];

        return (data as any[]).map(item => ({
            id: item.id,
            name: item.name,
            type: item.type,
            color: item.color,
            icon: item.icon,
            isDefault: item.is_default
        }));
    },

    async upsertCategory(category: any) {
        console.log('📝 [SERVICE] upsertCategory');
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

        if (error) {
            console.error('❌ [upsertCategory] Error:', error.message);
            throw error;
        }
        return { data };
    },

    async deleteCategory(id: string) {
        console.log(`🚮 [SERVICE] deleteCategory: ${id}`);
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

        const data = await this._wrap('getSuppliers', query.order('name'));
        return (data as Supplier[]) || [];
    },

    async upsertSupplier(supplier: any) {
        console.log('📝 [SERVICE] upsertSupplier');
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

        const data = await this._wrap('getPaymentMethods', query.order('name'));
        if (!data) return [];

        return (data as any[]).map(item => ({
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

        const data = await this._wrap('getTransactions', query.order('date', { ascending: false }));
        if (!data) return [];

        return (data as any[]).map(item => ({
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
        console.log('📝 [SERVICE] upsertTransaction');
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

        if (error) {
            console.error('❌ [upsertTransaction] Error:', error.message);
            throw error;
        }
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

        const data = await this._wrap('getCommitments', query.order('due_date'));
        if (!data) return [];

        return (data as any[]).map(item => ({
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

        const data = await this._wrap('getSavingsGoals', query.order('target_date'));
        if (!data) return [];

        return (data as any[]).map(item => ({
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
        const fileName = `${Date.now()}.${fileExt}`;
        const filePath = `${userId}/${fileName}`;

        console.log(`📡 [STORAGE] Uploading avatar to ${filePath}`);
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
        console.log(`🚮 [SERVICE] Resetting data for user: ${userId}`);
        const tables = ['transactions', 'commitments', 'savings_goals', 'suppliers', 'categories', 'payment_methods'];
        for (const table of tables) {
            const { error } = await supabase.from(table).delete().eq('user_id', userId);
            if (error) console.error(`Error resetting ${table}:`, error);
        }
    },

    async seedDemoData(userId: string) {
        try {
            await this.resetUserData(userId);

            const { error: catErr } = await supabase.from('categories').insert(
                DEFAULT_CATEGORIES.map(c => ({
                    id: c.id,
                    user_id: userId,
                    name: c.name,
                    type: c.type,
                    color: c.color,
                    icon: c.icon,
                    is_default: true
                }))
            );

            const { error: pmErr } = await supabase.from('payment_methods').insert(
                DEFAULT_METHODS.map(m => ({
                    id: m.id,
                    user_id: userId,
                    name: m.name,
                    color: m.color,
                    is_default: true
                }))
            );

            if (catErr || pmErr) throw new Error('Falha ao injetar padrões fundamentais.');

            const mockSuppliers = [
                { user_id: userId, name: 'Supermercado Elite', contact: 'contato@elite.com' },
                { user_id: userId, name: 'Energia S.A.', contact: 'financeiro@energia.com' },
                { user_id: userId, name: 'Internet Turbo', contact: 'suporte@turbo.com' }
            ];
            const { data: sups, error: supErr } = await supabase.from('suppliers').insert(mockSuppliers).select();
            if (supErr) throw supErr;

            const now = new Date();
            const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());

            const mockTransactions = [
                { type: 'INCOME', amount: 8500, description: 'Salário de Consultoria', date: now.toISOString(), category_id: 'cat_salario', payment_method_id: 'pm_pix', user_id: userId },
                { type: 'INCOME', amount: 1200, description: 'Dividendos Investimentos', date: now.toISOString(), category_id: 'cat_rendimentos', payment_method_id: 'pm_credito', user_id: userId },
                { type: 'EXPENSE', amount: 2450, description: 'Aluguel Loft', date: lastMonth.toISOString(), category_id: 'cat_contas_casa', payment_method_id: 'pm_pix', user_id: userId },
                { type: 'EXPENSE', amount: 840, description: 'Compras do Mês', date: now.toISOString(), category_id: 'cat_mercado', payment_method_id: 'pm_debito', user_id: userId, supplier_id: (sups as any)?.[0]?.id },
                { type: 'EXPENSE', amount: 180, description: 'Internet e TV', date: now.toISOString(), category_id: 'cat_assinaturas', payment_method_id: 'pm_credito', user_id: userId, supplier_id: (sups as any)?.[2]?.id },
                { type: 'EXPENSE', amount: 450, description: 'Jantar Romântico', date: now.toISOString(), category_id: 'cat_lazer', payment_method_id: 'pm_credito', user_id: userId }
            ];

            const { error: txErr } = await supabase.from('transactions').insert(mockTransactions);
            if (txErr) throw txErr;

            await supabase.from('savings_goals').insert({
                user_id: userId,
                description: 'Viagem para Maldivas',
                target_amount: 25000,
                current_amount: 5000,
                target_date: new Date(now.getFullYear() + 1, 11, 31).toISOString(),
                color: '#06b6d4',
                icon: 'Plane'
            });

        } catch (err) {
            console.error('Fatal error in seedDemoData:', err);
            throw err;
        }
    },

    async syncUserToProfile(user: any) {
        if (!user) return;

        console.log(`📡 [SERVICE] syncUserToProfile: Synchronizing defaults for ${user.id}`);

        const { data: existingProfile } = await supabase
            .from('profiles')
            .select('id')
            .eq('id', user.id)
            .single();

        if (!existingProfile) {
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
                console.error('Error creating user profile:', profileError);
                return;
            }
        }

        // ── Ensure Default Categories (Always Upsert) ──
        const { error: catError } = await supabase
            .from('categories')
            .upsert(DEFAULT_CATEGORIES.map(c => ({
                id: c.id,
                user_id: user.id,
                name: c.name,
                type: c.type,
                color: c.color,
                icon: c.icon,
                is_default: true
            })));

        if (catError) {
            console.error('Error syncing default categories:', catError);
        } else {
            console.log('✅ Default categories synchronized.');
        }

        // ── Ensure Default Payment Methods (Always Upsert) ──
        const { error: pmError } = await supabase
            .from('payment_methods')
            .upsert(DEFAULT_METHODS.map(m => ({
                id: m.id,
                user_id: user.id,
                name: m.name,
                color: m.color,
                is_default: true
            })));

        if (pmError) {
            console.error('Error syncing default payment methods:', pmError);
        } else {
            console.log('✅ Default payment methods synchronized.');
        }
    },

    // ─── AI TRAINING (FEW-SHOT LEARNING) ───
    async getTrainingExamples(userId: string): Promise<any[]> {
        const data = await this._wrap('getTrainingExamples', supabase
            .from('ai_training_examples')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(10) as any);

        return (data as any[]) || [];
    },

    async saveTrainingExample(userId: string, transcript: string, finalJson: any) {
        console.log('📝 [SERVICE] saveTrainingExample');
        const { error } = await supabase
            .from('ai_training_examples')
            .insert({
                user_id: userId,
                transcript,
                final_json: finalJson
            });

        if (error) {
            console.error('❌ [saveTrainingExample] Error:', error.message);
            throw error;
        }
    },

    // ─── TRANSACTIONS ───
    async addTransaction(userId: string, tx: any) {
        console.log('📝 [SERVICE] addTransaction');
        const { error } = await supabase
            .from('transactions')
            .insert({
                ...tx,
                user_id: userId,
                category_id: tx.categoryId,
                payment_method_id: tx.paymentMethodId,
                supplier_id: tx.supplierId
            });

        if (error) {
            console.error('❌ [addTransaction] Error:', error.message);
            throw error;
        }
    }
};

// Assuming DataContext is defined elsewhere, this is how you would add the method signature:
// export interface DataContext {
//     // ... other methods
//     addTransaction: (userId: string, tx: any) => Promise<void>;
//     // ... other methods
// }

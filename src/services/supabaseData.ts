import { supabase } from '../lib/supabaseClient';
import { Category, Transaction, PaymentMethod, Commitment, SavingsGoal, Supplier, UserProfile } from '../models/types';
import { DEFAULT_CATEGORIES, DEFAULT_METHODS } from '../constants/defaults';

export const SupabaseDataService = {
    // ─── USER PROFILES ───
    async getProfile(userId: string): Promise<UserProfile | null> {
        const { data, error } = await supabase
            .from('user_profiles')
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
            .from('user_profiles')
            .update(profile)
            .eq('id', userId);

        if (error) throw error;
    },

    async getAllProfiles(): Promise<UserProfile[]> {
        const { data, error } = await supabase
            .from('user_profiles')
            .select('*')
            .order('name');

        if (error) throw error;
        return data || [];
    },

    async deleteProfile(userId: string) {
        const { error } = await supabase
            .from('user_profiles')
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
        return data || [];
    },

    async upsertCategory(category: Category) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        const { error } = await supabase
            .from('categories')
            .upsert({
                ...category,
                user_id: user.id
            });

        if (error) throw error;
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

    async upsertSupplier(supplier: Supplier) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        const { error } = await supabase
            .from('suppliers')
            .upsert({
                ...supplier,
                user_id: user.id
            });

        if (error) throw error;
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
        return data || [];
    },

    async upsertPaymentMethod(method: PaymentMethod) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        const { error } = await supabase
            .from('payment_methods')
            .upsert({
                ...method,
                user_id: user.id
            });

        if (error) throw error;
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
        return data || [];
    },

    async upsertTransaction(transaction: Transaction) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        const { error } = await supabase
            .from('transactions')
            .upsert({
                ...transaction,
                user_id: user.id,
                updated_at: new Date().toISOString()
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
        return data || [];
    },

    async upsertCommitment(commitment: Commitment) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        const { error } = await supabase
            .from('commitments')
            .upsert({
                ...commitment,
                user_id: user.id,
                updated_at: new Date().toISOString()
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
        return data || [];
    },

    async upsertSavingsGoal(goal: SavingsGoal) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        const { error } = await supabase
            .from('savings_goals')
            .upsert({
                ...goal,
                user_id: user.id,
                updated_at: new Date().toISOString()
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

    // ─── AUTH SYNC ───
    async syncUserToProfile(user: any) {
        if (!user) return;

        const { data: existingProfile } = await supabase
            .from('user_profiles')
            .select('id')
            .eq('id', user.id)
            .single();

        if (!existingProfile) {
            // 1. Create Profile
            const { error: profileError } = await supabase
                .from('user_profiles')
                .insert({
                    id: user.id,
                    email: user.email,
                    name: user.user_metadata?.name || user.email?.split('@')[0] || 'Usuário',
                    is_admin: user.email === 'ivanrossi@outlook.com',
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

import * as React from 'react';
import { createContext, useContext, useState, useEffect } from 'react';
import { StorageService } from '../services/storage';

interface AuthContextType {
    isAuthenticated: boolean;
    user: any;
    login: (email: string, pass: string) => boolean;
    register: (name: string, email: string, pass: string) => boolean;
    logout: () => void;
    updateUser: (user: any) => void;
    adminUpdateUserInfo: (targetEmail: string, updates: any) => void;
    impersonateUser: (email: string) => void;
    stopImpersonating: () => void;
    changePassword: (currentPass: string, newPass: string) => Promise<{ success: boolean; message: string }>;
    isImpersonating: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
    const [user, setUser] = useState<any>(null); // To store current user info
    const [loading, setLoading] = useState(true);
    const [isImpersonating, setIsImpersonating] = useState(false);

    useEffect(() => {
        const storedUser = localStorage.getItem('fintrack_current_user');
        const impersonating = localStorage.getItem('fintrack_impersonating') === 'true';
        if (storedUser) {
            setUser(JSON.parse(storedUser));
            setIsAuthenticated(true);
            setIsImpersonating(impersonating);
        }
        setLoading(false);
    }, []);

    const login = (email: string, password: string): boolean => {
        const users = JSON.parse(localStorage.getItem('fintrack_users') || '[]');
        const foundUser = users.find((u: any) => u.email === email && u.password === password);

        if (foundUser) {
            const isMasterAdmin = foundUser.email === 'ivanrossi@outlook.com';

            // Check authorization
            if (!isMasterAdmin && foundUser.isAuthorized === false) {
                alert("Acesso negado. Aguarde a autorização do administrador.");
                return false;
            }

            const userSession = {
                name: foundUser.name,
                email: foundUser.email,
                avatar: foundUser.avatar,
                isAdmin: isMasterAdmin || foundUser.isAdmin,
                isAuthorized: foundUser.isAuthorized !== false, // default true if missing for legacy
                plan: foundUser.plan || 'FREE'
            };
            localStorage.setItem('fintrack_current_user', JSON.stringify(userSession));
            setUser(userSession);
            setIsAuthenticated(true);
            return true;
        }
        return false;
    };

    const register = (name: string, email: string, password: string): boolean => {
        const users = JSON.parse(localStorage.getItem('fintrack_users') || '[]');
        const existingUserIndex = users.findIndex((u: any) => u.email === email);

        if (existingUserIndex >= 0) {
            // User exists: Update the record (Password Recovery / Fix)
            const existingUser = users[existingUserIndex];
            const updatedUser = { ...existingUser, name, password }; // Update name and password
            users[existingUserIndex] = updatedUser;
            localStorage.setItem('fintrack_users', JSON.stringify(users));

            // Auto login
            const userSession = {
                name: updatedUser.name,
                email: updatedUser.email,
                avatar: updatedUser.avatar,
                phone: updatedUser.phone
            };
            localStorage.setItem('fintrack_current_user', JSON.stringify(userSession));
            setUser(userSession);
            setIsAuthenticated(true);
            return true;
        }

        const isMasterAdmin = email === 'ivanrossi@outlook.com';
        const newUser = {
            name,
            email,
            password,
            avatar: '',
            isAdmin: isMasterAdmin,
            isAuthorized: isMasterAdmin ? true : false,
            plan: 'FREE'
        };
        users.push(newUser);
        localStorage.setItem('fintrack_users', JSON.stringify(users));

        // Auto login ONLY if auto-authorized (master admin)
        if (newUser.isAuthorized) {
            const userSession = {
                name,
                email,
                avatar: '',
                isAdmin: isMasterAdmin,
                isAuthorized: true,
                plan: 'FREE'
            };
            localStorage.setItem('fintrack_current_user', JSON.stringify(userSession));
            setUser(userSession);
            setIsAuthenticated(true);
            return true;
        }

        alert("Conta criada! Aguarde a autorização do administrador para acessar o sistema.");
        return true;
    };

    const logout = () => {
        localStorage.removeItem('fintrack_current_user');
        setIsAuthenticated(false);
        setUser(null);
    };

    const updateUser = (updatedUser: any) => {
        // Read the authoritative user record from registered users to get admin-set fields
        const users = JSON.parse(localStorage.getItem('fintrack_users') || '[]');
        const registeredUser = users.find((u: any) => u.email === updatedUser.email);

        const userSession = {
            name: updatedUser.name,
            email: updatedUser.email,
            avatar: updatedUser.avatar,
            phone: updatedUser.phone,
            profession: updatedUser.profession,
            isAdmin: updatedUser.isAdmin || updatedUser.email === 'ivanrossi@outlook.com',
            isAuthorized: registeredUser?.isAuthorized ?? updatedUser.isAuthorized ?? true,
            plan: registeredUser?.plan || updatedUser.plan || 'FREE',
        };
        setUser(userSession);
        localStorage.setItem('fintrack_current_user', JSON.stringify(userSession));

        // Also update the user in the registered users list, preserving existing fields like password & plan
        const newUsers = users.map((u: any) =>
            u.email === updatedUser.email
                ? { ...u, name: updatedUser.name, avatar: updatedUser.avatar, phone: updatedUser.phone, profession: updatedUser.profession }
                : u
        );
        localStorage.setItem('fintrack_users', JSON.stringify(newUsers));
    };

    const adminUpdateUserInfo = (targetEmail: string, updates: any) => {
        const users = JSON.parse(localStorage.getItem('fintrack_users') || '[]');
        const userIndex = users.findIndex((u: any) => u.email === targetEmail);
        if (userIndex === -1) return;

        const oldUser = users[userIndex];
        const updatedUser = { ...oldUser, ...updates };

        // Handle email change and migration
        if (updates.email && updates.email !== targetEmail) {
            StorageService.renameUserKey(targetEmail, updates.email);
        }

        users[userIndex] = updatedUser;
        localStorage.setItem('fintrack_users', JSON.stringify(users));

        // If currently impersonating this user, update session
        if (user?.email === targetEmail) {
            const userSession = {
                name: updatedUser.name,
                email: updatedUser.email,
                avatar: updatedUser.avatar,
                isAdmin: updatedUser.isAdmin || updatedUser.email === 'ivanrossi@outlook.com',
                isAuthorized: updatedUser.isAuthorized,
                plan: updatedUser.plan
            };
            setUser(userSession);
            localStorage.setItem('fintrack_current_user', JSON.stringify(userSession));
        }
    };

    const impersonateUser = (email: string) => {
        if (!user || (!user.isAdmin && !isImpersonating)) return;

        const users = JSON.parse(localStorage.getItem('fintrack_users') || '[]');
        const target = users.find((u: any) => u.email === email);
        if (!target) return;

        // Store original admin if not already impersonating
        if (!isImpersonating) {
            localStorage.setItem('fintrack_original_admin', JSON.stringify(user));
        }

        const userSession = {
            name: target.name,
            email: target.email,
            avatar: target.avatar,
            isAdmin: target.isAdmin || target.email === 'ivanrossi@outlook.com'
        };

        setUser(userSession);
        localStorage.setItem('fintrack_current_user', JSON.stringify(userSession));
        localStorage.setItem('fintrack_impersonating', 'true');
        setIsImpersonating(true);
    };

    const stopImpersonating = () => {
        const originalAdmin = localStorage.getItem('fintrack_original_admin');
        if (!originalAdmin) {
            logout();
            return;
        }

        const adminSession = JSON.parse(originalAdmin);
        setUser(adminSession);
        localStorage.setItem('fintrack_current_user', JSON.stringify(adminSession));
        localStorage.removeItem('fintrack_impersonating');
        localStorage.removeItem('fintrack_original_admin');
        setIsImpersonating(false);
    };

    const changePassword = async (currentPass: string, newPass: string): Promise<{ success: boolean; message: string }> => {
        const users = JSON.parse(localStorage.getItem('fintrack_users') || '[]');
        const userIndex = users.findIndex((u: any) => u.email === user.email);

        if (userIndex === -1) return { success: false, message: 'Usuário não encontrado.' };

        const registeredUser = users[userIndex];

        // In this app, we are using plain text passwords for simplicity as inherited from previous code, 
        // but normally we would use bcrypt.
        if (registeredUser.password !== currentPass) {
            return { success: false, message: 'Senha atual incorreta.' };
        }

        if (currentPass === newPass) {
            return { success: false, message: 'A nova senha não pode ser igual à atual.' };
        }

        // Update password
        users[userIndex].password = newPass;
        localStorage.setItem('fintrack_users', JSON.stringify(users));

        return { success: true, message: 'Senha alterada com sucesso!' };
    };

    if (loading) return null;

    return (
        <AuthContext.Provider value={{
            isAuthenticated,
            user,
            login,
            register,
            logout,
            updateUser,
            adminUpdateUserInfo,
            impersonateUser,
            stopImpersonating,
            changePassword,
            isImpersonating
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within an AuthProvider');
    return context;
};

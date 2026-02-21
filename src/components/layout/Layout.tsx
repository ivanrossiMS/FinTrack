import * as React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import {
    Home, DollarSign, PieChart, List, User, LogOut,
    Settings, ShieldCheck, Calendar, Target, Crown
} from 'lucide-react';
import './Layout.css';
import { useAuth } from '../../contexts/AuthContext';
import { clsx } from 'clsx';
import { useNavigate } from 'react-router-dom';
import { ViewModeBanner } from '../admin/ViewModeBanner';

export const Layout: React.FC = () => {
    const { user, logout, isImpersonating, stopImpersonating } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const handleStopImpersonating = () => {
        stopImpersonating();
        navigate('/admin');
    };

    const navItems = [
        { path: '/', label: 'Dashboard', icon: Home },
        { path: '/transactions', label: 'Lançamentos', icon: DollarSign },
        { path: '/commitments', label: 'Compromissos', icon: Calendar },
        { path: '/savings', label: 'Economia', icon: Target },
        { path: '/reports', label: 'Relatórios', icon: PieChart },
        { path: '/manage', label: 'Cadastros', icon: List },
        { path: '/profile', label: 'Perfil', icon: User },
        ...(user?.isAdmin ? [
            { path: '/admin', label: 'ADM', icon: ShieldCheck },
            { path: '/settings', label: 'Ajustes', icon: Settings }
        ] : []),
    ];

    return (
        <div className="app-layout">
            <aside className="sidebar">
                <div className="sidebar-header">
                    <NavLink to="/profile" className="sidebar-avatar-container">
                        {user?.avatar ? (
                            <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                        ) : (
                            <User size={40} className="text-text-light" />
                        )}
                    </NavLink>
                    <div className="sidebar-user-info">
                        <span className="sidebar-user-name" title={user?.name}>{user?.name || 'Usuário'}</span>
                        <span className={`sidebar-user-tag ${user?.plan?.toLowerCase() || 'free'}`}>
                            {user?.plan === 'PREMIUM' && <Crown size={10} className="mr-1" />}
                            Plano {user?.plan === 'PREMIUM' ? 'Premium' : 'Free'}
                        </span>
                    </div>
                </div>

                <div className="nav-list">
                    {navItems.map(({ path, icon: Icon, label }) => (
                        <NavLink
                            key={path}
                            to={path}
                            className={({ isActive }) => clsx("nav-item", isActive && "active")}
                        >
                            <Icon size={22} strokeWidth={2} />
                            <span className="nav-label">{label}</span>
                        </NavLink>
                    ))}

                    <button
                        onClick={handleLogout}
                        className="nav-item text-danger hover:bg-danger-light mt-auto border-none"
                    >
                        <LogOut size={22} />
                        <span className="nav-label">SAIR</span>
                    </button>

                    <div style={{ marginTop: '1rem', padding: '0 1rem', fontSize: '0.625rem', opacity: 0.4, textAlign: 'center' }}>
                        @copyright by Ivan Rossi - <br /> todos direitos reservados
                    </div>
                </div>
            </aside>

            <main className="main-content">
                <div className="container">
                    {isImpersonating && (
                        <ViewModeBanner
                            userName={user?.name}
                            userEmail={user?.email}
                            onStop={handleStopImpersonating}
                        />
                    )}
                    <Outlet />
                </div>
            </main>
        </div>
    );
};

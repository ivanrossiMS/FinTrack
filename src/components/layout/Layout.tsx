import * as React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { Home, DollarSign, PieChart, List, User, LogOut, Settings, ShieldCheck, Calendar, Target, Crown, Mic } from 'lucide-react';
import './Layout.css';
import { useAuth } from '../../contexts/AuthContext';
import { clsx } from 'clsx';
import { useNavigate } from 'react-router-dom';
import { ViewModeBanner } from '../admin/ViewModeBanner';
import { GlobalVoiceModal } from '../voice/GlobalVoiceModal';
import logoIcon from '/icon.svg';

export const Layout: React.FC = () => {
    const { user, logout, isImpersonating, stopImpersonating } = useAuth();
    const navigate = useNavigate();
    const [voiceOpen, setVoiceOpen] = React.useState(false);

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
            {/* Desktop Sidebar / Mobile Bottom Nav Placeholder */}
            <aside className="sidebar bottom-nav">
                {/* ── Brand Top ── */}
                <div className="sidebar-brand">
                    <img src={logoIcon} alt="Finance+" className="sidebar-brand-icon" />
                    <div className="sidebar-brand-text">
                        <span className="sidebar-brand-name">Finance<span className="sidebar-brand-plus">+</span></span>
                        <span className="sidebar-brand-slogan">O jeito moderno de controlar gastos.</span>
                    </div>
                </div>

                <div className="sidebar-header">
                    <NavLink to="/profile" className="sidebar-avatar-container">
                        {user?.avatar ? (
                            <img src={user.avatar} alt={user.name} />
                        ) : (
                            <User size={24} className="text-text-light" />
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
                        className="nav-item nav-item-logout border-none"
                    >
                        <LogOut size={22} />
                        <span className="nav-label">SAIR</span>
                    </button>

                    {/* ── Copyright ── */}
                    <div className="sidebar-copyright">
                        © {new Date().getFullYear()} Ivan Rossi
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

            {/* ── Neural Pulse AI Button (FAB) ── */}
            <button
                className="ai-fab-neural"
                onClick={() => setVoiceOpen(true)}
                title="Assistente IA por Voz"
            >
                <div className="ai-fab-glow"></div>
                <div className="ai-fab-rings">
                    <div className="ring ring-1"></div>
                    <div className="ring ring-2"></div>
                </div>
                <div className="ai-fab-core">
                    <Mic size={24} strokeWidth={2.5} />
                    <span className="ai-fab-label">IA</span>
                </div>
            </button>

            {/* Global Voice Assistant Modal */}
            <GlobalVoiceModal isOpen={voiceOpen} onClose={() => setVoiceOpen(false)} />
        </div>
    );
};

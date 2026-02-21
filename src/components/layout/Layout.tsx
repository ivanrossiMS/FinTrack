import * as React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { Home, DollarSign, PieChart, List, User, LogOut, Settings, ShieldCheck, Calendar, Target, Crown, Mic, TrendingUp, Menu, X as CloseIcon } from 'lucide-react';
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
    const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const handleStopImpersonating = () => {
        stopImpersonating();
        navigate('/admin');
    };

    // Unified Nav Items
    const navItems = [
        { path: '/', label: 'Dashboard', icon: Home, main: true },
        { path: '/transactions', label: 'Lançamentos', icon: DollarSign, main: true },
        { path: '/commitments', label: 'Compromissos', icon: Calendar, main: true },
        { path: '/savings', label: 'Economia', icon: Target, main: false },
        { path: '/investments', label: 'Investimentos', icon: TrendingUp, main: true },
        { path: '/reports', label: 'Relatórios', icon: PieChart, main: false },
        { path: '/manage', label: 'Cadastros', icon: List, main: false },
        { path: '/profile', label: 'Perfil', icon: User, main: true },
        ...(user?.isAdmin ? [
            { path: '/admin', label: 'ADM', icon: ShieldCheck, main: false },
            { path: '/settings', label: 'Ajustes', icon: Settings, main: false }
        ] : []),
    ];

    const mainNavItems = navItems.filter(item => item.main);

    return (
        <div className={clsx("app-layout", mobileMenuOpen && "mobile-menu-active")}>
            {/* ── Mobile Top Header (Visible only on Mobile) ── */}
            <header className="mobile-header">
                <div className="mobile-header-left">
                    <button
                        className="mobile-menu-toggle"
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        aria-label="Menu"
                    >
                        {mobileMenuOpen ? <CloseIcon size={24} /> : <Menu size={24} />}
                    </button>
                    <div className="mobile-brand">
                        <img src={logoIcon} alt="Finance+" className="mobile-brand-icon" />
                        <span className="mobile-brand-name">F<span className="mobile-brand-plus">+</span></span>
                    </div>
                </div>

                <div className="mobile-header-right">
                    <div className="mobile-user-profile">
                        <span className="mobile-user-name">{user?.name?.split(' ')[0]}</span>
                        <NavLink to="/profile" className="mobile-avatar-link">
                            {user?.avatar ? (
                                <img src={user.avatar} alt={user.name} className="mobile-user-avatar" />
                            ) : (
                                <div className="mobile-avatar-placeholder">
                                    <User size={18} />
                                </div>
                            )}
                        </NavLink>
                    </div>
                </div>
            </header>

            {/* Overlay for mobile menu */}
            {mobileMenuOpen && (
                <div className="mobile-menu-overlay" onClick={() => setMobileMenuOpen(false)} />
            )}

            {/* Sidebar (Desktop) / Sliding Menu (Mobile) */}
            <aside className={clsx("sidebar", mobileMenuOpen && "mobile-open")}>
                {/* ── Brand Top (Desktop Only) ── */}
                <div className="sidebar-brand">
                    <img src={logoIcon} alt="Finance+" className="sidebar-brand-icon" />
                    <div className="sidebar-brand-text">
                        <span className="sidebar-brand-name">Finance<span className="sidebar-brand-plus">+</span></span>
                        <span className="sidebar-brand-slogan">O jeito moderno de controlar gastos.</span>
                    </div>
                </div>

                <div className="sidebar-header">
                    <NavLink to="/profile" className="sidebar-avatar-container" onClick={() => setMobileMenuOpen(false)}>
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
                            onClick={() => setMobileMenuOpen(false)}
                        >
                            <Icon size={22} strokeWidth={2} />
                            <span className="nav-label">{label}</span>
                        </NavLink>
                    ))}

                    <button
                        onClick={() => { handleLogout(); setMobileMenuOpen(false); }}
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

            {/* ── Mobile Floating Bottom Nav ── */}
            <nav className="mobile-bottom-nav">
                {mainNavItems.slice(0, 5).map(({ path, icon: Icon, label }) => (
                    <NavLink
                        key={path}
                        to={path}
                        className={({ isActive }) => clsx("mobile-nav-item", isActive && "active")}
                    >
                        <Icon size={22} />
                        <span className="mobile-nav-label">{label.split(' ')[0]}</span>
                    </NavLink>
                ))}
            </nav>

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

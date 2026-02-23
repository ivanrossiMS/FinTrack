import React, { useState, useEffect, useMemo } from 'react';
import { User, Shield, Mail, ExternalLink, Trash2, Edit2, X, Check, Lock, Camera, Search, Crown } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import './Admin.css';

export const Admin: React.FC = () => {
    const { user: currentUser, adminUpdateUserInfo, impersonateUser } = useAuth();
    const [users, setUsers] = useState<any[]>([]);
    const [editingUser, setEditingUser] = useState<any>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    // Form states
    const [editName, setEditName] = useState('');
    const [editEmail, setEditEmail] = useState('');
    const [editPassword, setEditPassword] = useState('');
    const [editAvatar, setEditAvatar] = useState('');
    const [editIsAuthorized, setEditIsAuthorized] = useState(true);
    const [editPlan, setEditPlan] = useState<'FREE' | 'PREMIUM'>('FREE');
    const [editIsAdmin, setEditIsAdmin] = useState(false);

    useEffect(() => {
        loadUsers();
    }, []);

    const loadUsers = () => {
        const registeredUsers = JSON.parse(localStorage.getItem('fintrack_users') || '[]');
        setUsers(registeredUsers);
    };

    const handleOpenEdit = (user: any) => {
        setEditingUser(user);
        setEditName(user.name);
        setEditEmail(user.email);
        setEditPassword(user.password || '');
        setEditAvatar(user.avatar || '');
        setEditIsAuthorized(user.isAuthorized !== false);
        setEditPlan(user.plan || 'FREE');
        setEditIsAdmin(user.isAdmin || false);
        setIsEditModalOpen(true);
    };

    const handleSaveEdit = () => {
        if (!editName || !editEmail) {
            alert("Nome e e-mail são obrigatórios.");
            return;
        }

        adminUpdateUserInfo(editingUser.email, {
            name: editName,
            email: editEmail,
            password: editPassword,
            avatar: editAvatar,
            isAuthorized: editIsAuthorized,
            plan: editPlan,
            isAdmin: editIsAdmin
        });

        setIsEditModalOpen(false);
        // Using a short timeout to ensure the state updates after storage changes
        setTimeout(loadUsers, 100);
    };

    const handleDeleteUser = (email: string) => {
        if (email === currentUser.email) {
            alert("Você não pode excluir sua própria conta de administrador aqui.");
            return;
        }

        if (window.confirm(`ATENÇÃO: Você está prestes a excluir permanentemente o usuário ${email}. Isto removerá todos os dados financeiros vinculados a esta conta. Deseja prosseguir?`)) {
            const registeredUsers = JSON.parse(localStorage.getItem('fintrack_users') || '[]');
            const updatedUsers = registeredUsers.filter((u: any) => u.email !== email);
            localStorage.setItem('fintrack_users', JSON.stringify(updatedUsers));

            // Wipe user specific financial data
            localStorage.removeItem(`fintrack_data_v1_${email}`);

            setUsers(updatedUsers);
        }
    };

    const handleToggleAuth = (user: any) => {
        adminUpdateUserInfo(user.email, { isAuthorized: !user.isAuthorized });
        setTimeout(loadUsers, 100);
    };

    const handleImpersonate = (email: string) => {
        if (window.confirm(`Você entrará no modo de visualização para a conta de ${email}. Deseja prosseguir?`)) {
            impersonateUser(email);
            window.location.href = '/';
        }
    };

    const stats = useMemo(() => ({
        total: users.length,
        premium: users.filter(u => u.plan === 'PREMIUM').length,
        active: users.filter(u => u.isAuthorized !== false).length
    }), [users]);

    const filteredUsers = useMemo(() => users.filter(u =>
        u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email.toLowerCase().includes(searchTerm.toLowerCase())
    ), [users, searchTerm]);

    return (
        <div className="admin-container">
            <header className="admin-header">
                <h1>Painel Administrativo</h1>
                <span className="admin-subtitle">Gestão centralizada de usuários e controle de acesso.</span>
            </header>

            <div className="admin-stats-grid">
                <div className="admin-stat-card">
                    <div className="admin-stat-icon" style={{ background: 'rgba(99, 102, 241, 0.1)', color: '#4f46e5' }}>
                        <User size={28} />
                    </div>
                    <div className="admin-stat-info">
                        <span className="admin-stat-value">{stats.total}</span>
                        <span className="admin-stat-label">Total de Usuários</span>
                    </div>
                </div>

                <div className="admin-stat-card">
                    <div className="admin-stat-icon" style={{ background: 'rgba(251, 191, 36, 0.1)', color: '#b45309' }}>
                        <Crown size={28} />
                    </div>
                    <div className="admin-stat-info">
                        <span className="admin-stat-value">{stats.premium}</span>
                        <span className="admin-stat-label">Usuários Premium</span>
                    </div>
                </div>

                <div className="admin-stat-card">
                    <div className="admin-stat-icon" style={{ background: 'rgba(34, 197, 94, 0.1)', color: '#16a34a' }}>
                        <Shield size={28} />
                    </div>
                    <div className="admin-stat-info">
                        <span className="admin-stat-value">{stats.active}</span>
                        <span className="admin-stat-label">Acessos Ativos</span>
                    </div>
                </div>
            </div>

            <div className="admin-card">
                <div className="admin-card-header">
                    <div className="flex items-center gap-3">
                        <h3 className="admin-card-title">Diretório de Usuários</h3>
                        <span className="user-count-badge">{filteredUsers.length}</span>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="relative">
                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                            <input
                                type="text"
                                placeholder="Buscar usuário..."
                                className="pl-10 pr-4 py-2.5 bg-gray-50/50 border border-border/40 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all w-64"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                </div>

                <div className="admin-table-scroll">
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th style={{ width: '35%' }}>Usuário</th>
                                <th style={{ width: '25%' }}>E-mail</th>
                                <th style={{ width: '25%' }}>Status & Nível</th>
                                <th style={{ width: '15%', textAlign: 'right' }}>Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredUsers.map((u) => (
                                <tr key={u.email}>
                                    <td>
                                        <div className="user-info-cell">
                                            <div className="user-avatar-wrapper">
                                                {u.avatar ? (
                                                    <img src={u.avatar} alt={u.name} />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-indigo-300">
                                                        <User size={24} />
                                                    </div>
                                                )}
                                            </div>
                                            <div className="user-details">
                                                <span className="user-name">{u.name}</span>
                                                <span className="user-profession">{u.profession || 'Membro'}</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                                        <div className="flex items-center gap-2 text-sm text-text-muted font-medium">
                                            <Mail size={14} className="opacity-50" />
                                            <span>{u.email}</span>
                                        </div>
                                    </td>
                                    <td>
                                        <div className="flex flex-col gap-2">
                                            {u.email === 'ivanrossi@outlook.com' || u.isAdmin ? (
                                                <span className="badge-admin">
                                                    <Shield size={10} strokeWidth={3} /> ADMINISTRADOR
                                                </span>
                                            ) : (
                                                <div className="flex flex-wrap gap-2">
                                                    <span className={`badge-pill badge-plan ${u.plan === 'PREMIUM' ? 'premium' : 'free'}`}>
                                                        {u.plan === 'PREMIUM' && <Crown size={10} className="mr-1" />}
                                                        {u.plan === 'PREMIUM' ? 'PREMIUM' : 'FREE'}
                                                    </span>
                                                    <button
                                                        onClick={() => handleToggleAuth(u)}
                                                        className={`badge-pill badge-auth ${u.isAuthorized !== false ? 'active' : 'inactive'}`}
                                                    >
                                                        {u.isAuthorized !== false ? 'ATIVO' : 'BLOQUEADO'}
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td>
                                        <div className="action-bar">
                                            <button
                                                onClick={() => handleImpersonate(u.email)}
                                                className="action-btn impersonate"
                                                title="Visualizar como Usuário"
                                            >
                                                <ExternalLink size={16} />
                                            </button>
                                            <button
                                                onClick={() => handleOpenEdit(u)}
                                                className="action-btn edit"
                                                title="Editar"
                                            >
                                                <Edit2 size={16} />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteUser(u.email)}
                                                className="action-btn delete"
                                                title="Excluir"
                                                disabled={u.email === currentUser.email}
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Note Section */}
            <div className="mt-10 bg-indigo-50/40 border border-indigo-100 p-6 rounded-[20px] flex gap-5">
                <div className="w-12 h-12 bg-white text-indigo-600 rounded-2xl flex items-center justify-center shrink-0 shadow-sm">
                    <Trash2 size={24} strokeWidth={2.5} />
                </div>
                <div>
                    <h4 className="text-xs font-black text-indigo-900 uppercase tracking-widest mb-1">Nota de Segurança: Exclusão</h4>
                    <p className="text-sm text-indigo-900/60 font-semibold leading-relaxed">
                        A exclusão de uma conta é irreversível através deste painel. Ao excluir um usuário, todos os registros relacionados (lançamentos, categorias, orçamentos e fornecedores) serão removidos permanentemente do armazenamento local.
                    </p>
                </div>
            </div>

            {/* Edit User Modal */}
            <Modal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                title="Configurações da Conta"
            >
                <div className="space-y-8 pt-4">
                    <div className="flex flex-col items-center gap-4">
                        <div className="relative group">
                            <div className="w-24 h-24 rounded-full border-4 border-primary/10 overflow-hidden bg-gray-50 flex items-center justify-center">
                                {editAvatar ? (
                                    <img src={editAvatar} alt="Avatar" className="w-full h-full object-cover" />
                                ) : (
                                    <User size={40} className="text-gray-200" />
                                )}
                            </div>
                            <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                                <Camera className="text-white" size={20} />
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Input
                            label="Nome Completo"
                            value={editName}
                            onChange={e => setEditName(e.target.value)}
                            placeholder="Nome Completo"
                            icon={<User size={18} />}
                        />
                        <Input
                            label="E-mail de Acesso"
                            value={editEmail}
                            onChange={e => setEditEmail(e.target.value)}
                            placeholder="email@empresa.com"
                            icon={<Mail size={18} />}
                        />
                        <Input
                            label="Senha de Acesso"
                            type="text"
                            value={editPassword}
                            onChange={e => setEditPassword(e.target.value)}
                            placeholder="Nova senha"
                            icon={<Lock size={18} />}
                        />
                        <Input
                            label="URL da Imagem"
                            value={editAvatar}
                            onChange={e => setEditAvatar(e.target.value)}
                            placeholder="URL da imagem (avatar)"
                            icon={<Camera size={18} />}
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 py-4 border-t border-gray-100">
                        <div className="space-y-3">
                            <label className="text-[11px] font-black text-text-muted uppercase tracking-widest pl-1">Plano de Acesso</label>
                            <div className="segmented-control">
                                <button
                                    className={editPlan === 'FREE' ? 'active' : ''}
                                    onClick={() => setEditPlan('FREE')}
                                >
                                    FREE
                                </button>
                                <button
                                    className={editPlan === 'PREMIUM' ? 'active' : ''}
                                    onClick={() => setEditPlan('PREMIUM')}
                                >
                                    <Crown size={14} className="mr-1" /> PREMIUM
                                </button>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <label className="text-[11px] font-black text-text-muted uppercase tracking-widest pl-1">Status de Autorização</label>
                            <div className="auth-toggle-control">
                                <label className="flex items-center gap-3 cursor-pointer">
                                    <div
                                        className={`custom-switch ${editIsAuthorized ? 'active' : ''}`}
                                        onClick={() => setEditIsAuthorized(!editIsAuthorized)}
                                    >
                                        <div className="switch-knob" />
                                    </div>
                                    <span className="text-sm font-bold text-text">
                                        {editIsAuthorized ? 'Acesso Liberado' : 'Acesso Bloqueado'}
                                    </span>
                                </label>
                            </div>
                        </div>

                        {/* Master Admin Only: Promote to Admin */}
                        {currentUser?.email === 'ivanrossi@outlook.com' && editingUser?.email !== 'ivanrossi@outlook.com' && (
                            <div className="space-y-3 pt-4 md:pt-0 border-t md:border-t-0 border-gray-100">
                                <label className="text-[11px] font-black text-text-muted uppercase tracking-widest pl-1">Poder Administrativo</label>
                                <div className="auth-toggle-control">
                                    <label className="flex items-center gap-3 cursor-pointer">
                                        <div
                                            className={`custom-switch ${editIsAdmin ? 'active' : ''}`}
                                            style={editIsAdmin ? { background: 'linear-gradient(135deg, #7C3AED, #3B82F6)' } : {}}
                                            onClick={() => setEditIsAdmin(!editIsAdmin)}
                                        >
                                            <div className="switch-knob" />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-sm font-bold text-text">
                                                {editIsAdmin ? 'Administrador do Sistema' : 'Usuário Comum'}
                                            </span>
                                            <span className="text-[10px] text-text-muted font-semibold leading-tight">
                                                Permite acesso ao Painel Admin e gestão de usuários.
                                            </span>
                                        </div>
                                    </label>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="flex gap-4 pt-6 border-t border-gray-100">
                        <button
                            onClick={() => setIsEditModalOpen(false)}
                            className="flex-1 py-3.5 rounded-2xl font-black text-text-muted hover:bg-gray-50 transition-all uppercase text-[11px] tracking-widest border border-border/40"
                        >
                            <span className="flex items-center justify-center gap-2"><X size={16} /> Cancelar</span>
                        </button>
                        <button
                            onClick={handleSaveEdit}
                            className="flex-[2] py-3.5 rounded-2xl font-black text-white bg-primary shadow-xl shadow-primary/20 hover:shadow-primary/40 hover:-translate-y-0.5 transition-all uppercase text-[11px] tracking-widest border-none"
                        >
                            <span className="flex items-center justify-center gap-2"><Check size={16} /> Salvar Alterações</span>
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

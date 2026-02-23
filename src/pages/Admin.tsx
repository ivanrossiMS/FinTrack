import React, { useState, useEffect } from 'react';
import {
    Users,
    Shield,
    CheckCircle,
    XCircle,
    Trash2,
    Search,
    UserCheck,
    Check,
    X,
    Camera,
    Mail,
    User,
    AlertTriangle
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { SupabaseDataService } from '../services/supabaseData';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import './Admin.css';

export const Admin: React.FC = () => {
    const { user: currentUser, adminUpdateUserInfo, impersonateUser, isImpersonating, stopImpersonating } = useAuth();
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // Modal & Edit states
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<any>(null);
    const [editName, setEditName] = useState('');
    const [editEmail, setEditEmail] = useState('');
    const [editAvatar, setEditAvatar] = useState('');
    const [editIsAuthorized, setEditIsAuthorized] = useState(true);
    const [editPlan, setEditPlan] = useState<'FREE' | 'PREMIUM'>('FREE');
    const [editIsAdmin, setEditIsAdmin] = useState(false);

    const loadUsers = async () => {
        setLoading(true);
        try {
            const profiles = await SupabaseDataService.getAllProfiles();
            setUsers(profiles);
        } catch (error) {
            console.error('Error loading users:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadUsers();
    }, []);

    const handleOpenEdit = (user: any) => {
        setEditingUser(user);
        setEditName(user.name || '');
        setEditEmail(user.email || '');
        setEditAvatar(user.avatar_url || '');
        setEditIsAuthorized(user.is_authorized !== false);
        setEditPlan(user.plan || 'FREE');
        setEditIsAdmin(user.role === 'ADMIN');
        setIsEditModalOpen(true);
    };

    const handleSaveEdit = async () => {
        if (!editingUser) return;
        try {
            await adminUpdateUserInfo(editingUser.id, {
                name: editName,
                email: editEmail,
                avatar_url: editAvatar,
                is_authorized: editIsAuthorized,
                plan: editPlan,
                role: editIsAdmin ? 'ADMIN' : 'USER'
            });
            setIsEditModalOpen(false);
            loadUsers();
        } catch (error) {
            alert('Erro ao salvar alterações');
        }
    };

    const handleToggleAuth = async (userId: string, currentStatus: boolean) => {
        try {
            await adminUpdateUserInfo(userId, { is_authorized: !currentStatus });
            loadUsers();
        } catch (error) {
            alert('Erro ao atualizar autorização');
        }
    };

    const handleToggleAdmin = async (userId: string, currentStatus: boolean) => {
        try {
            await adminUpdateUserInfo(userId, { role: currentStatus ? 'USER' : 'ADMIN' });
            loadUsers();
        } catch (error) {
            alert('Erro ao atualizar privilégios');
        }
    };

    const handleDeleteUser = async (userId: string) => {
        if (!window.confirm('Tem certeza que deseja excluir este usuário permanentemente?')) return;
        try {
            await SupabaseDataService.deleteProfile(userId);
            loadUsers();
        } catch (error) {
            alert('Erro ao excluir usuário');
        }
    };

    const handleUpdatePlan = async (userId: string, plan: string) => {
        try {
            await adminUpdateUserInfo(userId, { plan });
            loadUsers();
        } catch (error) {
            alert('Erro ao atualizar plano');
        }
    };

    const filteredUsers = users.filter(u =>
        u.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (currentUser?.role !== 'ADMIN' && !isImpersonating) {
        return <div className="p-8">Acesso restrito.</div>;
    }

    return (
        <div className="admin-container">
            {isImpersonating && (
                <div className="impersonate-banner">
                    <div className="flex items-center gap-3">
                        <AlertTriangle size={20} />
                        <span>MODO DE IMPERSONIFICAÇÃO ATIVO</span>
                    </div>
                    <Button variant="ghost" size="sm" className="text-white hover:bg-white/20" onClick={stopImpersonating}>
                        Sair do Modo
                    </Button>
                </div>
            )}

            <header className="admin-header">
                <div className="header-title">
                    <div className="header-icon">
                        <Shield size={32} />
                    </div>
                    <div>
                        <h1>Painel ADM</h1>
                        <p>Controle total de usuários e infraestrutura</p>
                    </div>
                </div>
            </header>

            <div className="admin-stats">
                <div className="stat-card">
                    <div className="stat-icon">
                        <Users size={28} />
                    </div>
                    <div className="stat-info">
                        <span className="stat-label">Usuários</span>
                        <span className="stat-value">{users.length}</span>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon success">
                        <UserCheck size={28} />
                    </div>
                    <div className="stat-info">
                        <span className="stat-label">Ativos</span>
                        <span className="stat-value">{users.filter(u => u.is_authorized).length}</span>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon warning">
                        <Shield size={28} />
                    </div>
                    <div className="stat-info">
                        <span className="stat-label">Admins</span>
                        <span className="stat-value">{users.filter(u => u.role === 'ADMIN').length}</span>
                    </div>
                </div>
            </div>

            <div className="users-section">
                <div className="section-header">
                    <div className="search-bar">
                        <Search size={20} />
                        <input
                            type="text"
                            placeholder="Buscar por nome ou e-mail..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <div className="users-table-container">
                    <table className="users-table">
                        <thead>
                            <tr>
                                <th>Identidade</th>
                                <th>Plano</th>
                                <th>Autorização</th>
                                <th>Cargo</th>
                                <th style={{ textAlign: 'right' }}>Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={5} style={{ textAlign: 'center', padding: '4rem' }}>
                                        <div className="font-bold text-text-muted animate-pulse">Sincronizando banco de dados...</div>
                                    </td>
                                </tr>
                            ) : filteredUsers.length === 0 ? (
                                <tr>
                                    <td colSpan={5} style={{ textAlign: 'center', padding: '4rem' }}>
                                        <div className="font-bold text-text-muted">Nenhum usuário encontrado.</div>
                                    </td>
                                </tr>
                            ) : filteredUsers.map(u => (
                                <tr key={u.id}>
                                    <td>
                                        <div className="user-info">
                                            <div className="user-avatar">
                                                {u.avatar_url ? (
                                                    <img src={u.avatar_url} alt={u.name} />
                                                ) : (
                                                    <span>{u.name?.charAt(0) || u.email?.charAt(0)}</span>
                                                )}
                                            </div>
                                            <div>
                                                <span className="user-name">{u.name || 'Sem Nome'}</span>
                                                <span className="user-email">{u.email}</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                                        <select
                                            className={`plan-badge ${u.plan?.toLowerCase() || 'free'}`}
                                            value={u.plan || 'FREE'}
                                            onChange={(e) => handleUpdatePlan(u.id, e.target.value)}
                                        >
                                            <option value="FREE">FREE</option>
                                            <option value="PREMIUM">PREMIUM</option>
                                        </select>
                                    </td>
                                    <td>
                                        <button
                                            className={`status-btn ${u.is_authorized ? 'authorized' : 'pending'}`}
                                            onClick={() => handleToggleAuth(u.id, u.is_authorized)}
                                        >
                                            {u.is_authorized ? (
                                                <><CheckCircle size={14} /> Ativo</>
                                            ) : (
                                                <><XCircle size={14} /> Bloqueado</>
                                            )}
                                        </button>
                                    </td>
                                    <td>
                                        <button
                                            className={`role-btn ${u.role === 'ADMIN' ? 'admin' : 'user'}`}
                                            onClick={() => handleToggleAdmin(u.id, u.role === 'ADMIN')}
                                            disabled={u.email === 'ivanrossi@outlook.com' || u.id === currentUser?.id}
                                        >
                                            <Shield size={14} /> {u.role === 'ADMIN' ? 'Admin' : 'Membro'}
                                        </button>
                                    </td>
                                    <td>
                                        <div className="action-btns">
                                            <button
                                                className="icon-btn impersonate"
                                                title="Impersonar"
                                                onClick={() => impersonateUser(u.id)}
                                                disabled={u.id === currentUser?.id}
                                            >
                                                <UserCheck size={18} />
                                            </button>
                                            <button
                                                className="icon-btn"
                                                title="Editar"
                                                onClick={() => handleOpenEdit(u)}
                                            >
                                                <Camera size={18} />
                                            </button>
                                            <button
                                                className="icon-btn delete"
                                                title="Excluir"
                                                onClick={() => handleDeleteUser(u.id)}
                                                disabled={u.email === 'ivanrossi@outlook.com' || u.id === currentUser?.id}
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <Modal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                title="Editar Usuário"
            >
                <div className="space-y-6 pt-4">
                    <Input
                        label="Nome"
                        value={editName}
                        onChange={e => setEditName(e.target.value)}
                        icon={<User size={18} />}
                    />
                    <Input
                        label="E-mail"
                        value={editEmail}
                        onChange={e => setEditEmail(e.target.value)}
                        icon={<Mail size={18} />}
                    />
                    <Input
                        label="Avatar URL"
                        value={editAvatar}
                        onChange={e => setEditAvatar(e.target.value)}
                        icon={<Camera size={18} />}
                    />

                    <div className="flex gap-4">
                        <div className="flex-1">
                            <label className="block text-xs font-bold mb-2 uppercase text-text-muted">Plano</label>
                            <select
                                className="w-full p-3 bg-gray-50 border border-border/40 rounded-xl font-bold"
                                value={editPlan}
                                onChange={e => setEditPlan(e.target.value as any)}
                            >
                                <option value="FREE">FREE</option>
                                <option value="PREMIUM">PREMIUM</option>
                            </select>
                        </div>
                        <div className="flex-1">
                            <label className="block text-xs font-bold mb-2 uppercase text-text-muted">Status</label>
                            <button
                                className={`w-full p-3 rounded-xl font-bold flex items-center justify-center gap-2 ${editIsAuthorized ? 'bg-green-50 text-green-600 border border-green-200' : 'bg-red-50 text-red-600 border border-red-200'}`}
                                onClick={() => setEditIsAuthorized(!editIsAuthorized)}
                            >
                                {editIsAuthorized ? <Check size={16} /> : <X size={16} />}
                                {editIsAuthorized ? 'Autorizado' : 'Bloqueado'}
                            </button>
                        </div>
                    </div>

                    <div className="flex gap-4 pt-4">
                        <Button variant="secondary" fullWidth onClick={() => setIsEditModalOpen(false)}>Cancelar</Button>
                        <Button fullWidth onClick={handleSaveEdit}>Salvar</Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

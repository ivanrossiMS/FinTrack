import * as React from 'react';
import { useState, useEffect } from 'react';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { User, Camera, Lock, Eye, EyeOff, Briefcase, Phone, Mail, CheckCircle2 } from 'lucide-react';
import './Profile.css';

export const Profile: React.FC = () => {
    const { data, updateProfile } = useData();
    const { user, updateUser, changePassword } = useAuth();

    // Profile State
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [profession, setProfession] = useState('');
    const [avatar, setAvatar] = useState('');

    // Security State
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPasswords, setShowPasswords] = useState(false);
    const [isChangingPass, setIsChangingPass] = useState(false);

    useEffect(() => {
        if (data.userProfile) {
            setName(data.userProfile.name);
            setEmail(data.userProfile.email);
            setPhone(data.userProfile.phone || '');
            setProfession(data.userProfile.profession || '');
            setAvatar(data.userProfile.avatar || '');
        } else if (user) {
            setName(user.name);
            setEmail(user.email);
            setPhone(user.phone || '');
            setProfession(user.profession || '');
            setAvatar(user.avatar || '');
        }
    }, [data.userProfile, user]);

    const processProfileImage = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (event) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const TARGET_SIZE = 240; // 2x 120px for Retina quality
                    canvas.width = TARGET_SIZE;
                    canvas.height = TARGET_SIZE;
                    const ctx = canvas.getContext('2d');
                    if (!ctx) {
                        reject('Could not get canvas context');
                        return;
                    }

                    // Fill background (neutral)
                    ctx.fillStyle = '#f3f4f6';
                    ctx.fillRect(0, 0, TARGET_SIZE, TARGET_SIZE);

                    ctx.imageSmoothingEnabled = true;
                    ctx.imageSmoothingQuality = 'high';

                    // Default to "contain" centered
                    const scale = Math.min(TARGET_SIZE / img.width, TARGET_SIZE / img.height);
                    const width = img.width * scale;
                    const height = img.height * scale;
                    const x = (TARGET_SIZE - width) / 2;
                    const y = (TARGET_SIZE - height) / 2;

                    ctx.drawImage(img, x, y, width, height);

                    const dataUrl = canvas.toDataURL('image/webp', 0.85);
                    resolve(dataUrl);
                };
                img.onerror = () => reject('Error loading image');
                img.src = event.target?.result as string;
            };
            reader.onerror = () => reject('Error reading file');
            reader.readAsDataURL(file);
        });
    };

    const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
            alert('Apenas arquivos JPG, PNG ou WebP são permitidos.');
            return;
        }

        if (file.size > 2 * 1024 * 1024) {
            alert('O arquivo deve ter no máximo 2MB.');
            return;
        }

        try {
            const processedImage = await processProfileImage(file);
            setAvatar(processedImage);
        } catch (error) {
            console.error('Error processing image:', error);
            alert('Erro ao processar a imagem.');
        }
    };

    const handleProfileSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (user && updateUser) {
            updateUser({
                ...user,
                name,
                phone,
                profession,
                avatar
            });
        }

        updateProfile({
            name,
            email,
            phone,
            profession,
            avatar
        });
        alert('Perfil atualizado com sucesso!');
    };

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!currentPassword || !newPassword || !confirmPassword) {
            alert('Por favor, preencha todos os campos de senha.');
            return;
        }

        if (newPassword !== confirmPassword) {
            alert('A nova senha e a confirmação não coincidem.');
            return;
        }

        if (newPassword.length < 6) {
            alert('A nova senha deve ter pelo menos 6 caracteres.');
            return;
        }

        setIsChangingPass(true);
        try {
            const result = await changePassword(currentPassword, newPassword);
            if (result.success) {
                alert(result.message);
                setCurrentPassword('');
                setNewPassword('');
                setConfirmPassword('');
            } else {
                alert(result.message);
            }
        } catch (error) {
            alert('Erro ao alterar senha. Tente novamente.');
        } finally {
            setIsChangingPass(false);
        }
    };

    return (
        <div className="max-w-[1200px] mx-auto px-6 py-10">
            {/* Page Title */}
            <header className="mb-10 text-center lg:text-left">
                <h1 className="text-3xl font-extrabold text-[#0f172a] tracking-tight mb-2">Meu Perfil</h1>
                <p className="text-[#64748b] font-medium text-lg">Gerencie sua identidade e segurança na plataforma</p>
            </header>

            <div className="space-y-10">
                {/* 1. IDENTITY HEADER CARD */}
                <Card className="shadow-2xl overflow-hidden border-0 rounded-[24px]">
                    <div className="profile-header-card">

                        {/* Section Left: Avatar & Profile Tag */}
                        <div className="profile-identity-section">
                            <div className="profile-avatar-wrapper">
                                <div className="profile-avatar-frame">
                                    {avatar ? (
                                        <img
                                            src={avatar}
                                            alt="Profile"
                                            className="profile-avatar-image"
                                        />
                                    ) : (
                                        <User size={64} className="text-[#cbd5e1]" />
                                    )}
                                </div>
                                <button
                                    type="button"
                                    onClick={() => document.getElementById('avatar-upload')?.click()}
                                    className="profile-camera-btn"
                                    title="Alterar foto"
                                >
                                    <Camera size={20} />
                                </button>
                            </div>

                            <div className="text-center">
                                <h2 className="profile-name-title">{name || 'Usuário'}</h2>
                                {profession && (
                                    <div className="profile-profession-tag">
                                        {profession}
                                    </div>
                                )}
                            </div>

                            <input
                                id="avatar-upload"
                                type="file"
                                style={{ display: 'none' }}
                                accept="image/*"
                                onChange={handleAvatarChange}
                            />

                            <p className="profile-upload-hint">
                                JPG, PNG, WEBP • MÁX 2MB
                            </p>
                        </div>

                        {/* Section Right: Table Info */}
                        <div className="profile-info-section">
                            <div className="profile-info-header">
                                <h3 className="profile-info-title">Informações de Contato</h3>
                            </div>

                            <div className="profile-info-table">
                                <div className="profile-info-row">
                                    <div className="profile-info-label">
                                        <Mail size={18} className="profile-info-label-icon" />
                                        <span className="profile-info-label-text">E-mail</span>
                                    </div>
                                    <div className="profile-info-value">
                                        {email}
                                    </div>
                                </div>

                                <div className="profile-info-row">
                                    <div className="profile-info-label">
                                        <Phone size={18} className="profile-info-label-icon" />
                                        <span className="profile-info-label-text">Telefone</span>
                                    </div>
                                    <div className={`profile-info-value ${!phone ? 'empty' : ''}`}>
                                        {phone || 'Não informado'}
                                    </div>
                                </div>

                                <div className="profile-info-row">
                                    <div className="profile-info-label">
                                        <Briefcase size={18} className="profile-info-label-icon" />
                                        <span className="profile-info-label-text">Cargo</span>
                                    </div>
                                    <div className={`profile-info-value ${!profession ? 'empty' : ''}`}>
                                        {profession || 'Não informado'}
                                    </div>
                                </div>
                            </div>

                            <div className="profile-status-banner">
                                <CheckCircle2 size={20} className="shrink-0" />
                                <p className="profile-status-text">Perfil verificado e ativo. Suas informações de contato são usadas para suporte e faturamento.</p>
                            </div>
                        </div>
                    </div>
                </Card>

                {/* 2. EDITABLE FORMS SECTION */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">

                    {/* Personal Data Form */}
                    <Card className="p-8 border-gray-100 shadow-xl rounded-[20px]">
                        <div className="mb-8 items-start flex gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center shrink-0">
                                <User className="text-blue-600" size={24} />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-[#0f172a]">Dados Pessoais</h3>
                                <p className="text-sm text-[#64748b]">Atualize seu nome, telefone e ocupação</p>
                            </div>
                        </div>

                        <form onSubmit={handleProfileSubmit} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-[#64748b] uppercase tracking-wider ml-1">Nome Completo</label>
                                <Input
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    required
                                    className="h-12 rounded-xl bg-gray-50 border-gray-100 focus:bg-white transition-all shadow-sm"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-[#64748b] uppercase tracking-wider ml-1">E-mail de acesso</label>
                                <Input
                                    value={email}
                                    disabled
                                    className="h-12 rounded-xl bg-gray-100 border-gray-200 border-dashed opacity-70 italic cursor-not-allowed"
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-[#64748b] uppercase tracking-wider ml-1">Telefone</label>
                                    <Input
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value)}
                                        placeholder="(00) 00000-0000"
                                        className="h-12 rounded-xl bg-gray-50 border-gray-100 shadow-sm"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-[#64748b] uppercase tracking-wider ml-1">Profissão</label>
                                    <Input
                                        value={profession}
                                        onChange={(e) => setProfession(e.target.value)}
                                        placeholder="Ex: Desenvolvedor"
                                        className="h-12 rounded-xl bg-gray-50 border-gray-100 shadow-sm"
                                    />
                                </div>
                            </div>

                            <div className="pt-4">
                                <Button type="submit" size="lg" className="w-full h-12 rounded-xl font-bold bg-[#0f172a] hover:bg-black text-white shadow-lg transition-all">
                                    Salvar Alterações
                                </Button>
                            </div>
                        </form>
                    </Card>

                    {/* Password Form */}
                    <Card className="p-8 border-gray-100 shadow-xl rounded-[20px]">
                        <div className="mb-8 items-start flex gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center shrink-0">
                                <Lock className="text-amber-600" size={24} />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-[#0f172a]">Segurança</h3>
                                <p className="text-sm text-[#64748b]">Aumente a segurança alterando sua senha</p>
                            </div>
                        </div>

                        <form onSubmit={handleChangePassword} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-[#64748b] uppercase tracking-wider ml-1">Senha Atual</label>
                                <div className="relative">
                                    <Input
                                        type={showPasswords ? 'text' : 'password'}
                                        value={currentPassword}
                                        onChange={(e) => setCurrentPassword(e.target.value)}
                                        className="h-12 rounded-xl bg-gray-50 border-gray-100 shadow-sm pr-12"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPasswords(!showPasswords)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-[#94a3b8] hover:text-[#2563eb]"
                                    >
                                        {showPasswords ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-[#64748b] uppercase tracking-wider ml-1">Nova Senha</label>
                                    <Input
                                        type={showPasswords ? 'text' : 'password'}
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        className="h-12 rounded-xl bg-gray-50 border-gray-100 shadow-sm"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-[#64748b] uppercase tracking-wider ml-1">Confirmar Senha</label>
                                    <Input
                                        type={showPasswords ? 'text' : 'password'}
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className="h-12 rounded-xl bg-gray-50 border-gray-100 shadow-sm"
                                    />
                                </div>
                            </div>

                            <div className="p-4 bg-gray-50 rounded-xl border border-dotted border-gray-300">
                                <p className="text-[10px] font-bold text-[#64748b] uppercase tracking-widest mb-2 text-center">Segurança Mínima</p>
                                <div className="flex justify-center gap-6">
                                    <span className="text-[10px] font-semibold text-[#94a3b8]">6+ Caracteres</span>
                                    <span className="text-[10px] font-semibold text-[#94a3b8]">Letras e Números</span>
                                </div>
                            </div>

                            <div className="pt-4">
                                <Button
                                    type="submit"
                                    disabled={isChangingPass}
                                    className="w-full h-12 rounded-xl font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg transition-all"
                                >
                                    {isChangingPass ? 'Processando...' : 'Atualizar Senha'}
                                </Button>
                            </div>
                        </form>
                    </Card>

                </div>
            </div>
        </div>
    );
};

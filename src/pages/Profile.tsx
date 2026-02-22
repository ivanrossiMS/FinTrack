import * as React from 'react';
import { useState, useEffect } from 'react';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { User, Camera, Lock, Eye, EyeOff, Phone, Mail, Shield, Sparkles, Save } from 'lucide-react';

export const Profile: React.FC = () => {
    const { data, updateProfile } = useData();
    const { user, updateUser, changePassword } = useAuth();

    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [profession, setProfession] = useState('');
    const [avatar, setAvatar] = useState('');

    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPasswords, setShowPasswords] = useState(false);
    const [isChangingPass, setIsChangingPass] = useState(false);
    const [avatarDirty, setAvatarDirty] = useState(false);

    useEffect(() => {
        if (data.userProfile) {
            setName(data.userProfile.name);
            setEmail(data.userProfile.email);
            setPhone(data.userProfile.phone || '');
            setProfession(data.userProfile.profession || '');
            setAvatar(data.userProfile.avatar || '');
            setAvatarDirty(false);
        } else if (user) {
            setName(user.name);
            setEmail(user.email);
            setPhone(user.phone || '');
            setProfession(user.profession || '');
            setAvatar(user.avatar || '');
            setAvatarDirty(false);
        }
    }, [data.userProfile, user]);

    const processProfileImage = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (event) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const TARGET_SIZE = 240;
                    canvas.width = TARGET_SIZE;
                    canvas.height = TARGET_SIZE;
                    const ctx = canvas.getContext('2d');
                    if (!ctx) { reject('Could not get canvas context'); return; }

                    ctx.fillStyle = '#f3f4f6';
                    ctx.fillRect(0, 0, TARGET_SIZE, TARGET_SIZE);
                    ctx.imageSmoothingEnabled = true;
                    ctx.imageSmoothingQuality = 'high';

                    const scale = Math.min(TARGET_SIZE / img.width, TARGET_SIZE / img.height);
                    const width = img.width * scale;
                    const height = img.height * scale;
                    const x = (TARGET_SIZE - width) / 2;
                    const y = (TARGET_SIZE - height) / 2;

                    ctx.drawImage(img, x, y, width, height);
                    resolve(canvas.toDataURL('image/webp', 0.85));
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
            setAvatarDirty(true);
        } catch (error) {
            console.error('Error processing image:', error);
            alert('Erro ao processar a imagem.');
        }
    };

    const handleSaveAvatar = () => {
        if (user && updateUser) {
            updateUser({ ...user, avatar });
        }
        updateProfile({ name, email, phone, profession, avatar });
        setAvatarDirty(false);
        alert('Imagem salva com sucesso!');
    };

    const handleProfileSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setAvatarDirty(false);
        if (user && updateUser) {
            updateUser({ ...user, name, phone, profession, avatar });
        }
        updateProfile({ name, email, phone, profession, avatar });
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
        } catch (_error) {
            alert('Erro ao alterar senha. Tente novamente.');
        } finally {
            setIsChangingPass(false);
        }
    };

    // ── Shared Styles ──
    const s = {
        page: {
            maxWidth: 960,
            margin: '0 auto',
            padding: '2rem 1.5rem 3rem',
        } as React.CSSProperties,
        pageTitle: {
            fontSize: '1.75rem',
            fontWeight: 800,
            color: '#0f172a',
            letterSpacing: '-0.03em',
            margin: 0,
        } as React.CSSProperties,
        pageSubtitle: {
            fontSize: '0.95rem',
            fontWeight: 500,
            color: '#64748b',
            marginTop: '0.3rem',
        } as React.CSSProperties,
        card: {
            background: 'rgba(255,255,255,0.7)',
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(226,232,240,0.6)',
            borderRadius: 20,
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            overflow: 'hidden',
        } as React.CSSProperties,
        sectionHeader: {
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            marginBottom: '1.75rem',
        } as React.CSSProperties,
        sectionIcon: (bg: string, fg: string) => ({
            width: 42,
            height: 42,
            borderRadius: 12,
            background: bg,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: fg,
            flexShrink: 0,
        } as React.CSSProperties),
        sectionTitle: {
            fontSize: '1.1rem',
            fontWeight: 700,
            color: '#0f172a',
            margin: 0,
        } as React.CSSProperties,
        sectionSubtitle: {
            fontSize: '0.8rem',
            fontWeight: 500,
            color: '#94a3b8',
            margin: 0,
        } as React.CSSProperties,
        label: {
            display: 'block',
            fontSize: '0.7rem',
            fontWeight: 700,
            color: '#64748b',
            textTransform: 'uppercase' as const,
            letterSpacing: '0.06em',
            marginBottom: '0.4rem',
        } as React.CSSProperties,
        input: {
            width: '100%',
            height: 44,
            padding: '0 0.9rem',
            fontSize: '0.9rem',
            fontWeight: 500,
            color: '#0f172a',
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: 12,
            outline: 'none',
            transition: 'border-color 0.2s, box-shadow 0.2s',
            boxSizing: 'border-box' as const,
        } as React.CSSProperties,
        inputDisabled: {
            width: '100%',
            height: 44,
            padding: '0 0.9rem',
            fontSize: '0.9rem',
            fontWeight: 500,
            color: '#94a3b8',
            background: '#f1f5f9',
            border: '1px dashed #cbd5e1',
            borderRadius: 12,
            cursor: 'not-allowed',
            fontStyle: 'italic' as const,
            boxSizing: 'border-box' as const,
        } as React.CSSProperties,
        btn: (bg: string, hover: string) => ({
            width: '100%',
            height: 46,
            border: 'none',
            borderRadius: 12,
            fontSize: '0.9rem',
            fontWeight: 700,
            color: 'white',
            background: bg,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            transition: 'background 0.2s, transform 0.15s, box-shadow 0.2s',
            boxShadow: `0 4px 14px ${hover}30`,
        } as React.CSSProperties),
        row2: {
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1rem',
        } as React.CSSProperties,
    };

    return (
        <div style={s.page}>
            {/* ── Page Header ── */}
            <header style={{ marginBottom: '2rem' }}>
                <h1 style={s.pageTitle}>Meu Perfil</h1>
                <p style={s.pageSubtitle}>Gerencie sua identidade e segurança na plataforma</p>
            </header>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

                {/* ══════════════════════════════════════════════
                    HERO CARD — Avatar + Contact Info (V3 ISOLATED)
                   ══════════════════════════════════════════════ */}
                <div className="prof-hero-card-container">
                    {/* Left/Top — Identity Column */}
                    <div className="prof-avatar-col">
                        <div style={{ position: 'relative' }}>
                            <div style={{
                                width: 124,
                                height: 124,
                                borderRadius: '50%',
                                background: 'white',
                                padding: 5,
                                boxShadow: '0 8px 30px rgba(0,0,0,0.06)',
                                border: '1px solid rgba(226,232,240,0.8)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                overflow: 'hidden',
                                position: 'relative',
                            }}>
                                {avatar ? (
                                    <img src={avatar} alt="Profile" style={{
                                        width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover',
                                    }} />
                                ) : (
                                    <User size={54} color="#cbd5e1" />
                                )}
                            </div>
                            <button
                                type="button"
                                onClick={() => document.getElementById('avatar-upload')?.click()}
                                style={{
                                    position: 'absolute',
                                    bottom: 4,
                                    right: 4,
                                    width: 38,
                                    height: 38,
                                    background: '#4f46e5',
                                    color: 'white',
                                    borderRadius: '50%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    border: '3px solid white',
                                    cursor: 'pointer',
                                    boxShadow: '0 4px 12px rgba(79,70,229,0.3)',
                                    zIndex: 2,
                                }}
                            >
                                <Camera size={18} />
                            </button>
                            <input
                                id="avatar-upload"
                                type="file"
                                style={{ display: 'none' }}
                                accept="image/*"
                                onChange={handleAvatarChange}
                            />
                        </div>

                        <div style={{ textAlign: 'center' }}>
                            <h2 className="prof-name" style={{
                                fontSize: '1.4rem',
                                fontWeight: 800,
                                color: '#1e293b',
                                letterSpacing: '-0.02em',
                                margin: '0 0 0.5rem 0',
                            }}>{name || 'Usuário'}</h2>

                            {profession ? (
                                <span style={{
                                    fontSize: '0.65rem',
                                    fontWeight: 700,
                                    color: '#6366f1',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.12em',
                                    background: 'rgba(99,102,241,0.08)',
                                    padding: '0.4rem 1.2rem',
                                    borderRadius: 100,
                                    border: '1px solid rgba(99,102,241,0.1)',
                                }}>{profession}</span>
                            ) : (
                                <span style={{ color: '#94a3b8', fontSize: '0.8rem', fontWeight: 500 }}>Ocupação não informada</span>
                            )}
                        </div>

                        {avatarDirty && (
                            <button
                                type="button"
                                onClick={handleSaveAvatar}
                                style={{
                                    marginTop: '0.5rem',
                                    height: 38,
                                    padding: '0 1.5rem',
                                    border: 'none',
                                    borderRadius: 12,
                                    fontSize: '0.8rem',
                                    fontWeight: 700,
                                    color: 'white',
                                    background: '#10b981',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    boxShadow: '0 4px 12px rgba(16,185,129,0.2)',
                                }}
                            >
                                <Save size={16} />
                                Salvar Imagem
                            </button>
                        )}
                    </div>

                    {/* Right/Bottom — Contact Column */}
                    <div className="prof-info-col">
                        <h3 style={{
                            fontSize: '1.05rem',
                            fontWeight: 700,
                            color: '#1e293b',
                            margin: '0 0 1.5rem 0',
                        }}>Informações de Contato</h3>

                        <div className="prof-contact-box">
                            {/* Email */}
                            <div className="prof-contact-item">
                                <div className="prof-contact-label-box">
                                    <Mail size={16} color="#6366f1" style={{ opacity: 0.8 }} />
                                    <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>E-mail Primário</span>
                                </div>
                                <span className="prof-value" style={{ fontSize: '0.95rem', fontWeight: 600, color: '#334155' }}>{email}</span>
                            </div>

                            {/* Phone */}
                            <div className="prof-contact-item">
                                <div className="prof-contact-label-box">
                                    <Phone size={16} color="#6366f1" style={{ opacity: 0.8 }} />
                                    <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>WhatsApp / Celular</span>
                                </div>
                                <span className="prof-value" style={{
                                    fontSize: '0.95rem',
                                    fontWeight: phone ? 700 : 500,
                                    color: phone ? '#1e293b' : '#94a3b8',
                                    fontStyle: phone ? 'normal' : 'italic'
                                }}>
                                    {phone || 'Número não cadastrado'}
                                </span>
                            </div>

                            {/* Plan */}
                            <div className="prof-contact-item">
                                <div className="prof-contact-label-box">
                                    <Sparkles size={16} color="#f59e0b" />
                                    <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Plano Ativo</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                    <span style={{
                                        fontSize: '0.75rem',
                                        fontWeight: 800,
                                        color: user?.plan === 'PREMIUM' ? '#fff' : '#475569',
                                        background: user?.plan === 'PREMIUM' ? 'linear-gradient(135deg, #4f46e5, #0ea5e9)' : '#f1f5f9',
                                        padding: '0.4rem 1.2rem',
                                        borderRadius: 100,
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.04em',
                                        boxShadow: user?.plan === 'PREMIUM' ? '0 4px 12px rgba(79,70,229,0.2)' : 'none'
                                    }}>
                                        {user?.plan === 'PREMIUM' ? '✦ Membro Premium' : 'Plano Free'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Security Banner */}
                        <div style={{
                            marginTop: '2rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.75rem',
                            padding: '1.25rem',
                            background: 'rgba(16, 185, 129, 0.04)',
                            borderRadius: 16,
                            border: '1px solid rgba(16, 185, 129, 0.1)',
                            color: '#065f46'
                        }}>
                            <Shield size={18} style={{ flexShrink: 0 }} />
                            <p style={{ margin: 0, fontSize: '0.75rem', fontWeight: 600, lineHeight: 1.4 }}>
                                Perfil verificado e ativo. Suas informações de contato são usadas para suporte e faturamento.
                            </p>
                        </div>
                    </div>
                </div>

                {/* ══════════════════════════════════════════════
                    FORMS ROW — Personal Data + Security
                   ══════════════════════════════════════════════ */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
                    gap: '1.5rem',
                }}>
                    {/* ── Personal Data ── */}
                    <div style={{ ...s.card, padding: '2rem' }}>
                        <div style={s.sectionHeader}>
                            <div style={s.sectionIcon('rgba(99,102,241,0.08)', '#6366f1')}>
                                <User size={20} />
                            </div>
                            <div>
                                <h3 style={s.sectionTitle}>Dados Pessoais</h3>
                                <p style={s.sectionSubtitle}>Atualize seu nome, telefone e ocupação</p>
                            </div>
                        </div>

                        <form onSubmit={handleProfileSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
                            <div>
                                <label style={s.label}>Nome Completo</label>
                                <input
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    required
                                    style={s.input}
                                    onFocus={e => { e.currentTarget.style.borderColor = '#6366f1'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.08)'; }}
                                    onBlur={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.boxShadow = 'none'; }}
                                />
                            </div>

                            <div>
                                <label style={s.label}>E-mail de acesso</label>
                                <input value={email} disabled style={s.inputDisabled} />
                            </div>

                            <div style={s.row2}>
                                <div>
                                    <label style={s.label}>Telefone</label>
                                    <input
                                        value={phone}
                                        onChange={e => setPhone(e.target.value)}
                                        placeholder="(00) 00000-0000"
                                        style={s.input}
                                        onFocus={e => { e.currentTarget.style.borderColor = '#6366f1'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.08)'; }}
                                        onBlur={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.boxShadow = 'none'; }}
                                    />
                                </div>
                                <div>
                                    <label style={s.label}>Profissão</label>
                                    <input
                                        value={profession}
                                        onChange={e => setProfession(e.target.value)}
                                        placeholder="Ex: Desenvolvedor"
                                        style={s.input}
                                        onFocus={e => { e.currentTarget.style.borderColor = '#6366f1'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.08)'; }}
                                        onBlur={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.boxShadow = 'none'; }}
                                    />
                                </div>
                            </div>

                            <div style={{ paddingTop: '0.5rem' }}>
                                <button
                                    type="submit"
                                    style={s.btn('#0f172a', '#0f172a')}
                                    onMouseEnter={e => { e.currentTarget.style.background = '#1e293b'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                                    onMouseLeave={e => { e.currentTarget.style.background = '#0f172a'; e.currentTarget.style.transform = 'translateY(0)'; }}
                                >
                                    <Save size={16} />
                                    Salvar Alterações
                                </button>
                            </div>
                        </form>
                    </div>

                    {/* ── Security / Password ── */}
                    <div style={{ ...s.card, padding: '2rem' }}>
                        <div style={s.sectionHeader}>
                            <div style={s.sectionIcon('rgba(245,158,11,0.08)', '#d97706')}>
                                <Shield size={20} />
                            </div>
                            <div>
                                <h3 style={s.sectionTitle}>Segurança</h3>
                                <p style={s.sectionSubtitle}>Aumente a segurança alterando sua senha</p>
                            </div>
                        </div>

                        <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
                            <div>
                                <label style={s.label}>Senha Atual</label>
                                <div style={{ position: 'relative' }}>
                                    <input
                                        type={showPasswords ? 'text' : 'password'}
                                        value={currentPassword}
                                        onChange={e => setCurrentPassword(e.target.value)}
                                        style={{ ...s.input, paddingRight: '2.8rem' }}
                                        onFocus={e => { e.currentTarget.style.borderColor = '#d97706'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(245,158,11,0.08)'; }}
                                        onBlur={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.boxShadow = 'none'; }}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPasswords(!showPasswords)}
                                        style={{
                                            position: 'absolute',
                                            right: 12,
                                            top: '50%',
                                            transform: 'translateY(-50%)',
                                            background: 'none',
                                            border: 'none',
                                            cursor: 'pointer',
                                            color: '#94a3b8',
                                            padding: 2,
                                            display: 'flex',
                                        }}
                                    >
                                        {showPasswords ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>
                            </div>

                            <div style={s.row2}>
                                <div>
                                    <label style={s.label}>Nova Senha</label>
                                    <input
                                        type={showPasswords ? 'text' : 'password'}
                                        value={newPassword}
                                        onChange={e => setNewPassword(e.target.value)}
                                        style={s.input}
                                        onFocus={e => { e.currentTarget.style.borderColor = '#d97706'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(245,158,11,0.08)'; }}
                                        onBlur={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.boxShadow = 'none'; }}
                                    />
                                </div>
                                <div>
                                    <label style={s.label}>Confirmar Senha</label>
                                    <input
                                        type={showPasswords ? 'text' : 'password'}
                                        value={confirmPassword}
                                        onChange={e => setConfirmPassword(e.target.value)}
                                        style={s.input}
                                        onFocus={e => { e.currentTarget.style.borderColor = '#d97706'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(245,158,11,0.08)'; }}
                                        onBlur={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.boxShadow = 'none'; }}
                                    />
                                </div>
                            </div>

                            {/* Security hint */}
                            <div style={{
                                padding: '0.75rem 1rem',
                                background: '#f8fafc',
                                border: '1px dashed #e2e8f0',
                                borderRadius: 10,
                                display: 'flex',
                                justifyContent: 'center',
                                gap: '1.5rem',
                            }}>
                                <span style={{ fontSize: '0.65rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>🔒 6+ Caracteres</span>
                                <span style={{ fontSize: '0.65rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>🔤 Letras e Números</span>
                            </div>

                            <div style={{ paddingTop: '0.5rem' }}>
                                <button
                                    type="submit"
                                    disabled={isChangingPass}
                                    style={{
                                        ...s.btn('#059669', '#059669'),
                                        opacity: isChangingPass ? 0.6 : 1,
                                        cursor: isChangingPass ? 'not-allowed' : 'pointer',
                                    }}
                                    onMouseEnter={e => { if (!isChangingPass) { e.currentTarget.style.background = '#047857'; e.currentTarget.style.transform = 'translateY(-1px)'; } }}
                                    onMouseLeave={e => { e.currentTarget.style.background = '#059669'; e.currentTarget.style.transform = 'translateY(0)'; }}
                                >
                                    <Lock size={16} />
                                    {isChangingPass ? 'Processando...' : 'Atualizar Senha'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>

            </div>
        </div >
    );
};

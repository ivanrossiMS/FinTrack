import React, { useRef } from 'react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { SupabaseDataService } from '../services/supabaseData';
import { Database, Download, Upload, AlertTriangle, PlayCircle, Info } from 'lucide-react';
import './Settings.css';

export const Settings: React.FC = () => {
    const { data, refresh } = useData();
    const { user } = useAuth();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleReset = async () => {
        if (!user) return;
        const confirmMsg = 'ATENÇÃO: Isso apagará PERMANENTEMENTE todos os seus dados do banco de dados (nuvem). Deseja continuar?';

        if (confirm(confirmMsg)) {
            try {
                await SupabaseDataService.resetUserData(user.id);
                await refresh();
                alert('Dados resetados com sucesso!');
            } catch (error) {
                alert('Erro ao resetar dados.');
            }
        }
    };

    const handleExportJSON = () => {
        const dataStr = JSON.stringify(data, null, 2);
        const blob = new Blob([dataStr], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `fintrack_cloud_backup_${new Date().toISOString().split('T')[0]}.json`;
        link.click();
    };

    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !user) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const json = JSON.parse(event.target?.result as string);
                if (json.transactions || json.categories) {
                    if (confirm('Isso enviará os dados do arquivo para o servidor. Confirmar?')) {
                        // In a real elite app, we should iterate and upsert
                        // For now, let's keep it simple but working with SupabaseDataService if we had a bulk method
                        // Since we don't have bulk yet, we'll suggest using current refresh logic or manual entry
                        alert('Importação via arquivo JSON está em manutenção para integração em nuvem.');
                    }
                }
            } catch (err) {
                alert('Erro ao ler arquivo JSON.');
            }
        };
        reader.readAsText(file);
        e.target.value = '';
    };

    return (
        <div className="stg-page-container">
            <header className="stg-header">
                <h2 className="text-4xl font-black text-text tracking-tighter mb-2">Ajustes</h2>
                <p className="text-text-muted font-semibold text-lg opacity-80">
                    Gerenciamento de dados e preferências do sistema.
                </p>
            </header>

            <div className="stg-grid">
                {/* Backup Section */}
                <Card className="stg-card">
                    <div className="stg-card-content">
                        <div className="stg-section-header">
                            <div className="stg-icon-box blue">
                                <Database size={24} />
                            </div>
                            <div className="stg-title-group">
                                <h3>Backup e Restauração</h3>
                                <p>Segurança dos seus dados</p>
                            </div>
                        </div>

                        <p className="text-sm text-text-muted leading-relaxed">
                            Exporte seus dados para um arquivo JSON para manter um backup físico ou transfira-os para outro dispositivo.
                        </p>

                        <div className="stg-actions-row">
                            <Button onClick={handleExportJSON} className="gap-2">
                                <Download size={18} /> Exportar
                            </Button>
                            <Button variant="secondary" onClick={handleImportClick} className="gap-2">
                                <Upload size={18} /> Importar
                            </Button>
                            <input
                                type="file"
                                ref={fileInputRef}
                                style={{ display: 'none' }}
                                accept=".json"
                                onChange={handleFileChange}
                            />
                        </div>
                    </div>
                </Card>

                {/* Experimental / Demo */}
                <Card className="stg-card">
                    <div className="stg-card-content">
                        <div className="stg-section-header">
                            <div className="stg-icon-box amber">
                                <PlayCircle size={24} />
                            </div>
                            <div className="stg-title-group">
                                <h3>Dados de Demonstração</h3>
                                <p>Exploração e testes</p>
                            </div>
                        </div>

                        <p className="text-sm text-text-muted leading-relaxed">
                            Preencha seu sistema com dados fictícios para explorar todas as funcionalidades e gráficos sem precisar cadastrar tudo manualmente.
                        </p>

                        <div className="stg-actions-row">
                            <Button
                                variant="ghost"
                                className="border border-border gap-2"
                                onClick={async () => {
                                    if (user && confirm('Isso apagará seus dados atuais e criará dados de teste na nuvem. Continuar?')) {
                                        await SupabaseDataService.seedDemoData(user.id);
                                        await refresh();
                                    }
                                }}
                            >
                                <PlayCircle size={18} /> Gerar Demo
                            </Button>
                        </div>
                    </div>
                </Card>

                {/* Info Card */}
                <Card className="stg-card">
                    <div className="stg-card-content">
                        <div className="stg-section-header">
                            <div className="stg-icon-box blue opacity-70">
                                <Info size={24} />
                            </div>
                            <div className="stg-title-group">
                                <h3>Sobre o FinTrack</h3>
                                <p>Informações técnicas</p>
                            </div>
                        </div>
                        <p className="text-sm text-text-muted">
                            Seus dados são armazenados de forma segura no Supabase (Nuvem).
                            Garantimos a privacidade e segurança das suas informações financeiras com criptografia e RLS.
                        </p>
                    </div>
                </Card>

                {/* Danger Zone */}
                <Card className="stg-card stg-danger-zone">
                    <div className="stg-card-content">
                        <div className="stg-section-header">
                            <div className="stg-icon-box red">
                                <AlertTriangle size={24} />
                            </div>
                            <div className="stg-title-group">
                                <h3 className="text-danger">Zona de Perigo</h3>
                                <p className="text-danger opacity-70">Ação irreversível</p>
                            </div>
                        </div>

                        <p className="text-sm text-danger opacity-80 leading-relaxed">
                            O reset de fábrica apagará permanentemente todas as transações, categorias, fornecedores e configurações.
                        </p>

                        <div className="stg-actions-row">
                            <Button variant="danger" onClick={handleReset} className="gap-2">
                                <AlertTriangle size={18} /> Resetar Fábrica
                            </Button>
                        </div>
                    </div>
                </Card>
            </div>

            <footer className="stg-footer">
                <span className="text-xs font-bold text-text-muted">
                    FinTrack Assistant • Versão 2.5.0 • © 2026
                </span>
            </footer>
        </div>
    );
};


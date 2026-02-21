import React, { useRef } from 'react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { useData } from '../contexts/DataContext';
import { StorageService } from '../services/storage';

export const Settings: React.FC = () => {
    const { data, refresh } = useData();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleReset = () => {
        if (confirm('ATENÇÃO: Isso apagará TODOS os seus dados e recarregará a página. Deseja continuar?')) {
            StorageService.clear();
        }
    };

    const handleExportJSON = () => {
        const dataStr = JSON.stringify(data, null, 2);
        const blob = new Blob([dataStr], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `fintrack_backup_${new Date().toISOString().split('T')[0]}.json`;
        link.click();
    };

    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const json = JSON.parse(event.target?.result as string);
                if (json.transactions && json.categories) {
                    if (confirm('Isso substituirá seus dados atuais pelos dados do arquivo. Confirmar?')) {
                        StorageService.save(json);
                        refresh();
                        alert('Dados importados com sucesso!');
                    }
                } else {
                    alert('Arquivo inválido: formato JSON incompatível.');
                }
            } catch (err) {
                alert('Erro ao ler arquivo JSON.');
            }
        };
        reader.readAsText(file);
        e.target.value = ''; // Reset input
    };

    return (
        <div className="flex flex-col gap-6">
            <header>
                <h2 className="text-lg font-bold">Configurações</h2>
                <p style={{ color: 'var(--color-text-muted)' }}>Gerenciamento de dados e preferências</p>
            </header>

            <Card title="Gerenciamento de Dados">
                <div className="flex flex-col gap-4">
                    <p className="text-sm text-muted">
                        Faça backup dos seus dados ou restaure de um arquivo anterior.
                        Todos os dados são salvos no navegador (LocalStorage).
                    </p>

                    <div className="flex gap-2 flex-wrap">
                        <Button onClick={handleExportJSON}>Exportar Backup (JSON)</Button>
                        <Button variant="secondary" onClick={handleImportClick}>Importar Backup (JSON)</Button>
                        <input
                            type="file"
                            ref={fileInputRef}
                            style={{ display: 'none' }}
                            accept=".json"
                            onChange={handleFileChange}
                        />
                    </div>

                    <div className="mt-4 pt-4 border-t border-border">
                        <p className="text-sm text-muted mb-2">Para testes:</p>
                        <Button
                            variant="ghost"
                            onClick={() => {
                                if (confirm('Isso apagará seus dados atuais e criará dados de teste. Continuar?')) {
                                    StorageService.seedDemoData();
                                    refresh();
                                }
                            }}
                        >
                            Gerar Dados de Demonstração
                        </Button>
                    </div>
                </div>
            </Card>

            <Card title="Zona de Perigo" className="border-red-200 bg-red-50">
                <h4 className="text-danger font-bold mb-2">Apagar todos os dados</h4>
                <p className="text-sm mb-4 text-danger">
                    Esta ação é irreversível. Todas as transações, categorias e configurações serão perdidas.
                </p>
                <Button variant="danger" onClick={handleReset}>Resetar Dados de Fábrica</Button>
            </Card>

            <footer className="text-center text-xs text-muted mt-8">
                Finance+ v1.0.0 • Desenvolvido com React + Vite
            </footer>
        </div>
    );
};

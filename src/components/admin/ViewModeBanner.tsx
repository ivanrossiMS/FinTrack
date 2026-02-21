import * as React from 'react';
import { ShieldCheck, ArrowLeft } from 'lucide-react';
import './ViewModeBanner.css';

interface ViewModeBannerProps {
    userName: string;
    userEmail: string;
    onStop: () => void;
}

export const ViewModeBanner: React.FC<ViewModeBannerProps> = ({ userName, userEmail, onStop }) => {
    return (
        <div className="view-mode-banner-top shadow-sm animate-in fade-in slide-in-from-top-4 duration-500">
            <div className="view-mode-header-section">
                <div className="view-mode-icon-box">
                    <ShieldCheck size={20} className="text-indigo-600" />
                </div>
                <div className="view-mode-text-content">
                    <h4 className="view-mode-title">Modo Visualização Ativo</h4>
                    <p className="view-mode-subtitle" title={`${userName} (${userEmail})`}>
                        Você está vendo a conta de: <strong>{userName}</strong>
                        <span className="view-mode-email-inline">({userEmail})</span>
                    </p>
                </div>
            </div>

            <button
                onClick={onStop}
                className="view-mode-exit-button"
                title="Encerrar visualização e voltar ao admin"
            >
                <ArrowLeft size={18} strokeWidth={2.5} />
                <span>Voltar ao Admin</span>
            </button>
        </div>
    );
};

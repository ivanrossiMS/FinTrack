import React from 'react';
import { Modal } from './Modal';
import { Attachment } from '../../models/types';
import { FileText, Download, Eye } from 'lucide-react';
import './AttachmentViewer.css';

interface AttachmentViewerProps {
    isOpen: boolean;
    onClose: () => void;
    attachments: Attachment[];
    title?: string;
}

export const AttachmentViewer: React.FC<AttachmentViewerProps> = ({
    isOpen,
    onClose,
    attachments,
    title = "Visualizar Anexos"
}) => {
    if (!attachments || attachments.length === 0) return null;

    const handleDownload = (att: Attachment) => {
        const link = document.createElement('a');
        link.href = att.url;
        link.download = att.name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const isImage = (type: string) => type.startsWith('image/');

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={title}>
            <div className="attachment-viewer-grid">
                {attachments.map(att => (
                    <div key={att.id} className="viewer-card">
                        <div className="viewer-preview">
                            {isImage(att.type) ? (
                                <img src={att.url} alt={att.name} />
                            ) : (
                                <div className="viewer-icon-placeholder">
                                    <FileText size={48} />
                                    <span>PDF</span>
                                </div>
                            )}
                            <div className="viewer-overlay">
                                <button className="viewer-action-btn" onClick={() => handleDownload(att)} title="Baixar">
                                    <Download size={18} />
                                </button>
                                {isImage(att.type) && (
                                    <button className="viewer-action-btn" onClick={() => window.open(att.url, '_blank')} title="Ver original">
                                        <Eye size={18} />
                                    </button>
                                )}
                            </div>
                        </div>
                        <div className="viewer-footer">
                            <span className="viewer-name" title={att.name}>{att.name}</span>
                        </div>
                    </div>
                ))}
            </div>
        </Modal>
    );
};

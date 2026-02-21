import React, { useRef } from 'react';
import { Attachment } from '../../models/types';
import { Paperclip, X, FileText } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import './AttachmentManager.css';

interface AttachmentManagerProps {
    attachments: Attachment[];
    onChange: (attachments: Attachment[]) => void;
    label?: string;
}

export const AttachmentManager: React.FC<AttachmentManagerProps> = ({
    attachments,
    onChange,
    label = "Anexos (Comprovantes, Notas, etc.)"
}) => {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files) return;

        Array.from(files).forEach(file => {
            const reader = new FileReader();
            reader.onload = (event) => {
                const newAttachment: Attachment = {
                    id: uuidv4(),
                    name: file.name,
                    type: file.type,
                    url: event.target?.result as string,
                    size: file.size
                };
                onChange([...attachments, newAttachment]);
            };
            reader.readAsDataURL(file);
        });

        // Reset input
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const removeAttachment = (id: string) => {
        onChange(attachments.filter(a => a.id !== id));
    };

    const formatSize = (bytes: number) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    };

    const isImage = (type: string) => type.startsWith('image/');

    return (
        <div className="attachment-manager">
            <label className="att-label">{label}</label>

            <div className="att-container">
                {attachments.map(att => (
                    <div key={att.id} className="att-card">
                        <div className="att-preview">
                            {isImage(att.type) ? (
                                <img src={att.url} alt={att.name} />
                            ) : (
                                <div className="att-icon-box">
                                    <FileText size={24} />
                                </div>
                            )}
                        </div>
                        <div className="att-info">
                            <span className="att-name" title={att.name}>{att.name}</span>
                            <span className="att-meta">{formatSize(att.size)}</span>
                        </div>
                        <button
                            type="button"
                            className="att-remove"
                            onClick={() => removeAttachment(att.id)}
                            title="Remover anexo"
                        >
                            <X size={14} />
                        </button>
                    </div>
                ))}

                <button
                    type="button"
                    className="att-add-btn"
                    onClick={() => fileInputRef.current?.click()}
                >
                    <div className="att-add-icon">
                        <Paperclip size={20} />
                    </div>
                    <span>Adicionar Arquivo</span>
                    <span className="att-add-sub">Fotos ou PDFs</span>
                </button>
            </div>

            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
                multiple
                accept="image/*,application/pdf"
            />
        </div>
    );
};

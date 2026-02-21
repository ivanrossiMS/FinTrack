import React from 'react';
import './Input.css';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
    icon?: React.ReactNode;
}

export const Input: React.FC<InputProps> = ({ label, error, icon, className, ...props }) => {
    return (
        <div className={`input-group ${className || ''} ${icon ? 'has-icon' : ''}`}>
            {label && <label className="input-label">{label}</label>}
            <div className="input-field-wrapper">
                {icon && <div className="input-field-icon">{icon}</div>}
                <input className="input-field" {...props} />
            </div>
            {error && <span className="input-error">{error}</span>}
        </div>
    );
};

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
    label?: string;
    error?: string;
    icon?: React.ReactNode;
    options: { value: string; label: string }[];
}

export const Select: React.FC<SelectProps> = ({ label, error, icon, options, className, ...props }) => {
    return (
        <div className={`input-group ${className || ''} ${icon ? 'has-icon' : ''}`}>
            {label && <label className="input-label">{label}</label>}
            <div className="input-field-wrapper">
                {icon && <div className="input-field-icon">{icon}</div>}
                <select className="input-field select-field" {...props}>
                    {options.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                </select>
            </div>
            {error && <span className="input-error">{error}</span>}
        </div>
    );
}

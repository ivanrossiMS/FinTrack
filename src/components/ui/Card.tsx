import React from 'react';
import './Card.css';

interface CardProps {
    children: React.ReactNode;
    title?: string;
    className?: string;
    onClick?: () => void;
    style?: React.CSSProperties;
}

export const Card: React.FC<CardProps> = ({ title, children, className, onClick, style }) => {
    return (
        <div className={`card ${className || ''}`} onClick={onClick} style={style}>
            {title && <h3 className="card-title">{title}</h3>}
            <div className="card-content">
                {children}
            </div>
        </div>
    );
};

import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import './Pagination.css';

interface PaginationProps {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
    totalItems: number;
    itemsPerPage: number;
}

export const Pagination: React.FC<PaginationProps> = ({
    currentPage,
    totalPages,
    onPageChange,
    totalItems,
    itemsPerPage
}) => {
    if (totalPages <= 1) return null;

    const startItem = (currentPage - 1) * itemsPerPage + 1;
    const endItem = Math.min(currentPage * itemsPerPage, totalItems);

    const getPageNumbers = () => {
        const pages = [];
        const maxVisiblePages = 5;

        let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
        let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

        if (endPage - startPage + 1 < maxVisiblePages) {
            startPage = Math.max(1, endPage - maxVisiblePages + 1);
        }

        for (let i = startPage; i <= endPage; i++) {
            pages.push(i);
        }
        return pages;
    };

    return (
        <div className="pg-container">
            <div className="pg-info">
                Mostrando <strong>{startItem}-{endItem}</strong> de <strong>{totalItems}</strong> registros
            </div>

            <div className="pg-controls">
                <button
                    className="pg-btn"
                    onClick={() => onPageChange(1)}
                    disabled={currentPage === 1}
                    title="Primeira página"
                >
                    <ChevronsLeft size={18} />
                </button>
                <button
                    className="pg-btn"
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    title="Anterior"
                >
                    <ChevronLeft size={18} />
                </button>

                <div className="pg-numbers">
                    {getPageNumbers().map(num => (
                        <button
                            key={num}
                            className={`pg-num-btn ${currentPage === num ? 'active' : ''}`}
                            onClick={() => onPageChange(num)}
                        >
                            {num}
                        </button>
                    ))}
                </div>

                <button
                    className="pg-btn"
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    title="Próxima"
                >
                    <ChevronRight size={18} />
                </button>
                <button
                    className="pg-btn"
                    onClick={() => onPageChange(totalPages)}
                    disabled={currentPage === totalPages}
                    title="Última página"
                >
                    <ChevronsRight size={18} />
                </button>
            </div>
        </div>
    );
};

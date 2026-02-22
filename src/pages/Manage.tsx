import * as React from 'react';
import { useState } from 'react';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { useData } from '../contexts/DataContext';
import { Plus, Trash2, Truck, CreditCard, Edit2, RotateCcw } from 'lucide-react';
import { CategoryForm } from '../components/forms/CategoryForm';
import { SupplierForm } from '../components/forms/SupplierForm';
import { PaymentMethodForm } from '../components/forms/PaymentMethodForm';
import { Category, Supplier, PaymentMethod } from '../models/types';
import * as Icons from 'lucide-react';
import './Manage.css';

export const Manage: React.FC = () => {
    const { data, deleteCategory, deleteSupplier, deletePaymentMethod, resetCategories } = useData();
    const [activeTab, setActiveTab] = useState<'categories' | 'suppliers' | 'methods'>('categories');

    // Modals state
    const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
    const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
    const [isMethodModalOpen, setIsMethodModalOpen] = useState(false);

    const [editingCategory, setEditingCategory] = useState<Category | undefined>(undefined);
    const [editingSupplier, setEditingSupplier] = useState<Supplier | undefined>(undefined);

    const handleEditCategory = (category: Category) => {
        setEditingCategory(category);
        setIsCategoryModalOpen(true);
    };

    const handleDeleteCategory = (id: string) => {
        if (confirm('Excluir categoria? Isso pode afetar transações existentes.')) {
            deleteCategory(id);
        }
    };

    const handleEditSupplier = (supplier: Supplier) => {
        setEditingSupplier(supplier);
        setIsSupplierModalOpen(true);
    };

    const handleDeleteSupplier = (id: string) => {
        if (confirm('Excluir fornecedor?')) {
            deleteSupplier(id);
        }
    };

    const handleEditMethod = (method: PaymentMethod) => {
        console.log('Editing method:', method);
        alert('Edição de método de pagamento será implementada em breve.');
    };

    const handleDeleteMethod = (id: string) => {
        if (confirm('Excluir método de pagamento?')) {
            deletePaymentMethod(id);
        }
    };

    return (
        <div className="mng-page">
            <header className="mng-header">
                <h1>Cadastros</h1>
                <span className="mng-subtitle">Gerencie suas categorias, fornecedores e métodos de pagamento</span>
            </header>

            {/* Tabs Navigation */}
            <div className="mng-tabs-container">
                <button
                    className={`mng-tab-btn ${activeTab === 'categories' ? 'active' : ''}`}
                    onClick={() => setActiveTab('categories')}
                >
                    Categorias
                </button>
                <button
                    className={`mng-tab-btn ${activeTab === 'suppliers' ? 'active' : ''}`}
                    onClick={() => setActiveTab('suppliers')}
                >
                    Fornecedores
                </button>
                <button
                    className={`mng-tab-btn ${activeTab === 'methods' ? 'active' : ''}`}
                    onClick={() => setActiveTab('methods')}
                >
                    Métodos
                </button>
            </div>

            {/* Content Area */}
            <div className="mng-card">

                {activeTab === 'categories' && (
                    <div className="mng-tab-content">
                        <div className="mng-card-header">
                            <div className="mng-header-info">
                                <h2>Gestão de Categorias</h2>
                                <span>Controle granular do seu ecossistema financeiro</span>
                            </div>
                            <div className="flex gap-2">
                                <Button onClick={() => {
                                    if (confirm('Deseja restaurar as categorias padrão do Finance+? Isso sincronizará as 30 categorias oficiais e não apagará suas categorias personalizadas.')) {
                                        resetCategories();
                                    }
                                }} size="sm" variant="secondary" className="rounded-full">
                                    <RotateCcw size={18} /> <span className="hidden md:inline">Restaurar Padrão Elite</span>
                                </Button>
                                <Button onClick={() => { setEditingCategory(undefined); setIsCategoryModalOpen(true); }} size="sm" className="rounded-full">
                                    <Plus size={18} /> <span>Novo</span>
                                </Button>
                            </div>
                        </div>

                        <div className="mng-type-section">
                            {/* --- SEÇÃO DE RECEITAS --- */}
                            <div className="mng-section-header income">
                                <div className="dot" />
                                <h2>Receitas</h2>
                            </div>
                            <div className="mng-grid-cards">
                                {data.categories.filter(c => c.type === 'INCOME').map((cat) => {
                                    const IconComponent = (Icons as any)[cat.icon || 'Layers'] || Icons.Layers;
                                    return (
                                        <div key={cat.id} className={`mng-elite-card ${cat.isDefault ? 'is-system' : ''}`}>
                                            <div
                                                className="mng-card-visual"
                                                style={{ backgroundColor: `${cat.color}15`, color: cat.color }}
                                            >
                                                <IconComponent size={24} strokeWidth={2.5} />
                                            </div>

                                            <div className="mng-card-body">
                                                <div className="mng-card-main">
                                                    <h3>{cat.name}</h3>
                                                    <span className="mng-type-pill income">Receita</span>
                                                </div>

                                                {cat.isDefault && (
                                                    <div className="mng-system-badge">
                                                        <Icons.Lock size={10} /> <span>FIXO</span>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="mng-card-footer">
                                                <button onClick={() => handleEditCategory(cat)} className="mng-action-btn edit" title="Editar">
                                                    <Edit2 size={16} />
                                                </button>
                                                {!cat.isDefault && (
                                                    <button onClick={() => handleDeleteCategory(cat.id)} className="mng-action-btn delete" title="Excluir">
                                                        <Trash2 size={16} />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* --- SEÇÃO DE DESPESAS --- */}
                            <div className="mng-section-header expense">
                                <div className="dot" />
                                <h2>Despesas</h2>
                            </div>
                            <div className="mng-grid-cards">
                                {data.categories.filter(c => c.type === 'EXPENSE').map((cat) => {
                                    const IconComponent = (Icons as any)[cat.icon || 'Layers'] || Icons.Layers;
                                    return (
                                        <div key={cat.id} className={`mng-elite-card ${cat.isDefault ? 'is-system' : ''}`}>
                                            <div
                                                className="mng-card-visual"
                                                style={{ backgroundColor: `${cat.color}15`, color: cat.color }}
                                            >
                                                <IconComponent size={24} strokeWidth={2.5} />
                                            </div>

                                            <div className="mng-card-body">
                                                <div className="mng-card-main">
                                                    <h3>{cat.name}</h3>
                                                    <span className="mng-type-pill expense">Despesa</span>
                                                </div>

                                                {cat.isDefault && (
                                                    <div className="mng-system-badge">
                                                        <Icons.Lock size={10} /> <span>FIXO</span>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="mng-card-footer">
                                                <button onClick={() => handleEditCategory(cat)} className="mng-action-btn edit" title="Editar">
                                                    <Edit2 size={16} />
                                                </button>
                                                {!cat.isDefault && (
                                                    <button onClick={() => handleDeleteCategory(cat.id)} className="mng-action-btn delete" title="Excluir">
                                                        <Trash2 size={16} />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'suppliers' && (
                    <div className="mng-tab-content">
                        <div className="mng-card-header">
                            <div className="mng-header-info">
                                <h2>Fornecedores</h2>
                                <span>Prestadores e lojas</span>
                            </div>
                            <Button onClick={() => { setEditingSupplier(undefined); setIsSupplierModalOpen(true); }} size="sm" className="rounded-full">
                                <Plus size={18} /> <span>Novo</span>
                            </Button>
                        </div>

                        <div className="mng-table-wrapper">
                            <div className="mng-grid-header mng-grid-3">
                                <span className="mng-col-h">Nome</span>
                                <span className="mng-col-h">Contato</span>
                                <span className="mng-col-h text-right">Ações</span>
                            </div>

                            <div className="mng-items-list">
                                {data.suppliers.map((sup) => (
                                    <div key={sup.id} className="mng-grid-row mng-grid-3">
                                        <div className="mng-col-name">
                                            <div className="mng-icon-box">
                                                <Truck size={18} />
                                            </div>
                                            <span className="mng-name-text">{sup.name}</span>
                                        </div>
                                        <div className="mng-col-contact">
                                            {sup.contact || '—'}
                                        </div>
                                        <div className="mng-col-actions">
                                            <button onClick={() => handleEditSupplier(sup)} className="mng-btn-icon" title="Editar">
                                                <Edit2 size={16} /> <span className="md:hidden">Editar</span>
                                            </button>
                                            <button onClick={() => handleDeleteSupplier(sup.id)} className="mng-btn-icon danger" title="Excluir">
                                                <Trash2 size={16} /> <span className="md:hidden">Excluir</span>
                                            </button>
                                        </div>
                                    </div>
                                ))}
                                {data.suppliers.length === 0 && (
                                    <div className="text-center py-12 text-text-light italic">Nenhum fornecedor cadastrado.</div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'methods' && (
                    <div className="mng-tab-content">
                        <div className="mng-card-header">
                            <div className="mng-header-info">
                                <h2>Métodos de Pagamento</h2>
                                <span>Cartões, conta, dinheiro</span>
                            </div>
                            <Button onClick={() => setIsMethodModalOpen(true)} size="sm" className="rounded-full">
                                <Plus size={18} /> <span>Novo</span>
                            </Button>
                        </div>

                        <div className="mng-table-wrapper">
                            <div className="mng-grid-header mng-grid-2">
                                <span className="mng-col-h">Nome</span>
                                <span className="mng-col-h text-right">Ações</span>
                            </div>

                            <div className="mng-items-list">
                                {data.paymentMethods.map((pm) => (
                                    <div key={pm.id} className="mng-grid-row mng-grid-2">
                                        <div className="mng-col-name">
                                            <div className="mng-icon-box">
                                                <CreditCard size={18} />
                                            </div>
                                            <span className="mng-name-text">{pm.name}</span>
                                        </div>
                                        <div className="mng-col-actions">
                                            <button onClick={() => handleEditMethod(pm)} className="mng-btn-icon" title="Editar">
                                                <Edit2 size={16} /> <span className="md:hidden">Editar</span>
                                            </button>
                                            <button onClick={() => handleDeleteMethod(pm.id)} className="mng-btn-icon danger" title="Excluir">
                                                <Trash2 size={16} /> <span className="md:hidden">Excluir</span>
                                            </button>
                                        </div>
                                    </div>
                                ))}
                                {data.paymentMethods.length === 0 && (
                                    <div className="text-center py-12 text-text-light italic">Nenhum método cadastrado.</div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Modals */}
            <Modal
                isOpen={isCategoryModalOpen}
                onClose={() => setIsCategoryModalOpen(false)}
                title={editingCategory ? "Editar Categoria" : "Nova Categoria"}
            >
                <CategoryForm
                    onClose={() => setIsCategoryModalOpen(false)}
                    initialData={editingCategory}
                />
            </Modal>

            <Modal
                isOpen={isSupplierModalOpen}
                onClose={() => setIsSupplierModalOpen(false)}
                title={editingSupplier ? "Editar Fornecedor" : "Novo Fornecedor"}
            >
                <SupplierForm
                    onClose={() => setIsSupplierModalOpen(false)}
                    initialData={editingSupplier}
                />
            </Modal>

            <Modal
                isOpen={isMethodModalOpen}
                onClose={() => setIsMethodModalOpen(false)}
                title="Novo Método de Pagamento"
            >
                <PaymentMethodForm
                    onClose={() => setIsMethodModalOpen(false)}
                />
            </Modal>
        </div>
    );
};

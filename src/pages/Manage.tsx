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
    const [editingMethod, setEditingMethod] = useState<PaymentMethod | undefined>(undefined);

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
        setEditingMethod(method);
        setIsMethodModalOpen(true);
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
                                    if (confirm('Deseja restaurar as categorias padrão do FinTrack? Isso sincronizará as 30 categorias oficiais e não apagará suas categorias personalizadas.')) {
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
                                <h2>Fluxo de Receitas</h2>
                                <span style={{ fontSize: '0.7rem', opacity: 0.6, fontWeight: 600 }}>(Ganhos e Entradas)</span>
                            </div>
                            <div className="mng-grid-cards">
                                {data.categories
                                    .filter(c => c.type === 'INCOME')
                                    .sort((a, b) => a.name.localeCompare(b.name))
                                    .map((cat) => {
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
                                                    {!cat.isDefault && (
                                                        <>
                                                            <button onClick={() => handleEditCategory(cat)} className="mng-action-btn edit" title="Editar">
                                                                <Edit2 size={16} />
                                                            </button>
                                                            <button onClick={() => handleDeleteCategory(cat.id)} className="mng-action-btn delete" title="Excluir">
                                                                <Trash2 size={16} />
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                            </div>

                            {/* --- SEÇÃO DE DESPESAS --- */}
                            <div className="mng-section-header expense">
                                <div className="dot" />
                                <h2>Fluxo de Despesas</h2>
                                <span style={{ fontSize: '0.7rem', opacity: 0.6, fontWeight: 600 }}>(Gastos e Saídas)</span>
                            </div>
                            <div className="mng-grid-cards">
                                {data.categories
                                    .filter(c => c.type === 'EXPENSE')
                                    .sort((a, b) => a.name.localeCompare(b.name))
                                    .map((cat) => {
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
                                                    {!cat.isDefault && (
                                                        <>
                                                            <button onClick={() => handleEditCategory(cat)} className="mng-action-btn edit" title="Editar">
                                                                <Edit2 size={16} />
                                                            </button>
                                                            <button onClick={() => handleDeleteCategory(cat.id)} className="mng-action-btn delete" title="Excluir">
                                                                <Trash2 size={16} />
                                                            </button>
                                                        </>
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

                        <div className="mng-grid-cards mt-6">
                            {data.suppliers
                                .sort((a, b) => a.name.localeCompare(b.name))
                                .map((sup) => (
                                    <div key={sup.id} className="mng-elite-card">
                                        <div
                                            className="mng-card-visual"
                                            style={{ backgroundColor: `var(--color-primary-light)15`, color: 'var(--color-primary)' }}
                                        >
                                            <Truck size={24} strokeWidth={2.5} />
                                        </div>

                                        <div className="mng-card-body">
                                            <div className="mng-card-main">
                                                <h3>{sup.name}</h3>
                                                <span className="mng-col-contact">{sup.contact || 'Sem contato'}</span>
                                            </div>
                                        </div>

                                        <div className="mng-card-footer">
                                            <button onClick={() => handleEditSupplier(sup)} className="mng-action-btn edit" title="Editar">
                                                <Edit2 size={16} />
                                            </button>
                                            <button onClick={() => handleDeleteSupplier(sup.id)} className="mng-action-btn delete" title="Excluir">
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            {data.suppliers.length === 0 && (
                                <div className="text-center py-12 text-text-light italic col-span-full">Nenhum fornecedor cadastrado.</div>
                            )}
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

                        <div className="mng-grid-cards mt-6">
                            {data.paymentMethods
                                .sort((a, b) => a.name.localeCompare(b.name))
                                .map((pm) => (
                                    <div key={pm.id} className={`mng-elite-card ${pm.isDefault ? 'is-system' : ''}`}>
                                        <div
                                            className="mng-card-visual"
                                            style={{ backgroundColor: `${pm.color || '#6366f1'}15`, color: pm.color || '#6366f1' }}
                                        >
                                            <CreditCard size={24} strokeWidth={2.5} />
                                        </div>

                                        <div className="mng-card-body">
                                            <div className="mng-card-main">
                                                <h3>{pm.name}</h3>
                                            </div>
                                            {pm.isDefault && (
                                                <div className="mng-system-badge">
                                                    <Icons.Lock size={10} /> <span>FIXO</span>
                                                </div>
                                            )}
                                        </div>

                                        <div className="mng-card-footer">
                                            {!pm.isDefault && (
                                                <>
                                                    <button onClick={() => handleEditMethod(pm)} className="mng-action-btn edit" title="Editar">
                                                        <Edit2 size={16} />
                                                    </button>
                                                    <button onClick={() => handleDeleteMethod(pm.id)} className="mng-action-btn delete" title="Excluir">
                                                        <Trash2 size={16} />
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            {data.paymentMethods.length === 0 && (
                                <div className="text-center py-12 text-text-light italic col-span-full">Nenhum método cadastrado.</div>
                            )}
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
                title={editingMethod ? "Editar Método de Pagamento" : "Novo Método de Pagamento"}
            >
                <PaymentMethodForm
                    onClose={() => setIsMethodModalOpen(false)}
                    initialData={editingMethod}
                />
            </Modal>
        </div>
    );
};

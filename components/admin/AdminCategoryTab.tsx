import React, { useState, useEffect } from 'react';
import { getCategories, createCategory, updateCategory, deleteCategory, Category } from '../../lib/supabaseService';
import { SpinnerIcon, PlusIcon, TrashIcon, EditIcon, CheckIcon, XIcon } from '../Icons';
import { useLanguage } from '../../contexts/LanguageContext';
import { useToast } from '../../contexts/ToastContext';

const AdminCategoryTab: React.FC = () => {
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<Omit<Category, 'id'>>({ name: '', name_tr: '', icon: '' });
    const [isAdding, setIsAdding] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const { t } = useLanguage();
    const { success: showSuccess, error: showError } = useToast();

    useEffect(() => {
        loadCategories();
    }, []);

    const loadCategories = async () => {
        setLoading(true);
        const data = await getCategories();
        setCategories(data);
        setLoading(false);
    };

    const handleStartEdit = (category: Category) => {
        setEditingId(category.id);
        setEditForm({ name: category.name, name_tr: category.name_tr || '', icon: category.icon || '' });
    };

    const handleCancelEdit = () => {
        setEditingId(null);
        setIsAdding(false);
        setEditForm({ name: '', name_tr: '', icon: '' });
    };

    const handleSave = async () => {
        if (!editForm.name) return showError(t('categoryNameRequired') || 'Category name is required');

        setIsSaving(true);
        try {
            if (isAdding) {
                await createCategory(editForm);
            } else if (editingId) {
                await updateCategory(editingId, editForm);
            }
            await loadCategories();
            handleCancelEdit();
            showSuccess(t('adminSuccessTitle'));
        } catch (error: any) {
            showError(t('categorySaveError'));
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (id: string, name: string) => {
        if (!window.confirm(t('confirmDeleteCategory', { name }))) return;

        try {
            await deleteCategory(id);
            await loadCategories();
            showSuccess(t('categoryDeletedSuccess'));
        } catch (error: any) {
            showError(t('adminErrorTitle'));
        }
    };

    if (loading && categories.length === 0) {
        return <div className="p-8 text-center"><SpinnerIcon className="w-8 h-8 mx-auto text-brand-primary animate-spin" /></div>;
    }

    return (
        <section className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Category Management</h2>
                <button
                    onClick={() => { setIsAdding(true); setEditingId('new'); setEditForm({ name: '', name_tr: '', icon: '' }); }}
                    className="bg-brand-primary text-white px-4 py-2 rounded-lg hover:bg-opacity-90 transition-colors flex items-center gap-2"
                >
                    <PlusIcon className="w-4 h-4" /> Add Category
                </button>
            </div>

            <div className="glass-premium rounded-xl shadow-sm border border-white/10 overflow-hidden">
                <table className="w-full text-sm text-left text-gray-300">
                    <thead className="text-xs text-white/60 uppercase bg-white/5">
                        <tr>
                            <th className="px-6 py-4">Icon</th>
                            <th className="px-6 py-4">Name (EN)</th>
                            <th className="px-6 py-4">Name (TR)</th>
                            <th className="px-6 py-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/10">
                        {isAdding && (
                            <tr className="bg-brand-primary/10">
                                <td className="px-6 py-4">
                                    <input
                                        type="text"
                                        placeholder="Icon name"
                                        value={editForm.icon}
                                        onChange={e => setEditForm({ ...editForm, icon: e.target.value })}
                                        className="w-full p-2 rounded border border-white/10 bg-white/5 text-white"
                                    />
                                </td>
                                <td className="px-6 py-4">
                                    <input
                                        type="text"
                                        placeholder="English Name"
                                        value={editForm.name}
                                        onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                                        className="w-full p-2 rounded border border-white/10 bg-white/5 text-white"
                                    />
                                </td>
                                <td className="px-6 py-4">
                                    <input
                                        type="text"
                                        placeholder="Turkish Name"
                                        value={editForm.name_tr}
                                        onChange={e => setEditForm({ ...editForm, name_tr: e.target.value })}
                                        className="w-full p-2 rounded border border-white/10 bg-white/5 text-white"
                                    />
                                </td>
                                <td className="px-6 py-4 text-right space-x-2">
                                    <button onClick={handleSave} disabled={isSaving} className="text-green-400 hover:text-green-300 p-1">
                                        {isSaving ? <SpinnerIcon className="w-5 h-5 animate-spin" /> : <CheckIcon className="w-5 h-5" />}
                                    </button>
                                    <button onClick={handleCancelEdit} className="text-red-400 hover:text-red-300 p-1">
                                        <XIcon className="w-5 h-5" />
                                    </button>
                                </td>
                            </tr>
                        )}
                        {categories.map((cat) => (
                            <tr key={cat.id} className="hover:bg-white/5 transition-colors">
                                <td className="px-6 py-4">
                                    {editingId === cat.id ? (
                                        <input
                                            type="text"
                                            value={editForm.icon}
                                            onChange={e => setEditForm({ ...editForm, icon: e.target.value })}
                                            className="w-full p-2 rounded border border-white/10 bg-white/5 text-white"
                                        />
                                    ) : (
                                        <span className="text-brand-text-muted">{cat.icon || '-'}</span>
                                    )}
                                </td>
                                <td className="px-6 py-4 font-medium text-white">
                                    {editingId === cat.id ? (
                                        <input
                                            type="text"
                                            value={editForm.name}
                                            onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                                            className="w-full p-2 rounded border border-white/10 bg-white/5 text-white"
                                        />
                                    ) : (
                                        cat.name
                                    )}
                                </td>
                                <td className="px-6 py-4">
                                    {editingId === cat.id ? (
                                        <input
                                            type="text"
                                            value={editForm.name_tr}
                                            onChange={e => setEditForm({ ...editForm, name_tr: e.target.value })}
                                            className="w-full p-2 rounded border border-white/10 bg-white/5 text-white"
                                        />
                                    ) : (
                                        cat.name_tr || <span className="text-white/40 italic">No translation</span>
                                    )}
                                </td>
                                <td className="px-6 py-4 text-right space-x-3">
                                    {editingId === cat.id ? (
                                        <>
                                            <button onClick={handleSave} disabled={isSaving} className="text-green-400 hover:text-green-300 p-1">
                                                {isSaving ? <SpinnerIcon className="w-5 h-5 animate-spin" /> : <CheckIcon className="w-5 h-5" />}
                                            </button>
                                            <button onClick={handleCancelEdit} className="text-red-400 hover:text-red-300 p-1">
                                                <XIcon className="w-5 h-5" />
                                            </button>
                                        </>
                                    ) : (
                                        <>
                                            <button onClick={() => handleStartEdit(cat)} className="text-blue-400 hover:text-blue-300 p-1">
                                                <EditIcon className="w-5 h-5" />
                                            </button>
                                            <button onClick={() => handleDelete(cat.id, cat.name)} className="text-red-400 hover:text-red-300 p-1">
                                                <TrashIcon className="w-5 h-5" />
                                            </button>
                                        </>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </section>
    );
};

export default AdminCategoryTab;

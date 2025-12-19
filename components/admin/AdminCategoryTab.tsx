import React, { useState, useEffect } from 'react';
import { getCategories, createCategory, updateCategory, deleteCategory, Category } from '../../lib/supabaseService';
import { SpinnerIcon, PlusIcon, TrashIcon, EditIcon, CheckIcon, XIcon } from '../Icons';

const AdminCategoryTab: React.FC = () => {
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<Omit<Category, 'id'>>({ name: '', name_tr: '', icon: '' });
    const [isAdding, setIsAdding] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

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
        if (!editForm.name) return alert('Category name is required');

        setIsSaving(true);
        try {
            if (isAdding) {
                await createCategory(editForm);
            } else if (editingId) {
                await updateCategory(editingId, editForm);
            }
            await loadCategories();
            handleCancelEdit();
        } catch (error: any) {
            alert('Error saving category: ' + error.message);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (id: string, name: string) => {
        if (!window.confirm(`Are you sure you want to delete category "${name}"? This might cause issues if deals are still assigned to it.`)) return;

        try {
            await deleteCategory(id);
            await loadCategories();
        } catch (error: any) {
            alert('Error deleting category: ' + error.message);
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

            <div className="bg-white dark:bg-brand-surface rounded-xl shadow-sm border border-gray-100 dark:border-white/5 overflow-hidden">
                <table className="w-full text-sm text-left">
                    <thead className="text-xs text-gray-700 dark:text-brand-text-light uppercase bg-gray-50 dark:bg-brand-bg">
                        <tr>
                            <th className="px-6 py-4">Icon</th>
                            <th className="px-6 py-4">Name (EN)</th>
                            <th className="px-6 py-4">Name (TR)</th>
                            <th className="px-6 py-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                        {isAdding && (
                            <tr className="bg-brand-primary/5">
                                <td className="px-6 py-4">
                                    <input
                                        type="text"
                                        placeholder="Icon name"
                                        value={editForm.icon}
                                        onChange={e => setEditForm({ ...editForm, icon: e.target.value })}
                                        className="w-full p-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-brand-surface"
                                    />
                                </td>
                                <td className="px-6 py-4">
                                    <input
                                        type="text"
                                        placeholder="English Name"
                                        value={editForm.name}
                                        onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                                        className="w-full p-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-brand-surface"
                                    />
                                </td>
                                <td className="px-6 py-4">
                                    <input
                                        type="text"
                                        placeholder="Turkish Name"
                                        value={editForm.name_tr}
                                        onChange={e => setEditForm({ ...editForm, name_tr: e.target.value })}
                                        className="w-full p-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-brand-surface"
                                    />
                                </td>
                                <td className="px-6 py-4 text-right space-x-2">
                                    <button onClick={handleSave} disabled={isSaving} className="text-green-600 hover:text-green-700 p-1">
                                        {isSaving ? <SpinnerIcon className="w-5 h-5 animate-spin" /> : <CheckIcon className="w-5 h-5" />}
                                    </button>
                                    <button onClick={handleCancelEdit} className="text-red-600 hover:text-red-700 p-1">
                                        <XIcon className="w-5 h-5" />
                                    </button>
                                </td>
                            </tr>
                        )}
                        {categories.map((cat) => (
                            <tr key={cat.id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                                <td className="px-6 py-4">
                                    {editingId === cat.id ? (
                                        <input
                                            type="text"
                                            value={editForm.icon}
                                            onChange={e => setEditForm({ ...editForm, icon: e.target.value })}
                                            className="w-full p-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-brand-surface"
                                        />
                                    ) : (
                                        <span className="text-gray-500 dark:text-brand-text-muted">{cat.icon || '-'}</span>
                                    )}
                                </td>
                                <td className="px-6 py-4 font-medium text-gray-900 dark:text-brand-text-light">
                                    {editingId === cat.id ? (
                                        <input
                                            type="text"
                                            value={editForm.name}
                                            onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                                            className="w-full p-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-brand-surface"
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
                                            className="w-full p-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-brand-surface"
                                        />
                                    ) : (
                                        cat.name_tr || <span className="text-gray-400 italic">No translation</span>
                                    )}
                                </td>
                                <td className="px-6 py-4 text-right space-x-3">
                                    {editingId === cat.id ? (
                                        <>
                                            <button onClick={handleSave} disabled={isSaving} className="text-green-600 hover:text-green-700 p-1">
                                                {isSaving ? <SpinnerIcon className="w-5 h-5 animate-spin" /> : <CheckIcon className="w-5 h-5" />}
                                            </button>
                                            <button onClick={handleCancelEdit} className="text-red-600 hover:text-red-700 p-1">
                                                <XIcon className="w-5 h-5" />
                                            </button>
                                        </>
                                    ) : (
                                        <>
                                            <button onClick={() => handleStartEdit(cat)} className="text-blue-600 hover:text-blue-700 p-1">
                                                <EditIcon className="w-5 h-5" />
                                            </button>
                                            <button onClick={() => handleDelete(cat.id, cat.name)} className="text-red-600 hover:text-red-700 p-1">
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

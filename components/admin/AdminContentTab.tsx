import React, { useState, useMemo } from 'react';
import { useContent } from '../../contexts/ContentContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { PageContent } from '../../types';
import { SpinnerIcon } from '../Icons';
import ImageUpload from '../ImageUpload';

const AdminContentTab: React.FC = () => {
    const { content, updateContent, loading } = useContent();
    const { t } = useLanguage();
    const [selectedPage, setSelectedPage] = useState<string>('home');
    const [editingContent, setEditingContent] = useState<Record<string, string>>({});
    const [isSaving, setIsSaving] = useState(false);

    // Group content by page and section
    const groupedContent = useMemo(() => {
        const grouped: Record<string, Record<string, PageContent[]>> = {};
        content.forEach(item => {
            if (!grouped[item.page_key]) grouped[item.page_key] = {};
            if (!grouped[item.page_key][item.section_key]) grouped[item.page_key][item.section_key] = [];
            grouped[item.page_key][item.section_key].push(item);
        });
        return grouped;
    }, [content]);

    const handleContentChange = (id: string, field: 'content_value' | 'content_value_tr', value: string) => {
        setEditingContent(prev => ({ ...prev, [`${id}-${field}`]: value }));
    };

    const handleSave = async (item: PageContent) => {
        setIsSaving(true);
        try {
            const newValue = editingContent[`${item.id}-content_value`] ?? item.content_value;
            const newValueTr = editingContent[`${item.id}-content_value_tr`] ?? item.content_value_tr;

            await updateContent({
                ...item,
                content_value: newValue,
                content_value_tr: newValueTr
            });

            // Clear local edit state for this item
            setEditingContent(prev => {
                const newState = { ...prev };
                delete newState[`${item.id}-content_value`];
                delete newState[`${item.id}-content_value_tr`];
                return newState;
            });
        } catch (error) {
            console.error('Failed to save content', error);
        } finally {
            setIsSaving(false);
        }
    };

    if (loading) return <div className="p-8 text-center"><SpinnerIcon className="w-8 h-8 mx-auto text-brand-primary animate-spin" /></div>;

    const pageContent = groupedContent[selectedPage] || {};

    return (
        <div className="space-y-8">
            <div className="flex space-x-4 border-b border-gray-200 dark:border-gray-700 pb-4">
                {Object.keys(groupedContent).map(page => (
                    <button
                        key={page}
                        onClick={() => setSelectedPage(page)}
                        className={`px-4 py-2 rounded-md capitalize ${selectedPage === page ? 'bg-brand-primary text-white' : 'bg-gray-100 dark:bg-brand-surface text-gray-700 dark:text-brand-text-light hover:bg-gray-200 dark:hover:bg-gray-700'}`}
                    >
                        {page}
                    </button>
                ))}
            </div>

            {Object.entries(pageContent).map(([sectionKey, items]: [string, PageContent[]]) => (
                <section key={sectionKey} className="glass-premium p-6 rounded-lg shadow-sm border border-white/10">
                    <h3 className="text-xl font-bold mb-4 capitalize text-white border-b border-white/10 pb-2">{sectionKey} Section</h3>
                    <div className="space-y-6">
                        {items.map(item => (
                            <div key={item.id} className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 hover:bg-white/5 rounded-lg border border-white/5 transition-colors">
                                <div className="md:col-span-2 flex justify-between items-center mb-2">
                                    <span className="text-sm font-semibold text-brand-text-muted uppercase tracking-wider">{item.content_key}</span>
                                    <button
                                        onClick={() => handleSave(item)}
                                        disabled={isSaving || (!editingContent[`${item.id}-content_value`] && !editingContent[`${item.id}-content_value_tr`])}
                                        className="text-sm bg-brand-secondary text-brand-bg px-3 py-1 rounded hover:bg-opacity-80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                                    >
                                        {isSaving ? 'Saving...' : 'Save Changes'}
                                    </button>
                                </div>

                                <div>
                                    <label className="block text-xs text-brand-text-muted mb-1">English</label>
                                    <div className="text-xs text-white/50 mb-1 truncate" title={item.content_value}>
                                        Current: {item.content_value}
                                    </div>
                                    {item.content_type === 'image' ? (
                                        <div className="space-y-2">
                                            <ImageUpload
                                                value={editingContent[`${item.id}-content_value`] ?? item.content_value}
                                                onChange={(base64) => handleContentChange(item.id, 'content_value', base64)}
                                                placeholder="Upload Content Image"
                                            />
                                            <div className="mt-1">
                                                <p className="text-xs text-brand-text-muted mb-1">Or enter URL:</p>
                                                <input
                                                    type="text"
                                                    value={editingContent[`${item.id}-content_value`] ?? item.content_value}
                                                    onChange={(e) => handleContentChange(item.id, 'content_value', e.target.value)}
                                                    className="w-full bg-white/5 rounded border border-white/10 p-2 text-sm text-white focus:ring-1 focus:ring-brand-primary outline-none"
                                                    placeholder="https://..."
                                                />
                                            </div>
                                        </div>
                                    ) : (
                                        <textarea
                                            value={editingContent[`${item.id}-content_value`] ?? item.content_value}
                                            onChange={(e) => handleContentChange(item.id, 'content_value', e.target.value)}
                                            className="w-full bg-white/5 rounded border border-white/10 p-2 text-sm h-24 text-white focus:ring-1 focus:ring-brand-primary outline-none"
                                        />
                                    )}
                                </div>

                                <div>
                                    <label className="block text-xs text-brand-text-muted mb-1">Turkish</label>
                                    <div className="text-xs text-white/50 mb-1 truncate" title={item.content_value_tr || ''}>
                                        Current: {item.content_value_tr || '-'}
                                    </div>
                                    {item.content_type === 'image' ? (
                                        <p className="text-sm text-white/40 italic">Images are shared across languages currently.</p>
                                    ) : (
                                        <textarea
                                            value={editingContent[`${item.id}-content_value_tr`] ?? (item.content_value_tr || '')}
                                            onChange={(e) => handleContentChange(item.id, 'content_value_tr', e.target.value)}
                                            className="w-full bg-white/5 rounded border border-white/10 p-2 text-sm h-24 text-white focus:ring-1 focus:ring-brand-primary outline-none"
                                            placeholder="Add Turkish translation..."
                                        />
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            ))}

            {Object.keys(pageContent).length === 0 && (
                <div className="text-center py-12 text-gray-500 dark:text-brand-text-muted">
                    No editable content found for this page.
                </div>
            )}
        </div>
    );
};

export default AdminContentTab;

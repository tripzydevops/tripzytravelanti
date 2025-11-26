import React, { createContext, useState, useContext, ReactNode, useCallback, useEffect } from 'react';
import { PageContent } from '../types';
import { supabase } from '../lib/supabaseClient';

interface ContentContextType {
    content: PageContent[];
    loading: boolean;
    getContent: (pageKey: string, sectionKey: string, contentKey: string) => PageContent | undefined;
    updateContent: (content: PageContent) => Promise<void>;
    refreshContent: () => Promise<void>;
}

const ContentContext = createContext<ContentContextType | undefined>(undefined);

export const ContentProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [content, setContent] = useState<PageContent[]>([]);
    const [loading, setLoading] = useState(true);

    const loadContent = useCallback(async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('page_content')
                .select('*');

            if (error) throw error;
            setContent(data || []);
        } catch (error) {
            console.error('Error loading page content:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadContent();
    }, [loadContent]);

    const refreshContent = useCallback(async () => {
        await loadContent();
    }, [loadContent]);

    const getContent = useCallback((pageKey: string, sectionKey: string, contentKey: string) => {
        return content.find(c => c.page_key === pageKey && c.section_key === sectionKey && c.content_key === contentKey);
    }, [content]);

    const updateContent = useCallback(async (updatedContent: PageContent) => {
        try {
            // Check if content exists
            const existing = content.find(c =>
                c.page_key === updatedContent.page_key &&
                c.section_key === updatedContent.section_key &&
                c.content_key === updatedContent.content_key
            );

            let error;
            if (existing) {
                const { error: updateError } = await supabase
                    .from('page_content')
                    .update({
                        content_value: updatedContent.content_value,
                        content_value_tr: updatedContent.content_value_tr,
                        content_type: updatedContent.content_type
                    })
                    .eq('id', existing.id);
                error = updateError;
            } else {
                const { error: insertError } = await supabase
                    .from('page_content')
                    .insert({
                        page_key: updatedContent.page_key,
                        section_key: updatedContent.section_key,
                        content_key: updatedContent.content_key,
                        content_value: updatedContent.content_value,
                        content_value_tr: updatedContent.content_value_tr,
                        content_type: updatedContent.content_type
                    });
                error = insertError;
            }

            if (error) throw error;
            await refreshContent();
        } catch (error) {
            console.error('Error updating content:', error);
            throw error;
        }
    }, [content, refreshContent]);

    return (
        <ContentContext.Provider value={{ content, loading, getContent, updateContent, refreshContent }}>
            {children}
        </ContentContext.Provider>
    );
};

export const useContent = (): ContentContextType => {
    const context = useContext(ContentContext);
    if (!context) {
        throw new Error('useContent must be used within a ContentProvider');
    }
    return context;
};

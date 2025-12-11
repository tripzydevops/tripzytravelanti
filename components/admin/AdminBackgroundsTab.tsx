import React, { useState, useEffect } from 'react';
import { getBackgroundImages, addBackgroundImage, deleteBackgroundImage, uploadBackgroundImage, updateBackgroundImage, BackgroundImage } from '../../lib/supabaseService';
import { TrashIcon, UploadIcon, PlusIcon, SpinnerIcon } from '../Icons';
import { useLanguage } from '../../contexts/LanguageContext';

const AdminBackgroundsTab: React.FC = () => {
    const { t } = useLanguage();
    const [images, setImages] = useState<BackgroundImage[]>([]);
    const [loading, setLoading] = useState(true);

    // Method 1: URL Input
    const [newImageUrl, setNewImageUrl] = useState('');

    // Method 2: File Upload
    const [uploadFile, setUploadFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);

    // Common
    const [newImageTimeOfDay, setNewImageTimeOfDay] = useState('morning');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    useEffect(() => {
        fetchImages();
    }, []);

    const fetchImages = async () => {
        setLoading(true);
        const data = await getBackgroundImages(); // Fetch all active images
        // Sort by time of day for better grouping
        const order = { morning: 1, afternoon: 2, evening: 3, night: 4 };
        const sorted = data.sort((a, b) => (order[a.time_of_day as keyof typeof order] || 0) - (order[b.time_of_day as keyof typeof order] || 0));
        setImages(sorted);
        setLoading(false);
    };

    const handleUrlAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newImageUrl) return;

        try {
            setLoading(true);
            await addBackgroundImage(newImageUrl, newImageTimeOfDay);
            setNewImageUrl('');
            setSuccess('Image added successfully!');
            fetchImages();
        } catch (err) {
            setError('Failed to add image.');
        } finally {
            setLoading(false);
        }
    };

    const handleFileUpload = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!uploadFile) return;

        try {
            setIsUploading(true);
            const publicUrl = await uploadBackgroundImage(uploadFile);
            await addBackgroundImage(publicUrl, newImageTimeOfDay);

            setUploadFile(null);
            // Reset file input manually if needed, or by key
            setSuccess('Image uploaded and added successfully!');
            fetchImages();
        } catch (err) {
            console.error(err);
            setError('Failed to upload image. Make sure the storage bucket exists.');
        } finally {
            setIsUploading(false);
        }
    };

    const handleDelete = async (id: string, url: string) => {
        if (!window.confirm(t('confirmDelete') || 'Are you sure you want to delete this image?')) return;

        try {
            await deleteBackgroundImage(id, url);
            setImages(prev => prev.filter(img => img.id !== id));
            setSuccess('Image deleted.');
        } catch (err) {
            setError('Failed to delete image.');
        }
    };

    const [editingId, setEditingId] = useState<string | null>(null);
    const [editTimeOfDay, setEditTimeOfDay] = useState('');

    const handleUpdate = async (id: string) => {
        try {
            await updateBackgroundImage(id, editTimeOfDay);
            setImages(prev => prev.map(img => img.id === id ? { ...img, time_of_day: editTimeOfDay } : img));
            setSuccess('Image updated successfully!');
            setEditingId(null);
        } catch (err) {
            setError('Failed to update image.');
        }
    };

    const startEditing = (img: BackgroundImage) => {
        setEditingId(img.id);
        setEditTimeOfDay(img.time_of_day);
    };

    const cancelEditing = () => {
        setEditingId(null);
        setEditTimeOfDay('');
    };

    const times = ['morning', 'afternoon', 'evening', 'night'];

    return (
        <div className="space-y-8 animate-fade-in">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
                <h2 className="text-xl font-bold mb-6 text-gray-900 dark:text-white flex items-center gap-2">
                    <span>🖼️</span> Manage Background Images
                </h2>

                {error && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg">{error}</div>}
                {success && <div className="mb-4 p-3 bg-green-100 text-green-700 rounded-lg">{success}</div>}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Upload Form */}
                    <div className="bg-gray-50 dark:bg-gray-700/50 p-6 rounded-xl border border-gray-200 dark:border-gray-600">
                        <h3 className="font-bold text-lg mb-4 text-gray-800 dark:text-gray-200">Upload New Image</h3>
                        <form onSubmit={handleFileUpload} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Select File</label>
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                                    className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-brand-primary/10 file:text-brand-primary hover:file:bg-brand-primary/20"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Time of Day</label>
                                <select
                                    value={newImageTimeOfDay}
                                    onChange={(e) => setNewImageTimeOfDay(e.target.value)}
                                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 focus:ring-2 focus:ring-brand-primary"
                                >
                                    {times.map(t => (
                                        <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                                    ))}
                                </select>
                            </div>

                            <button
                                type="submit"
                                disabled={!uploadFile || isUploading}
                                className="w-full py-2 bg-brand-primary hover:bg-brand-primary-dark text-white rounded-lg font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {isUploading ? <SpinnerIcon className="animate-spin w-5 h-5" /> : <UploadIcon className="w-5 h-5" />}
                                Upload & Add
                            </button>
                        </form>
                    </div>

                    {/* URL Input Form */}
                    <div className="bg-gray-50 dark:bg-gray-700/50 p-6 rounded-xl border border-gray-200 dark:border-gray-600">
                        <h3 className="font-bold text-lg mb-4 text-gray-800 dark:text-gray-200">Add by URL</h3>
                        <form onSubmit={handleUrlAdd} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Image URL</label>
                                <input
                                    type="text"
                                    placeholder="https://images.unsplash.com/..."
                                    value={newImageUrl}
                                    onChange={(e) => setNewImageUrl(e.target.value)}
                                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 focus:ring-2 focus:ring-brand-primary"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Time of Day</label>
                                <select
                                    value={newImageTimeOfDay}
                                    onChange={(e) => setNewImageTimeOfDay(e.target.value)}
                                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 focus:ring-2 focus:ring-brand-primary"
                                >
                                    {times.map(t => (
                                        <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                                    ))}
                                </select>
                            </div>

                            <button
                                type="submit"
                                disabled={!newImageUrl || loading}
                                className="w-full py-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                <PlusIcon className="w-5 h-5" />
                                Add from URL
                            </button>
                        </form>
                    </div>
                </div>
            </div>

            {/* Image Grid */}
            <h3 className="text-xl font-bold mt-8 mb-4 text-gray-900 dark:text-white">Active Backgrounds</h3>
            {loading ? (
                <div className="flex justify-center p-12">
                    <SpinnerIcon className="w-10 h-10 text-brand-primary animate-spin" />
                </div>
            ) : images.length === 0 ? (
                <p className="text-gray-500 italic">No background images found.</p>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {images.map((img) => (
                        <div key={img.id} className="group relative aspect-video rounded-xl overflow-hidden shadow-md border border-gray-200 dark:border-gray-700 bg-gray-100">
                            <img
                                src={img.url}
                                alt={img.time_of_day}
                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4">
                                {editingId === img.id ? (
                                    <div className="flex items-center gap-2 bg-white/90 p-2 rounded-lg w-full">
                                        <select
                                            value={editTimeOfDay}
                                            onChange={(e) => setEditTimeOfDay(e.target.value)}
                                            className="flex-1 text-xs py-1 px-2 rounded border border-gray-300 text-gray-900"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            {times.map(t => (
                                                <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                                            ))}
                                        </select>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleUpdate(img.id);
                                            }}
                                            className="p-1 bg-green-500 hover:bg-green-600 text-white rounded shadow"
                                            title="Save"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                cancelEditing();
                                            }}
                                            className="p-1 bg-gray-500 hover:bg-gray-600 text-white rounded shadow"
                                            title="Cancel"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                        </button>
                                    </div>
                                ) : (
                                    <div className="flex justify-between items-end w-full">
                                        <span className={`px-2 py-1 rounded-md text-xs font-bold uppercase ${img.time_of_day === 'morning' ? 'bg-yellow-400 text-yellow-900' :
                                            img.time_of_day === 'afternoon' ? 'bg-orange-400 text-orange-900' :
                                                img.time_of_day === 'evening' ? 'bg-purple-400 text-white' :
                                                    'bg-blue-900 text-white'
                                            }`}>
                                            {img.time_of_day}
                                        </span>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    startEditing(img);
                                                }}
                                                className="p-2 bg-blue-500 hover:bg-blue-600 text-white rounded-full shadow-lg transition-transform hover:scale-110"
                                                title="Edit Time of Day"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                            </button>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDelete(img.id, img.url);
                                                }}
                                                className="p-2 bg-red-500 hover:bg-red-600 text-white rounded-full shadow-lg transition-transform hover:scale-110"
                                                title="Delete Image"
                                            >
                                                <TrashIcon className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default AdminBackgroundsTab;

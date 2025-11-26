import React, { useState, useRef } from 'react';
import { SpinnerIcon, TrashIcon } from './Icons';
import { supabase } from '../lib/supabaseClient';

interface ImageUploadProps {
    value?: string;
    onChange: (url: string) => void;
    placeholder?: string;
    className?: string;
    bucketName?: string;
}

const ImageUpload: React.FC<ImageUploadProps> = ({
    value,
    onChange,
    placeholder = "Upload Image",
    className = "",
    bucketName = "deals"
}) => {
    const [isDragging, setIsDragging] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFile = async (file: File) => {
        if (!file.type.startsWith('image/')) {
            alert('Please upload an image file');
            return;
        }

        // 5MB limit
        if (file.size > 5 * 1024 * 1024) {
            alert('File size must be less than 5MB');
            return;
        }

        setIsLoading(true);

        try {
            // Generate a unique file name
            const fileExt = file.name.split('.').pop();
            const fileName = `${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;
            const filePath = `${fileName}`;

            // Upload to Supabase
            const { error: uploadError } = await supabase.storage
                .from(bucketName)
                .upload(filePath, file);

            if (uploadError) {
                throw uploadError;
            }

            // Get Public URL
            const { data } = supabase.storage
                .from(bucketName)
                .getPublicUrl(filePath);

            if (data) {
                onChange(data.publicUrl);
            }
        } catch (error: any) {
            console.error('Error uploading image:', error);
            alert(error.message || 'Failed to upload image');
        } finally {
            setIsLoading(false);
        }
    };

    const onDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const onDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const onDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFile(e.dataTransfer.files[0]);
        }
    };

    const handleClick = () => {
        fileInputRef.current?.click();
    };

    const handleRemove = (e: React.MouseEvent) => {
        e.stopPropagation();
        onChange('');
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    return (
        <div className={`w-full ${className}`}>
            <div
                onClick={handleClick}
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onDrop={onDrop}
                className={`
                    relative border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-all duration-200
                    ${isDragging ? 'border-brand-primary bg-brand-primary/5' : 'border-gray-300 dark:border-gray-600 hover:border-brand-primary'}
                    ${value ? 'h-auto' : 'h-32 flex items-center justify-center'}
                `}
            >
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                    accept="image/*"
                    className="hidden"
                />

                {isLoading ? (
                    <div className="flex flex-col items-center justify-center text-brand-text-muted">
                        <SpinnerIcon className="w-8 h-8 animate-spin mb-2 text-brand-primary" />
                        <span>Uploading...</span>
                    </div>
                ) : value ? (
                    <div className="relative group">
                        <img
                            src={value}
                            alt="Uploaded preview"
                            className="max-h-64 mx-auto rounded-md shadow-sm object-contain"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-md flex items-center justify-center">
                            <p className="text-white font-semibold">Click to change</p>
                        </div>
                        <button
                            onClick={handleRemove}
                            className="absolute -top-2 -right-2 bg-red-500 text-white p-1.5 rounded-full shadow-md hover:bg-red-600 transition-colors z-10"
                            title="Remove image"
                        >
                            <TrashIcon className="w-4 h-4" />
                        </button>
                    </div>
                ) : (
                    <div className="text-gray-500 dark:text-brand-text-muted">
                        <p className="font-medium mb-1">{placeholder}</p>
                        <p className="text-xs">Drag & drop or click to upload</p>
                        <p className="text-xs mt-2 opacity-70">Max 5MB</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ImageUpload;

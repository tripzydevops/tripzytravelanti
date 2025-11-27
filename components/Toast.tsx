import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, InformationCircleIcon } from './Icons';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastProps {
    id: string;
    message: string;
    type: ToastType;
    onClose: (id: string) => void;
    duration?: number;
}

const Toast: React.FC<ToastProps> = ({ id, message, type, onClose, duration = 5000 }) => {
    useEffect(() => {
        const timer = setTimeout(() => {
            onClose(id);
        }, duration);

        return () => clearTimeout(timer);
    }, [id, duration, onClose]);

    const variants = {
        initial: { opacity: 0, y: 50, scale: 0.3 },
        animate: { opacity: 1, y: 0, scale: 1 },
        exit: { opacity: 0, scale: 0.5, transition: { duration: 0.2 } }
    };

    const icons = {
        success: <CheckCircle className="w-6 h-6 text-green-500" />,
        error: <XCircle className="w-6 h-6 text-red-500" />,
        info: <InformationCircleIcon className="w-6 h-6 text-blue-500" />
    };

    const bgColors = {
        success: 'bg-white dark:bg-brand-surface border-l-4 border-green-500',
        error: 'bg-white dark:bg-brand-surface border-l-4 border-red-500',
        info: 'bg-white dark:bg-brand-surface border-l-4 border-blue-500'
    };

    return (
        <motion.div
            layout
            initial="initial"
            animate="animate"
            exit="exit"
            variants={variants}
            className={`flex items-center w-full max-w-sm p-4 mb-4 text-gray-500 shadow-lg rounded-lg dark:text-gray-400 ${bgColors[type]} border border-gray-100 dark:border-gray-700`}
            role="alert"
        >
            <div className="inline-flex items-center justify-center flex-shrink-0 w-8 h-8">
                {icons[type]}
            </div>
            <div className="ml-3 text-sm font-normal text-gray-900 dark:text-white">{message}</div>
            <button
                type="button"
                className="ml-auto -mx-1.5 -my-1.5 bg-transparent text-gray-400 hover:text-gray-900 rounded-lg focus:ring-2 focus:ring-gray-300 p-1.5 hover:bg-gray-100 inline-flex h-8 w-8 dark:text-gray-500 dark:hover:text-white dark:bg-transparent dark:hover:bg-gray-700"
                onClick={() => onClose(id)}
                aria-label="Close"
            >
                <span className="sr-only">Close</span>
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L10 8.586 5.707 4.293a1 1 0 010-1.414z" clipRule="evenodd"></path>
                </svg>
            </button>
        </motion.div>
    );
};

export default Toast;

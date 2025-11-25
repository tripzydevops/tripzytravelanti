import React, { useState } from 'react';
import Modal from './Modal';
import { useLanguage } from '../contexts/LanguageContext';

interface DeleteAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

const DeleteAccountModal: React.FC<DeleteAccountModalProps> = ({ isOpen, onClose, onConfirm }) => {
  const { t, language } = useLanguage();
  const [confirmationText, setConfirmationText] = useState('');
  
  const confirmationString = language === 'tr' ? 'SİL' : 'DELETE';

  const handleConfirm = () => {
    if (confirmationText === confirmationString) {
      onConfirm();
      onClose();
    }
  };
  
  const handleClose = () => {
      setConfirmationText('');
      onClose();
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={t('deleteAccountTitle')}>
      <div className="space-y-4">
        <p className="text-gray-600 dark:text-brand-text-muted">{t('deleteAccountWarning')}</p>
        <div>
          <label className="block text-sm font-medium text-gray-600 dark:text-brand-text-muted mb-1">{t('deleteAccountConfirmationPrompt')}</label>
          <input 
            type="text"
            value={confirmationText}
            onChange={e => setConfirmationText(e.target.value)}
            className="w-full py-2 px-3 bg-gray-100 dark:bg-brand-bg border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-brand-text-light focus:outline-none focus:ring-2 focus:ring-red-500"
          />
        </div>
        <div className="flex justify-end gap-4 pt-4">
          <button onClick={handleClose} className="bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-white font-semibold py-2 px-4 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors">{t('cancel')}</button>
          <button 
            onClick={handleConfirm}
            disabled={confirmationText !== confirmationString}
            className="bg-red-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-red-700 transition-colors disabled:bg-red-400 dark:disabled:bg-red-800 disabled:cursor-not-allowed"
          >
            {t('confirmDeletion')}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default DeleteAccountModal;
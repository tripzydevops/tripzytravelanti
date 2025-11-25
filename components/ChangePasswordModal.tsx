import React, { useState } from 'react';
import Modal from './Modal';
import { useLanguage } from '../contexts/LanguageContext';

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
}

const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({ isOpen, onClose, onSave }) => {
  const { t } = useLanguage();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');

  const handleSave = () => {
    if (newPassword !== confirmPassword) {
      setError(t('passwordMismatchError'));
      return;
    }
    // In a real app, you would make an API call here.
    // For this demo, we'll just simulate success.
    setError('');
    onSave();
    onClose();
  };

  const handleClose = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setError('');
    onClose();
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={t('changePasswordTitle')}>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-600 dark:text-brand-text-muted mb-1">{t('currentPasswordLabel')}</label>
          <input 
            type="password"
            value={currentPassword}
            onChange={e => setCurrentPassword(e.target.value)}
            className="w-full py-2 px-3 bg-gray-100 dark:bg-brand-bg border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-brand-text-light focus:outline-none focus:ring-2 focus:ring-brand-primary"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-600 dark:text-brand-text-muted mb-1">{t('newPasswordLabel')}</label>
          <input 
            type="password"
            value={newPassword}
            onChange={e => setNewPassword(e.target.value)}
            className="w-full py-2 px-3 bg-gray-100 dark:bg-brand-bg border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-brand-text-light focus:outline-none focus:ring-2 focus:ring-brand-primary"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-600 dark:text-brand-text-muted mb-1">{t('confirmNewPasswordLabel')}</label>
          <input 
            type="password"
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            className="w-full py-2 px-3 bg-gray-100 dark:bg-brand-bg border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-brand-text-light focus:outline-none focus:ring-2 focus:ring-brand-primary"
          />
        </div>
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <div className="flex justify-end gap-4 pt-4">
          <button onClick={handleClose} className="bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-white font-semibold py-2 px-4 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors">{t('cancel')}</button>
          <button onClick={handleSave} className="bg-brand-primary text-white font-semibold py-2 px-4 rounded-lg hover:bg-opacity-80 transition-colors">{t('saveChanges')}</button>
        </div>
      </div>
    </Modal>
  );
};

export default ChangePasswordModal;
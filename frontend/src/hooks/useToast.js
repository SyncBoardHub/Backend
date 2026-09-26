import { useContext } from 'react';
import { ToastContext } from '../context/toastContext';

export function useToast() {
  const value = useContext(ToastContext);
  if (!value) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  const { showToast, dismissToast } = value;
  return { showToast, dismissToast };
}

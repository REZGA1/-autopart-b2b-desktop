import React from 'react';
import { CheckCircle, AlertCircle, X } from 'lucide-react';

/**
 * Reusable Toast Notification component
 */
const ToastNotification = ({ toast, onClose }) => {
  if (!toast) return null;

  return (
    <div className={`fixed top-4 right-4 z-[100] px-4 py-3 rounded-lg shadow-lg text-white transition-all transform animate-in fade-in slide-in-from-right-4 ${
      toast.type === 'error' ? 'bg-red-500' : 'bg-green-500'
    }`}>
      <div className="flex items-center gap-3">
        {toast.type === 'error' ? (
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
        ) : (
          <CheckCircle className="h-5 w-5 flex-shrink-0" />
        )}
        <span className="font-medium">{toast.message}</span>
        {onClose && (
          <button 
            onClick={onClose}
            className="ml-2 p-1 hover:bg-white/20 rounded transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
};

export default ToastNotification;

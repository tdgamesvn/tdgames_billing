import React from 'react';

interface ToastNotificationProps {
  message: { text: string; type: 'success' | 'warning' | 'error' } | null;
  onDismiss: () => void;
}

export const ToastNotification: React.FC<ToastNotificationProps> = ({ message, onDismiss }) => {
  if (!message) return null;
  return (
    <div className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] px-6 py-4 rounded-2xl shadow-2xl animate-fadeInUp flex items-center gap-3 border ${message.type === 'success' ? 'bg-status-success text-white border-white/20' :
      message.type === 'warning' ? 'bg-status-warning text-black border-black/10' :
        'bg-status-error text-white border-white/20'
      }`}>
      <span className="font-bold uppercase text-[10px] tracking-widest">{message.text}</span>
      <button onClick={onDismiss} className="opacity-60 hover:opacity-100 font-bold">✕</button>
    </div>
  );
};

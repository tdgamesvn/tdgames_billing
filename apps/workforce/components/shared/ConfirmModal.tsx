import React, { useState, useCallback } from 'react';

export interface ConfirmModalState {
  message: string;
  subMessage?: string;
  onConfirm: () => void;
}

/** Hook to manage confirm modal state */
export function useConfirmModal() {
  const [modal, setModal] = useState<ConfirmModalState | null>(null);

  const confirm = useCallback((message: string, onConfirm: () => void, subMessage?: string) => {
    setModal({ message, subMessage, onConfirm });
  }, []);

  const close = useCallback(() => setModal(null), []);

  return { modal, confirm, close };
}

/** Reusable confirmation dialog */
export const ConfirmModal: React.FC<{
  message: string;
  subMessage?: string;
  onConfirm: () => void;
  onCancel: () => void;
}> = ({ message, subMessage, onConfirm, onCancel }) => (
  <div className="fixed inset-0 z-[9999] flex items-center justify-center" onClick={onCancel}>
    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
    <div
      className="relative z-10 rounded-[20px] border border-red-500/30 bg-[#1a1a1a] p-8 max-w-sm w-full mx-4 shadow-2xl"
      onClick={e => e.stopPropagation()}
      style={{ animation: 'fadeInUp 0.2s ease-out' }}
    >
      <div className="flex flex-col items-center text-center gap-4">
        <div className="w-14 h-14 rounded-full bg-red-500/10 flex items-center justify-center">
          <svg className="w-7 h-7 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <p className="text-white font-bold text-base">{message}</p>
        {subMessage && <p className="text-neutral-medium text-sm -mt-2">{subMessage}</p>}
        <div className="flex gap-3 w-full mt-2">
          <button
            onClick={onCancel}
            className="flex-1 py-3 rounded-xl border border-primary/20 text-neutral-medium font-black text-xs uppercase tracking-widest hover:text-white hover:border-primary/40 transition-all"
          >Hủy</button>
          <button
            onClick={onConfirm}
            className="flex-1 py-3 rounded-xl bg-red-500 text-white font-black text-xs uppercase tracking-widest hover:bg-red-600 transition-all"
          >Xác nhận</button>
        </div>
      </div>
    </div>
  </div>
);

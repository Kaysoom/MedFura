import React from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';

export interface ConfirmationDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  itemName?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
  isOpen,
  title,
  message,
  itemName,
  confirmLabel = 'تأكيد الحذف النهائي',
  cancelLabel = 'إلغاء التراجع',
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onCancel}
    >
      <div
        className="relative w-full max-w-md bg-[#111A2E] border border-rose-500/40 rounded-3xl p-6 text-right text-white shadow-2xl space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <button
            type="button"
            onClick={onCancel}
            aria-label="إغلاق نافذة التأكيد"
            className="p-1.5 rounded-xl bg-slate-800/80 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2 text-rose-400">
            <h3 id="confirm-dialog-title" className="font-black text-base text-white">
              {title}
            </h3>
            <div className="w-9 h-9 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
        </div>

        <div className="space-y-2 py-1">
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">{message}</p>
          {itemName && (
            <div className="p-3 rounded-2xl bg-rose-950/30 border border-rose-500/30 text-xs font-bold text-rose-200">
              العنصر المحدد: « {itemName} »
            </div>
          )}
          <p className="text-[11px] text-slate-400">
            لا يمكن التراجع عن هذا الإجراء بعد التأكيد.
          </p>
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-800">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-colors cursor-pointer"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm();
              onCancel();
            }}
            className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black flex items-center gap-1.5 shadow-lg shadow-rose-600/25 transition-all cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
            <span>{confirmLabel}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

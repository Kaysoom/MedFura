import React, { useState, useRef, useEffect } from 'react';
import {
  Heart,
  Download,
  Share2,
  Send,
  MoreVertical,
  X,
  ArrowDown,
  Play,
  ExternalLink,
  Trash2,
  Edit3,
} from 'lucide-react';

interface MediaIconWithProgressProps {
  type: 'pdf' | 'video';
  formatLabel?: string;
  isDownloaded: boolean;
  isDownloading: boolean;
  progressPercent: number;
  accentColor?: string;
  onStartOrOpen: (e: React.MouseEvent) => void;
  onCancelDownload: (e: React.MouseEvent) => void;
}

/**
 * Renders the right-side File/Video icon box matching Pages 2, 4, and 5 of the reference screenshots:
 * - While downloading (Page 4): Circular progress ring with an '✕' cancel button in the center.
 * - Before download (Page 2): Red PDF icon (or Video Play icon) with a small green '↓' badge at bottom-left.
 * - After download (Page 5): Clean PDF/Video icon without the '↓' badge.
 */
export const MediaIconWithCircularProgress: React.FC<MediaIconWithProgressProps> = ({
  type,
  formatLabel = 'PDF',
  isDownloaded,
  isDownloading,
  progressPercent,
  onStartOrOpen,
  onCancelDownload,
}) => {
  const radius = 17;
  const circumference = 2 * Math.PI * radius;
  const clampedPct = Math.max(8, Math.min(100, progressPercent || 15));
  const strokeDashoffset = circumference - (clampedPct / 100) * circumference;

  if (isDownloading) {
    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onCancelDownload(e);
        }}
        title="إلغاء التحميل"
        aria-label="إلغاء التحميل"
        className="relative w-12 h-12 rounded-2xl bg-[#1E1B2E] border border-rose-500/30 flex items-center justify-center shrink-0 cursor-pointer group"
      >
        <svg className="w-10 h-10 -rotate-90" viewBox="0 0 44 44">
          <circle
            cx="22"
            cy="22"
            r={radius}
            fill="none"
            stroke="rgba(244, 63, 94, 0.22)"
            strokeWidth="3"
          />
          <circle
            cx="22"
            cy="22"
            r={radius}
            fill="none"
            stroke="#F8FAFC"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-200"
          />
        </svg>
        <X className="w-4 h-4 text-white absolute group-hover:text-rose-400 transition-colors" />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onStartOrOpen(e);
      }}
      title={isDownloaded ? 'فتح مباشر' : 'تحميل الملف'}
      aria-label={isDownloaded ? 'فتح مباشر' : 'تحميل الملف'}
      className={`relative w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 cursor-pointer transition-transform active:scale-95 ${
        type === 'pdf'
          ? 'bg-rose-500/15 border border-rose-500/25 text-rose-500'
          : 'bg-emerald-500/15 border border-emerald-500/25 text-emerald-400'
      }`}
    >
      {type === 'pdf' ? (
        <div className="w-7 h-7 rounded-md border-2 border-rose-500 flex items-center justify-center">
          <span className="text-[8px] font-black tracking-tighter text-rose-500 leading-none">
            {formatLabel.slice(0, 4)}
          </span>
        </div>
      ) : (
        <div className="w-7 h-7 rounded-full bg-emerald-500/20 flex items-center justify-center">
          <Play className="w-3.5 h-3.5 fill-current text-emerald-400" />
        </div>
      )}

      {/* Small green download badge at bottom-left when NOT downloaded yet (matching Page 2) */}
      {!isDownloaded && (
        <span className="absolute -bottom-1 -left-1 w-5 h-5 rounded-full bg-[#0E1726] border border-emerald-500/50 text-emerald-400 flex items-center justify-center shadow-md">
          <ArrowDown className="w-3 h-3 stroke-[2.6]" />
        </span>
      )}
    </button>
  );
};

interface MediaThreeDotsMenuProps {
  title: string;
  isFavorite: boolean;
  isDownloaded: boolean;
  isAdmin?: boolean;
  onToggleFavorite: () => void;
  onDownloadOffline: () => void;
  onShare: () => void;
  onSendTelegram: () => void;
  onOpenExternal?: () => void;
  externalLabel?: string;
  onOpenInApp?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

/**
 * Renders the 3-dots ('⋮') floating context menu matching Page 3 of the reference PDF:
 * - إضافة للمفضلة ❤️
 * - تحميل أوفلاين ⬇️
 * - مشاركة 🔗
 * - إرسال لتلجرام ✈️
 */
export const MediaThreeDotsMenu: React.FC<MediaThreeDotsMenuProps> = ({
  isFavorite,
  isDownloaded,
  isAdmin,
  onToggleFavorite,
  onDownloadOffline,
  onShare,
  onSendTelegram,
  onOpenExternal,
  externalLabel,
  onOpenInApp,
  onEdit,
  onDelete,
}) => {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const handleOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [open]);

  return (
    <div ref={menuRef} className="relative shrink-0" onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-label="خيارات الملف"
        className="w-9 h-9 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/70 flex items-center justify-center transition-colors cursor-pointer"
      >
        <MoreVertical className="w-5 h-5" />
      </button>

      {open && (
        <div className="absolute left-0 top-10 z-50 w-52 rounded-2xl bg-[#1A2436] border border-slate-700/90 shadow-2xl py-2 px-1.5 space-y-1 text-right animate-in fade-in zoom-in-95 duration-150">
          {/* 1. إضافة للمفضلة */}
          <button
            type="button"
            onClick={() => {
              onToggleFavorite();
              setOpen(false);
            }}
            className="w-full px-3 py-2.5 rounded-xl hover:bg-slate-800/80 flex items-center justify-end gap-3 text-xs font-bold text-white transition-colors cursor-pointer"
          >
            <span>{isFavorite ? 'إزالة من المفضلة' : 'إضافة للمفضلة'}</span>
            <Heart
              className={`w-4 h-4 ${
                isFavorite ? 'text-rose-500 fill-rose-500' : 'text-rose-500'
              }`}
            />
          </button>

          {/* 2. تحميل أوفلاين */}
          <button
            type="button"
            onClick={() => {
              onDownloadOffline();
              setOpen(false);
            }}
            className="w-full px-3 py-2.5 rounded-xl hover:bg-slate-800/80 flex items-center justify-end gap-3 text-xs font-bold text-white transition-colors cursor-pointer"
          >
            <span>{isDownloaded ? 'تنزيل نسخة للجهاز' : 'تحميل أوفلاين'}</span>
            <Download className="w-4 h-4 text-emerald-400" />
          </button>

          {/* 3. مشاركة */}
          <button
            type="button"
            onClick={() => {
              onShare();
              setOpen(false);
            }}
            className="w-full px-3 py-2.5 rounded-xl hover:bg-slate-800/80 flex items-center justify-end gap-3 text-xs font-bold text-sky-400 transition-colors cursor-pointer"
          >
            <span>مشاركة</span>
            <Share2 className="w-4 h-4 text-sky-400" />
          </button>

          {/* 4. إرسال لتلجرام */}
          <button
            type="button"
            onClick={() => {
              onSendTelegram();
              setOpen(false);
            }}
            className="w-full px-3 py-2.5 rounded-xl hover:bg-slate-800/80 flex items-center justify-end gap-3 text-xs font-bold text-white transition-colors cursor-pointer"
          >
            <span>إرسال لتلجرام</span>
            <div className="w-4 h-4 rounded-full bg-sky-500 flex items-center justify-center text-white">
              <Send className="w-2.5 h-2.5" />
            </div>
          </button>

          {/* 5. فتح كملف PDF خارجي / مشغل خارجي */}
          {onOpenExternal && (
            <button
              type="button"
              onClick={() => {
                onOpenExternal();
                setOpen(false);
              }}
              className="w-full px-3 py-2 rounded-xl hover:bg-slate-800/80 flex items-center justify-end gap-3 text-[11px] font-bold text-emerald-300 transition-colors cursor-pointer border-t border-slate-800 pt-2"
            >
              <span>{externalLabel || 'فتح بمشغل خارجي'}</span>
              <ExternalLink className="w-3.5 h-3.5 text-emerald-400" />
            </button>
          )}

          {/* Optional: معاينة داخل التطبيق */}
          {onOpenInApp && (
            <button
              type="button"
              onClick={() => {
                onOpenInApp();
                setOpen(false);
              }}
              className="w-full px-3 py-2 rounded-xl hover:bg-slate-800/80 flex items-center justify-end gap-3 text-[11px] font-bold text-slate-300 transition-colors cursor-pointer"
            >
              <span>معاينة داخل التطبيق</span>
              <Play className="w-3.5 h-3.5 text-sky-400" />
            </button>
          )}

          {/* Supervisor Edit / Delete controls */}
          {isAdmin && (onEdit || onDelete) && (
            <div className="border-t border-slate-800 pt-1 mt-1 space-y-1">
              {onEdit && (
                <button
                  type="button"
                  onClick={() => {
                    onEdit();
                    setOpen(false);
                  }}
                  className="w-full px-3 py-2 rounded-xl hover:bg-slate-800/80 flex items-center justify-end gap-3 text-[11px] font-bold text-amber-300 transition-colors cursor-pointer"
                >
                  <span>تعديل البيانات</span>
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
              )}
              {onDelete && (
                <button
                  type="button"
                  onClick={() => {
                    onDelete();
                    setOpen(false);
                  }}
                  className="w-full px-3 py-2 rounded-xl hover:bg-rose-950/50 flex items-center justify-end gap-3 text-[11px] font-bold text-rose-400 transition-colors cursor-pointer"
                >
                  <span>حذف نهائي</span>
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

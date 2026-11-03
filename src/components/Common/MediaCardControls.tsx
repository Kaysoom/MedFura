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
  Trash2,
  Edit3,
  Info,
  Check,
  FolderTree,
} from 'lucide-react';
import {
  EXTERNAL_FILE_APPS,
  EXTERNAL_VIDEO_APPS,
  ExternalAppOption,
  getDefaultExternalAppId,
  setDefaultExternalAppId,
} from '../../utils/downloadManagerLogic';

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
      title={isDownloaded ? 'فتح باستخدام تطبيق خارجي' : 'تحميل الملف'}
      aria-label={isDownloaded ? 'فتح باستخدام تطبيق خارجي' : 'تحميل الملف'}
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
  onEdit?: () => void;
  onDelete?: () => void;
}

/**
 * Renders the 3-dots ('⋮') floating context menu matching Page 3 of the reference PDF:
 * - إضافة للمفضلة ❤️
 * - تحميل أوفلاين ⬇️
 * - مشاركة 🔗
 * - إرسال لتلجرام ✈️
 * (Internal preview is completely removed per user instructions)
 */
export const MediaThreeDotsMenu: React.FC<MediaThreeDotsMenuProps> = ({
  isFavorite,
  isDownloaded,
  isAdmin,
  onToggleFavorite,
  onDownloadOffline,
  onShare,
  onSendTelegram,
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

export interface ExternalOpenWithTarget {
  id: string;
  mediaType: 'file' | 'video';
  title: string;
  fileName: string;
  virtualPath?: string;
  url?: string;
  mimeType?: string;
  subtitle?: string;
  authorOrDoctor?: string;
  pages?: number;
  duration?: string;
  format?: string;
}

interface ExternalOpenWithSheetProps {
  target: ExternalOpenWithTarget | null;
  onClose: () => void;
  onConfirmOpen: (
    target: ExternalOpenWithTarget,
    chosenApp: ExternalAppOption,
    mode: 'once' | 'always'
  ) => void;
}

/**
 * Renders the Android-style "فتح باستخدام" (Open With) bottom sheet matching Screenshot 1 / Page 1 of the PDF:
 * - Header: "فتح باستخدام" on the right + info icon 'ⓘ' on the left
 * - 4-column grid of external PDF reader or Video player apps
 * - Bottom action bar: "مرة واحدة فقط  |  دائمًا"
 */
export const ExternalOpenWithSheet: React.FC<ExternalOpenWithSheetProps> = ({
  target,
  onClose,
  onConfirmOpen,
}) => {
  const apps =
    target?.mediaType === 'video' ? EXTERNAL_VIDEO_APPS : EXTERNAL_FILE_APPS;

  const savedDefaultId = target ? getDefaultExternalAppId(target.mediaType) : null;
  const [selectedAppId, setSelectedAppId] = useState<string>(
    () => savedDefaultId || apps[0]?.id || 'one-read'
  );
  const [showPathInfo, setShowPathInfo] = useState(false);

  useEffect(() => {
    if (!target) return;
    const list =
      target.mediaType === 'video' ? EXTERNAL_VIDEO_APPS : EXTERNAL_FILE_APPS;
    const saved = getDefaultExternalAppId(target.mediaType);
    setSelectedAppId(saved || list[0]?.id || '');
    setShowPathInfo(false);
  }, [target]);

  if (!target) return null;

  const selectedApp =
    apps.find((a) => a.id === selectedAppId) || apps[0];

  const handleChooseMode = (mode: 'once' | 'always') => {
    if (!selectedApp) return;
    if (mode === 'always') {
      setDefaultExternalAppId(target.mediaType, selectedApp.id);
    }
    onConfirmOpen(target, selectedApp, mode);
  };

  return (
    <div
      dir="rtl"
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/65 backdrop-blur-[2px] flex items-end justify-center animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-label="فتح باستخدام"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-[#1F1F23] border-t border-white/10 rounded-t-[32px] pt-5 pb-6 px-5 text-white shadow-2xl space-y-5 animate-in slide-in-from-bottom duration-200"
      >
        {/* Top Row: "فتح باستخدام" on Right + Info 'ⓘ' Button on Left (Matching Page 1) */}
        <div className="flex items-center justify-between px-1">
          <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight">
            فتح باستخدام
          </h3>

          <button
            type="button"
            onClick={() => setShowPathInfo((prev) => !prev)}
            aria-label="معلومات مسار الملف"
            title="عرض مسار التخزين في الهاتف"
            className="w-8 h-8 rounded-full text-slate-300 hover:text-white hover:bg-white/10 flex items-center justify-center transition-colors cursor-pointer"
          >
            <Info className="w-5 h-5" />
          </button>
        </div>

        {/* Optional file path info banner when 'ⓘ' is clicked */}
        {showPathInfo && (
          <div className="p-3 rounded-2xl bg-black/35 border border-white/10 text-right space-y-1 animate-in fade-in duration-150">
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-400">
              <FolderTree className="w-3.5 h-3.5 shrink-0" />
              <span>مسار التخزين في ذاكرة الهاتف:</span>
            </div>
            <p className="text-xs font-bold text-slate-200 break-words">
              {target.virtualPath || `MedFur / ${target.title}`}
            </p>
            <p className="text-[11px] text-slate-400 truncate font-mono">
              {target.fileName}
            </p>
          </div>
        )}

        {/* 4-Column Grid of External Reader / Player Apps (Matching Page 1) */}
        <div className="grid grid-cols-4 gap-x-2 gap-y-5 pt-1">
          {apps.map((app) => {
            const isSelected = app.id === selectedApp?.id;
            return (
              <button
                key={app.id}
                type="button"
                onClick={() => setSelectedAppId(app.id)}
                onDoubleClick={() => {
                  setSelectedAppId(app.id);
                  onConfirmOpen(target, app, 'once');
                }}
                className="flex flex-col items-center text-center group cursor-pointer focus:outline-hidden"
              >
                <div
                  className={`relative w-14 h-14 rounded-[18px] bg-gradient-to-br ${app.bgGradient} flex items-center justify-center shadow-md transition-all ${
                    isSelected
                      ? 'ring-2 ring-white scale-105 shadow-lg'
                      : 'opacity-90 hover:opacity-100 hover:scale-102'
                  }`}
                >
                  <span className="text-xs font-black text-white tracking-tight drop-shadow-xs">
                    {app.badgeText}
                  </span>

                  {isSelected && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 border-2 border-[#1F1F23] text-white flex items-center justify-center shadow-xs">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </span>
                  )}
                </div>

                <span
                  className={`mt-2 text-xs font-semibold leading-tight line-clamp-1 ${
                    isSelected ? 'text-white font-bold' : 'text-slate-200'
                  }`}
                >
                  {app.name}
                </span>
                <span className="mt-0.5 text-[10px] text-slate-400 leading-tight line-clamp-1">
                  {app.subtitle}
                </span>
              </button>
            );
          })}
        </div>

        {/* Bottom Actions Row: مرة واحدة فقط  |  دائمًا (Matching Page 1) */}
        <div className="pt-3 border-t border-white/10 grid grid-cols-2 items-center text-center relative">
          <button
            type="button"
            onClick={() => handleChooseMode('once')}
            className="py-2.5 text-sm sm:text-base font-bold text-slate-200 hover:text-white active:scale-98 transition-all cursor-pointer"
          >
            مرة واحدة فقط
          </button>

          {/* Center Vertical Divider */}
          <span
            aria-hidden="true"
            className="absolute left-1/2 top-4 bottom-1 w-px bg-white/20 -translate-x-1/2"
          />

          <button
            type="button"
            onClick={() => handleChooseMode('always')}
            className="py-2.5 text-sm sm:text-base font-bold text-slate-200 hover:text-white active:scale-98 transition-all cursor-pointer"
          >
            دائمًا
          </button>
        </div>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import {
  X,
  Play,
  BookOpen,
  ExternalLink,
  FolderTree,
  CheckCircle2,
  Download,
  Film,
  FileText,
  Sparkles,
} from 'lucide-react';
import { launchMediaInExternalPlayer } from '../../utils/fileHelpers';

export interface MediaLaunchTarget {
  id: string;
  type: 'file' | 'video';
  title: string;
  subtitle?: string;
  authorOrDoctor?: string;
  fileName: string;
  virtualPath: string;
  url?: string;
  mimeType?: string;
  fileSize?: string;
  pages?: number;
  duration?: string;
  format?: string;
  description?: string;
  isCachedOffline?: boolean;
}

interface MediaLaunchChoiceModalProps {
  target: MediaLaunchTarget | null;
  onClose: () => void;
  onOpenInApp: (target: MediaLaunchTarget) => void;
  onDownloadBoth?: (target: MediaLaunchTarget) => void;
}

export const MediaLaunchChoiceModal: React.FC<MediaLaunchChoiceModalProps> = ({
  target,
  onClose,
  onOpenInApp,
  onDownloadBoth,
}) => {
  const [isLaunchingExternal, setIsLaunchingExternal] = useState(false);
  const [externalNotice, setExternalNotice] = useState<string | null>(null);

  if (!target) return null;

  const isVideo = target.type === 'video';

  const handleExternalLaunch = async () => {
    setIsLaunchingExternal(true);
    setExternalNotice(null);
    try {
      await launchMediaInExternalPlayer({
        id: target.id,
        type: target.type,
        title: target.title,
        subtitle: target.subtitle,
        fileName: target.fileName,
        url: target.url,
        mimeType: target.mimeType,
        virtualPath: target.virtualPath,
      });
      setExternalNotice(
        'تم تجهيز وتصدير الملف باسم MedFur المرتب لفتحه عبر المشغل الخارجي في جهازك.'
      );
    } finally {
      setIsLaunchingExternal(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-label="اختيار طريقة تشغيل أو فتح الوسائط"
    >
      <div className="bg-[#111A2E] border border-slate-800 rounded-t-3xl sm:rounded-3xl w-full max-w-md overflow-hidden shadow-2xl text-right">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 bg-[#0E1628] flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800/80 text-slate-400 hover:text-white transition-colors cursor-pointer"
            aria-label="إغلاق نافذة التخيير"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2.5 min-w-0">
            <div className="text-right min-w-0">
              <span className="text-[11px] font-bold text-emerald-400 block">
                {isVideo ? 'مشغل المرئيات الطبية' : 'قارئ الملفات والمحاضرات'}
              </span>
              <h3 className="text-sm sm:text-base font-black text-white truncate">
                {target.title}
              </h3>
            </div>
            <div
              className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 border ${
                isVideo
                  ? 'bg-rose-500/15 border-rose-500/30 text-rose-400'
                  : 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
              }`}
            >
              {isVideo ? <Film className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-5 space-y-4">
          {/* Structured MedFur Path Box */}
          <div className="p-3.5 rounded-2xl bg-[#0B1220] border border-slate-800/90 space-y-2">
            <div className="flex items-center justify-between gap-2">
              {target.isCachedOffline ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[10px] font-black">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>محفوظ داخل التطبيق أوفلاين</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[10px] font-bold">
                  <Sparkles className="w-3 h-3" />
                  <span>جاهز للتشغيل والحفظ</span>
                </span>
              )}
              <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
                <span>مسار وتسمية MedFur المنظمة</span>
                <FolderTree className="w-3.5 h-3.5 text-sky-400" />
              </span>
            </div>

            <div className="text-[11px] text-sky-300 font-bold bg-sky-950/30 border border-sky-500/20 rounded-xl px-2.5 py-1.5 dir-rtl text-right">
              {target.virtualPath}
            </div>

            <div className="text-[11px] text-slate-300 font-mono bg-slate-900/90 border border-slate-800 rounded-xl px-2.5 py-1.5 break-all text-right">
              {target.fileName}
            </div>
          </div>

          {/* Primary & Secondary Launch Options */}
          <div className="space-y-2.5">
            <p className="text-xs font-bold text-slate-300">
              اختر طريقة الفتح المفضلة لديك:
            </p>

            {/* Option 1: Open inside the App */}
            <button
              type="button"
              onClick={() => {
                onOpenInApp(target);
              }}
              className="w-full p-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-between gap-3 transition-all cursor-pointer shadow-lg shadow-emerald-950/50"
            >
              <span className="text-[11px] font-bold bg-black/20 px-2.5 py-1 rounded-xl">
                مستحسن · فوري
              </span>
              <div className="flex items-center gap-3 text-right">
                <div>
                  <div className="text-sm font-black">
                    {isVideo ? 'تشغيل داخل التطبيق' : 'فتح وقراءة داخل التطبيق'}
                  </div>
                  <div className="text-[11px] text-emerald-100/90">
                    {isVideo
                      ? 'مشغل مدفور المدمج مع التحكم بالسرعة وتكبير الشاشة'
                      : 'قارئ المحاضرات المدمج مع التكبير والتنقل بين الصفحات'}
                  </div>
                </div>
                <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
                  {isVideo ? (
                    <Play className="w-5 h-5 fill-current" />
                  ) : (
                    <BookOpen className="w-5 h-5" />
                  )}
                </div>
              </div>
            </button>

            {/* Option 2: Open in External Player */}
            <button
              type="button"
              disabled={isLaunchingExternal}
              onClick={handleExternalLaunch}
              className="w-full p-3.5 rounded-2xl bg-[#162238] hover:bg-slate-800 border border-slate-700/80 text-white flex items-center justify-between gap-3 transition-all cursor-pointer disabled:opacity-50"
            >
              <span className="text-[11px] font-bold text-sky-300 bg-sky-500/15 border border-sky-500/30 px-2.5 py-1 rounded-xl">
                {isLaunchingExternal ? 'جاري التجهيز...' : 'مشغل الجهاز'}
              </span>
              <div className="flex items-center gap-3 text-right">
                <div>
                  <div className="text-sm font-black">
                    فتح بمشغل خارجي في الجهاز
                  </div>
                  <div className="text-[11px] text-slate-400">
                    {isVideo
                      ? 'تصدير وتشغيل عبر VLC أو مشغل الفيديو في هاتفك/حاسوبك'
                      : 'تصدير وفتح عبر Adobe Acrobat أو قارئ PDF الخارجي'}
                  </div>
                </div>
                <div className="w-10 h-10 rounded-xl bg-sky-500/15 border border-sky-500/30 text-sky-400 flex items-center justify-center shrink-0">
                  <ExternalLink className="w-5 h-5" />
                </div>
              </div>
            </button>

            {/* Optional Dual Save Button if not yet cached offline */}
            {onDownloadBoth && !target.isCachedOffline && (
              <button
                type="button"
                onClick={() => {
                  onDownloadBoth(target);
                  onClose();
                }}
                className="w-full p-3 rounded-2xl bg-slate-900/90 hover:bg-slate-800/80 border border-slate-800 text-slate-200 flex items-center justify-center gap-2 text-xs font-bold transition-colors cursor-pointer"
              >
                <Download className="w-4 h-4 text-emerald-400" />
                <span>تنزيل وحفظ مزدوج (داخل التطبيق + في ملفات الجهاز باسم MedFur)</span>
              </button>
            )}
          </div>

          {externalNotice && (
            <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-bold text-right">
              {externalNotice}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

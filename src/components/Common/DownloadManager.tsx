import React, { useState, useEffect, useCallback } from 'react';
import {
  Download,
  HardDriveDownload,
  CheckCircle2,
  X,
  Trash2,
  FileText,
  Film,
  Play,
  Eye,
  AlertCircle,
  HardDrive,
  ChevronUp,
  ChevronDown,
  Clock,
  Gauge,
} from 'lucide-react';
import {
  DownloadProgressState,
  StoredMediaRecord,
  subscribeDownloadManager,
  getActiveDownloadsMap,
  listOfflineMediaRecords,
  removeOfflineMediaRecord,
  clearAllOfflineMedia,
  cancelManagedDownload,
  formatFileSize,
  triggerDeviceSaveBlob,
} from '../../utils/fileHelpers';

export function useDownloadManager() {
  const [activeDownloads, setActiveDownloads] = useState<
    Record<string, DownloadProgressState>
  >(() => getActiveDownloadsMap());
  const [cachedRecords, setCachedRecords] = useState<StoredMediaRecord[]>([]);

  const refreshState = useCallback(async () => {
    setActiveDownloads(getActiveDownloadsMap());
    const records = await listOfflineMediaRecords();
    setCachedRecords(records);
  }, []);

  useEffect(() => {
    refreshState();
    const unsubscribe = subscribeDownloadManager(() => {
      refreshState();
    });
    return unsubscribe;
  }, [refreshState]);

  const cachedIds = cachedRecords.map((r) => r.id);
  const totalCachedBytes = cachedRecords.reduce(
    (sum, r) => sum + (r.sizeBytes || 0),
    0
  );
  const activeList = (Object.values(activeDownloads) as DownloadProgressState[]).filter(
    (d) => d.status === 'downloading'
  );

  return {
    activeDownloads,
    activeList,
    cachedRecords,
    cachedIds,
    totalCachedBytes,
    isDownloadingCount: activeList.length,
    cancelDownload: cancelManagedDownload,
    removeCached: removeOfflineMediaRecord,
    clearAllCache: clearAllOfflineMedia,
    refreshState,
  };
}

interface InlineDownloadStatusProps {
  itemId: string;
  itemType: 'file' | 'video';
  progress?: DownloadProgressState;
  isCached: boolean;
  cachedSize?: string;
  onStartDownload?: () => void;
  onOpenInApp?: () => void;
  compact?: boolean;
}

/**
 * Visual Download & Temporary Cache Status Bar displayed directly inside Library Cards,
 * Video Cards, and the Modern Video Player / Document Viewer
 */
export const InlineDownloadStatus: React.FC<InlineDownloadStatusProps> = ({
  itemId,
  itemType,
  progress,
  isCached,
  cachedSize,
  onStartDownload,
  onOpenInApp,
  compact = false,
}) => {
  if (progress && progress.status === 'downloading') {
    return (
      <div
        dir="rtl"
        data-testid={`download-progress-${itemId}`}
        className="w-full p-2.5 sm:p-3 rounded-xl bg-slate-900/95 border border-emerald-500/40 text-white space-y-2 animate-in fade-in"
      >
        <div className="flex items-center justify-between gap-2 text-[11px] font-bold tabular-nums">
          <div className="flex items-center gap-1.5 min-w-0">
            <HardDriveDownload className="w-4 h-4 text-emerald-400 animate-bounce shrink-0" />
            <span className="text-emerald-300 truncate">
              جاري التنزيل والحفظ المؤقت ({progress.percent}%)
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0 text-slate-300">
            {progress.speedFormatted && (
              <span className="text-sky-300">{progress.speedFormatted}</span>
            )}
            <span>
              {formatFileSize(progress.loadedBytes)} /{' '}
              {formatFileSize(progress.totalBytes)}
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                cancelManagedDownload(itemId);
              }}
              className="p-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/40 text-rose-300 transition-colors cursor-pointer"
              title="إلغاء التنزيل"
              aria-label="إلغاء التنزيل"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        </div>

        <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
          <div
            className="h-full bg-gradient-to-l from-emerald-500 via-teal-400 to-sky-500 transition-all duration-150 rounded-full"
            style={{ width: `${Math.max(4, progress.percent)}%` }}
          />
        </div>

        {!compact && progress.etaFormatted && (
          <div className="flex items-center justify-between text-[10px] text-slate-400 tabular-nums">
            <span>يُحفظ مؤقتاً في ذاكرة المتصفح للتشغيل بدون إنترنت</span>
            <span>الوقت المتبقي: {progress.etaFormatted}</span>
          </div>
        )}
      </div>
    );
  }

  if (progress && progress.status === 'error') {
    return (
      <div
        dir="rtl"
        className="w-full p-2.5 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-200 flex items-center justify-between gap-2 text-xs"
      >
        <div className="flex items-center gap-1.5">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{progress.errorMessage || 'تعذر إكمال التنزيل'}</span>
        </div>
        {onStartDownload && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onStartDownload();
            }}
            className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-bold cursor-pointer"
          >
            إعادة المحاولة
          </button>
        )}
      </div>
    );
  }

  if (isCached) {
    return (
      <div
        dir="rtl"
        data-testid={`download-cached-${itemId}`}
        className="w-full px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex flex-wrap items-center justify-between gap-2 text-[11px]"
      >
        <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-300 font-bold">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
          <span>
            محفوظ مؤقتاً في التطبيق{' '}
            {cachedSize ? `(${cachedSize})` : ''} — جاهز للفتح بدون إنترنت
          </span>
        </div>
        {onOpenInApp && !compact && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpenInApp();
            }}
            className="text-emerald-600 dark:text-emerald-400 hover:underline font-black cursor-pointer flex items-center gap-1"
          >
            {itemType === 'video' ? (
              <>
                <Play className="w-3 h-3 fill-current" />
                <span>تشغيل من الذاكرة</span>
              </>
            ) : (
              <>
                <Eye className="w-3 h-3" />
                <span>قراءة من الذاكرة</span>
              </>
            )}
          </button>
        )}
      </div>
    );
  }

  return null;
};

interface DownloadManagerProps {
  isOpen?: boolean;
  onClose?: () => void;
  onOpenMediaItem?: (record: StoredMediaRecord) => void;
  variant?: 'floating' | 'modal-only';
}

/**
 * Global & Contextual DownloadManager Component
 * Displays live download progress for files & videos, manages temporary IndexedDB storage,
 * and allows instant opening inside the Library & Video Player.
 */
export const DownloadManager: React.FC<DownloadManagerProps> = ({
  isOpen: controlledIsOpen,
  onClose,
  onOpenMediaItem,
  variant = 'floating',
}) => {
  const {
    activeList,
    cachedRecords,
    totalCachedBytes,
    isDownloadingCount,
    cancelDownload,
    removeCached,
    clearAllCache,
  } = useDownloadManager();

  const [internalOpen, setInternalOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'all' | 'file' | 'video'>('all');
  const [minimizedBar, setMinimizedBar] = useState(false);

  const isDrawerOpen =
    controlledIsOpen !== undefined ? controlledIsOpen : internalOpen;

  const handleClose = () => {
    setInternalOpen(false);
    onClose?.();
  };

  // Auto-surface floating status pill when a new download starts
  useEffect(() => {
    if (isDownloadingCount > 0) {
      setMinimizedBar(false);
    }
  }, [isDownloadingCount]);

  const filteredRecords = cachedRecords.filter((rec) => {
    if (activeFilter === 'all') return true;
    const recType =
      rec.itemType || (rec.mimeType?.startsWith('video/') ? 'video' : 'file');
    return recType === activeFilter;
  });

  const avgPercent =
    activeList.length > 0
      ? Math.round(
          activeList.reduce((acc, item) => acc + item.percent, 0) /
            activeList.length
        )
      : 0;

  return (
    <>
      {/* Floating Live Download Progress Bar when downloads are actively running */}
      {variant === 'floating' && !isDrawerOpen && isDownloadingCount > 0 && (
        <div
          dir="rtl"
          className="fixed bottom-4 right-3 sm:right-5 z-40 max-w-[92vw] sm:max-w-sm animate-in slide-in-from-bottom-3 duration-200"
        >
          {!minimizedBar ? (
            <div className="bg-slate-900/95 backdrop-blur-md border border-emerald-500/50 rounded-2xl p-3 text-white shadow-2xl space-y-2 w-72 sm:w-80">
              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setInternalOpen(true)}
                  className="flex items-center gap-2 text-right flex-1 min-w-0 cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
                    <HardDriveDownload className="w-4 h-4 animate-bounce" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-black text-white truncate">
                      مدير التنزيلات ({isDownloadingCount} قيد التحميل)
                    </p>
                    <p className="text-[10px] text-emerald-300 truncate tabular-nums">
                      {activeList[0]?.title} • {avgPercent}%
                    </p>
                  </div>
                </button>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => setInternalOpen(true)}
                    className="px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-[10px] font-bold text-white cursor-pointer"
                  >
                    التفاصيل
                  </button>
                  <button
                    type="button"
                    onClick={() => setMinimizedBar(true)}
                    className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
                    aria-label="تصغير شريط التنزيل"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-l from-emerald-400 to-sky-400 transition-all duration-150 rounded-full"
                  style={{ width: `${Math.max(5, avgPercent)}%` }}
                />
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setInternalOpen(true)}
              aria-label="فتح مدير التنزيلات والملفات المؤقتة"
              className="px-3.5 py-2.5 rounded-2xl bg-slate-900/95 hover:bg-slate-800 text-white border border-slate-700/80 shadow-xl flex items-center gap-2 text-xs font-bold cursor-pointer transition-all"
            >
              <HardDrive className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>التنزيلات الجارية</span>
              <span className="px-1.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 text-[10px] font-black tabular-nums">
                {avgPercent}%
              </span>
              <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
            </button>
          )}
        </div>
      )}

      {/* Full Responsive DownloadManager Bottom-Sheet (Mobile) / Modal (Desktop) */}
      {isDrawerOpen && (
        <div
          dir="rtl"
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={handleClose}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full sm:max-w-xl bg-white dark:bg-[#0E172A] border-t sm:border border-slate-200 dark:border-slate-800 rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[88dvh] overflow-hidden text-right"
          >
            {/* Mobile Drag Handle */}
            <div className="w-10 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto mt-2.5 sm:hidden shrink-0" />

            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-500 shrink-0">
                  <HardDriveDownload className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-black text-sm sm:text-base text-slate-900 dark:text-white truncate">
                    مدير التنزيلات والملفات المؤقتة
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
                    المساحة المؤقتة المستخدمة: {formatFileSize(totalCachedBytes)} •{' '}
                    {cachedRecords.length} عنصر محفوظ
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleClose}
                className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer shrink-0"
                aria-label="إغلاق مدير التنزيلات"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Filter Tabs & Clear All */}
            <div className="px-4 py-2.5 bg-slate-50 dark:bg-[#131D2E] border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                {(
                  [
                    { id: 'all', label: `الكل (${cachedRecords.length})` },
                    {
                      id: 'file',
                      label: 'ملفات المكتبة',
                    },
                    {
                      id: 'video',
                      label: 'الفيديوهات',
                    },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveFilter(tab.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                      activeFilter === tab.id
                        ? 'bg-emerald-600 text-white'
                        : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {cachedRecords.length > 0 && (
                <button
                  type="button"
                  onClick={() => clearAllCache()}
                  className="px-2.5 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>تفريغ الذاكرة المؤقتة</span>
                </button>
              )}
            </div>

            {/* Body List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* 1. Active Downloads Section */}
              {activeList.length > 0 && (
                <div className="space-y-2.5">
                  <h4 className="text-xs font-black text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                    <Gauge className="w-4 h-4" />
                    <span>التنزيلات الجارية حالياً ({activeList.length})</span>
                  </h4>

                  {activeList.map((dl) => (
                    <div
                      key={dl.id}
                      className="p-3.5 rounded-2xl bg-slate-900 border border-emerald-500/40 text-white space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          {dl.itemType === 'video' ? (
                            <Film className="w-4 h-4 text-rose-400 shrink-0" />
                          ) : (
                            <FileText className="w-4 h-4 text-purple-400 shrink-0" />
                          )}
                          <span className="text-xs font-bold truncate">
                            {dl.title || dl.fileName}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 shrink-0 text-xs font-black text-emerald-400 tabular-nums">
                          <span>{dl.percent}%</span>
                          <button
                            type="button"
                            onClick={() => cancelDownload(dl.id)}
                            className="p-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/40 text-rose-300 cursor-pointer"
                            title="إلغاء التنزيل"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-l from-emerald-500 to-sky-400 transition-all duration-150 rounded-full"
                          style={{ width: `${Math.max(5, dl.percent)}%` }}
                        />
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-400 tabular-nums">
                        <span>
                          {formatFileSize(dl.loadedBytes)} من{' '}
                          {formatFileSize(dl.totalBytes)}
                        </span>
                        <span>
                          {dl.speedFormatted} • المتبقي: {dl.etaFormatted}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* 2. Cached / Completed Files & Videos Section */}
              <div className="space-y-2.5">
                <h4 className="text-xs font-black text-slate-600 dark:text-slate-300">
                  الملفات والفيديوهات المحفوظة مؤقتاً ({filteredRecords.length})
                </h4>

                {filteredRecords.length === 0 ? (
                  <div className="text-center py-10 px-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-dashed border-slate-200 dark:border-slate-800 space-y-2">
                    <HardDrive className="w-9 h-9 text-slate-400 mx-auto opacity-60" />
                    <p className="text-xs font-bold text-slate-600 dark:text-slate-300">
                      لا توجد ملفات أو فيديوهات محفوظة مؤقتاً حالياً
                    </p>
                    <p className="text-[11px] text-slate-400 max-w-xs mx-auto leading-relaxed">
                      عند تنزيل أي ملف من المكتبة أو فيديو من قسم المرئيات، يظهر تقدم التنزيل هنا ويُحفظ مؤقتاً للفتح الفوري بدون إنترنت.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredRecords.map((rec) => {
                      const isVid =
                        rec.itemType === 'video' ||
                        rec.mimeType?.startsWith('video/');
                      const displayTitle =
                        rec.title || rec.fileName.replace(/\.[^/.]+$/, '');

                      return (
                        <div
                          key={rec.id}
                          className="p-3 rounded-2xl bg-slate-50 dark:bg-[#131D2E] border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                        >
                          <div className="flex items-start gap-2.5 min-w-0">
                            <div
                              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                                isVid
                                  ? 'bg-rose-500/15 text-rose-500 border border-rose-500/30'
                                  : 'bg-purple-500/15 text-purple-500 border border-purple-500/30'
                              }`}
                            >
                              {isVid ? (
                                <Film className="w-5 h-5" />
                              ) : (
                                <FileText className="w-5 h-5" />
                              )}
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                  <CheckCircle2 className="w-3 h-3" />
                                  <span>محفوظ مؤقتاً</span>
                                </span>
                                <span className="text-slate-400">·</span>
                                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 tabular-nums">
                                  {formatFileSize(rec.sizeBytes)}
                                </span>
                                {rec.duration && (
                                  <>
                                    <span className="text-slate-400">·</span>
                                    <span className="text-[10px] text-rose-400 font-bold flex items-center gap-0.5">
                                      <Clock className="w-2.5 h-2.5" />
                                      <span>{rec.duration}</span>
                                    </span>
                                  </>
                                )}
                              </div>

                              <h5 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white truncate mt-0.5">
                                {displayTitle}
                              </h5>
                            </div>
                          </div>

                          <div className="flex items-center justify-end gap-1.5 shrink-0">
                            {onOpenMediaItem && (
                              <button
                                type="button"
                                onClick={() => {
                                  onOpenMediaItem(rec);
                                  handleClose();
                                }}
                                className={`px-3 py-1.5 rounded-xl text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer ${
                                  isVid
                                    ? 'bg-rose-600 hover:bg-rose-500'
                                    : 'bg-emerald-600 hover:bg-emerald-500'
                                }`}
                              >
                                {isVid ? (
                                  <>
                                    <Play className="w-3.5 h-3.5 fill-white" />
                                    <span>تشغيل</span>
                                  </>
                                ) : (
                                  <>
                                    <Eye className="w-3.5 h-3.5" />
                                    <span>فتح</span>
                                  </>
                                )}
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() =>
                                triggerDeviceSaveBlob(rec.blob, rec.fileName)
                              }
                              className="px-2.5 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1 cursor-pointer"
                              title="تنزيل نسخة إلى ذاكرة الجهاز"
                            >
                              <Download className="w-3.5 h-3.5" />
                              <span>حفظ للجهاز</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => removeCached(rec.id)}
                              className="p-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 cursor-pointer"
                              title="حذف من الذاكرة المؤقتة"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="p-3.5 sm:p-4 bg-slate-50 dark:bg-[#131D2E] border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                تُحفظ الملفات والفيديوهات مؤقتاً في IndexedDB لسرعة التصفح بدون إنترنت
              </span>
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-white text-xs font-bold cursor-pointer"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

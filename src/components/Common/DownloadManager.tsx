import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Download,
  HardDriveDownload,
  CheckCircle2,
  X,
  Trash2,
  FileText,
  Film,
  Play,
  AlertCircle,
  HardDrive,
  ChevronUp,
  ChevronDown,
  Clock,
  Gauge,
  ArrowRight,
  FolderTree,
  FolderOpen,
  HelpCircle,
  RotateCcw,
  ExternalLink,
  CheckCheck,
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
  getDeviceStorageEstimate,
  connectMedFurDeviceDirectory,
  getConnectedDeviceFolderName,
  launchMediaInExternalPlayer,
} from '../../utils/fileHelpers';
import {
  calculateStorageBreakdown,
  buildMedFurStorageTree,
  StorageItemSummary,
  getDefaultExternalAppId,
  setDefaultExternalAppId,
  getExternalAppById,
  ExternalAppOption,
} from '../../utils/downloadManagerLogic';
import {
  ExternalOpenWithSheet,
  ExternalOpenWithTarget,
} from './MediaCardControls';

export function useDownloadManager() {
  const [activeDownloads, setActiveDownloads] = useState<
    Record<string, DownloadProgressState>
  >(() => getActiveDownloadsMap());
  const [cachedRecords, setCachedRecords] = useState<StoredMediaRecord[]>([]);
  const [deviceQuotaBytes, setDeviceQuotaBytes] = useState<number>(
    64 * 1024 * 1024 * 1024
  );
  const [isStoragePersisted, setIsStoragePersisted] = useState<boolean>(false);
  const [connectedDeviceFolder, setConnectedDeviceFolder] = useState<string | null>(
    () => getConnectedDeviceFolderName()
  );

  const refreshState = useCallback(async () => {
    setActiveDownloads(getActiveDownloadsMap());
    const records = await listOfflineMediaRecords();
    setCachedRecords(records);
    setConnectedDeviceFolder(getConnectedDeviceFolderName());
    const estimate = await getDeviceStorageEstimate();
    if (estimate.quotaBytes > 0) {
      setDeviceQuotaBytes(estimate.quotaBytes);
    }
    setIsStoragePersisted(estimate.isPersisted);
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

  const storageItems: StorageItemSummary[] = useMemo(() => {
    return cachedRecords.map((r) => {
      const resolvedType: 'file' | 'video' | 'questions' =
        r.itemType === 'questions'
          ? 'questions'
          : r.itemType === 'video' || r.mimeType?.startsWith('video/')
          ? 'video'
          : 'file';

      return {
        id: r.id,
        title: r.title || r.fileName.replace(/\.[^/.]+$/, ''),
        fileName: r.fileName,
        virtualPath:
          r.virtualPath ||
          `MedFur / السنة الثالثة / الفصل الأول / مقرر عام / ${
            resolvedType === 'video'
              ? 'الفيديوهات'
              : resolvedType === 'questions'
              ? 'الأسئلة'
              : 'الملفات'
          }`,
        itemType: resolvedType,
        sizeBytes: r.sizeBytes || 0,
        formattedSize: formatFileSize(r.sizeBytes || 0),
        savedAt: r.savedAt,
        subtitle: r.subtitle,
        authorOrDoctor: r.authorOrDoctor,
        pages: r.pages,
        duration: r.duration,
        questionsCount: r.questionsCount,
        format: r.format,
        mimeType: r.mimeType,
        subjectId: r.subjectId,
      };
    });
  }, [cachedRecords]);

  const storageBreakdown = useMemo(
    () => calculateStorageBreakdown(storageItems, deviceQuotaBytes),
    [storageItems, deviceQuotaBytes]
  );

  const storageTree = useMemo(
    () => buildMedFurStorageTree(storageItems),
    [storageItems]
  );

  const handleConnectDeviceFolder = async () => {
    const res = await connectMedFurDeviceDirectory();
    await refreshState();
    return res;
  };

  return {
    activeDownloads,
    activeList,
    cachedRecords,
    cachedIds,
    totalCachedBytes,
    storageItems,
    storageBreakdown,
    storageTree,
    deviceQuotaBytes,
    isStoragePersisted,
    connectedDeviceFolder,
    connectDeviceFolder: handleConnectDeviceFolder,
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
              جاري التنزيل والحفظ في ذاكرة الهاتف ({progress.percent}%)
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
            محفوظ في ذاكرة الهاتف {cachedSize ? `(${cachedSize})` : ''} — جاهز للفتح الخارجي
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
            <ExternalLink className="w-3 h-3" />
            <span>{itemType === 'video' ? 'فتح بمشغل خارجي' : 'فتح باستخدام...'}</span>
          </button>
        )}
      </div>
    );
  }

  return null;
};

interface DownloadsViewProps {
  onBack: () => void;
  onNavigateSection?: (section: 'library' | 'videos' | 'automation') => void;
}

/**
 * Full-Page Download & Storage Manager View (قسم التنزيلات وإدارة المساحة)
 * Accessible from the Side Drawer ("التنزيلات") and Quick Banners on Home, Library, and Videos.
 */
export const DownloadsView: React.FC<DownloadsViewProps> = ({
  onBack,
  onNavigateSection,
}) => {
  const {
    activeList,
    cachedRecords,
    storageBreakdown,
    storageTree,
    connectedDeviceFolder,
    connectDeviceFolder,
    cancelDownload,
    removeCached,
    clearAllCache,
    refreshState,
  } = useDownloadManager();

  const [activeTab, setActiveTab] = useState<
    'folders' | 'videos' | 'files' | 'questions'
  >('folders');
  const [expandedYears, setExpandedYears] = useState<Record<string, boolean>>({});
  const [statusNotice, setStatusNotice] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setStatusNotice(msg);
    setTimeout(() => setStatusNotice(null), 3500);
  };

  const handleLinkDeviceStorage = async () => {
    try {
      const res = await connectDeviceFolder();
      if (res.connected) {
        showToast(
          `تم تفعيل الحفظ المباشر في ذاكرة الهاتف داخل مجلد (${res.folderName}) ومزامنة ${res.syncedCount} عنصر ✓`
        );
      }
    } catch {
      // User cancelled picker
    }
  };

  const handleOpenDownloadedItem = async (item: StorageItemSummary) => {
    if (item.itemType === 'questions') {
      if (onNavigateSection) {
        onNavigateSection('automation');
      }
      return;
    }

    const mediaType: 'file' | 'video' =
      item.itemType === 'video' ? 'video' : 'file';

    await launchMediaInExternalPlayer({
      id: item.id,
      fileName: item.fileName,
      virtualPath: item.virtualPath,
      mimeType:
        item.mimeType || (mediaType === 'video' ? 'video/mp4' : 'application/pdf'),
      title: item.title,
      subtitle: item.subtitle,
      authorOrDoctor: item.authorOrDoctor,
      itemType: mediaType,
      pages: item.pages,
      duration: item.duration,
      format: item.format,
    });
  };

  const handleSaveRecordCopyToDevice = (itemId: string) => {
    const rec = cachedRecords.find((r) => r.id === itemId);
    if (rec && rec.blob) {
      triggerDeviceSaveBlob(rec.blob, rec.fileName);
      showToast(`تم تصدير الملف إلى ذاكرة الهاتف: ${rec.fileName}`);
    }
  };

  const toggleYearExpand = (yearName: string) => {
    setExpandedYears((prev) => ({
      ...prev,
      [yearName]: prev[yearName] === undefined ? false : !prev[yearName],
    }));
  };

  const renderStorageItemCard = (item: StorageItemSummary) => {
    const isVid = item.itemType === 'video';
    const isQ = item.itemType === 'questions';

    return (
      <div
        key={item.id}
        onClick={() => handleOpenDownloadedItem(item)}
        className="group bg-[#161F30] hover:bg-[#1B263B] border border-slate-800/90 hover:border-emerald-500/40 rounded-2xl p-3.5 transition-all cursor-pointer space-y-2.5 text-right"
      >
        <div className="flex items-start gap-3 min-w-0">
          <div
            className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border mt-0.5 ${
              isVid
                ? 'bg-rose-500/15 border-rose-500/30 text-rose-400'
                : isQ
                ? 'bg-sky-500/15 border-sky-500/30 text-sky-400'
                : 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
            }`}
          >
            {isVid ? (
              <Play className="w-4 h-4 fill-current" />
            ) : isQ ? (
              <HelpCircle className="w-4 h-4" />
            ) : (
              <span className="text-[9px] font-black border-2 border-current rounded px-1 py-0.5 leading-none">
                PDF
              </span>
            )}
          </div>

          <div className="min-w-0 flex-1 space-y-1">
            <h4 className="font-black text-xs sm:text-sm text-white group-hover:text-emerald-400 transition-colors leading-snug break-all">
              {item.title}
            </h4>
            <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-bold text-slate-400 tabular-nums">
              <span className="text-emerald-400">{item.formattedSize}</span>
              <span>•</span>
              <span className="text-slate-300 break-words">
                {item.virtualPath}
              </span>
              {item.duration && (
                <>
                  <span>•</span>
                  <span>{item.duration}</span>
                </>
              )}
              {item.questionsCount ? (
                <>
                  <span>•</span>
                  <span>{item.questionsCount} سؤال</span>
                </>
              ) : null}
            </div>
          </div>
        </div>

        <div
          className="flex items-center justify-end gap-1.5 pt-2 border-t border-slate-800/70"
          onClick={(e) => e.stopPropagation()}
        >
          {!isQ && (
            <button
              type="button"
              onClick={() => handleOpenDownloadedItem(item)}
              title="فتح عبر تطبيقات الهاتف المثبتة"
              aria-label="فتح باستخدام"
              className="px-2.5 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>فتح باستخدام</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => handleSaveRecordCopyToDevice(item.id)}
            title="حفظ نسخة مباشرة في ملفات الهاتف"
            aria-label="حفظ في الهاتف"
            className="px-2.5 py-1.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-200 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>حفظ بالهاتف</span>
          </button>

          <button
            type="button"
            onClick={() => removeCached(item.id)}
            title="حذف من ذاكرة الهاتف"
            aria-label="حذف"
            className="p-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div
      dir="rtl"
      className="w-full max-w-4xl mx-auto px-3 sm:px-5 py-3 sm:py-4 space-y-3.5 text-right overflow-x-hidden"
    >
      {/* 1. EMERALD HEADER CARD */}
      <div className="bg-gradient-to-l from-emerald-500 via-emerald-600 to-teal-700 text-white rounded-3xl p-4 sm:p-5 shadow-lg space-y-3.5 dark-surface-preserve">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={onBack}
              aria-label="رجوع"
              className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors cursor-pointer shrink-0"
            >
              <ArrowRight className="w-5 h-5" />
            </button>

            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl font-black text-white leading-tight truncate">
                التنزيلات وإدارة المساحة
              </h1>
              <p className="text-xs text-emerald-50/90 font-bold truncate mt-0.5">
                تخزين منظم في ذاكرة الهاتف (MedFur / السنة / الفصل / المادة)
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleLinkDeviceStorage}
            className="px-3 py-2 rounded-2xl bg-white text-emerald-800 hover:bg-emerald-50 text-xs font-black flex items-center gap-1.5 shadow-sm cursor-pointer shrink-0"
          >
            <FolderTree className="w-4 h-4 text-emerald-600" />
            <span>
              {connectedDeviceFolder ? 'مجلد الهاتف مرتبط ✓' : 'ربط مجلد الهاتف'}
            </span>
          </button>
        </div>

        {/* Summary pills inside Emerald Header */}
        <div className="flex items-center gap-2 flex-wrap pt-0.5 tabular-nums">
          <span className="px-3 py-1 rounded-full bg-black/20 text-white text-xs font-black">
            المستهلك: {storageBreakdown.totalUsedFormatted}
          </span>
          <span className="px-3 py-1 rounded-full bg-black/20 text-white text-xs font-black">
            المتاح بالهاتف: {storageBreakdown.deviceFreeFormatted}
          </span>
          <span className="px-3 py-1 rounded-full bg-black/20 text-white text-xs font-black">
            {storageBreakdown.totalItemsCount} عنصر مخزن
          </span>
        </div>
      </div>

      {/* Status Notice Toast */}
      {statusNotice && (
        <div className="p-3.5 rounded-2xl bg-emerald-950/90 border border-emerald-500/40 text-emerald-200 text-xs font-bold flex items-center justify-between gap-2 animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{statusNotice}</span>
          </div>
          <button
            type="button"
            onClick={() => setStatusNotice(null)}
            className="text-slate-400 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 2. STORAGE STATISTICS PANEL (لوحة إحصائيات مساحة التخزين التفصيلية) */}
      <div className="bg-[#161F30] border border-slate-800/90 rounded-3xl p-4 sm:p-5 space-y-4 shadow-sm">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <HardDrive className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-black text-white">
                إحصائيات مساحة تخزين الهاتف
              </h2>
              <p className="text-[11px] text-slate-400 font-bold tabular-nums">
                مجلد التخزين الرئيسي:{' '}
                <span className="text-emerald-400">
                  {connectedDeviceFolder || 'MedFur / ذاكرة الهاتف الداخلية'}
                </span>
              </p>
            </div>
          </div>

          <div className="text-left tabular-nums">
            <span className="text-xs font-black text-white block">
              {storageBreakdown.totalUsedFormatted} مستخدم
            </span>
            <span className="text-[11px] text-slate-400 font-bold">
              من إجمالي {storageBreakdown.deviceQuotaFormatted}
            </span>
          </div>
        </div>

        {/* Segmented Storage Bar (Videos | Files | Questions | Free Space) */}
        <div className="space-y-2">
          <div className="w-full h-3.5 rounded-full bg-[#0B1220] border border-slate-800 overflow-hidden flex p-0.5 gap-0.5">
            {storageBreakdown.videos.bytes > 0 && (
              <div
                title={`الفيديوهات: ${storageBreakdown.videos.formattedSize}`}
                className="h-full bg-rose-500 rounded-r-full transition-all duration-300"
                style={{
                  width: `${Math.max(8, storageBreakdown.videos.percentOfUsed)}%`,
                }}
              />
            )}
            {storageBreakdown.files.bytes > 0 && (
              <div
                title={`الملفات: ${storageBreakdown.files.formattedSize}`}
                className="h-full bg-emerald-500 transition-all duration-300"
                style={{
                  width: `${Math.max(8, storageBreakdown.files.percentOfUsed)}%`,
                }}
              />
            )}
            {storageBreakdown.questions.bytes > 0 && (
              <div
                title={`الأسئلة: ${storageBreakdown.questions.formattedSize}`}
                className="h-full bg-sky-500 rounded-l-full transition-all duration-300"
                style={{
                  width: `${Math.max(8, storageBreakdown.questions.percentOfUsed)}%`,
                }}
              />
            )}
          </div>

          {/* Bar Legend */}
          <div className="flex items-center justify-between gap-2 flex-wrap text-[11px] font-bold text-slate-300 tabular-nums">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                <span>فيديوهات ({storageBreakdown.videos.formattedSize})</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span>ملفات PDF ({storageBreakdown.files.formattedSize})</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-sky-500" />
                <span>أسئلة أتمتة ({storageBreakdown.questions.formattedSize})</span>
              </span>
            </div>
            <span className="text-slate-400">
              المساحة الحرة: {storageBreakdown.deviceFreeFormatted}
            </span>
          </div>
        </div>

        {/* 3 Category Breakdown Cards (الفيديوهات | الملفات | الأسئلة) */}
        <div className="grid grid-cols-3 gap-2.5 pt-1 tabular-nums">
          {/* Card 1: الفيديوهات */}
          <button
            type="button"
            onClick={() => setActiveTab('videos')}
            className={`p-3 rounded-2xl border text-right transition-all cursor-pointer space-y-1.5 ${
              activeTab === 'videos'
                ? 'bg-rose-500/15 border-rose-500/50 text-white'
                : 'bg-[#0F1726] border-slate-800/90 hover:border-rose-500/30 text-slate-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <Film className="w-4 h-4 text-rose-400 shrink-0" />
              <span className="text-[11px] font-black text-rose-400">
                {storageBreakdown.videos.count} فيديو
              </span>
            </div>
            <div className="text-xs sm:text-sm font-black text-white">
              الفيديوهات
            </div>
            <div className="text-[11px] font-bold text-slate-400">
              {storageBreakdown.videos.formattedSize}
            </div>
          </button>

          {/* Card 2: الملفات */}
          <button
            type="button"
            onClick={() => setActiveTab('files')}
            className={`p-3 rounded-2xl border text-right transition-all cursor-pointer space-y-1.5 ${
              activeTab === 'files'
                ? 'bg-emerald-500/15 border-emerald-500/50 text-white'
                : 'bg-[#0F1726] border-slate-800/90 hover:border-emerald-500/30 text-slate-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <FileText className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="text-[11px] font-black text-emerald-400">
                {storageBreakdown.files.count} ملف
              </span>
            </div>
            <div className="text-xs sm:text-sm font-black text-white">
              الملفات (PDF)
            </div>
            <div className="text-[11px] font-bold text-slate-400">
              {storageBreakdown.files.formattedSize}
            </div>
          </button>

          {/* Card 3: الأسئلة */}
          <button
            type="button"
            onClick={() => setActiveTab('questions')}
            className={`p-3 rounded-2xl border text-right transition-all cursor-pointer space-y-1.5 ${
              activeTab === 'questions'
                ? 'bg-sky-500/15 border-sky-500/50 text-white'
                : 'bg-[#0F1726] border-slate-800/90 hover:border-sky-500/30 text-slate-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <HelpCircle className="w-4 h-4 text-sky-400 shrink-0" />
              <span className="text-[11px] font-black text-sky-400">
                {storageBreakdown.questions.questionsCount || storageBreakdown.questions.count} سؤال
              </span>
            </div>
            <div className="text-xs sm:text-sm font-black text-white">
              الأسئلة
            </div>
            <div className="text-[11px] font-bold text-slate-400">
              {storageBreakdown.questions.formattedSize}
            </div>
          </button>
        </div>
      </div>

      {/* 3. ACTIVE DOWNLOADS PROGRESS (IF ANY) */}
      {activeList.length > 0 && (
        <div className="bg-[#161F30] border border-emerald-500/40 rounded-3xl p-4 space-y-2.5">
          <h3 className="text-xs sm:text-sm font-black text-emerald-400 flex items-center gap-1.5">
            <Gauge className="w-4 h-4" />
            <span>جاري التنزيل الآن ({activeList.length})</span>
          </h3>
          {activeList.map((dl) => (
            <div
              key={dl.id}
              className="p-3 rounded-2xl bg-[#0F1726] border border-slate-800 space-y-2"
            >
              <div className="flex items-center justify-between gap-2 text-xs font-bold text-white">
                <span className="truncate">{dl.title || dl.fileName}</span>
                <div className="flex items-center gap-2 shrink-0 tabular-nums">
                  <span className="text-emerald-400">{dl.percent}%</span>
                  <button
                    type="button"
                    onClick={() => cancelDownload(dl.id)}
                    className="p-1 rounded-lg bg-rose-500/20 text-rose-300 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-150"
                  style={{ width: `${Math.max(6, dl.percent)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 4. NAVIGATION TABS: المجلدات (MedFur) | الفيديوهات | الملفات | الأسئلة */}
      <div className="bg-[#161F30] border border-slate-800/90 rounded-2xl p-1.5 grid grid-cols-4 gap-1">
        {(
          [
            { id: 'folders', label: 'المجلدات' },
            { id: 'videos', label: `الفيديوهات (${storageBreakdown.videos.count})` },
            { id: 'files', label: `الملفات (${storageBreakdown.files.count})` },
            { id: 'questions', label: `الأسئلة (${storageBreakdown.questions.count})` },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`py-2 px-1 rounded-xl text-[11px] sm:text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-emerald-500 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 5. TAB CONTENT: HIERARCHICAL PHONE STORAGE TREE OR CATEGORY LIST */}
      {activeTab === 'folders' ? (
        <div className="space-y-3">
          {storageTree.length === 0 ? (
            <div className="bg-[#161F30] border border-slate-800/80 rounded-3xl p-8 text-center space-y-2.5">
              <FolderOpen className="w-11 h-11 text-slate-500 mx-auto" />
              <h3 className="text-sm font-black text-white">
                مجلد التنزيلات (MedFur) فارغ حالياً
              </h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
                عند تنزيل أي ملف من المكتبة أو فيديو من المرئيات أو حزمة أسئلة من بنك الأتمتة، يتم حفظها وترتيبها تلقائياً هنا حسب السنة والفصل والمادة.
              </p>
            </div>
          ) : (
            storageTree.map((yearNode) => {
              const isExpanded = expandedYears[yearNode.yearName] ?? true;
              return (
                <div
                  key={yearNode.yearName}
                  className="bg-[#161F30] border border-slate-800/90 rounded-3xl overflow-hidden shadow-xs"
                >
                  {/* Year Header Row */}
                  <button
                    type="button"
                    onClick={() => toggleYearExpand(yearNode.yearName)}
                    className="w-full p-4 bg-[#1A253A] hover:bg-[#1E2B42] flex items-center justify-between gap-3 text-right transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                        <FolderOpen className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm sm:text-base font-black text-white truncate">
                          MedFur / {yearNode.yearName}
                        </div>
                        <div className="text-[11px] font-bold text-slate-400 tabular-nums">
                          {yearNode.totalCount} عنصر • {yearNode.formattedSize}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="px-2.5 py-1 rounded-xl bg-emerald-500/15 text-emerald-300 text-xs font-black tabular-nums">
                        {yearNode.formattedSize}
                      </span>
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-slate-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-slate-400" />
                      )}
                    </div>
                  </button>

                  {/* Semesters & Subjects inside Year */}
                  {isExpanded && (
                    <div className="p-3.5 sm:p-4 space-y-4">
                      {yearNode.semesters.map((sem) => (
                        <div
                          key={sem.semesterName}
                          className="space-y-3 border-r-2 border-emerald-500/30 pr-3"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-black text-emerald-400">
                              📂 {sem.semesterName}
                            </span>
                            <span className="text-[11px] font-bold text-slate-400 tabular-nums">
                              {sem.totalCount} عنصر ({sem.formattedSize})
                            </span>
                          </div>

                          {sem.subjects.map((sub) => (
                            <div
                              key={sub.subjectName}
                              className="bg-[#0F1726] border border-slate-800/80 rounded-2xl p-3 space-y-2.5"
                            >
                              <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                                <span className="text-xs sm:text-sm font-black text-white">
                                  📁 {sub.subjectName}
                                </span>
                                <span className="text-[11px] font-bold text-sky-400 tabular-nums">
                                  {sub.formattedSize}
                                </span>
                              </div>

                              <div className="space-y-2">
                                {[
                                  ...sub.videos,
                                  ...sub.files,
                                  ...sub.questions,
                                ].map((item) => renderStorageItemCard(item))}
                              </div>
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      ) : (
        <div className="space-y-2.5">
          {storageTree
            .flatMap((y) =>
              y.semesters.flatMap((s) =>
                s.subjects.flatMap((sub) =>
                  activeTab === 'videos'
                    ? sub.videos
                    : activeTab === 'files'
                    ? sub.files
                    : sub.questions
                )
              )
            )
            .map((item) => renderStorageItemCard(item))}

          {((activeTab === 'videos' && storageBreakdown.videos.count === 0) ||
            (activeTab === 'files' && storageBreakdown.files.count === 0) ||
            (activeTab === 'questions' &&
              storageBreakdown.questions.count === 0)) && (
            <div className="bg-[#161F30] border border-slate-800/80 rounded-3xl p-8 text-center space-y-2">
              <HardDrive className="w-10 h-10 text-slate-500 mx-auto" />
              <p className="text-xs sm:text-sm font-black text-slate-300">
                لا توجد عناصر محملة في هذا التبويب حالياً
              </p>
            </div>
          )}
        </div>
      )}

      {/* Clear All Storage Button if items exist */}
      {storageBreakdown.totalItemsCount > 0 && (
        <div className="pt-2 flex justify-end">
          <button
            type="button"
            onClick={async () => {
              await clearAllCache();
              await refreshState();
              showToast('تم تفريغ جميع التنزيلات المحفوظة بنجاح');
            }}
            className="px-4 py-2.5 rounded-2xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 text-xs font-black flex items-center gap-2 cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
            <span>حذف جميع التنزيلات وتفريغ المساحة</span>
          </button>
        </div>
      )}
    </div>
  );
};

interface DownloadManagerProps {
  isOpen?: boolean;
  onClose?: () => void;
  onOpenMediaItem?: (record: StoredMediaRecord) => void;
  variant?: 'floating' | 'modal-only';
}

export const DownloadManager: React.FC<DownloadManagerProps> = ({
  isOpen: controlledIsOpen,
  onClose,
  variant = 'floating',
}) => {
  const {
    activeList,
    cachedRecords,
    storageBreakdown,
    isDownloadingCount,
    cancelDownload,
    removeCached,
    clearAllCache,
  } = useDownloadManager();

  const [internalOpen, setInternalOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'all' | 'file' | 'video'>('all');
  const [minimizedBar, setMinimizedBar] = useState(false);
  const [openWithTarget, setOpenWithTarget] =
    useState<ExternalOpenWithTarget | null>(null);

  const isDrawerOpen =
    controlledIsOpen !== undefined ? controlledIsOpen : internalOpen;

  const handleClose = () => {
    setInternalOpen(false);
    onClose?.();
  };

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
                      جاري التنزيل للهاتف ({isDownloadingCount})
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
              aria-label="فتح مدير التنزيلات"
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

      {isDrawerOpen && (
        <div
          dir="rtl"
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={handleClose}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full sm:max-w-xl bg-[#0E172A] border-t sm:border border-slate-800 rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[88dvh] overflow-hidden text-right text-white"
          >
            <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                  <HardDriveDownload className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-black text-sm sm:text-base text-white truncate">
                    مدير التنزيلات ومساحة الهاتف
                  </h3>
                  <p className="text-[11px] text-slate-400 tabular-nums">
                    المستهلك: {storageBreakdown.totalUsedFormatted} • المتاح:{' '}
                    {storageBreakdown.deviceFreeFormatted}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleClose}
                className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer shrink-0"
                aria-label="إغلاق مدير التنزيلات"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-4 py-2.5 bg-[#131D2E] border-b border-slate-800 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                {(
                  [
                    { id: 'all', label: `الكل (${cachedRecords.length})` },
                    { id: 'file', label: `ملفات (${storageBreakdown.files.count})` },
                    { id: 'video', label: `فيديوهات (${storageBreakdown.videos.count})` },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveFilter(tab.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                      activeFilter === tab.id
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-900 text-slate-400 border border-slate-800'
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
                  className="px-2.5 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>تفريغ الكل</span>
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {filteredRecords.map((rec) => {
                const isVid =
                  rec.itemType === 'video' || rec.mimeType?.startsWith('video/');
                const displayTitle =
                  rec.title || rec.fileName.replace(/\.[^/.]+$/, '');

                return (
                  <div
                    key={rec.id}
                    className="p-3 rounded-2xl bg-[#131D2E] border border-slate-800 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                          isVid
                            ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                            : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                        }`}
                      >
                        {isVid ? (
                          <Film className="w-5 h-5" />
                        ) : (
                          <FileText className="w-5 h-5" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <h5 className="text-xs sm:text-sm font-black text-white truncate">
                          {displayTitle}
                        </h5>
                        <p className="text-[10px] text-slate-400 tabular-nums truncate">
                          {formatFileSize(rec.sizeBytes)} • {rec.virtualPath || 'MedFur'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() =>
                          setOpenWithTarget({
                            id: rec.id,
                            mediaType: isVid ? 'video' : 'file',
                            title: displayTitle,
                            fileName: rec.fileName,
                            virtualPath: rec.virtualPath,
                            mimeType: rec.mimeType,
                            subtitle: rec.subtitle,
                            authorOrDoctor: rec.authorOrDoctor,
                            pages: rec.pages,
                            duration: rec.duration,
                            format: rec.format,
                          })
                        }
                        className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>فتح باستخدام</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => removeCached(rec.id)}
                        className="p-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <ExternalOpenWithSheet
        target={openWithTarget}
        onClose={() => setOpenWithTarget(null)}
        onConfirmOpen={async (target) => {
          setOpenWithTarget(null);
          await launchMediaInExternalPlayer({
            id: target.id,
            fileName: target.fileName,
            virtualPath: target.virtualPath,
            mimeType:
              target.mediaType === 'video'
                ? target.mimeType || 'video/mp4'
                : 'application/pdf',
            title: target.title,
            subtitle: target.subtitle,
            authorOrDoctor: target.authorOrDoctor,
            itemType: target.mediaType,
            pages: target.pages,
            duration: target.duration,
            format: target.format,
          });
        }}
      />
    </>
  );
};

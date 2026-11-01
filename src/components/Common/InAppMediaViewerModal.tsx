import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Download,
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
  FileText,
  Film,
  CheckCircle2,
  ExternalLink,
  BookOpen,
  User,
  Clock,
  HardDriveDownload,
} from 'lucide-react';
import {
  getOfflineMediaRecord,
  getTemporaryCachedObjectUrl,
  dataUrlToBlob,
  triggerDeviceSaveBlob,
  downloadMediaWithProgress,
  parseFileSizeToBytes,
} from '../../utils/fileHelpers';
import { ModernVideoPlayer } from './ModernVideoPlayer';
import { useDownloadManager, InlineDownloadStatus } from './DownloadManager';

export interface InAppViewerItem {
  id: string;
  type: 'file' | 'video';
  title: string;
  subtitle?: string;
  authorOrDoctor?: string;
  fileSize?: string;
  pages?: number;
  duration?: string;
  format?: string;
  url?: string;
  mimeType?: string;
  description?: string;
}

interface InAppMediaViewerModalProps {
  item: InAppViewerItem | null;
  onClose: () => void;
}

export const InAppMediaViewerModal: React.FC<InAppMediaViewerModalProps> = ({
  item,
  onClose,
}) => {
  const { activeDownloads, cachedIds, refreshState } = useDownloadManager();

  const [resolvedUrl, setResolvedUrl] = useState<string | null>(null);
  const [resolvedBlob, setResolvedBlob] = useState<Blob | null>(null);
  const [isOfflineCopy, setIsOfflineCopy] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [zoomPercent, setZoomPercent] = useState(100);
  const [textPreview, setTextPreview] = useState<string | null>(null);

  const modalContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!item) return;
    let createdObjectUrl: string | null = null;
    let isMounted = true;

    const loadMedia = async () => {
      setIsLoading(true);
      setTextPreview(null);
      setResolvedBlob(null);
      setIsOfflineCopy(false);

      // 1. Check in-memory temporary ObjectURL cache or IndexedDB offline storage first
      const record = await getOfflineMediaRecord(item.id);
      if (record && record.blob && record.blob.size > 0) {
        if (!isMounted) return;
        const memUrl = getTemporaryCachedObjectUrl(item.id);
        const objUrl = memUrl || URL.createObjectURL(record.blob);
        if (!memUrl) createdObjectUrl = objUrl;
        setResolvedBlob(record.blob);
        setResolvedUrl(objUrl);
        setIsOfflineCopy(true);
        if (
          record.mimeType.startsWith('text/') ||
          item.format?.toUpperCase() === 'TXT'
        ) {
          try {
            const txt = await record.blob.text();
            if (isMounted) setTextPreview(txt);
          } catch {
            // ignore
          }
        }
        setIsLoading(false);
        return;
      }

      // 2. If item.url is a Data URL, convert to Blob Object URL so iframe/video renders smoothly
      if (item.url && item.url.startsWith('data:')) {
        try {
          const blob = dataUrlToBlob(item.url);
          if (!isMounted) return;
          createdObjectUrl = URL.createObjectURL(blob);
          setResolvedBlob(blob);
          setResolvedUrl(createdObjectUrl);
          if (blob.type.startsWith('text/')) {
            const txt = await blob.text();
            if (isMounted) setTextPreview(txt);
          }
          setIsLoading(false);
          return;
        } catch {
          // fallback to raw url
        }
      }

      // 3. Standard URL
      if (isMounted) {
        setResolvedUrl(item.url && item.url !== '#' ? item.url : null);
        setIsLoading(false);
      }
    };

    loadMedia();

    return () => {
      isMounted = false;
      if (createdObjectUrl) {
        URL.revokeObjectURL(createdObjectUrl);
      }
    };
  }, [item, cachedIds.length]);

  if (!item) return null;

  const isItemCached = isOfflineCopy || cachedIds.includes(item.id);
  const currentDownloadProgress = activeDownloads[item.id];

  const handleToggleFullscreen = () => {
    if (!modalContainerRef.current) {
      setIsFullscreen((prev) => !prev);
      return;
    }
    if (!document.fullscreenElement) {
      modalContainerRef.current.requestFullscreen?.().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const handleStartInViewerDownload = async () => {
    try {
      const ext =
        item.type === 'video' ? 'mp4' : (item.format || 'pdf').toLowerCase();
      const expectedBytes =
        parseFileSizeToBytes(item.fileSize) ||
        (item.type === 'video' ? 1024 * 640 : 1024 * 256);

      const { blob, objectUrl } = await downloadMediaWithProgress({
        id: item.id,
        url: item.url,
        fileName: `${item.title}.${ext}`,
        mimeType:
          item.mimeType ||
          (item.type === 'video' ? 'video/mp4' : 'application/pdf'),
        expectedBytes,
        title: item.title,
        subtitle: item.subtitle,
        authorOrDoctor: item.authorOrDoctor,
        itemType: item.type,
        pages: item.pages,
        duration: item.duration,
        format: item.format,
      });

      setResolvedBlob(blob);
      setResolvedUrl(objectUrl);
      setIsOfflineCopy(true);
      if (blob.type.startsWith('text/')) {
        const txt = await blob.text();
        setTextPreview(txt);
      }
      refreshState();
    } catch {
      // handled by DownloadManager state
    }
  };

  const handleSaveToDevice = async () => {
    const ext =
      item.type === 'video' ? 'mp4' : (item.format || 'pdf').toLowerCase();
    const safeFileName = `${item.title}.${ext}`;
    if (resolvedBlob) {
      triggerDeviceSaveBlob(resolvedBlob, safeFileName);
    } else if (resolvedUrl) {
      const link = document.createElement('a');
      link.href = resolvedUrl;
      link.download = safeFileName;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      await handleStartInViewerDownload();
    }
  };

  return (
    <div
      dir="rtl"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div
        ref={modalContainerRef}
        className={`relative w-full bg-[#0E172A] border-t sm:border border-slate-800 shadow-2xl flex flex-col overflow-hidden transition-all ${
          isFullscreen
            ? 'h-screen max-w-none rounded-none'
            : 'max-w-4xl max-h-[94dvh] sm:max-h-[92vh] rounded-t-3xl sm:rounded-3xl'
        }`}
      >
        {/* Top Control Header */}
        <div className="p-3 sm:p-4 bg-[#131D2E] border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 text-white">
          {/* Right Info: Icon, Title & Offline Badge */}
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div
              className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0 ${
                item.type === 'video'
                  ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                  : 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
              }`}
            >
              {item.type === 'video' ? (
                <Film className="w-5 h-5" />
              ) : (
                <FileText className="w-5 h-5" />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                {isItemCached && (
                  <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[10px] font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>محفوظ مؤقتاً (يعمل بدون إنترنت)</span>
                  </span>
                )}
                {item.subtitle && (
                  <span className="text-purple-300 text-[10px] font-bold">
                    {item.subtitle}
                  </span>
                )}
              </div>
              <h3 className="font-black text-xs sm:text-sm text-white truncate mt-0.5">
                {item.title}
              </h3>
            </div>
          </div>

          {/* Left Controls: Zoom (for files), Temporary Download, Save to Device, Fullscreen, Close */}
          <div className="flex items-center gap-1.5 flex-wrap shrink-0">
            {item.type === 'file' && (
              <>
                <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-xl px-1.5 py-1">
                  <button
                    type="button"
                    onClick={() => setZoomPercent((z) => Math.max(70, z - 15))}
                    className="p-1 text-slate-300 hover:text-white cursor-pointer"
                    title="تصغير العرض"
                  >
                    <ZoomOut className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-[11px] font-bold text-emerald-400 px-1 tabular-nums">
                    {zoomPercent}%
                  </span>
                  <button
                    type="button"
                    onClick={() => setZoomPercent((z) => Math.min(200, z + 15))}
                    className="p-1 text-slate-300 hover:text-white cursor-pointer"
                    title="تكبير العرض"
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                  </button>
                </div>

                {!isItemCached && (
                  <button
                    type="button"
                    disabled={currentDownloadProgress?.status === 'downloading'}
                    onClick={handleStartInViewerDownload}
                    className="px-2.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                    title="تنزيل وحفظ الملف مؤقتاً داخل التطبيق"
                  >
                    <HardDriveDownload className="w-3.5 h-3.5" />
                    <span>تنزيل مؤقت</span>
                  </button>
                )}
              </>
            )}

            <button
              type="button"
              onClick={handleSaveToDevice}
              className="px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="حفظ نسخة على الجهاز"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">حفظ للجهاز</span>
            </button>

            <button
              type="button"
              onClick={handleToggleFullscreen}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors cursor-pointer"
              title={isFullscreen ? 'تصغير الشاشة' : 'ملء الشاشة'}
            >
              {isFullscreen ? (
                <Minimize2 className="w-4 h-4" />
              ) : (
                <Maximize2 className="w-4 h-4" />
              )}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-rose-600 text-slate-200 hover:text-white transition-colors cursor-pointer"
              title="إغلاق المشغل"
              aria-label="إغلاق المشغل"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* File Inline Download Progress Bar inside Document Viewer */}
        {item.type === 'file' && (currentDownloadProgress || isItemCached) && (
          <div className="px-3 sm:px-4 py-2 bg-[#0B1222] border-b border-slate-800">
            <InlineDownloadStatus
              itemId={item.id}
              itemType="file"
              progress={currentDownloadProgress}
              isCached={isItemCached}
              cachedSize={item.fileSize}
              onStartDownload={handleStartInViewerDownload}
              compact
            />
          </div>
        )}

        {/* Main Viewer Body */}
        <div className="flex-1 bg-slate-950 overflow-y-auto flex flex-col items-center justify-center min-h-[50vh] sm:min-h-[62vh] relative">
          {isLoading ? (
            <div className="text-center space-y-2 p-8">
              <div className="w-10 h-10 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs font-bold text-slate-300">
                جاري تجهيز المشغل...
              </p>
            </div>
          ) : item.type === 'video' ? (
            <ModernVideoPlayer
              id={item.id}
              title={item.title}
              subtitle={item.subtitle}
              doctorName={item.authorOrDoctor}
              description={item.description}
              videoUrl={resolvedUrl}
              mimeType={item.mimeType}
              durationStr={item.duration}
              fileSize={item.fileSize}
              isOfflineCached={isItemCached}
              downloadProgress={currentDownloadProgress}
              onTriggerDownload={handleStartInViewerDownload}
              onSaveToDevice={handleSaveToDevice}
            />
          ) : /* Document / PDF Viewer */ textPreview !== null ? (
            <div
              className="w-full h-full p-4 sm:p-6 overflow-y-auto text-right font-sans text-slate-100 leading-relaxed whitespace-pre-wrap"
              style={{ fontSize: `${Math.round((14 * zoomPercent) / 100)}px` }}
            >
              {textPreview}
            </div>
          ) : resolvedUrl ? (
            <div
              className="w-full h-[60vh] sm:h-[72vh] flex flex-col items-center overflow-auto bg-slate-900"
              style={{
                transform: `scale(${zoomPercent / 100})`,
                transformOrigin: 'top center',
              }}
            >
              <object
                data={resolvedUrl}
                type={item.mimeType || 'application/pdf'}
                className="w-full h-full flex-1 border-0"
              >
                <iframe
                  src={resolvedUrl}
                  title={item.title}
                  className="w-full h-full border-0"
                />
              </object>
            </div>
          ) : (
            <div className="text-center p-6 sm:p-8 space-y-4 max-w-md">
              <BookOpen className="w-12 h-12 text-purple-400 mx-auto opacity-80" />
              <h4 className="text-sm sm:text-base font-black text-white">
                {item.title}
              </h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                اضغط على زر التنزيل المؤقت أدناه لتوليد وحفظ نسخة الملف في الذاكرة المؤقتة للتطبيق وقراءتها مباشرةً.
              </p>
              <button
                type="button"
                onClick={handleStartInViewerDownload}
                className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold inline-flex items-center gap-2 cursor-pointer shadow-lg"
              >
                <HardDriveDownload className="w-4 h-4" />
                <span>تنزيل وحفظ الملف مؤقتاً للعرض</span>
              </button>
            </div>
          )}
        </div>

        {/* Bottom Metadata Footer */}
        <div className="p-3 sm:p-4 bg-[#131D2E] border-t border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-300">
          <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400 tabular-nums">
            {item.authorOrDoctor && (
              <span className="flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-emerald-400" />
                <span>{item.authorOrDoctor}</span>
              </span>
            )}
            {item.fileSize && (
              <span className="text-slate-200 font-bold">
                الحجم: {item.fileSize}
              </span>
            )}
            {item.pages && item.pages > 0 && (
              <span className="text-purple-300 font-bold">
                {item.pages} صفحة
              </span>
            )}
            {item.duration && (
              <span className="text-rose-300 font-bold flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span>{item.duration}</span>
              </span>
            )}
            {resolvedUrl &&
              !resolvedUrl.startsWith('blob:') &&
              !resolvedUrl.startsWith('data:') && (
                <a
                  href={resolvedUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sky-400 hover:underline flex items-center gap-1 font-bold"
                >
                  <ExternalLink className="w-3 h-3" />
                  <span>فتح في نافذة مستقلة</span>
                </a>
              )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold cursor-pointer"
          >
            إغلاق العارض
          </button>
        </div>
      </div>
    </div>
  );
};

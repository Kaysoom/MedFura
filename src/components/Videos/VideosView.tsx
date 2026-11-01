import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Play,
  Clock,
  Wifi,
  Download,
  ArrowRight,
  Upload,
  Search,
  Sparkles,
  Film,
  X,
  Trash2,
  User,
  CheckCircle2,
  GraduationCap,
  Edit3,
  ArrowUp,
  ArrowDown,
  Pin,
  HardDriveDownload,
} from 'lucide-react';
import { VideoItem, AcademicYearId, SemesterType, SubjectItem } from '../../types';
import { ConfirmationDialog } from '../Common/ConfirmationDialog';
import { InAppSelect } from '../Common/InAppSelect';
import {
  SubjectMedicalIcon,
  resolveSubjectMedicalIcon,
} from '../Common/SubjectMedicalIcon';
import {
  extractVideoMetadata,
  formatVideoDuration,
  parseDurationToSeconds,
  formatTotalHoursDuration,
  saveOfflineMediaBlob,
  downloadMediaWithProgress,
  parseFileSizeToBytes,
  removeOfflineMediaRecord,
  StoredMediaRecord,
} from '../../utils/fileHelpers';
import {
  InAppMediaViewerModal,
  InAppViewerItem,
} from '../Common/InAppMediaViewerModal';
import {
  MediaLaunchChoiceModal,
  MediaLaunchTarget,
} from '../Common/MediaLaunchChoiceModal';
import {
  DownloadManager,
  InlineDownloadStatus,
  useDownloadManager,
} from '../Common/DownloadManager';
import { buildStructuredMedFurFileName } from '../../utils/mediaAndOfflineLogic';

function extractYouTubeInfo(
  rawUrl: string
): { id: string; embedUrl: string; thumbnail: string } | null {
  const match = rawUrl.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
  );
  if (!match) return null;
  const id = match[1];
  return {
    id,
    embedUrl: `https://www.youtube.com/embed/${id}`,
    thumbnail: `https://img.youtube.com/vi/${id}/hqdefault.jpg`,
  };
}

export const VideosView: React.FC = () => {
  const {
    subjects,
    videos,
    addVideo,
    updateVideo,
    deleteVideo,
    moveVideo,
    togglePinVideo,
    isAdmin,
  } = useApp();

  const {
    activeDownloads,
    cachedIds,
    cachedRecords,
    isDownloadingCount,
    refreshState,
  } = useDownloadManager();

  // 1. Controls State
  const [selectedYear, setSelectedYear] = useState<AcademicYearId>('year-3');
  const [selectedSemester, setSelectedSemester] = useState<SemesterType>('first');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);

  // Search filter
  const [searchQuery, setSearchQuery] = useState('');

  // In-App Video Player & Launch Choice Modal State
  const [viewerItem, setViewerItem] = useState<InAppViewerItem | null>(null);
  const [launchChoiceTarget, setLaunchChoiceTarget] =
    useState<MediaLaunchTarget | null>(null);
  const [isDownloadManagerOpen, setIsDownloadManagerOpen] = useState(false);

  // Offline & Real Download Notice State
  const [downloadNotice, setDownloadNotice] = useState<string | null>(null);

  // Supervisor Upload / Edit Modal
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [editingVideoId, setEditingVideoId] = useState<string | null>(null);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadDoctor, setUploadDoctor] = useState('');
  const [uploadChapterName, setUploadChapterName] = useState('');
  const [uploadDuration, setUploadDuration] = useState('يُقرأ تلقائياً من الفيديو');
  const [uploadDurationSeconds, setUploadDurationSeconds] = useState<number>(0);
  const [uploadedVideoSize, setUploadedVideoSize] = useState<string>('يُقرأ تلقائياً من الفيديو');
  const [uploadedVideoSizeBytes, setUploadedVideoSizeBytes] = useState<number>(0);
  const [uploadedVideoMimeType, setUploadedVideoMimeType] = useState<string>('video/mp4');
  const [selectedRawVideoFile, setSelectedRawVideoFile] = useState<File | null>(null);
  const [uploadDescription, setUploadDescription] = useState('');
  const [uploadSubjectId, setUploadSubjectId] = useState<string>('');
  const [uploadVideoUrl, setUploadVideoUrl] = useState('');
  const [uploadThumbnail, setUploadThumbnail] = useState('');
  const [uploadRequiresInternet, setUploadRequiresInternet] = useState(true);

  // Confirm Dialog state
  const [confirmDeleteVideo, setConfirmDeleteVideo] = useState<VideoItem | null>(null);

  // File upload from device
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);

  const academicYearsList = [
    { id: 'year-3' as AcademicYearId, name: 'السنة الثالثة', badge: '3' },
    { id: 'year-2' as AcademicYearId, name: 'السنة الثانية', badge: '2' },
    { id: 'year-prep' as AcademicYearId, name: 'السنة التحضيرية', badge: 'تحضيري' },
    { id: 'year-4' as AcademicYearId, name: 'السنة الرابعة', badge: '4' },
    { id: 'year-5' as AcademicYearId, name: 'السنة الخامسة', badge: '5' },
    { id: 'year-6' as AcademicYearId, name: 'السنة السادسة', badge: '6' },
  ];

  // Subjects belonging to current year and semester
  const availableSubjects = useMemo(() => {
    return subjects.filter(
      (s) => s.yearId === selectedYear && s.semester === selectedSemester
    );
  }, [subjects, selectedYear, selectedSemester]);

  // Selected subject object
  const activeSubject = useMemo(() => {
    if (!selectedSubjectId) return null;
    return subjects.find((s) => s.id === selectedSubjectId) || null;
  }, [subjects, selectedSubjectId]);

  // Videos belonging to active subject sorted by Pinned first, then Admin orderIndex
  const currentSubjectVideos = useMemo(() => {
    if (!activeSubject) return [];
    return videos
      .filter((v) => v.subjectId === activeSubject.id)
      .sort((a, b) => {
        if (Boolean(b.isPinned) !== Boolean(a.isPinned)) {
          return b.isPinned ? 1 : -1;
        }
        return (a.orderIndex ?? 9999) - (b.orderIndex ?? 9999);
      });
  }, [videos, activeSubject]);

  // Filtered videos when in subject view or search
  const displayedVideos = useMemo(() => {
    let list = currentSubjectVideos;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (v) =>
          v.title.toLowerCase().includes(q) ||
          v.doctorName.toLowerCase().includes(q) ||
          (v.chapterName && v.chapterName.toLowerCase().includes(q))
      );
    }
    return list;
  }, [currentSubjectVideos, searchQuery]);

  // Real dynamic duration calculation for a subject based on actual uploaded videos
  const getSubjectDuration = (sub: SubjectItem) => {
    const subVids = videos.filter((v) => v.subjectId === sub.id);
    if (subVids.length === 0) return '00:00:00';
    const totalSec = subVids.reduce(
      (acc, v) => acc + parseDurationToSeconds(v.duration, v.durationSeconds),
      0
    );
    return formatTotalHoursDuration(totalSec);
  };

  const getSubjectVideoCount = (sub: SubjectItem) => {
    return videos.filter((v) => v.subjectId === sub.id).length;
  };

  const resolveVideoMedFurMeta = (vid: {
    subjectId?: string;
    yearId?: AcademicYearId;
    academicYear?: string;
    semester?: SemesterType;
    title: string;
  }) => {
    const subObj = subjects.find((s) => s.id === vid.subjectId);
    return buildStructuredMedFurFileName({
      yearId: vid.yearId || subObj?.yearId || selectedYear,
      yearLabel: vid.academicYear,
      semester: vid.semester || subObj?.semester || selectedSemester,
      subjectOrFolderName: subObj?.name || 'المرئيات الطبية',
      mediaType: 'video',
      title: vid.title,
      extension: 'mp4',
    });
  };

  // Open Video directly inside the In-App Player Modal
  const openVideoDirectlyInApp = (vid: VideoItem) => {
    updateVideo(vid.id, { viewsCount: (vid.viewsCount || 0) + 1 });
    setViewerItem({
      id: vid.id,
      type: 'video',
      title: vid.title,
      subtitle: vid.chapterName || vid.academicYear,
      authorOrDoctor: vid.doctorName,
      fileSize: vid.fileSize,
      duration: vid.duration,
      url: vid.videoUrl,
      mimeType: vid.mimeType || 'video/mp4',
      description: vid.description,
    });
  };

  // Show fast chooser modal (In-App Player vs External Player) when clicking a video
  const handlePlayVideoInApp = (vid: VideoItem) => {
    const medfurMeta = resolveVideoMedFurMeta(vid);
    setLaunchChoiceTarget({
      id: vid.id,
      type: 'video',
      title: vid.title,
      subtitle: vid.chapterName || vid.academicYear,
      authorOrDoctor: vid.doctorName,
      fileName: medfurMeta.fileName,
      virtualPath: medfurMeta.virtualPath,
      url: vid.videoUrl,
      mimeType: vid.mimeType || 'video/mp4',
      fileSize: vid.fileSize,
      duration: vid.duration,
      description: vid.description,
      isCachedOffline:
        cachedIds.includes(vid.id) || vid.requiresInternet === false,
    });
  };

  const handleOpenFromDownloadManager = (record: StoredMediaRecord) => {
    setViewerItem({
      id: record.id,
      type:
        record.itemType ||
        (record.mimeType?.startsWith('video/') ? 'video' : 'file'),
      title: record.title || record.fileName.replace(/\.[^/.]+$/, ''),
      subtitle: record.subtitle,
      authorOrDoctor: record.authorOrDoctor,
      pages: record.pages,
      duration: record.duration,
      format: record.format,
      mimeType: record.mimeType,
    });
  };

  // Real Streaming Download for Video with Progress Bar, IndexedDB Caching & External Device Save with MedFur Filename
  const handleDownloadVideo = async (
    e: React.MouseEvent | null,
    vid: VideoItem
  ) => {
    e?.stopPropagation();
    try {
      const expectedBytes =
        vid.fileSizeBytes ||
        parseFileSizeToBytes(vid.fileSize) ||
        1024 * 640;

      const medfurMeta = resolveVideoMedFurMeta(vid);

      await downloadMediaWithProgress({
        id: vid.id,
        url: vid.videoUrl,
        fileName: medfurMeta.fileName,
        mimeType: vid.mimeType || 'video/mp4',
        expectedBytes,
        title: vid.title,
        subtitle: vid.chapterName || vid.academicYear,
        authorOrDoctor: vid.doctorName,
        itemType: 'video',
        duration: vid.duration,
        virtualPath: medfurMeta.virtualPath,
        saveToDevice: true,
      });

      refreshState();
      await updateVideo(vid.id, { requiresInternet: false });

      setDownloadNotice(
        `تم حفظ الفيديو داخل التطبيق وتنزيله لجهازك بالاسم المنظم: ${medfurMeta.fileName}`
      );
      setTimeout(() => {
        setDownloadNotice(null);
      }, 4500);
    } catch {
      // handled by InlineDownloadStatus
    }
  };

  // Handle device file upload for video with automatic duration, real size & cover capture
  const handleDeviceVideoUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingFile(true);
    setSelectedRawVideoFile(file);
    setUploadedFileName(file.name);

    try {
      const meta = await extractVideoMetadata(file);
      if (!uploadTitle.trim() || !editingVideoId) {
        setUploadTitle(meta.cleanTitle);
      }
      setUploadedVideoSize(meta.fileSize);
      setUploadedVideoSizeBytes(meta.fileSizeBytes);
      setUploadDuration(meta.durationFormatted);
      setUploadDurationSeconds(meta.durationSeconds);
      setUploadedVideoMimeType(meta.mimeType);
      setUploadRequiresInternet(false);
      if (meta.thumbnailDataUrl) {
        setUploadThumbnail(meta.thumbnailDataUrl);
      }

      if (file.size <= 3 * 1024 * 1024) {
        const reader = new FileReader();
        reader.onload = () => {
          setUploadVideoUrl(reader.result as string);
        };
        reader.readAsDataURL(file);
      } else {
        setUploadVideoUrl('');
      }
    } finally {
      setIsProcessingFile(false);
    }
  };

  // Handle external URL input with automatic YouTube / direct MP4 metadata resolution
  const handleExternalVideoUrlChange = (rawVal: string) => {
    setUploadVideoUrl(rawVal);
    const trimmed = rawVal.trim();
    if (!trimmed) return;

    const yt = extractYouTubeInfo(trimmed);
    if (yt) {
      setUploadThumbnail(yt.thumbnail);
      setUploadedVideoSize('بث يوتيوب');
      setUploadRequiresInternet(true);
      return;
    }

    if (/\.(mp4|webm|ogg|mov)(\?|$)/i.test(trimmed)) {
      const tempVid = document.createElement('video');
      tempVid.preload = 'metadata';
      tempVid.crossOrigin = 'anonymous';
      tempVid.src = trimmed;
      tempVid.onloadedmetadata = () => {
        if (Number.isFinite(tempVid.duration) && tempVid.duration > 0) {
          setUploadDurationSeconds(Math.round(tempVid.duration));
          setUploadDuration(formatVideoDuration(tempVid.duration));
        }
      };
    }
  };

  const handleOpenEditVideo = (vid: VideoItem) => {
    setEditingVideoId(vid.id);
    setUploadTitle(vid.title);
    setUploadDoctor(vid.doctorName);
    setUploadChapterName(vid.chapterName || '');
    setUploadDuration(vid.duration);
    setUploadDurationSeconds(vid.durationSeconds || 0);
    setUploadedVideoSize(vid.fileSize || 'محفوظ');
    setUploadedVideoSizeBytes(vid.fileSizeBytes || 0);
    setUploadedVideoMimeType(vid.mimeType || 'video/mp4');
    setSelectedRawVideoFile(null);
    setUploadDescription(vid.description || '');
    setUploadSubjectId(vid.subjectId);
    setUploadVideoUrl(vid.videoUrl);
    setUploadThumbnail(vid.thumbnail || '');
    setUploadRequiresInternet(vid.requiresInternet ?? true);
    setIsUploadModalOpen(true);
  };

  // Submit Video Upload / Edit
  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadTitle.trim()) return;

    const targetSubId =
      uploadSubjectId ||
      activeSubject?.id ||
      availableSubjects[0]?.id ||
      'sub-y3-anat-3';
    const yearLabel =
      academicYearsList.find((y) => y.id === selectedYear)?.name ||
      'السنة الثالثة';

    const ytInfo = extractYouTubeInfo(uploadVideoUrl.trim());
    const finalVideoUrl = ytInfo ? ytInfo.embedUrl : uploadVideoUrl.trim();
    const finalThumbnail =
      uploadThumbnail.trim() || (ytInfo ? ytInfo.thumbnail : '');
    const finalDuration =
      uploadDuration && uploadDuration !== 'يُقرأ تلقائياً من الفيديو'
        ? uploadDuration.trim()
        : '10:00 دقيقة';
    const finalSize =
      uploadedVideoSize && uploadedVideoSize !== 'يُقرأ تلقائياً من الفيديو'
        ? uploadedVideoSize.trim()
        : '640 KB';

    if (editingVideoId) {
      if (selectedRawVideoFile) {
        const medfurMeta = resolveVideoMedFurMeta({
          subjectId: targetSubId,
          yearId: selectedYear,
          academicYear: yearLabel,
          semester: selectedSemester,
          title: uploadTitle.trim(),
        });
        await saveOfflineMediaBlob(
          editingVideoId,
          selectedRawVideoFile,
          medfurMeta.fileName,
          uploadedVideoMimeType,
          {
            title: uploadTitle.trim(),
            itemType: 'video',
            subtitle: uploadChapterName.trim() || 'محاضرة مصورة',
            authorOrDoctor: uploadDoctor.trim() || 'الإشراف الأكاديمي',
            duration: finalDuration,
            virtualPath: medfurMeta.virtualPath,
          }
        );
        refreshState();
      }

      await updateVideo(editingVideoId, {
        subjectId: targetSubId,
        chapterName: uploadChapterName.trim() || 'محاضرة مصورة',
        title: uploadTitle.trim(),
        doctorName: uploadDoctor.trim() || 'الإشراف الأكاديمي',
        duration: finalDuration,
        durationSeconds: uploadDurationSeconds || undefined,
        fileSize: finalSize,
        fileSizeBytes: uploadedVideoSizeBytes || undefined,
        mimeType: uploadedVideoMimeType,
        videoUrl: finalVideoUrl,
        thumbnail: finalThumbnail || undefined,
        description: uploadDescription.trim() || undefined,
        requiresInternet: selectedRawVideoFile ? false : uploadRequiresInternet,
      });
    } else {
      const createdId = await addVideo({
        subjectId: targetSubId,
        chapterName: uploadChapterName.trim() || 'محاضرة مصورة',
        title: uploadTitle.trim(),
        doctorName: uploadDoctor.trim() || 'الإشراف الأكاديمي',
        duration: finalDuration,
        durationSeconds: uploadDurationSeconds || undefined,
        fileSize: finalSize,
        fileSizeBytes: uploadedVideoSizeBytes || undefined,
        mimeType: uploadedVideoMimeType,
        videoUrl: finalVideoUrl,
        thumbnail: finalThumbnail || undefined,
        academicYear: yearLabel,
        yearId: selectedYear,
        semester: selectedSemester,
        description: uploadDescription.trim() || undefined,
        requiresInternet: selectedRawVideoFile ? false : uploadRequiresInternet,
      });

      if (selectedRawVideoFile && createdId) {
        const medfurMeta = resolveVideoMedFurMeta({
          subjectId: targetSubId,
          yearId: selectedYear,
          academicYear: yearLabel,
          semester: selectedSemester,
          title: uploadTitle.trim(),
        });
        await saveOfflineMediaBlob(
          createdId,
          selectedRawVideoFile,
          medfurMeta.fileName,
          uploadedVideoMimeType,
          {
            title: uploadTitle.trim(),
            itemType: 'video',
            subtitle: uploadChapterName.trim() || 'محاضرة مصورة',
            authorOrDoctor: uploadDoctor.trim() || 'الإشراف الأكاديمي',
            duration: finalDuration,
            virtualPath: medfurMeta.virtualPath,
          }
        );
        refreshState();
      }
    }

    setEditingVideoId(null);
    setUploadTitle('');
    setUploadDoctor('');
    setUploadChapterName('');
    setUploadVideoUrl('');
    setUploadThumbnail('');
    setUploadDuration('يُقرأ تلقائياً من الفيديو');
    setUploadDurationSeconds(0);
    setUploadedVideoSize('يُقرأ تلقائياً من الفيديو');
    setUploadedVideoSizeBytes(0);
    setSelectedRawVideoFile(null);
    setUploadDescription('');
    setUploadedFileName(null);
    setIsUploadModalOpen(false);
  };

  return (
    <div
      dir="rtl"
      className="w-full max-w-6xl mx-auto px-3 sm:px-6 py-3.5 sm:py-5 space-y-4 text-right selection:bg-rose-500 selection:text-white overflow-x-hidden"
    >
      {/* Toast Notification */}
      {downloadNotice && (
        <div className="p-3.5 rounded-2xl bg-slate-900 border border-emerald-500/50 text-white shadow-xl flex items-center justify-between gap-2.5 animate-in fade-in duration-300">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="text-xs font-bold">{downloadNotice}</span>
          </div>
          <button
            type="button"
            onClick={() => setIsDownloadManagerOpen(true)}
            className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white text-[11px] font-bold shrink-0 cursor-pointer"
          >
            عرض التنزيلات
          </button>
        </div>
      )}

      {/* ======================================================== */}
      {/* VIEW A: LIST OF SUBJECTS (شاشة القائمة والمواد)             */}
      {/* ======================================================== */}
      {!selectedSubjectId ? (
        <div className="space-y-4 animate-in fade-in duration-200">
          {/* Compact Header Controls Banner */}
          <div className="bg-gradient-to-r from-rose-700 via-pink-700 to-rose-900 text-white p-4 sm:p-6 rounded-2xl shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-1.5 text-[11px] font-bold text-rose-100">
                <Film className="w-3.5 h-3.5" />
                <span>المرئيات والشروحات الأكاديمية</span>
              </div>
              <h1 className="text-base sm:text-2xl font-black leading-snug">
                بوابة الفيديوهات والمحاضرات المصورة
              </h1>
              <p className="text-[11px] sm:text-xs text-rose-100 max-w-xl leading-relaxed">
                مشغل فيديو حديث متكامل مع دعم التقديم والترجيع، التحكم بالسرعة، والتنزيل المؤقت للتشغيل بدون إنترنت.
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap shrink-0">
              <button
                type="button"
                onClick={() => setIsDownloadManagerOpen(true)}
                className="px-3 py-2 rounded-xl bg-black/25 hover:bg-black/40 border border-white/20 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <HardDriveDownload
                  className={`w-4 h-4 text-emerald-300 ${
                    isDownloadingCount > 0 ? 'animate-bounce' : ''
                  }`}
                />
                <span>مدير التنزيلات</span>
                <span className="px-1.5 py-0.5 rounded-md bg-white/15 text-[10px] font-black tabular-nums">
                  {cachedRecords.length}
                </span>
              </button>

              {/* Supervisor Upload CTA */}
              {isAdmin && (
                <button
                  onClick={() => {
                    setEditingVideoId(null);
                    setUploadTitle('');
                    setUploadDoctor('');
                    setUploadChapterName('');
                    setUploadVideoUrl('');
                    setUploadThumbnail('');
                    setUploadDuration('يُقرأ تلقائياً من الفيديو');
                    setUploadDurationSeconds(0);
                    setUploadedVideoSize('يُقرأ تلقائياً من الفيديو');
                    setUploadedVideoSizeBytes(0);
                    setSelectedRawVideoFile(null);
                    setUploadedFileName(null);
                    setUploadDescription('');
                    setUploadSubjectId(availableSubjects[0]?.id || '');
                    setIsUploadModalOpen(true);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-white text-rose-700 hover:bg-rose-50 text-xs font-black transition-all cursor-pointer shadow-md flex items-center justify-center gap-1.5 shrink-0"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>رفع فيديو جديد</span>
                </button>
              )}
            </div>
          </div>

          {/* Filter Bar: Dropdown for Academic Year & Toggle Buttons for Semesters */}
          <div className="bg-white dark:bg-slate-900 p-3.5 sm:p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3 sm:space-y-0 sm:flex sm:items-center sm:justify-between gap-3">
            {/* 1. Academic Year In-App Selector */}
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-xs font-black text-slate-500 shrink-0">
                السنة:
              </span>
              <div className="flex-1 sm:w-60">
                <InAppSelect<AcademicYearId>
                  value={selectedYear}
                  onChange={(val) => setSelectedYear(val)}
                  size="sm"
                  variant="adaptive"
                  icon={<GraduationCap className="w-4 h-4" />}
                  options={academicYearsList.map((yr) => ({
                    value: yr.id,
                    label: yr.name,
                  }))}
                />
              </div>
            </div>

            {/* 2. Semester Toggle Buttons */}
            <div className="flex items-center justify-between sm:justify-end gap-2">
              <div className="p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center gap-1">
                <button
                  onClick={() => setSelectedSemester('first')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    selectedSemester === 'first'
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  الفصل الأول
                </button>
                <button
                  onClick={() => setSelectedSemester('second')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    selectedSemester === 'second'
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  الفصل الثاني
                </button>
              </div>

              <div className="text-[11px] font-bold text-slate-400 font-mono shrink-0">
                {availableSubjects.length} مقررات
              </div>
            </div>
          </div>

          {/* 3. Subject Cards Grid (بطاقات المواد) */}
          <div className="space-y-3">
            <h3 className="text-sm font-black text-slate-400 px-1">
              اختر المادة لعرض فيديوهاتها وشروحاتها:
            </h3>

            {availableSubjects.length === 0 ? (
              <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8 space-y-3">
                <Film className="w-12 h-12 text-slate-400 mx-auto opacity-40" />
                <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">
                  لا توجد مواد مسجلة لهذا الفصل في السنة المختارة
                </h4>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {availableSubjects.map((sub) => {
                  const videoCount = getSubjectVideoCount(sub);
                  const duration = getSubjectDuration(sub);
                  const { accentColor } = resolveSubjectMedicalIcon(sub);

                  return (
                    <div
                      key={sub.id}
                      onClick={() => {
                        setSelectedSubjectId(sub.id);
                        setSearchQuery('');
                      }}
                      className="group bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-3xl border border-slate-200 dark:border-slate-800 hover:border-rose-500/50 hover:shadow-xl transition-all cursor-pointer flex items-center justify-between gap-3.5 text-right min-w-0"
                    >
                      <div className="w-9 h-9 rounded-2xl bg-slate-100 dark:bg-slate-800 group-hover:bg-rose-600 group-hover:text-white text-slate-400 flex items-center justify-center transition-colors shrink-0">
                        <ArrowRight className="w-4 h-4 rotate-180" />
                      </div>

                      <div className="flex-1 min-w-0 space-y-1.5">
                        <h4 className="font-black text-sm sm:text-base text-slate-900 dark:text-white group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors line-clamp-1">
                          {sub.name}
                        </h4>

                        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium font-mono flex flex-wrap items-center justify-end gap-1.5">
                          <span>{videoCount} فيديو</span>
                          <span>•</span>
                          <span className="text-rose-600 dark:text-rose-400 font-bold">
                            {duration}
                          </span>
                        </p>
                      </div>

                      <div
                        className="subject-medical-badge w-13 h-13 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-md group-hover:scale-105 transition-transform border"
                        style={{
                          backgroundColor: `${accentColor}18`,
                          borderColor: `${accentColor}40`,
                          color: accentColor,
                        }}
                      >
                        <SubjectMedicalIcon
                          subject={sub}
                          className="w-6 h-6 sm:w-7 sm:h-7"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* ======================================================== */
        /* VIEW B: SINGLE SUBJECT VIDEOS (شاشة عرض الفيديوهات للمادة الواحدة) */
        /* ======================================================== */
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Back button and path */}
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            <button
              onClick={() => setSelectedSubjectId(null)}
              className="px-4 py-2 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 hover:text-rose-600 hover:border-rose-400 transition-colors flex items-center gap-2 cursor-pointer shadow-xs"
            >
              <ArrowRight className="w-4 h-4" />
              <span>الرجوع إلى قائمة المقررات</span>
            </button>

            {isAdmin && (
              <button
                onClick={() => {
                  setEditingVideoId(null);
                  setUploadTitle('');
                  setUploadDoctor('');
                  setUploadChapterName('');
                  setUploadVideoUrl('');
                  setUploadThumbnail('');
                  setUploadDuration('يُقرأ تلقائياً من الفيديو');
                  setUploadDurationSeconds(0);
                  setUploadedVideoSize('يُقرأ تلقائياً من الفيديو');
                  setUploadedVideoSizeBytes(0);
                  setSelectedRawVideoFile(null);
                  setUploadedFileName(null);
                  setUploadDescription('');
                  setUploadSubjectId(activeSubject?.id || '');
                  setIsUploadModalOpen(true);
                }}
                className="px-4 py-2 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-md"
              >
                <Upload className="w-4 h-4" />
                <span>رفع فيديو جديد لهذا المقرر</span>
              </button>
            )}
          </div>

          {/* Top Bar showing Course, Video Count & Real Total Hours */}
          {activeSubject && (
            <div className="bg-gradient-to-r from-slate-900 via-rose-950 to-slate-900 border border-rose-500/30 p-4 sm:p-5 rounded-2xl text-white shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
              <div className="space-y-1.5 min-w-0">
                <span className="text-[11px] text-rose-300 block">
                  {selectedSemester === 'first' ? 'الفصل الأول' : 'الفصل الثاني'}{' '}
                  •{' '}
                  {
                    academicYearsList.find((y) => y.id === selectedYear)?.name
                  }
                </span>
                <h2 className="text-base sm:text-2xl font-black break-words">
                  مرئيات مقرر {activeSubject.name}
                </h2>
                <p className="text-[11px] sm:text-xs text-slate-300 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                  <span className="truncate">
                    {activeSubject.department || 'القسم الأكاديمي'}
                  </span>
                </p>
              </div>

              {/* Dynamic Stats Box */}
              <div className="flex items-center gap-3 bg-white/5 border border-white/10 p-2.5 px-4 rounded-xl shrink-0 self-start sm:self-auto font-mono text-center">
                <div className="px-2.5 border-l border-white/10">
                  <div className="text-base sm:text-xl font-black text-rose-400">
                    {displayedVideos.length}
                  </div>
                  <div className="text-[10px] text-slate-400 font-sans">
                    فيديو
                  </div>
                </div>
                <div className="px-2.5">
                  <div className="text-base sm:text-xl font-black text-emerald-400">
                    {getSubjectDuration(activeSubject)}
                  </div>
                  <div className="text-[10px] text-slate-400 font-sans">
                    إجمالي المدة
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Search within subject */}
          <div className="relative max-w-md mr-auto w-full">
            <input
              type="text"
              placeholder="البحث في فيديوهات ومحاضرات هذا المقرر..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pr-10 pl-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs font-semibold text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:border-rose-500 text-right shadow-xs"
            />
            <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
          </div>

          {/* 2. Video Cards Grid (بطاقات الفيديوهات) */}
          {displayedVideos.length === 0 ? (
            <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8 space-y-3">
              <Film className="w-12 h-12 text-slate-400 mx-auto opacity-40" />
              <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">
                لا توجد فيديوهات مرفوعة في هذا المقرر حالياً
              </h4>
              <p className="text-xs text-slate-400">
                يمكن للمشرف رفع فيديوهات وشروحات جديدة مباشرة عبر زر الرفع أعلاه.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
              {displayedVideos.map((vid, idx) => {
                const progress = activeDownloads[vid.id];
                const isOffline =
                  cachedIds.includes(vid.id) || vid.requiresInternet === false;

                return (
                  <div
                    key={vid.id}
                    className={`group bg-white dark:bg-slate-900 rounded-3xl overflow-hidden border ${
                      vid.isPinned
                        ? 'border-amber-500/60 shadow-lg'
                        : 'border-slate-200 dark:border-slate-800'
                    } hover:border-rose-500/50 hover:shadow-xl transition-all flex flex-col justify-between min-w-0`}
                  >
                    {/* Thumbnail with duration & size badge */}
                    <div
                      onClick={() => handlePlayVideoInApp(vid)}
                      className="relative aspect-video overflow-hidden bg-slate-950 cursor-pointer flex items-center justify-center"
                    >
                      {vid.thumbnail ? (
                        <img
                          src={vid.thumbnail}
                          alt={vid.title}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 opacity-90"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-slate-900 via-rose-950/60 to-slate-950 flex items-center justify-center">
                          <Film className="w-12 h-12 text-rose-500/40" />
                        </div>
                      )}

                      {/* Scrim & Play Overlay Button */}
                      <div className="absolute inset-0 bg-black/30 group-hover:bg-black/15 transition-colors flex items-center justify-center">
                        <div className="w-12 h-12 rounded-full bg-rose-600/95 text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                          <Play className="w-5 h-5 fill-white mr-0.5" />
                        </div>
                      </div>

                      {/* Duration & Size Badges */}
                      <div className="absolute bottom-2.5 left-2.5 flex items-center gap-1.5">
                        <div className="bg-black/80 backdrop-blur-md px-2.5 py-1 rounded-lg text-[11px] font-mono text-white flex items-center gap-1.5 shadow-md">
                          <Clock className="w-3.5 h-3.5 text-rose-400" />
                          <span>{vid.duration}</span>
                        </div>
                        {vid.fileSize && (
                          <div className="bg-black/80 backdrop-blur-md px-2 py-1 rounded-lg text-[10px] font-mono text-emerald-300 shadow-md">
                            {vid.fileSize}
                          </div>
                        )}
                      </div>

                      {/* Offline vs Internet Badge */}
                      {isOffline ? (
                        <div className="absolute top-2.5 left-2.5 bg-emerald-950/90 backdrop-blur-md px-2.5 py-1 rounded-lg text-[10px] font-bold text-emerald-300 flex items-center gap-1 shadow-md border border-emerald-500/40">
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          <span>محفوظ مؤقتاً</span>
                        </div>
                      ) : (
                        <div className="absolute top-2.5 left-2.5 bg-slate-900/85 backdrop-blur-md px-2.5 py-1 rounded-lg text-[10px] font-bold text-amber-300 flex items-center gap-1.5 shadow-md border border-amber-500/30">
                          <Wifi className="w-3 h-3 text-amber-400" />
                          <span>بث مباشر</span>
                        </div>
                      )}

                      {/* Chapter/Lecture & Pin tag */}
                      <div className="absolute top-2.5 right-2.5 flex items-center gap-1 max-w-[70%]">
                        {vid.isPinned && (
                          <span className="bg-amber-500 text-slate-950 px-2 py-0.5 rounded-lg text-[10px] font-black flex items-center gap-0.5 shadow-xs shrink-0">
                            <Pin className="w-2.5 h-2.5" />
                            <span>مثبت</span>
                          </span>
                        )}
                        {vid.chapterName && (
                          <div className="bg-rose-600/90 backdrop-blur-md px-2.5 py-0.5 rounded-lg text-[10px] font-bold text-white shadow-xs line-clamp-1">
                            {vid.chapterName}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Video Details */}
                    <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-3.5 min-w-0">
                      <div className="space-y-2 min-w-0">
                        <h4
                          onClick={() => handlePlayVideoInApp(vid)}
                          className="font-black text-sm sm:text-base text-slate-900 dark:text-white group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors leading-snug line-clamp-2 cursor-pointer break-words"
                        >
                          {vid.title}
                        </h4>

                        <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">
                            المحاضر: {vid.doctorName}
                          </span>
                        </p>

                        {vid.description && (
                          <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed break-words">
                            {vid.description}
                          </p>
                        )}
                      </div>

                      {/* Visual Download & Temporary Cache Status Bar */}
                      <InlineDownloadStatus
                        itemId={vid.id}
                        itemType="video"
                        progress={progress}
                        isCached={isOffline}
                        cachedSize={vid.fileSize}
                        onStartDownload={() => handleDownloadVideo(null, vid)}
                        onOpenInApp={() => handlePlayVideoInApp(vid)}
                        compact
                      />

                      {/* Action Buttons: زر التشغيل بالمشغل الحديث + زر التنزيل المؤقت + أدوات المشرف */}
                      <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          {/* Play Chooser (In-App or External Player) Button */}
                          <button
                            type="button"
                            onClick={() => handlePlayVideoInApp(vid)}
                            className="flex-1 min-h-[40px] py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all cursor-pointer shadow-sm flex items-center justify-center gap-1.5"
                          >
                            <Play className="w-3.5 h-3.5 fill-white" />
                            <span>تشغيل (بالتطبيق أو خارجي)</span>
                          </button>

                          {/* Real Download Button (App + Device MedFur Name) */}
                          <button
                            type="button"
                            disabled={progress?.status === 'downloading'}
                            onClick={(e) => handleDownloadVideo(e, vid)}
                            className={`min-h-[40px] px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                              isOffline
                                ? 'bg-emerald-500/15 border border-emerald-500/40 text-emerald-600 dark:text-emerald-400'
                                : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
                            }`}
                            title="تنزيل الفيديو وحفظه داخل التطبيق وفي ملفات الجهاز باسم MedFur"
                          >
                            {progress?.status === 'downloading' ? (
                              <>
                                <HardDriveDownload className="w-3.5 h-3.5 animate-bounce" />
                                <span>{progress.percent}%</span>
                              </>
                            ) : isOffline ? (
                              <>
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                                <span>محفوظ</span>
                              </>
                            ) : (
                              <>
                                <Download className="w-3.5 h-3.5" />
                                <span>تنزيل</span>
                              </>
                            )}
                          </button>
                        </div>

                        {/* Admin Reorder (Up/Down/Pin) & Edit/Delete */}
                        {isAdmin && (
                          <div className="flex items-center justify-between gap-1 bg-slate-100 dark:bg-slate-800/70 rounded-xl p-1.5 border border-slate-200 dark:border-slate-800">
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                disabled={idx === 0}
                                onClick={() => moveVideo(vid.id, 'up')}
                                className="p-1.5 text-slate-400 hover:text-emerald-400 disabled:opacity-30 rounded-lg hover:bg-slate-700/60 transition-colors cursor-pointer"
                                title="تحريك الفيديو للأعلى"
                              >
                                <ArrowUp className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                disabled={idx === displayedVideos.length - 1}
                                onClick={() => moveVideo(vid.id, 'down')}
                                className="p-1.5 text-slate-400 hover:text-emerald-400 disabled:opacity-30 rounded-lg hover:bg-slate-700/60 transition-colors cursor-pointer"
                                title="تحريك الفيديو للأسفل"
                              >
                                <ArrowDown className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => togglePinVideo(vid.id)}
                                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                  vid.isPinned
                                    ? 'text-amber-400 bg-amber-500/15'
                                    : 'text-slate-400 hover:text-amber-300 hover:bg-slate-700/60'
                                }`}
                                title={
                                  vid.isPinned
                                    ? 'إلغاء التثبيت'
                                    : 'تثبيت الفيديو في المقدمة'
                                }
                              >
                                <Pin className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleOpenEditVideo(vid)}
                                className="p-1.5 text-amber-400 hover:bg-amber-500/10 rounded-lg transition-colors cursor-pointer"
                                title="تعديل بيانات الفيديو"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteVideo(vid)}
                                className="p-1.5 text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                                title="حذف الفيديو"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Contextual DownloadManager Modal */}
      <DownloadManager
        variant="modal-only"
        isOpen={isDownloadManagerOpen}
        onClose={() => setIsDownloadManagerOpen(false)}
        onOpenMediaItem={handleOpenFromDownloadManager}
      />

      {/* Fast Chooser Modal (In-App Video Player vs External Player) */}
      <MediaLaunchChoiceModal
        target={launchChoiceTarget}
        onClose={() => setLaunchChoiceTarget(null)}
        onOpenInApp={(target) => {
          setLaunchChoiceTarget(null);
          const foundVid = videos.find((v) => v.id === target.id);
          if (foundVid) {
            openVideoDirectlyInApp(foundVid);
          } else {
            setViewerItem({
              id: target.id,
              type: 'video',
              title: target.title,
              subtitle: target.subtitle,
              authorOrDoctor: target.authorOrDoctor,
              fileSize: target.fileSize,
              duration: target.duration,
              url: target.url,
              mimeType: target.mimeType,
              description: target.description,
            });
          }
        }}
        onDownloadBoth={(target) => {
          const foundVid = videos.find((v) => v.id === target.id);
          if (foundVid) {
            handleDownloadVideo(null, foundVid);
          }
        }}
      />

      {/* ======================================================== */}
      {/* IN-APP VIDEO PLAYER MODAL                                */}
      {/* ======================================================== */}
      <InAppMediaViewerModal
        item={viewerItem}
        onClose={() => setViewerItem(null)}
      />

      {/* ======================================================== */}
      {/* SUPERVISOR VIDEO UPLOAD MODAL (Automated Real Metadata)  */}
      {/* ======================================================== */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-xs animate-in fade-in">
          <div className="bg-[#121B2F] border-t sm:border border-slate-800 rounded-t-3xl sm:rounded-3xl max-w-lg w-full p-5 sm:p-6 space-y-4 shadow-2xl text-right max-h-[92dvh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <button
                onClick={() => setIsUploadModalOpen(false)}
                className="p-1 rounded-xl bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
              <h3 className="font-extrabold text-sm sm:text-base text-white flex items-center gap-2">
                <Upload className="w-5 h-5 text-rose-400" />
                <span>
                  {editingVideoId
                    ? 'تعديل بيانات الفيديو الأكاديمي'
                    : 'رفع فيديو جديد وشرح أكاديمي'}
                </span>
              </h3>
            </div>

            <form onSubmit={handleUploadSubmit} className="space-y-4">
              {/* Option A: Pick Video directly from Device */}
              <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-rose-400 flex items-center gap-1.5">
                    <Film className="w-4 h-4" />
                    <span>الرفع المباشر من جهاز المشرف (استخراج تلقائي)</span>
                  </span>
                  {isProcessingFile && (
                    <span className="text-[11px] text-amber-400 font-bold animate-pulse">
                      جاري قراءة المدة والحجم الفعلي والغلاف...
                    </span>
                  )}
                </div>

                <input
                  type="file"
                  ref={fileInputRef}
                  accept="video/*"
                  onChange={handleDeviceVideoUpload}
                  className="hidden"
                />

                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="p-4 rounded-xl border border-dashed border-rose-500/40 hover:border-rose-400 bg-slate-800/40 text-center cursor-pointer transition-colors space-y-1"
                >
                  <Upload className="w-6 h-6 text-rose-400 mx-auto" />
                  <p className="text-xs font-bold text-slate-200 break-words">
                    {uploadedFileName
                      ? `تم اختيار الفيديو: ${uploadedFileName}`
                      : 'انقر لاختيار ملف فيديو من جهازك'}
                  </p>
                  <p className="text-[10px] text-emerald-300/90 font-semibold">
                    يتم أخذ حجم الفيديو والمدة الزمنية الفعلية وصورة الغلاف من ملف الفيديو تلقائياً
                  </p>
                </div>
              </div>

              {/* Option B: Or Embed/Youtube/Direct MP4 URL */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  أو الصق رابط فيديو مباشر / يوتيوب:
                </label>
                <input
                  type="text"
                  placeholder="https://..."
                  value={
                    uploadVideoUrl.startsWith('data:video') ? '' : uploadVideoUrl
                  }
                  onChange={(e) => handleExternalVideoUrlChange(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-rose-500 text-left font-mono"
                />
              </div>

              {/* Automated Media Metadata & Cover Preview Card */}
              <div className="p-3.5 rounded-2xl bg-[#0E1628] border border-slate-800 space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-1.5 tabular-nums flex-wrap">
                    <span className="px-2.5 py-0.5 rounded-lg bg-rose-500/20 text-rose-300 font-bold text-[11px] flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>المدة: {uploadDuration}</span>
                    </span>
                    <span className="px-2.5 py-0.5 rounded-lg bg-emerald-500/15 text-emerald-300 font-bold text-[11px]">
                      الحجم: {uploadedVideoSize}
                    </span>
                  </div>
                  <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                    <span>مستخرج من الفيديو</span>
                  </span>
                </div>

                {uploadThumbnail && (
                  <div className="relative aspect-video w-full max-h-36 rounded-xl overflow-hidden border border-slate-700 bg-slate-950">
                    <img
                      src={uploadThumbnail}
                      alt="معاينة الغلاف الملتقط تلقائياً"
                      className="w-full h-full object-cover"
                    />
                    <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded-md bg-black/75 text-[10px] font-bold text-emerald-300">
                      تم توليد صورة الغلاف تلقائياً ✓
                    </span>
                  </div>
                )}
              </div>

              {/* Title */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  عنوان الفيديو:
                </label>
                <input
                  type="text"
                  required
                  placeholder="يُملأ تلقائياً عند اختيار الفيديو أو اكتبه هنا..."
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-rose-500 text-right"
                />
              </div>

              {/* Target Subject & Lecture */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    المادة الدراسية:
                  </label>
                  <InAppSelect
                    value={uploadSubjectId}
                    onChange={(val) => setUploadSubjectId(val)}
                    size="sm"
                    options={availableSubjects.map((s) => ({
                      value: s.id,
                      label: s.name,
                    }))}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    اسم المحاضرة أو القسم:
                  </label>
                  <input
                    type="text"
                    placeholder="مثال: المحاضرة 1"
                    value={uploadChapterName}
                    onChange={(e) => setUploadChapterName(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-rose-500 text-right"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  اسم المحاضر / الدكتور (اختياري):
                </label>
                <input
                  type="text"
                  placeholder="اسم المحاضر"
                  value={uploadDoctor}
                  onChange={(e) => setUploadDoctor(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-rose-500 text-right"
                />
              </div>

              <div className="flex items-center gap-2 pt-3 border-t border-slate-800">
                <button
                  type="submit"
                  disabled={isProcessingFile}
                  className="flex-1 py-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs cursor-pointer shadow-md transition-colors disabled:opacity-50"
                >
                  {editingVideoId
                    ? 'حفظ التعديلات'
                    : 'حفظ ونشر الفيديو في المقرر'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditingVideoId(null);
                    setIsUploadModalOpen(false);
                  }}
                  className="px-4 py-3 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs cursor-pointer hover:bg-slate-700"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Dialog for deleting video */}
      <ConfirmationDialog
        isOpen={Boolean(confirmDeleteVideo)}
        title="تأكيد حذف الفيديو"
        message={
          confirmDeleteVideo
            ? `هل أنت متأكد من حذف فيديو "${confirmDeleteVideo.title}"؟`
            : ''
        }
        onConfirm={async () => {
          if (confirmDeleteVideo) {
            await removeOfflineMediaRecord(confirmDeleteVideo.id);
            await deleteVideo(confirmDeleteVideo.id);
            setConfirmDeleteVideo(null);
          }
        }}
        onCancel={() => setConfirmDeleteVideo(null)}
      />
    </div>
  );
};

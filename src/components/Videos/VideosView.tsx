import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Play,
  Clock,
  ArrowRight,
  Upload,
  Search,
  Sparkles,
  Film,
  X,
  Trash2,
  User,
  CheckCircle2,
  Edit3,
  ArrowUp,
  ArrowDown,
  Pin,
  ChevronLeft,
  BookOpen,
  Users,
  Heart,
  HardDrive,
} from 'lucide-react';
import { VideoItem, AcademicYearId, SemesterType, SubjectItem } from '../../types';
import { ConfirmationDialog } from '../Common/ConfirmationDialog';
import { InAppSelect } from '../Common/InAppSelect';
import { resolveSubjectMedicalIcon } from '../Common/SubjectMedicalIcon';
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
  cancelManagedDownload,
  launchMediaInExternalPlayer,
} from '../../utils/fileHelpers';
import {
  DownloadManager,
  useDownloadManager,
} from '../Common/DownloadManager';
import { buildStructuredMedFurFileName } from '../../utils/mediaAndOfflineLogic';
import {
  MediaIconWithCircularProgress,
  MediaThreeDotsMenu,
} from '../Common/MediaCardControls';
import { groupSubjectVideosIntoSections } from '../../utils/redesignStructureLogic';

const FAVORITE_VIDEOS_STORAGE_KEY = 'medfur_favorite_videos_v1';

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
    setActiveSection,
  } = useApp();

  const {
    activeDownloads,
    cachedIds,
    refreshState,
  } = useDownloadManager();

  // 1. Controls State
  const [selectedYear, setSelectedYear] = useState<AcademicYearId>('year-3');
  const [selectedSemester, setSelectedSemester] = useState<SemesterType>('first');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);

  // Search filter
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchBar, setShowSearchBar] = useState(false);

  // Favorite video IDs persisted in localStorage
  const [favoriteVideoIds, setFavoriteVideoIds] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(FAVORITE_VIDEOS_STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(FAVORITE_VIDEOS_STORAGE_KEY, JSON.stringify(favoriteVideoIds));
    } catch {
      // ignore
    }
  }, [favoriteVideoIds]);

  const toggleFavoriteVideo = (vidId: string) => {
    setFavoriteVideoIds((prev) =>
      prev.includes(vidId) ? prev.filter((id) => id !== vidId) : [...prev, vidId]
    );
  };

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
    { id: 'year-prep' as AcademicYearId, name: 'السنة التحضيرية', shortLabel: 'تحضيرية' },
    { id: 'year-2' as AcademicYearId, name: 'السنة الثانية', shortLabel: 'الثانية' },
    { id: 'year-3' as AcademicYearId, name: 'السنة الثالثة', shortLabel: 'الثالثة' },
    { id: 'year-4' as AcademicYearId, name: 'السنة الرابعة', shortLabel: 'الرابعة' },
    { id: 'year-5' as AcademicYearId, name: 'السنة الخامسة', shortLabel: 'الخامسة' },
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

  // Doctor/Section groups inside active subject (Page 7)
  const subjectSections = useMemo(() => {
    return groupSubjectVideosIntoSections(currentSubjectVideos);
  }, [currentSubjectVideos]);

  const activeSectionGroup = useMemo(() => {
    if (!selectedSectionId) return null;
    return subjectSections.find((s) => s.id === selectedSectionId) || null;
  }, [subjectSections, selectedSectionId]);

  // Filtered videos when in section view or search
  const displayedVideos = useMemo(() => {
    let list = activeSectionGroup ? activeSectionGroup.videos : currentSubjectVideos;
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
  }, [activeSectionGroup, currentSubjectVideos, searchQuery]);

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

  // Total stats for current year + semester (Page 6 header pills)
  const yearSemStats = useMemo(() => {
    const subIds = new Set(availableSubjects.map((s) => s.id));
    const matchingVids = videos.filter((v) => subIds.has(v.subjectId));
    const totalSec = matchingVids.reduce(
      (acc, v) => acc + parseDurationToSeconds(v.duration, v.durationSeconds),
      0
    );
    return {
      subjectsCount: availableSubjects.length,
      videosCount: matchingVids.length,
      totalDuration: formatTotalHoursDuration(totalSec),
    };
  }, [availableSubjects, videos]);

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

  // Open downloaded video directly via the Native Mobile OS Intent Chooser / System Sheet
  const handleOpenDownloadedVideo = async (vid: VideoItem) => {
    updateVideo(vid.id, { viewsCount: (vid.viewsCount || 0) + 1 });
    const medfurMeta = resolveVideoMedFurMeta(vid);
    await launchMediaInExternalPlayer({
      id: vid.id,
      url: vid.videoUrl,
      fileName: medfurMeta.fileName,
      mimeType: vid.mimeType || 'video/mp4',
      title: vid.title,
      subtitle: vid.chapterName || vid.academicYear,
      authorOrDoctor: vid.doctorName,
      itemType: 'video',
      duration: vid.duration,
      virtualPath: medfurMeta.virtualPath,
    });
  };

  // Primary click on video row:
  // - If downloading -> cancel download
  // - If already cached offline -> trigger native OS video player chooser (navigator.share with File / native open)
  // - Otherwise -> start inline circular download & save to phone storage
  const handlePrimaryVideoClick = (vid: VideoItem) => {
    const progress = activeDownloads[vid.id];
    if (progress?.status === 'downloading') {
      cancelManagedDownload(vid.id);
      return;
    }
    const isOffline = cachedIds.includes(vid.id) || vid.requiresInternet === false;
    if (isOffline) {
      handleOpenDownloadedVideo(vid);
    } else {
      handleDownloadVideo(null, vid, true);
    }
  };

  const handleOpenFromDownloadManager = (record: StoredMediaRecord) => {
    launchMediaInExternalPlayer({
      id: record.id,
      fileName: record.fileName,
      virtualPath: record.virtualPath,
      mimeType: record.mimeType || 'video/mp4',
      title: record.title || record.fileName.replace(/\.[^/.]+$/, ''),
      subtitle: record.subtitle,
      authorOrDoctor: record.authorOrDoctor,
      itemType: 'video',
      duration: record.duration,
    });
  };

  // Real Streaming Download for Video with Circular Progress & IndexedDB Caching
  const handleDownloadVideo = async (
    e: React.MouseEvent | null,
    vid: VideoItem,
    saveToDevice = false
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
        saveToDevice,
      });

      refreshState();
      await updateVideo(vid.id, { requiresInternet: false });

      if (saveToDevice) {
        setDownloadNotice(`تم حفظ الفيديو وتنزيله للجهاز: ${medfurMeta.fileName}`);
        setTimeout(() => setDownloadNotice(null), 3500);
      }
    } catch {
      // handled inline
    }
  };

  const handleShareVideo = async (vid: VideoItem) => {
    const shareText = `🎬 ${vid.title} — ${vid.doctorName} (MedFur)`;
    const shareUrl = vid.videoUrl || window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: vid.title, text: shareText, url: shareUrl });
        return;
      } catch {
        // fallback
      }
    }
    try {
      await navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
      setDownloadNotice('تم نسخ رابط الفيديو للمشاركة ✓');
      setTimeout(() => setDownloadNotice(null), 3000);
    } catch {
      // ignore
    }
  };

  const handleSendVideoTelegram = (vid: VideoItem) => {
    const text = encodeURIComponent(`🎬 ${vid.title}\nالمحاضر: ${vid.doctorName}\nعبر تطبيق MedFur`);
    const url = encodeURIComponent(vid.videoUrl || window.location.href);
    window.open(`https://t.me/share/url?url=${url}&text=${text}`, '_blank');
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

  const openNewVideoUploadModal = () => {
    setEditingVideoId(null);
    setUploadTitle('');
    setUploadDoctor(activeSectionGroup?.doctorName || '');
    setUploadChapterName(activeSectionGroup?.title || '');
    setUploadVideoUrl('');
    setUploadThumbnail('');
    setUploadDuration('يُقرأ تلقائياً من الفيديو');
    setUploadDurationSeconds(0);
    setUploadedVideoSize('يُقرأ تلقائياً من الفيديو');
    setUploadedVideoSizeBytes(0);
    setSelectedRawVideoFile(null);
    setUploadedFileName(null);
    setUploadDescription('');
    setUploadSubjectId(activeSubject?.id || availableSubjects[0]?.id || '');
    setIsUploadModalOpen(true);
  };

  const currentYearName =
    academicYearsList.find((y) => y.id === selectedYear)?.name || 'السنة الثالثة';

  return (
    <div
      dir="rtl"
      className="w-full max-w-4xl mx-auto px-3 sm:px-5 py-3 sm:py-4 pb-36 space-y-3.5 text-right"
    >
      {/* Toast Notification */}
      {downloadNotice && (
        <div className="p-3.5 rounded-2xl bg-emerald-950/90 border border-emerald-500/40 text-emerald-200 text-xs font-bold flex items-center justify-between gap-2 animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{downloadNotice}</span>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* LEVEL 1: SUBJECTS GRID (Matching Page 6)                 */}
      {/* ======================================================== */}
      {!selectedSubjectId ? (
        <div className="space-y-3.5 animate-in fade-in duration-200">
          {/* 1. Emerald Header Card (Page 6) */}
          <div className="bg-gradient-to-l from-emerald-500 via-emerald-600 to-teal-700 text-white rounded-3xl p-4 sm:p-5 shadow-lg space-y-3.5 dark-surface-preserve">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <button
                  type="button"
                  onClick={() => setActiveSection('home')}
                  aria-label="رجوع للرئيسية"
                  className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors cursor-pointer shrink-0"
                >
                  <ArrowRight className="w-5 h-5" />
                </button>

                <div className="min-w-0">
                  <h1 className="text-lg sm:text-xl font-black text-white leading-tight truncate">
                    المرئيات والشروحات
                  </h1>
                  <p className="text-xs text-emerald-50/90 font-bold truncate mt-0.5">
                    كل المحاضرات المصورة بمكان واحد
                  </p>
                </div>
              </div>

              {isAdmin && (
                <button
                  type="button"
                  onClick={openNewVideoUploadModal}
                  title="رفع فيديو جديد"
                  aria-label="رفع فيديو جديد"
                  className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center cursor-pointer transition-colors shrink-0"
                >
                  <Upload className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Bottom Stat Pills: X مواد | Y فيديو | HH:MM:SS */}
            <div className="flex items-center gap-2 flex-wrap pt-0.5">
              <div className="px-3.5 py-1.5 rounded-full bg-black/20 text-white text-xs font-black flex items-center gap-1.5 tabular-nums">
                <BookOpen className="w-3.5 h-3.5 text-emerald-200" />
                <span>{yearSemStats.subjectsCount} مواد</span>
              </div>
              <div className="px-3.5 py-1.5 rounded-full bg-black/20 text-white text-xs font-black flex items-center gap-1.5 tabular-nums">
                <Film className="w-3.5 h-3.5 text-rose-200" />
                <span>{yearSemStats.videosCount} فيديو</span>
              </div>
              <div className="px-3.5 py-1.5 rounded-full bg-black/20 text-white text-xs font-black flex items-center gap-1.5 tabular-nums font-mono">
                <Clock className="w-3.5 h-3.5 text-amber-200" />
                <span>{yearSemStats.totalDuration}</span>
              </div>
            </div>
          </div>

          {/* 2. Year & Semester Selector Card (Page 6) */}
          <div className="bg-[#161F30] border border-slate-800/80 rounded-3xl p-2.5 sm:p-3 space-y-2.5 shadow-sm">
            {/* Row 1: Academic Years */}
            <div className="grid grid-cols-5 gap-1">
              {academicYearsList.map((yr) => {
                const active = selectedYear === yr.id;
                return (
                  <button
                    key={yr.id}
                    type="button"
                    onClick={() => setSelectedYear(yr.id)}
                    className={`py-2 px-1.5 rounded-2xl text-[11px] sm:text-xs font-black transition-all cursor-pointer truncate ${
                      active
                        ? 'bg-emerald-500 text-white shadow-md'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                    }`}
                  >
                    {yr.shortLabel}
                  </button>
                );
              })}
            </div>

            {/* Row 2: Semester Toggle */}
            <div className="grid grid-cols-2 gap-1.5 pt-0.5">
              <button
                type="button"
                onClick={() => setSelectedSemester('first')}
                className={`py-2.5 px-3 rounded-2xl text-xs sm:text-sm font-black transition-all cursor-pointer ${
                  selectedSemester === 'first'
                    ? 'bg-emerald-500 text-white shadow-md'
                    : 'bg-[#0F1726] text-slate-400 hover:text-white'
                }`}
              >
                الفصل الأول
              </button>
              <button
                type="button"
                onClick={() => setSelectedSemester('second')}
                className={`py-2.5 px-3 rounded-2xl text-xs sm:text-sm font-black transition-all cursor-pointer ${
                  selectedSemester === 'second'
                    ? 'bg-emerald-500 text-white shadow-md'
                    : 'bg-[#0F1726] text-slate-400 hover:text-white'
                }`}
              >
                الفصل الثاني
              </button>
            </div>
          </div>

          {/* 3. 2-Column Subject Cards Grid (Matching Page 6) */}
          {availableSubjects.length === 0 ? (
            <div className="text-center py-14 bg-[#161F30] rounded-3xl border border-slate-800/80 p-8 space-y-2.5">
              <Film className="w-10 h-10 text-slate-500 mx-auto" />
              <h4 className="text-xs sm:text-sm font-black text-slate-300">
                لا توجد مواد مسجلة لهذا الفصل في السنة المختارة
              </h4>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {availableSubjects.map((sub) => {
                const videoCount = getSubjectVideoCount(sub);
                const duration = getSubjectDuration(sub);
                const { accentColor } = resolveSubjectMedicalIcon(sub);

                return (
                  <div
                    key={sub.id}
                    onClick={() => {
                      setSelectedSubjectId(sub.id);
                      setSelectedSectionId(null);
                      setSearchQuery('');
                    }}
                    className="group bg-[#161F30] hover:bg-[#1B263B] border border-slate-800/80 hover:border-emerald-500/40 rounded-3xl p-4 transition-all cursor-pointer flex flex-col justify-between gap-4 text-right min-w-0 shadow-xs"
                  >
                    {/* Top Row: Play Circle Icon on Right + Video Count Pill on Left */}
                    <div className="flex items-center justify-between gap-2">
                      <div
                        className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105"
                        style={{
                          backgroundColor: `${accentColor}20`,
                          color: accentColor,
                        }}
                      >
                        <Play className="w-5 h-5 fill-current" />
                      </div>

                      <span className="px-2.5 py-1 rounded-full bg-[#0F1726] border border-slate-800 text-[11px] font-black text-slate-300 tabular-nums">
                        {videoCount} فيديو
                      </span>
                    </div>

                    {/* Bottom Row: Subject Name + Duration */}
                    <div className="space-y-1 min-w-0">
                      <h4 className="font-black text-sm sm:text-base text-white group-hover:text-emerald-400 transition-colors leading-snug line-clamp-1">
                        {sub.name}
                      </h4>
                      <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400 font-mono tabular-nums">
                        <Clock className="w-3 h-3 text-slate-500 shrink-0" />
                        <span>{duration}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : !selectedSectionId && searchQuery.trim() === '' ? (
        /* ======================================================== */
        /* LEVEL 2: SUBJECT SECTIONS / DOCTORS VIEW (Matching Page 7) */
        /* ======================================================== */
        <div className="space-y-3.5 animate-in fade-in duration-200">
          {/* Emerald Header Card for Active Subject (Page 7) */}
          <div className="bg-gradient-to-l from-emerald-500 via-emerald-600 to-teal-700 text-white rounded-3xl p-4 sm:p-5 shadow-lg space-y-3.5 dark-surface-preserve">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedSubjectId(null);
                    setSelectedSectionId(null);
                  }}
                  aria-label="رجوع للمواد"
                  className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors cursor-pointer shrink-0"
                >
                  <ArrowRight className="w-5 h-5" />
                </button>

                <div className="min-w-0">
                  <h1 className="text-lg sm:text-xl font-black text-white leading-tight truncate">
                    {activeSubject?.name}
                  </h1>
                  <p className="text-xs text-emerald-50/90 font-bold truncate mt-0.5">
                    {currentYearName} •{' '}
                    {selectedSemester === 'first' ? 'الفصل الأول' : 'الفصل الثاني'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {isAdmin && (
                  <button
                    type="button"
                    onClick={openNewVideoUploadModal}
                    className="px-3 py-2 rounded-2xl bg-white text-emerald-700 hover:bg-emerald-50 text-xs font-black flex items-center gap-1 cursor-pointer shadow-xs"
                  >
                    <Upload className="w-4 h-4" />
                    <span className="hidden sm:inline">رفع فيديو</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setShowSearchBar((prev) => !prev)}
                  aria-label="بحث في فيديوهات المادة"
                  className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white cursor-pointer"
                >
                  <Search className="w-5 h-5" />
                </button>
              </div>
            </div>

            {showSearchBar && (
              <div className="relative animate-in fade-in duration-150">
                <Search className="w-4 h-4 text-white/70 absolute right-3.5 top-3 pointer-events-none" />
                <input
                  type="text"
                  placeholder="ابحث عن محاضرة أو دكتور..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pr-10 pl-9 py-2.5 rounded-2xl bg-black/25 border border-white/20 text-xs sm:text-sm font-bold text-white placeholder:text-white/70 focus:outline-hidden focus:border-white"
                />
              </div>
            )}

            {/* Bottom Stat Pills: X أقسام | Y فيديو */}
            <div className="flex items-center gap-2 flex-wrap pt-0.5">
              <div className="px-3.5 py-1.5 rounded-full bg-black/20 text-white text-xs font-black flex items-center gap-1.5 tabular-nums">
                <Users className="w-3.5 h-3.5 text-emerald-200" />
                <span>{subjectSections.length} أقسام</span>
              </div>
              <div className="px-3.5 py-1.5 rounded-full bg-black/20 text-white text-xs font-black flex items-center gap-1.5 tabular-nums">
                <Film className="w-3.5 h-3.5 text-rose-200" />
                <span>{currentSubjectVideos.length} فيديو</span>
              </div>
            </div>
          </div>

          {/* Doctor / Section Cards List (Matching Page 7) */}
          {subjectSections.length === 0 ? (
            <div className="text-center py-14 bg-[#161F30] rounded-3xl border border-slate-800/80 p-8 space-y-2.5">
              <Film className="w-10 h-10 text-slate-500 mx-auto" />
              <h4 className="text-xs sm:text-sm font-black text-slate-300">
                لا توجد فيديوهات مرفوعة في هذا المقرر حالياً
              </h4>
              {isAdmin && (
                <button
                  type="button"
                  onClick={openNewVideoUploadModal}
                  className="mt-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold cursor-pointer"
                >
                  رفع أول فيديو للمادة
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {subjectSections.map((sec) => (
                <div
                  key={sec.id}
                  onClick={() => setSelectedSectionId(sec.id)}
                  className="group bg-[#161F30] hover:bg-[#1B263B] border border-slate-800/80 hover:border-emerald-500/40 rounded-3xl p-4 sm:p-5 flex items-center justify-between gap-3.5 cursor-pointer transition-all shadow-xs"
                >
                  <div className="flex items-center gap-3.5 min-w-0 flex-1">
                    {/* Right: Colored Play Circle Icon */}
                    <div
                      className="w-13 h-13 rounded-2xl flex items-center justify-center shrink-0"
                      style={{
                        backgroundColor: `${sec.badgeColor}20`,
                        color: sec.badgeColor,
                      }}
                    >
                      <Play className="w-6 h-6 fill-current" />
                    </div>

                    {/* Middle: Title + Badge + Count + CTA */}
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-black text-sm sm:text-base text-white leading-snug break-words">
                          {sec.title}
                        </h3>
                        <span
                          className="px-2.5 py-0.5 rounded-full text-[10px] font-black"
                          style={{
                            backgroundColor: `${sec.badgeColor}25`,
                            color: sec.badgeColor,
                          }}
                        >
                          القسم {sec.index}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400">
                        <Film className="w-3.5 h-3.5 text-slate-500" />
                        <span>{sec.videos.length} فيديو</span>
                      </div>

                      <div
                        className="text-xs font-black flex items-center gap-1"
                        style={{ color: sec.badgeColor }}
                      >
                        <span>استعرض الفيديوهات</span>
                        <span>←</span>
                      </div>
                    </div>
                  </div>

                  <ChevronLeft className="w-5 h-5 text-slate-500 group-hover:text-white transition-colors shrink-0" />
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* ======================================================== */
        /* LEVEL 3: VIDEOS LIST INSIDE A SECTION / SEARCH           */
        /* ======================================================== */
        <div className="space-y-3.5 animate-in fade-in duration-200">
          {/* Emerald Header Card for Active Section */}
          <div className="bg-gradient-to-l from-emerald-500 via-emerald-600 to-teal-700 text-white rounded-3xl p-4 sm:p-5 shadow-lg space-y-3.5 dark-surface-preserve">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <button
                  type="button"
                  onClick={() => {
                    if (selectedSectionId) {
                      setSelectedSectionId(null);
                    } else {
                      setSearchQuery('');
                    }
                  }}
                  aria-label="رجوع للأقسام"
                  className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors cursor-pointer shrink-0"
                >
                  <ArrowRight className="w-5 h-5" />
                </button>

                <div className="min-w-0">
                  <h1 className="text-lg sm:text-xl font-black text-white leading-tight truncate">
                    {activeSectionGroup?.title || activeSubject?.name}
                  </h1>
                  <p className="text-xs text-emerald-50/90 font-bold truncate mt-0.5">
                    {activeSubject?.name} • {displayedVideos.length} فيديو
                  </p>
                </div>
              </div>

              {isAdmin && (
                <button
                  type="button"
                  onClick={openNewVideoUploadModal}
                  className="px-3 py-2 rounded-2xl bg-white text-emerald-700 hover:bg-emerald-50 text-xs font-black flex items-center gap-1 cursor-pointer shadow-xs shrink-0"
                >
                  <Upload className="w-4 h-4" />
                  <span>رفع فيديو</span>
                </button>
              )}
            </div>

            {/* Search bar inside Section */}
            <div className="relative">
              <Search className="w-4 h-4 text-white/70 absolute right-3.5 top-3 pointer-events-none" />
              <input
                type="text"
                placeholder="ابحث في الفيديوهات..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pr-10 pl-9 py-2.5 rounded-2xl bg-black/25 border border-white/20 text-xs sm:text-sm font-bold text-white placeholder:text-white/70 focus:outline-hidden focus:border-white"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute left-3 top-2.5 text-white/80 hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Videos List with Inline Circular Download Ring & 3-Dots Menu */}
          {displayedVideos.length === 0 ? (
            <div className="text-center py-14 bg-[#161F30] rounded-3xl border border-slate-800/80 p-8 space-y-2.5">
              <Film className="w-10 h-10 text-slate-500 mx-auto" />
              <h4 className="text-xs sm:text-sm font-black text-slate-300">
                لا توجد فيديوهات تطابق البحث الحالي
              </h4>
            </div>
          ) : (
            <div className="space-y-2.5">
              {displayedVideos.map((vid, idx) => {
                const progress = activeDownloads[vid.id];
                const isDownloading = progress?.status === 'downloading';
                const isOffline =
                  cachedIds.includes(vid.id) || vid.requiresInternet === false;
                const isFavorite = favoriteVideoIds.includes(vid.id);
                const medfurMeta = resolveVideoMedFurMeta(vid);

                return (
                  <div
                    key={vid.id}
                    onClick={() => handlePrimaryVideoClick(vid)}
                    className="group bg-[#161F30] hover:bg-[#1B263B] border border-slate-800/80 hover:border-emerald-500/40 rounded-2xl p-3.5 sm:p-4 transition-all cursor-pointer flex items-center justify-between gap-3 text-right min-w-0 shadow-xs"
                  >
                    {/* Right: Video Icon with Download Badge / Circular Progress Ring + Details */}
                    <div className="flex items-center gap-3.5 min-w-0 flex-1">
                      <MediaIconWithCircularProgress
                        type="video"
                        formatLabel="MP4"
                        isDownloaded={isOffline}
                        isDownloading={isDownloading}
                        progressPercent={progress?.percent || 0}
                        onStartOrOpen={() => handlePrimaryVideoClick(vid)}
                        onCancelDownload={() => cancelManagedDownload(vid.id)}
                      />

                      <div className="min-w-0 flex-1 space-y-1">
                        <h4 className="font-black text-sm sm:text-base text-white group-hover:text-emerald-400 transition-colors leading-snug break-words">
                          {vid.title}
                        </h4>

                        <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-bold text-slate-400 tabular-nums">
                          <span>{vid.duration}</span>
                          {vid.fileSize && (
                            <>
                              <span>•</span>
                              <span>{vid.fileSize}</span>
                            </>
                          )}
                          {vid.doctorName && (
                            <>
                              <span>•</span>
                              <span className="truncate max-w-[160px]">
                                {vid.doctorName}
                              </span>
                            </>
                          )}
                          {isDownloading && (
                            <>
                              <span>•</span>
                              <span className="text-emerald-400">
                                جاري التحميل {progress?.percent || 0}%
                              </span>
                            </>
                          )}
                          {isFavorite && (
                            <Heart className="w-3 h-3 text-rose-500 fill-rose-500 inline mr-1" />
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Left: 3-Dots Context Menu + Admin Arrows */}
                    <div
                      className="flex items-center gap-1 shrink-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {isAdmin && (
                        <div className="hidden sm:flex items-center gap-0.5 mr-1">
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() => moveVideo(vid.id, 'up')}
                            className="p-1.5 text-slate-400 hover:text-emerald-400 disabled:opacity-30 rounded-lg cursor-pointer"
                            title="تحريك للأعلى"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={idx === displayedVideos.length - 1}
                            onClick={() => moveVideo(vid.id, 'down')}
                            className="p-1.5 text-slate-400 hover:text-emerald-400 disabled:opacity-30 rounded-lg cursor-pointer"
                            title="تحريك للأسفل"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => togglePinVideo(vid.id)}
                            className={`p-1.5 rounded-lg cursor-pointer ${
                              vid.isPinned
                                ? 'text-amber-400'
                                : 'text-slate-400 hover:text-amber-400'
                            }`}
                            title="تثبيت"
                          >
                            <Pin className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}

                      <MediaThreeDotsMenu
                        title={vid.title}
                        isFavorite={isFavorite}
                        isDownloaded={isOffline}
                        isAdmin={isAdmin}
                        onToggleFavorite={() => toggleFavoriteVideo(vid.id)}
                        onDownloadOffline={() => handleDownloadVideo(null, vid, true)}
                        onShare={() => handleShareVideo(vid)}
                        onSendTelegram={() => handleSendVideoTelegram(vid)}
                        onEdit={isAdmin ? () => handleOpenEditVideo(vid) : undefined}
                        onDelete={
                          isAdmin ? () => setConfirmDeleteVideo(vid) : undefined
                        }
                      />
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

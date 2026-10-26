import React, { useState, useMemo, useRef } from 'react';
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
  Edit3
} from 'lucide-react';
import { VideoItem, AcademicYearId, SemesterType, SubjectItem } from '../../types';
import { ConfirmationDialog } from '../Common/ConfirmationDialog';
import { InAppSelect } from '../Common/InAppSelect';
import { SubjectMedicalIcon, resolveSubjectMedicalIcon } from '../Common/SubjectMedicalIcon';

function formatVideoSeconds(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return '35:00 دقيقة';
  const totalSec = Math.round(seconds);
  const hrs = Math.floor(totalSec / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  const secs = totalSec % 60;
  if (hrs > 0) {
    return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')} دقيقة`;
}

function extractYouTubeInfo(rawUrl: string): { id: string; embedUrl: string; thumbnail: string } | null {
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
    isAdmin 
  } = useApp();

  // 1. Controls State
  const [selectedYear, setSelectedYear] = useState<AcademicYearId>('year-3');
  const [selectedSemester, setSelectedSemester] = useState<SemesterType>('first');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);

  // Search filter
  const [searchQuery, setSearchQuery] = useState('');

  // Playing video modal
  const [selectedVideo, setSelectedVideo] = useState<VideoItem | null>(null);

  // Download notification toast
  const [downloadNotice, setDownloadNotice] = useState<string | null>(null);

  // Supervisor Upload / Edit Modal
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [editingVideoId, setEditingVideoId] = useState<string | null>(null);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadDoctor, setUploadDoctor] = useState('');
  const [uploadChapterName, setUploadChapterName] = useState('');
  const [uploadDuration, setUploadDuration] = useState('تلقائي');
  const [uploadedVideoSize, setUploadedVideoSize] = useState<string>('تلقائي');
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
    { id: 'year-3' as AcademicYearId, name: 'السنة الثالثة (دفعة 30)', badge: '3' },
    { id: 'year-2' as AcademicYearId, name: 'السنة الثانية (دفعة 31)', badge: '2' },
    { id: 'year-prep' as AcademicYearId, name: 'السنة التحضيرية', badge: 'تحضيري' },
    { id: 'year-4' as AcademicYearId, name: 'السنة الرابعة (أرشيف)', badge: '4' },
    { id: 'year-5' as AcademicYearId, name: 'السنة الخامسة (أرشيف)', badge: '5' },
    { id: 'year-6' as AcademicYearId, name: 'السنة السادسة (أرشيف)', badge: '6' },
  ];

  // Subjects belonging to current year and semester
  const availableSubjects = useMemo(() => {
    return subjects.filter(s => s.yearId === selectedYear && s.semester === selectedSemester);
  }, [subjects, selectedYear, selectedSemester]);

  // Selected subject object
  const activeSubject = useMemo(() => {
    if (!selectedSubjectId) return null;
    return subjects.find(s => s.id === selectedSubjectId) || null;
  }, [subjects, selectedSubjectId]);

  // Videos belonging to active subject
  const currentSubjectVideos = useMemo(() => {
    if (!activeSubject) return [];
    return videos.filter(v => v.subjectId === activeSubject.id);
  }, [videos, activeSubject]);

  // Filtered videos when in subject view or global search
  const displayedVideos = useMemo(() => {
    let list = currentSubjectVideos;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(v => 
        v.title.toLowerCase().includes(q) ||
        v.doctorName.toLowerCase().includes(q) ||
        (v.chapterName && v.chapterName.toLowerCase().includes(q))
      );
    }
    return list;
  }, [currentSubjectVideos, searchQuery]);

  // Total duration calculation for a subject
  const getSubjectDuration = (sub: SubjectItem) => {
    if (sub.totalHoursDuration) return sub.totalHoursDuration;
    const subVids = videos.filter(v => v.subjectId === sub.id);
    if (subVids.length === 0) return '00:00:00';
    return `${subVids.length * 45}:00 دقيقة`;
  };

  const getSubjectVideoCount = (sub: SubjectItem) => {
    const customCount = videos.filter(v => v.subjectId === sub.id).length;
    return Math.max(customCount, sub.totalVideosCount || 0);
  };

  // Handle download simulation
  const handleDownloadVideo = (e: React.MouseEvent, vid: VideoItem) => {
    e.stopPropagation();
    setDownloadNotice(`بدأ تنزيل فيديو "${vid.title}" لمشاهدته بدون إنترنت...`);
    setTimeout(() => {
      setDownloadNotice(null);
    }, 4000);
  };

  // Handle device file upload for video with automatic duration, size & frame cover capture
  const handleDeviceVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingFile(true);
    setUploadedFileName(file.name);

    // 1. Auto-extract clean video title
    const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[_-]+/g, ' ').trim();
    if (!uploadTitle.trim() || !editingVideoId) {
      setUploadTitle(cleanName);
    }

    // 2. Auto-extract file size
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.max(0, Math.floor(Math.log(Math.max(1, file.size)) / Math.log(k)));
    const formattedSize = parseFloat((file.size / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    setUploadedVideoSize(formattedSize);
    setUploadRequiresInternet(false);

    // 3. Auto-extract exact duration & capture cover thumbnail via offscreen <video> + <canvas>
    const objectUrl = URL.createObjectURL(file);
    const tempVideo = document.createElement('video');
    tempVideo.preload = 'metadata';
    tempVideo.muted = true;
    tempVideo.playsInline = true;
    tempVideo.src = objectUrl;

    tempVideo.onloadedmetadata = () => {
      const formattedDur = formatVideoSeconds(tempVideo.duration);
      setUploadDuration(formattedDur);
      const seekTarget = Math.min(2.5, Math.max(0.2, (tempVideo.duration || 2) * 0.15));
      try {
        tempVideo.currentTime = seekTarget;
      } catch {
        URL.revokeObjectURL(objectUrl);
      }
    };

    tempVideo.onseeked = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 640;
        canvas.height = 360;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(tempVideo, 0, 0, canvas.width, canvas.height);
          const capturedCover = canvas.toDataURL('image/jpeg', 0.84);
          if (capturedCover && capturedCover.length > 100) {
            setUploadThumbnail(capturedCover);
          }
        }
      } catch {
        // fallback if canvas tainted
      } finally {
        URL.revokeObjectURL(objectUrl);
      }
    };

    tempVideo.onerror = () => {
      URL.revokeObjectURL(objectUrl);
    };

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setUploadVideoUrl(dataUrl);
      setIsProcessingFile(false);
    };
    reader.onerror = () => {
      setIsProcessingFile(false);
    };
    reader.readAsDataURL(file);
  };

  // Handle external URL input with automatic YouTube thumbnail & embed resolution
  const handleExternalVideoUrlChange = (rawVal: string) => {
    setUploadVideoUrl(rawVal);
    const yt = extractYouTubeInfo(rawVal);
    if (yt) {
      setUploadThumbnail(yt.thumbnail);
      setUploadedVideoSize('بث يوتيوب ذكي');
      if (uploadDuration === 'تلقائي') {
        setUploadDuration('شرح مصور HD');
      }
    }
  };

  const handleOpenEditVideo = (vid: VideoItem) => {
    setEditingVideoId(vid.id);
    setUploadTitle(vid.title);
    setUploadDoctor(vid.doctorName);
    setUploadChapterName(vid.chapterName || '');
    setUploadDuration(vid.duration);
    setUploadedVideoSize('محفوظ مسبقاً');
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

    const targetSubId = uploadSubjectId || (activeSubject?.id || availableSubjects[0]?.id || 'sub-neuro-anat');
    const yearLabel = academicYearsList.find(y => y.id === selectedYear)?.name || 'السنة الثالثة';

    const ytInfo = extractYouTubeInfo(uploadVideoUrl.trim());
    const finalVideoUrl = ytInfo
      ? ytInfo.embedUrl
      : uploadVideoUrl.trim() || 'https://www.youtube.com/embed/dQw4w9WgXcQ';
    const finalThumbnail =
      uploadThumbnail.trim() ||
      (ytInfo ? ytInfo.thumbnail : 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=600&q=80');
    const finalDuration =
      uploadDuration && uploadDuration !== 'تلقائي' ? uploadDuration.trim() : '35:00 دقيقة';

    if (editingVideoId) {
      await updateVideo(editingVideoId, {
        subjectId: targetSubId,
        chapterName: uploadChapterName.trim() || 'شرح المحاضرة التفاعلية',
        title: uploadTitle.trim(),
        doctorName: uploadDoctor.trim() || 'فريق التدريس السريري',
        duration: finalDuration,
        videoUrl: finalVideoUrl,
        thumbnail: finalThumbnail,
        description: uploadDescription.trim() || 'شرح مصور تفصيلي مرفوع للمادة.',
        requiresInternet: uploadRequiresInternet,
      });
    } else {
      await addVideo({
        subjectId: targetSubId,
        chapterName: uploadChapterName.trim() || 'شرح المحاضرة التفاعلية',
        title: uploadTitle.trim(),
        doctorName: uploadDoctor.trim() || 'فريق التدريس السريري',
        duration: finalDuration,
        videoUrl: finalVideoUrl,
        thumbnail: finalThumbnail,
        academicYear: yearLabel,
        yearId: selectedYear,
        semester: selectedSemester,
        description: uploadDescription.trim() || 'شرح مصور تفصيلي مرفوع للمادة.',
        requiresInternet: uploadRequiresInternet,
        downloadUrl: '#'
      });
    }

    setEditingVideoId(null);
    setUploadTitle('');
    setUploadDoctor('');
    setUploadChapterName('');
    setUploadVideoUrl('');
    setUploadThumbnail('');
    setUploadDuration('تلقائي');
    setUploadedVideoSize('تلقائي');
    setUploadDescription('');
    setUploadedFileName(null);
    setIsUploadModalOpen(false);
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 py-5 sm:py-6 space-y-6 text-right selection:bg-rose-500 selection:text-white overflow-x-hidden">
      
      {/* Toast Notification */}
      {downloadNotice && (
        <div className="fixed bottom-6 left-6 z-50 bg-slate-900 border border-emerald-500/50 text-white p-4 rounded-2xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-bottom duration-300">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-xs font-bold">{downloadNotice}</span>
        </div>
      )}

      {/* ======================================================== */}
      {/* VIEW A: LIST OF SUBJECTS (شاشة القائمة والمواد)             */}
      {/* ======================================================== */}
      {!selectedSubjectId ? (
        <div className="space-y-6 animate-in fade-in duration-200">
          
          {/* Header Controls Banner */}
          <div className="bg-gradient-to-r from-rose-700 via-pink-700 to-rose-900 text-white p-6 sm:p-8 rounded-3xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 text-xs font-bold text-rose-100">
                <Film className="w-3.5 h-3.5" />
                <span>المرئيات والشروحات الأكاديمية (Media Hub)</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black">
                بوابة الفيديوهات والمحاضرات المصورة
              </h1>
              <p className="text-xs sm:text-sm text-rose-100 max-w-xl leading-relaxed">
                شروحات سريرية ونظرية ومقاطع تشريح ثلاثية الأبعاد مصنفة بالدقة حسب السنة والفصل والمقرر.
              </p>
            </div>

            {/* Supervisor Upload CTA */}
            {isAdmin && (
              <button
                onClick={() => {
                  setEditingVideoId(null);
                  setUploadTitle('');
                  setUploadDoctor('');
                  setUploadChapterName('');
                  setUploadVideoUrl('');
                  setUploadDescription('');
                  setUploadSubjectId(availableSubjects[0]?.id || '');
                  setIsUploadModalOpen(true);
                }}
                className="px-5 py-3 rounded-2xl bg-white text-rose-700 hover:bg-rose-50 text-xs sm:text-sm font-black transition-all cursor-pointer shadow-lg flex items-center justify-center gap-2 shrink-0 self-start md:self-auto"
              >
                <Upload className="w-4 h-4" />
                <span>رفع فيديو جديد من الجهاز</span>
              </button>
            )}
          </div>

          {/* Filter Bar: Dropdown for Academic Year & Toggle Buttons for Semesters */}
          <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
            
            {/* 1. Academic Year In-App Selector */}
            <div className="flex items-center gap-3 w-full md:w-auto">
              <span className="text-xs font-black text-slate-500 shrink-0">السنة الدراسية:</span>
              <div className="flex-1 sm:w-64">
                <InAppSelect<AcademicYearId>
                  value={selectedYear}
                  onChange={(val) => setSelectedYear(val)}
                  size="md"
                  variant="adaptive"
                  icon={<GraduationCap className="w-4 h-4" />}
                  options={academicYearsList.map((yr) => ({
                    value: yr.id,
                    label: yr.name,
                  }))}
                />
              </div>
            </div>

            {/* 2. Semester Toggle Buttons (أزرار تبديل الفصول: الفصل الأول / الفصل الثاني) */}
            <div className="flex items-center gap-2 self-center">
              <span className="text-xs font-black text-slate-500 shrink-0 hidden sm:inline">الفصل:</span>
              <div className="p-1 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center gap-1">
                <button
                  onClick={() => setSelectedSemester('first')}
                  className={`px-5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    selectedSemester === 'first'
                      ? 'bg-rose-600 text-white shadow-md'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  الفصل الأول
                </button>
                <button
                  onClick={() => setSelectedSemester('second')}
                  className={`px-5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    selectedSemester === 'second'
                      ? 'bg-rose-600 text-white shadow-md'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  الفصل الثاني
                </button>
              </div>
            </div>

            {/* Video Total Indicator */}
            <div className="text-xs font-bold text-slate-400 font-mono">
              {availableSubjects.length} مقررات متاحة
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
                <p className="text-xs text-slate-400">
                  يمكنك التبديل إلى السنة الثالثة أو الثانية لاستعراض المواد والفيديوهات.
                </p>
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
                      {/* Left Side: Chevron / Jump icon */}
                      <div className="w-9 h-9 rounded-2xl bg-slate-100 dark:bg-slate-800 group-hover:bg-rose-600 group-hover:text-white text-slate-400 flex items-center justify-center transition-colors shrink-0">
                        <ArrowRight className="w-4 h-4 rotate-180" />
                      </div>

                      {/* Center Info: Name, count, hours */}
                      <div className="flex-1 min-w-0 space-y-1.5">
                        <h4 className="font-black text-sm sm:text-base text-slate-900 dark:text-white group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors line-clamp-1">
                          {sub.name}
                        </h4>
                        
                        {/* Requirement Specification: تشريح عصبية • 26 فيديو • 23:12:03 */}
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium font-mono flex flex-wrap items-center justify-end gap-1.5">
                          <span>{videoCount} فيديو</span>
                          <span>•</span>
                          <span className="text-rose-600 dark:text-rose-400 font-bold">{duration}</span>
                        </p>
                      </div>

                      {/* Right Side: Minimalist Medical Subject Icon Container */}
                      <div 
                        className="subject-medical-badge w-13 h-13 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-md group-hover:scale-105 transition-transform border"
                        style={{
                          backgroundColor: `${accentColor}18`,
                          borderColor: `${accentColor}40`,
                          color: accentColor,
                        }}
                      >
                        <SubjectMedicalIcon subject={sub} className="w-6 h-6 sm:w-7 sm:h-7" />
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
                  setUploadDuration('تلقائي');
                  setUploadedVideoSize('تلقائي');
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

          {/* 1. Top Bar showing Doctor's Name, Dedicated Course, Video Count & Hours */}
          {activeSubject && (
            <div className="bg-gradient-to-r from-slate-900 via-rose-950 to-slate-900 border border-rose-500/30 p-5 sm:p-6 rounded-3xl text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-5">
              <div className="space-y-2 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-rose-300">
                    {selectedSemester === 'first' ? 'الفصل الأول' : 'الفصل الثاني'} • {academicYearsList.find(y => y.id === selectedYear)?.name}
                  </span>
                </div>
                <h2 className="text-xl sm:text-3xl font-black break-words">
                  مرئيات مقرر {activeSubject.name}
                </h2>
                <p className="text-xs sm:text-sm text-slate-300 flex items-center gap-2">
                  <User className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>
                    إشراف {activeSubject.department || 'الكادر الأكاديمي للكلية'} • الدورة النظرية والعملية المكثفة
                  </span>
                </p>
              </div>

              {/* Stats Box */}
              <div className="flex items-center gap-4 bg-white/5 border border-white/10 p-3.5 px-5 rounded-2xl shrink-0 self-start md:self-auto font-mono text-center">
                <div className="px-3 border-l border-white/10">
                  <div className="text-xl sm:text-2xl font-black text-rose-400">
                    {displayedVideos.length}
                  </div>
                  <div className="text-[10px] text-slate-400 font-sans">فيديو متاح</div>
                </div>
                <div className="px-3">
                  <div className="text-xl sm:text-2xl font-black text-emerald-400">
                    {getSubjectDuration(activeSubject)}
                  </div>
                  <div className="text-[10px] text-slate-400 font-sans">إجمالي الساعات</div>
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
                لا توجد فيديوهات مطابقة للبحث حالياً
              </h4>
              <p className="text-xs text-slate-400">
                يمكن للمشرف رفع فيديوهات وشروحات جديدة مباشرة عبر زر الرفع أعلاه.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
              {displayedVideos.map((vid) => (
                <div
                  key={vid.id}
                  className="group bg-white dark:bg-slate-900 rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800 hover:border-rose-500/50 hover:shadow-xl transition-all flex flex-col justify-between min-w-0"
                >
                  {/* Thumbnail with duration badge directly on image */}
                  <div 
                    onClick={() => setSelectedVideo(vid)}
                    className="relative aspect-video overflow-hidden bg-slate-950 cursor-pointer"
                  >
                    <img
                      src={vid.thumbnail || 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=600&q=80'}
                      alt={vid.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 opacity-90"
                    />

                    {/* Scrim & Play Overlay Button */}
                    <div className="absolute inset-0 bg-black/30 group-hover:bg-black/15 transition-colors flex items-center justify-center">
                      <div className="w-12 h-12 rounded-full bg-rose-600/95 text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                        <Play className="w-5 h-5 fill-white mr-0.5" />
                      </div>
                    </div>

                    {/* Duration Badge directly on image (المدة الزمنية على الصورة) */}
                    <div className="absolute bottom-2.5 left-2.5 bg-black/80 backdrop-blur-md px-2.5 py-1 rounded-lg text-[11px] font-mono text-white flex items-center gap-1.5 shadow-md">
                      <Clock className="w-3.5 h-3.5 text-rose-400" />
                      <span>{vid.duration}</span>
                    </div>

                    {/* Internet Indicator Badge (مؤشر يحتاج إنترنت) */}
                    <div className="absolute top-2.5 left-2.5 bg-slate-900/85 backdrop-blur-md px-2.5 py-1 rounded-lg text-[10px] font-bold text-amber-300 flex items-center gap-1.5 shadow-md border border-amber-500/30">
                      <Wifi className="w-3 h-3 text-amber-400" />
                      <span>يحتاج إنترنت</span>
                    </div>

                    {/* Chapter/Lecture tag */}
                    {vid.chapterName && (
                      <div className="absolute top-2.5 right-2.5 bg-rose-600/90 backdrop-blur-md px-2.5 py-0.5 rounded-lg text-[10px] font-bold text-white shadow-xs line-clamp-1 max-w-[70%]">
                        {vid.chapterName}
                      </div>
                    )}
                  </div>

                  {/* Video Details */}
                  <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-4 min-w-0">
                    <div className="space-y-2 min-w-0">
                      <h4 
                        onClick={() => setSelectedVideo(vid)}
                        className="font-black text-sm sm:text-base text-slate-900 dark:text-white group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors leading-snug line-clamp-2 cursor-pointer break-words"
                      >
                        {vid.title}
                      </h4>

                      <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">المحاضر: {vid.doctorName}</span>
                      </p>

                      {vid.description && (
                        <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed break-words">
                          {vid.description}
                        </p>
                      )}
                    </div>

                    {/* Action Buttons: زر التشغيل + زر التحميل */}
                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                      
                      {/* Play Button */}
                      <button
                        onClick={() => setSelectedVideo(vid)}
                        className="flex-1 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all cursor-pointer shadow-sm flex items-center justify-center gap-1.5"
                      >
                        <Play className="w-3.5 h-3.5 fill-white" />
                        <span>تشغيل الآن</span>
                      </button>

                      {/* Download Button */}
                      <button
                        onClick={(e) => handleDownloadVideo(e, vid)}
                        className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                        title="تحميل للمشاهدة بدون اتصال"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">تحميل</span>
                      </button>

                      {/* Admin Edit & Delete */}
                      {isAdmin && (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleOpenEditVideo(vid)}
                            className="p-2 text-amber-500 hover:bg-amber-500/10 rounded-xl transition-colors cursor-pointer"
                            title="تعديل الفيديو (مشرف)"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setConfirmDeleteVideo(vid)}
                            className="p-2 text-rose-500 hover:bg-rose-500/10 rounded-xl transition-colors cursor-pointer"
                            title="حذف الفيديو (مشرف)"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

        </div>
      )}

      {/* ======================================================== */}
      {/* VIDEO PLAYER MODAL                                       */}
      {/* ======================================================== */}
      {selectedVideo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in">
          <div className="relative w-full max-w-4xl bg-slate-900 rounded-3xl overflow-hidden border border-slate-800 shadow-2xl">
            <div className="p-4 bg-slate-800 flex items-center justify-between text-white">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-xs px-2.5 py-0.5 rounded-md bg-rose-600 font-bold shrink-0">
                  {selectedVideo.chapterName || selectedVideo.academicYear}
                </span>
                <h3 className="font-bold text-sm sm:text-base line-clamp-1">
                  {selectedVideo.title}
                </h3>
              </div>
              <button
                onClick={() => setSelectedVideo(null)}
                className="p-1 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Video Playback Container */}
            <div className="aspect-video bg-black flex items-center justify-center">
              {selectedVideo.videoUrl.startsWith('data:video') || selectedVideo.videoUrl.endsWith('.mp4') ? (
                <video
                  src={selectedVideo.videoUrl}
                  controls
                  autoPlay
                  className="w-full h-full"
                />
              ) : (
                <iframe
                  src={selectedVideo.videoUrl}
                  title={selectedVideo.title}
                  className="w-full h-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              )}
            </div>

            <div className="p-5 bg-slate-900 text-slate-300 text-xs sm:text-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <p className="font-bold text-white text-base">{selectedVideo.title}</p>
                <p className="text-slate-400 text-xs mt-1">
                  المحاضر: {selectedVideo.doctorName} • المدة: {selectedVideo.duration} • {selectedVideo.viewsCount} مشاهدة
                </p>
                {selectedVideo.description && (
                  <p className="text-slate-300 text-xs mt-2 leading-relaxed">
                    {selectedVideo.description}
                  </p>
                )}
              </div>
              <button
                onClick={() => setSelectedVideo(null)}
                className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-colors cursor-pointer shrink-0"
              >
                إغلاق المشغل
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* SUPERVISOR VIDEO UPLOAD MODAL (Automated Metadata)       */}
      {/* ======================================================== */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in">
          <div className="bg-[#121B2F] border border-slate-800 rounded-3xl max-w-lg w-full p-5 sm:p-6 space-y-4 shadow-2xl text-right max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <button 
                onClick={() => setIsUploadModalOpen(false)} 
                className="p-1 rounded-xl bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
              <h3 className="font-extrabold text-sm sm:text-base text-white flex items-center gap-2">
                <Upload className="w-5 h-5 text-rose-400" />
                <span>{editingVideoId ? 'تعديل بيانات الفيديو الأكاديمي' : 'رفع فيديو جديد وشرح أكاديمي'}</span>
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
                      جاري استخراج المدة والغلاف...
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
                    {uploadedFileName ? `تم اختيار: ${uploadedFileName}` : 'انقر لاختيار ملف فيديو من جهازك'}
                  </p>
                  <p className="text-[10px] text-emerald-300/90 font-semibold">
                    يتم استخراج المدة الزمنية والحجم وصورة الغلاف تلقائياً من الفيديو
                  </p>
                </div>
              </div>

              {/* Option B: Or Embed/Youtube URL */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  أو الصق رابط يوتيوب / فيديو خارجي (يستخرج الغلاف تلقائياً):
                </label>
                <input
                  type="text"
                  placeholder="https://www.youtube.com/watch?v=..."
                  value={uploadVideoUrl.startsWith('data:video') ? '' : uploadVideoUrl}
                  onChange={(e) => handleExternalVideoUrlChange(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-rose-500 text-left font-mono"
                />
              </div>

              {/* Automated Media Metadata & Cover Preview Card (Replaces Manual Duration & Thumbnail URL Inputs) */}
              <div className="p-3.5 rounded-2xl bg-[#0E1628] border border-slate-800 space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-1.5 tabular-nums">
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
                    <span>بيانات وغلاف الفيديو المستخرجة تلقائياً</span>
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
                <label className="block text-xs font-bold text-slate-300 mb-1">عنوان الفيديو:</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: الفصل الأول - الفيديو الأول: تشريح جذع الدماغ"
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-rose-500 text-right"
                />
              </div>

              {/* Target Subject & Lecture */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">المادة الدراسية:</label>
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
                  <label className="block text-xs font-bold text-slate-300 mb-1">اسم المحاضرة أو الدورة:</label>
                  <input
                    type="text"
                    placeholder="مثال: المحاضرة 1: قشرة المخ والباحات"
                    value={uploadChapterName}
                    onChange={(e) => setUploadChapterName(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-rose-500 text-right"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">اسم المحاضر / الدكتور:</label>
                <input
                  type="text"
                  placeholder="د. عصام الخوري"
                  value={uploadDoctor}
                  onChange={(e) => setUploadDoctor(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-rose-500 text-right"
                />
              </div>

              {/* Requires Internet toggle */}
              <div className="flex items-center gap-2 bg-slate-900 p-3 rounded-xl border border-slate-800 text-xs text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  id="reqNet"
                  checked={uploadRequiresInternet}
                  onChange={(e) => setUploadRequiresInternet(e.target.checked)}
                  className="rounded text-rose-500"
                />
                <label htmlFor="reqNet" className="cursor-pointer font-bold">
                  إظهار مؤشر &quot;يحتاج إنترنت&quot; على الفيديو
                </label>
              </div>

              <div className="flex items-center gap-2 pt-3 border-t border-slate-800">
                <button
                  type="submit"
                  disabled={isProcessingFile}
                  className="flex-1 py-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs cursor-pointer shadow-md transition-colors disabled:opacity-50"
                >
                  {editingVideoId ? 'حفظ التعديلات' : 'حفظ ونشر الفيديو في المقرر'}
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
        message={confirmDeleteVideo ? `هل أنت متأكد من حذف فيديو "${confirmDeleteVideo.title}"؟` : ''}
        onConfirm={() => {
          if (confirmDeleteVideo) {
            deleteVideo(confirmDeleteVideo.id);
            setConfirmDeleteVideo(null);
          }
        }}
        onCancel={() => setConfirmDeleteVideo(null)}
      />

    </div>
  );
};

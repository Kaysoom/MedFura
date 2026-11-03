export interface DownloadMetrics {
  percent: number;
  speedBps: number;
  speedFormatted: string;
  etaSeconds: number;
  etaFormatted: string;
}

export interface StorageItemSummary {
  id: string;
  title: string;
  fileName: string;
  virtualPath: string;
  itemType: 'file' | 'video' | 'questions';
  sizeBytes: number;
  formattedSize: string;
  savedAt: string;
  subtitle?: string;
  authorOrDoctor?: string;
  pages?: number;
  duration?: string;
  questionsCount?: number;
  format?: string;
  mimeType?: string;
  subjectId?: string;
}

export interface StorageCategoryStat {
  count: number;
  questionsCount?: number;
  bytes: number;
  formattedSize: string;
  percentOfUsed: number;
  percentOfQuota: number;
}

export interface StorageBreakdownReport {
  videos: StorageCategoryStat;
  files: StorageCategoryStat;
  questions: StorageCategoryStat;
  totalItemsCount: number;
  totalUsedBytes: number;
  totalUsedFormatted: string;
  deviceQuotaBytes: number;
  deviceQuotaFormatted: string;
  deviceFreeBytes: number;
  deviceFreeFormatted: string;
  usedPercentOfQuota: number;
}

export interface MedFurStorageSubjectNode {
  subjectName: string;
  totalBytes: number;
  formattedSize: string;
  totalCount: number;
  files: StorageItemSummary[];
  videos: StorageItemSummary[];
  questions: StorageItemSummary[];
}

export interface MedFurStorageSemesterNode {
  semesterName: string;
  totalBytes: number;
  formattedSize: string;
  totalCount: number;
  subjects: MedFurStorageSubjectNode[];
}

export interface MedFurStorageYearNode {
  yearName: string;
  orderRank: number;
  totalBytes: number;
  formattedSize: string;
  totalCount: number;
  semesters: MedFurStorageSemesterNode[];
}

export interface ExternalAppOption {
  id: string;
  name: string;
  subtitle: string;
  mediaType: 'file' | 'video';
  badgeText: string;
  bgGradient: string;
  accentColor: string;
}

export const EXTERNAL_FILE_APPS: ExternalAppOption[] = [
  {
    id: 'one-read',
    name: 'One Read',
    subtitle: 'فتح ملف PDF',
    mediaType: 'file',
    badgeText: 'PDF/W',
    bgGradient: 'from-rose-500 via-amber-500 to-sky-500',
    accentColor: '#F43F5E',
  },
  {
    id: 'samsung-pdf',
    name: 'Samsung PDF',
    subtitle: 'قارئ PDF',
    mediaType: 'file',
    badgeText: 'PDF',
    bgGradient: 'from-red-500 to-rose-600',
    accentColor: '#EF4444',
  },
  {
    id: 'comic-screen',
    name: 'Comic Screen',
    subtitle: 'عارض الملفات',
    mediaType: 'file',
    badgeText: 'III',
    bgGradient: 'from-sky-400 to-blue-600',
    accentColor: '#38BDF8',
  },
  {
    id: 'word-pdf',
    name: 'Word',
    subtitle: 'فتح ملف PDF',
    mediaType: 'file',
    badgeText: 'W',
    bgGradient: 'from-blue-500 to-indigo-700',
    accentColor: '#3B82F6',
  },
  {
    id: 'shareit-pdf',
    name: 'SHAREit PDF',
    subtitle: 'قارئ PDF',
    mediaType: 'file',
    badgeText: 'SH',
    bgGradient: 'from-sky-500 to-blue-600',
    accentColor: '#0EA5E9',
  },
  {
    id: 'copilot-pdf',
    name: 'Copilot',
    subtitle: 'فتح ملف PDF',
    mediaType: 'file',
    badgeText: 'CP',
    bgGradient: 'from-emerald-400 via-sky-500 to-rose-500',
    accentColor: '#10B981',
  },
  {
    id: 'edrawmax-pdf',
    name: 'EdrawMax',
    subtitle: 'قارئ مستندات',
    mediaType: 'file',
    badgeText: 'ED',
    bgGradient: 'from-blue-400 to-sky-600',
    accentColor: '#0284C7',
  },
  {
    id: 'deepseek-pdf',
    name: 'DeepSeek',
    subtitle: 'قارئ ملفات',
    mediaType: 'file',
    badgeText: 'DS',
    bgGradient: 'from-indigo-500 to-blue-700',
    accentColor: '#6366F1',
  },
];

export const EXTERNAL_VIDEO_APPS: ExternalAppOption[] = [
  {
    id: 'vlc-player',
    name: 'VLC Player',
    subtitle: 'مشغل فيديو خارجي',
    mediaType: 'video',
    badgeText: 'VLC',
    bgGradient: 'from-orange-500 to-amber-600',
    accentColor: '#F97316',
  },
  {
    id: 'mx-player',
    name: 'MX Player',
    subtitle: 'مشغل فيديو الهاتف',
    mediaType: 'video',
    badgeText: 'MX',
    bgGradient: 'from-blue-500 to-sky-600',
    accentColor: '#3B82F6',
  },
  {
    id: 'system-video',
    name: 'مشغل الفيديو',
    subtitle: 'مشغل النظام الافتراضي',
    mediaType: 'video',
    badgeText: '▶',
    bgGradient: 'from-purple-500 to-indigo-600',
    accentColor: '#A855F7',
  },
  {
    id: 'kmplayer',
    name: 'KMPlayer',
    subtitle: 'تشغيل بجودة كاملة',
    mediaType: 'video',
    badgeText: 'KM',
    bgGradient: 'from-fuchsia-500 to-purple-700',
    accentColor: '#D946EF',
  },
  {
    id: 'next-player',
    name: 'Next Player',
    subtitle: 'مشغل فيديو سريع',
    mediaType: 'video',
    badgeText: 'NX',
    bgGradient: 'from-emerald-500 to-teal-700',
    accentColor: '#10B981',
  },
  {
    id: 'mpv-player',
    name: 'mpv Android',
    subtitle: 'مشغل وسائط',
    mediaType: 'video',
    badgeText: 'MPV',
    bgGradient: 'from-slate-600 to-slate-800',
    accentColor: '#94A3B8',
  },
];

const DEFAULT_FILE_APP_STORAGE_KEY = 'medfur_default_external_file_app_v1';
const DEFAULT_VIDEO_APP_STORAGE_KEY = 'medfur_default_external_video_app_v1';

export function getDefaultExternalAppId(mediaType: 'file' | 'video'): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const key =
      mediaType === 'video' ? DEFAULT_VIDEO_APP_STORAGE_KEY : DEFAULT_FILE_APP_STORAGE_KEY;
    return localStorage.getItem(key) || null;
  } catch {
    return null;
  }
}

export function setDefaultExternalAppId(mediaType: 'file' | 'video', appId: string | null): void {
  if (typeof window === 'undefined') return;
  try {
    const key =
      mediaType === 'video' ? DEFAULT_VIDEO_APP_STORAGE_KEY : DEFAULT_FILE_APP_STORAGE_KEY;
    if (!appId) {
      localStorage.removeItem(key);
    } else {
      localStorage.setItem(key, appId);
    }
  } catch {
    // ignore storage errors
  }
}

export function getExternalAppById(
  mediaType: 'file' | 'video',
  appId?: string | null
): ExternalAppOption | null {
  if (!appId) return null;
  const list = mediaType === 'video' ? EXTERNAL_VIDEO_APPS : EXTERNAL_FILE_APPS;
  return list.find((a) => a.id === appId) || null;
}

/**
 * Formats byte count into human-readable string (B, KB, MB, GB)
 */
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 KB';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(
    sizes.length - 1,
    Math.max(0, Math.floor(Math.log(bytes) / Math.log(k)))
  );
  const value = bytes / Math.pow(k, i);
  return `${parseFloat(value.toFixed(i >= 2 ? 2 : 1))} ${sizes[i]}`;
}

/**
 * Calculates download percentage, transfer speed, and ETA from byte progress
 */
export function calculateDownloadMetrics(
  loadedBytes: number,
  totalBytes: number,
  elapsedMs: number
): DownloadMetrics {
  const safeLoaded = Math.max(0, loadedBytes);
  const safeTotal = Math.max(safeLoaded, totalBytes > 0 ? totalBytes : safeLoaded);
  const percent =
    safeTotal > 0 ? Math.min(100, Math.max(0, Math.round((safeLoaded / safeTotal) * 100))) : 0;

  const elapsedSeconds = Math.max(0.1, elapsedMs / 1000);
  const speedBps = Math.round(safeLoaded / elapsedSeconds);
  const speedFormatted = `${formatBytes(speedBps)}/ث`;

  const remainingBytes = Math.max(0, safeTotal - safeLoaded);
  const etaSeconds = speedBps > 0 ? Math.ceil(remainingBytes / speedBps) : 0;

  let etaFormatted = 'أقل من ثانية';
  if (etaSeconds > 60) {
    const mins = Math.floor(etaSeconds / 60);
    const secs = etaSeconds % 60;
    etaFormatted = `${mins} د و ${secs} ث`;
  } else if (etaSeconds > 0) {
    etaFormatted = `${etaSeconds} ثانية`;
  }

  return {
    percent,
    speedBps,
    speedFormatted,
    etaSeconds,
    etaFormatted,
  };
}

/**
 * Formats video player time in seconds to MM:SS or HH:MM:SS
 */
export function formatPlayerTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '00:00';
  const totalSec = Math.floor(seconds);
  const hrs = Math.floor(totalSec / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  const secs = totalSec % 60;
  if (hrs > 0) {
    return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

/**
 * Clamps seek target time within [0, duration]
 */
export function clampSeekTime(current: number, delta: number, duration: number): number {
  const safeDuration = Number.isFinite(duration) && duration > 0 ? duration : 0;
  const target = (Number.isFinite(current) ? current : 0) + delta;
  return Math.min(safeDuration, Math.max(0, target));
}

/**
 * Computes storage breakdown across Videos, Files (PDFs), and Questions against total device quota
 */
export function calculateStorageBreakdown(
  items: StorageItemSummary[],
  deviceQuotaBytes = 64 * 1024 * 1024 * 1024 // 64 GB fallback if navigator.storage is unavailable
): StorageBreakdownReport {
  const safeQuota = Math.max(
    1024 * 1024 * 128,
    Number.isFinite(deviceQuotaBytes) && deviceQuotaBytes > 0
      ? deviceQuotaBytes
      : 64 * 1024 * 1024 * 1024
  );

  let videoBytes = 0;
  let videoCount = 0;
  let fileBytes = 0;
  let fileCount = 0;
  let questionBytes = 0;
  let questionPacksCount = 0;
  let totalQuestionsCount = 0;

  for (const item of items) {
    const bytes = Math.max(0, item.sizeBytes || 0);
    if (item.itemType === 'video') {
      videoBytes += bytes;
      videoCount += 1;
    } else if (item.itemType === 'questions') {
      questionBytes += bytes;
      questionPacksCount += 1;
      totalQuestionsCount += item.questionsCount || 0;
    } else {
      fileBytes += bytes;
      fileCount += 1;
    }
  }

  const totalUsedBytes = videoBytes + fileBytes + questionBytes;
  const safeQuotaFinal = Math.max(safeQuota, totalUsedBytes * 2);
  const deviceFreeBytes = Math.max(0, safeQuotaFinal - totalUsedBytes);

  const calcPctOfUsed = (part: number) =>
    totalUsedBytes > 0 ? Math.round((part / totalUsedBytes) * 100) : 0;
  const calcPctOfQuota = (part: number) =>
    safeQuotaFinal > 0 ? Math.min(100, Number(((part / safeQuotaFinal) * 100).toFixed(2))) : 0;

  return {
    videos: {
      count: videoCount,
      bytes: videoBytes,
      formattedSize: formatBytes(videoBytes),
      percentOfUsed: calcPctOfUsed(videoBytes),
      percentOfQuota: calcPctOfQuota(videoBytes),
    },
    files: {
      count: fileCount,
      bytes: fileBytes,
      formattedSize: formatBytes(fileBytes),
      percentOfUsed: calcPctOfUsed(fileBytes),
      percentOfQuota: calcPctOfQuota(fileBytes),
    },
    questions: {
      count: questionPacksCount,
      questionsCount: totalQuestionsCount,
      bytes: questionBytes,
      formattedSize: formatBytes(questionBytes),
      percentOfUsed: calcPctOfUsed(questionBytes),
      percentOfQuota: calcPctOfQuota(questionBytes),
    },
    totalItemsCount: videoCount + fileCount + questionPacksCount,
    totalUsedBytes,
    totalUsedFormatted: formatBytes(totalUsedBytes),
    deviceQuotaBytes: safeQuotaFinal,
    deviceQuotaFormatted: formatBytes(safeQuotaFinal),
    deviceFreeBytes,
    deviceFreeFormatted: formatBytes(deviceFreeBytes),
    usedPercentOfQuota: calcPctOfQuota(totalUsedBytes),
  };
}

const YEAR_ORDER_RANK: Record<string, number> = {
  'السنة التحضيرية': 1,
  'السنة الأولى': 1,
  'السنة الثانية': 2,
  'السنة الثالثة': 3,
  'السنة الرابعة': 4,
  'السنة الخامسة': 5,
  'السنة السادسة': 6,
};

function normalizeSemesterLabel(raw?: string): string {
  if (!raw) return 'الفصل الأول';
  if (raw.includes('ثاني') || raw === 'second' || raw === 'sem-2') return 'الفصل الثاني';
  if (raw.includes('أول') || raw.includes('اول') || raw === 'first' || raw === 'sem-1') {
    return 'الفصل الأول';
  }
  return raw.trim();
}

function normalizeYearLabel(raw?: string): string {
  if (!raw) return 'السنة الثالثة';
  const trimmed = raw.trim();
  if (trimmed.includes('تحضيري') || trimmed.includes('أولى') || trimmed.includes('اولى')) {
    return 'السنة التحضيرية';
  }
  if (trimmed.includes('ثاني')) return 'السنة الثانية';
  if (trimmed.includes('ثالث')) return 'السنة الثالثة';
  if (trimmed.includes('رابع')) return 'السنة الرابعة';
  if (trimmed.includes('خامس')) return 'السنة الخامسة';
  if (trimmed.includes('سادس')) return 'السنة السادسة';
  return trimmed;
}

/**
 * Parses a MedFur virtualPath (e.g. "MedFur / السنة الثالثة / فصل أول / تشريح 3 / ملف")
 * into canonical hierarchy segments: { yearName, semesterName, subjectName, categoryFolder }
 */
export function parseMedFurHierarchySegments(
  virtualPath?: string,
  itemType: 'file' | 'video' | 'questions' = 'file'
): {
  rootFolder: 'MedFur';
  yearName: string;
  semesterName: string;
  subjectName: string;
  categoryFolder: 'الملفات' | 'الفيديوهات' | 'الأسئلة';
  fullRelativePath: string;
} {
  const categoryFolder =
    itemType === 'video' ? 'الفيديوهات' : itemType === 'questions' ? 'الأسئلة' : 'الملفات';

  const rawParts = (virtualPath || '')
    .split('/')
    .map((p) => p.trim())
    .filter(Boolean);

  // Strip leading "MedFur" if present
  const parts = rawParts[0]?.toLowerCase() === 'medfur' ? rawParts.slice(1) : rawParts;

  const yearCandidate = parts.find((p) => p.includes('السنة') || p.includes('كلية'));
  const semCandidate = parts.find((p) => p.includes('فصل') || p.includes('الفصل'));

  // Subject is the first segment that is not year, not semester, and not media type label
  const subjectCandidate = parts.find(
    (p) =>
      p !== yearCandidate &&
      p !== semCandidate &&
      !['ملف', 'الملفات', 'فيديو', 'الفيديوهات', 'أسئلة', 'الأسئلة', 'أتمتة'].includes(p)
  );

  const yearName = normalizeYearLabel(yearCandidate || 'السنة الثالثة');
  const semesterName = normalizeSemesterLabel(semCandidate || 'الفصل الأول');
  const subjectName = (subjectCandidate || 'مقرر عام').trim();

  return {
    rootFolder: 'MedFur',
    yearName,
    semesterName,
    subjectName,
    categoryFolder,
    fullRelativePath: `MedFur / ${yearName} / ${semesterName} / ${subjectName} / ${categoryFolder}`,
  };
}

/**
 * Organizes all downloaded items into the MedFur -> Academic Year -> Semester -> Subject tree
 */
export function buildMedFurStorageTree(items: StorageItemSummary[]): MedFurStorageYearNode[] {
  const yearMap = new Map<
    string,
    {
      yearName: string;
      totalBytes: number;
      totalCount: number;
      semMap: Map<
        string,
        {
          semesterName: string;
          totalBytes: number;
          totalCount: number;
          subMap: Map<string, MedFurStorageSubjectNode>;
        }
      >;
    }
  >();

  for (const item of items) {
    const parsed = parseMedFurHierarchySegments(item.virtualPath, item.itemType);
    const bytes = Math.max(0, item.sizeBytes || 0);

    let yNode = yearMap.get(parsed.yearName);
    if (!yNode) {
      yNode = {
        yearName: parsed.yearName,
        totalBytes: 0,
        totalCount: 0,
        semMap: new Map(),
      };
      yearMap.set(parsed.yearName, yNode);
    }
    yNode.totalBytes += bytes;
    yNode.totalCount += 1;

    let sNode = yNode.semMap.get(parsed.semesterName);
    if (!sNode) {
      sNode = {
        semesterName: parsed.semesterName,
        totalBytes: 0,
        totalCount: 0,
        subMap: new Map(),
      };
      yNode.semMap.set(parsed.semesterName, sNode);
    }
    sNode.totalBytes += bytes;
    sNode.totalCount += 1;

    let subNode = sNode.subMap.get(parsed.subjectName);
    if (!subNode) {
      subNode = {
        subjectName: parsed.subjectName,
        totalBytes: 0,
        formattedSize: '0 KB',
        totalCount: 0,
        files: [],
        videos: [],
        questions: [],
      };
      sNode.subMap.set(parsed.subjectName, subNode);
    }
    subNode.totalBytes += bytes;
    subNode.formattedSize = formatBytes(subNode.totalBytes);
    subNode.totalCount += 1;

    const normalizedItem: StorageItemSummary = {
      ...item,
      virtualPath: parsed.fullRelativePath,
      formattedSize: formatBytes(bytes),
    };

    if (item.itemType === 'video') {
      subNode.videos.push(normalizedItem);
    } else if (item.itemType === 'questions') {
      subNode.questions.push(normalizedItem);
    } else {
      subNode.files.push(normalizedItem);
    }
  }

  const result: MedFurStorageYearNode[] = [];
  yearMap.forEach((yVal) => {
    const semesters: MedFurStorageSemesterNode[] = [];
    yVal.semMap.forEach((sVal) => {
      const subjects = Array.from(sVal.subMap.values()).sort((a, b) =>
        a.subjectName.localeCompare(b.subjectName, 'ar')
      );
      semesters.push({
        semesterName: sVal.semesterName,
        totalBytes: sVal.totalBytes,
        formattedSize: formatBytes(sVal.totalBytes),
        totalCount: sVal.totalCount,
        subjects,
      });
    });

    semesters.sort((a, b) => (a.semesterName === 'الفصل الأول' ? -1 : 1));

    result.push({
      yearName: yVal.yearName,
      orderRank: YEAR_ORDER_RANK[yVal.yearName] || 99,
      totalBytes: yVal.totalBytes,
      formattedSize: formatBytes(yVal.totalBytes),
      totalCount: yVal.totalCount,
      semesters,
    });
  });

  result.sort((a, b) => a.orderRank - b.orderRank);
  return result;
}

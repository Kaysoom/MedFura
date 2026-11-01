import { LibraryFileItem, LibraryFolderItem, MarketplaceItem, QuestionItem, VideoItem } from '../types';

export type LibraryMainTab = 'cloud' | 'downloads' | 'favorites';
export type LibrarySortOption = 'newest' | 'alpha' | 'size';
export type SubjectQuickFilterTab = 'none' | 'mistakes' | 'saved' | 'notes';

/**
 * Determines whether the global top Header bar should be visible.
 * Per user specification and reference screenshots, the global header is only
 * shown on the Home dashboard; all sub-sections start directly with their
 * own Emerald Header Card and Back button.
 */
export function shouldShowGlobalHeader(activeSection: string): boolean {
  return activeSection === 'home';
}

/**
 * Normalizes marketplace deal types so both 'إهداء' and 'هبة' map cleanly to 'هبة'
 * for display and filtering as shown in the reference screenshots.
 */
export function normalizeDealTypeLabel(dealType: string): string {
  if (dealType === 'إهداء' || dealType === 'هبة') return 'هبة';
  return dealType;
}

/**
 * Normalizes marketplace status labels ('تم البيع' -> 'مباع').
 */
export function normalizeMarketplaceStatusLabel(status: string): 'متاح' | 'محجوز' | 'مباع' {
  if (status === 'تم البيع' || status === 'مباع') return 'مباع';
  if (status === 'محجوز') return 'محجوز';
  return 'متاح';
}

/**
 * Filters marketplace items according to search query, deal type ('الكل' | 'بيع' | 'إعارة' | 'هبة' | 'إيجار'),
 * status ('all' | 'متاح' | 'محجوز' | 'مباع'), category ('all' | 'جامعية' | 'غير جامعية'),
 * academic year ('all' | string), and optional sellerId (for 'إعلاناتي').
 */
export function filterMarketplaceListings(
  items: MarketplaceItem[],
  options: {
    searchQuery: string;
    dealType: string;
    status: string;
    category: string;
    academicYear: string;
    onlySellerId?: string | null;
  }
): MarketplaceItem[] {
  const q = options.searchQuery.trim().toLowerCase();

  return items.filter((item) => {
    if (options.onlySellerId && item.sellerId !== options.onlySellerId) {
      return false;
    }

    if (q) {
      const matchesText =
        item.title.toLowerCase().includes(q) ||
        (item.description || '').toLowerCase().includes(q) ||
        (item.sellerName || '').toLowerCase().includes(q);
      if (!matchesText) return false;
    }

    if (options.dealType !== 'all') {
      const itemDeal = normalizeDealTypeLabel(item.dealType);
      const targetDeal = normalizeDealTypeLabel(options.dealType);
      if (itemDeal !== targetDeal) return false;
    }

    if (options.status !== 'all') {
      const itemStatus = normalizeMarketplaceStatusLabel(item.status);
      const targetStatus = normalizeMarketplaceStatusLabel(options.status);
      if (itemStatus !== targetStatus) return false;
    }

    if (options.category !== 'all') {
      const itemCat =
        item.category === 'جامعية' || (item.category as string) === 'جامعي'
          ? 'جامعية'
          : 'غير جامعية';
      if (itemCat !== options.category) return false;
    }

    if (options.academicYear !== 'all') {
      const itemYear = (item as MarketplaceItem & { academicYear?: string }).academicYear || '';
      if (!itemYear.includes(options.academicYear)) return false;
    }

    return true;
  });
}

/**
 * Filters library files by tab ('cloud' | 'downloads' | 'favorites'), folderId,
 * search query, fileType filter, and sorts them.
 */
export function filterAndSortLibraryFiles(
  files: LibraryFileItem[],
  options: {
    activeTab: LibraryMainTab;
    currentFolderId: string | null;
    searchQuery: string;
    fileTypeFilter: string;
    sortBy: LibrarySortOption;
    downloadedIds: Set<string>;
    favoriteIds: Set<string>;
  }
): LibraryFileItem[] {
  const q = options.searchQuery.trim().toLowerCase();

  const filtered = files.filter((f) => {
    if (options.activeTab === 'downloads' && !options.downloadedIds.has(f.id)) {
      return false;
    }
    if (options.activeTab === 'favorites' && !options.favoriteIds.has(f.id)) {
      return false;
    }
    if (options.activeTab === 'cloud' && !q) {
      if ((f.folderId || null) !== options.currentFolderId) {
        return false;
      }
    }

    if (options.fileTypeFilter !== 'الكل' && f.fileType !== options.fileTypeFilter) {
      return false;
    }

    if (q) {
      const matches =
        f.title.toLowerCase().includes(q) ||
        (f.author || '').toLowerCase().includes(q) ||
        (f.fileType || '').toLowerCase().includes(q);
      if (!matches) return false;
    }

    return true;
  });

  return [...filtered].sort((a, b) => {
    if (options.sortBy === 'alpha') {
      return a.title.localeCompare(b.title, 'ar');
    }
    if (options.sortBy === 'size') {
      const numA = parseFloat(a.fileSize) || 0;
      const numB = parseFloat(b.fileSize) || 0;
      return numB - numA;
    }
    return 0;
  });
}

/**
 * Resolves the subject-scoped questions for the 3 quick personal tabs inside a subject:
 * 'mistakes' (أخطائي), 'saved' (محفوظاتي), 'notes' (ملاحظاتي).
 */
export function getSubjectQuickTabQuestions(
  subjectQuestions: QuestionItem[],
  quickTab: SubjectQuickFilterTab,
  wrongQuestionIds: string[],
  savedQuestionIds: string[],
  questionNotes: Record<string, string>
): QuestionItem[] {
  if (quickTab === 'mistakes') {
    const wrongSet = new Set(wrongQuestionIds);
    return subjectQuestions.filter((q) => wrongSet.has(q.id));
  }
  if (quickTab === 'saved') {
    const savedSet = new Set(savedQuestionIds);
    return subjectQuestions.filter((q) => savedSet.has(q.id));
  }
  if (quickTab === 'notes') {
    return subjectQuestions.filter((q) => Boolean(questionNotes[q.id]?.trim()));
  }
  return [];
}

/**
 * Groups subject videos into doctor/section cards for Level 2 of VideosView (matching Page 7).
 */
export interface VideoSectionGroup {
  id: string;
  index: number;
  title: string;
  doctorName: string;
  videos: VideoItem[];
  badgeColor: string;
}

const SECTION_BADGE_COLORS = [
  '#2563EB', // blue (القسم 1)
  '#059669', // emerald (القسم 2)
  '#D97706', // amber (القسم 3)
  '#7C3AED', // purple (القسم 4)
  '#E11D48', // rose (القسم 5)
  '#0891B2', // cyan (القسم 6)
];

export function groupSubjectVideosIntoSections(
  subjectVideos: VideoItem[]
): VideoSectionGroup[] {
  const map = new Map<string, VideoItem[]>();

  for (const v of subjectVideos) {
    const docName = (v.doctorName || '').trim();
    const chapName = (v.chapterName || '').trim();
    const groupTitle = chapName
      ? chapName
      : docName
      ? docName.startsWith('قسم')
        ? docName
        : `قسم ${docName}`
      : 'المحاضرات العامة للمقرر';

    const existing = map.get(groupTitle) || [];
    existing.push(v);
    map.set(groupTitle, existing);
  }

  return Array.from(map.entries()).map(([title, vids], idx) => ({
    id: `sec-${idx}-${title}`,
    index: idx + 1,
    title,
    doctorName: vids[0]?.doctorName || title,
    videos: vids,
    badgeColor: SECTION_BADGE_COLORS[idx % SECTION_BADGE_COLORS.length],
  }));
}

/**
 * Builds the root-level folders in the order shown in Page 1 of the reference PDF
 * when at root level ('السنة الخامسة', 'السنة الرابعة', 'السنة الثالثة', 'السنة الثانية', 'السنة التحضيرية', 'مراجع طبية', 'متنوعات').
 */
export function sortRootLibraryFolders(folders: LibraryFolderItem[]): LibraryFolderItem[] {
  const priorityOrder = [
    'السنة الخامسة',
    'السنة الرابعة',
    'السنة الثالثة',
    'السنة الثانية',
    'السنة التحضيرية',
    'مراجع طبية',
    'متنوعات',
  ];

  return [...folders].sort((a, b) => {
    const idxA = priorityOrder.findIndex((p) => a.name.includes(p));
    const idxB = priorityOrder.findIndex((p) => b.name.includes(p));
    const rankA = idxA === -1 ? 999 : idxA;
    const rankB = idxB === -1 ? 999 : idxB;
    if (rankA !== rankB) return rankA - rankB;
    return (a.orderIndex ?? 0) - (b.orderIndex ?? 0);
  });
}

import {
  AcademicYearId,
  ChapterCategory,
  CustomQuizSourceFilter,
  LibraryFolderItem,
  QuestionItem,
  StudentCustomQuiz,
  SubjectItem,
} from '../types';

export interface FolderCoverPreset {
  id: string;
  label: string;
  color: string;
  gradientClass: string;
  badgeText: string;
}

export const FOLDER_COVER_PRESETS: FolderCoverPreset[] = [
  {
    id: 'emerald',
    label: 'زمردي طبي',
    color: '#10B981',
    gradientClass: 'from-emerald-600/30 via-teal-900/40 to-slate-900',
    badgeText: 'مقرر أساسي',
  },
  {
    id: 'purple',
    label: 'بنفسجي أكاديمي',
    color: '#8B5CF6',
    gradientClass: 'from-purple-600/30 via-indigo-900/40 to-slate-900',
    badgeText: 'محاضرات ونوط',
  },
  {
    id: 'rose',
    label: 'قرمزي سريري',
    color: '#F43F5E',
    gradientClass: 'from-rose-600/30 via-pink-900/40 to-slate-900',
    badgeText: 'سريريات',
  },
  {
    id: 'sky',
    label: 'سماوي علمي',
    color: '#0EA5E9',
    gradientClass: 'from-sky-600/30 via-blue-900/40 to-slate-900',
    badgeText: 'مراجع وكتب',
  },
  {
    id: 'amber',
    label: 'ذهبي امتحاني',
    color: '#F59E0B',
    gradientClass: 'from-amber-500/30 via-orange-900/40 to-slate-900',
    badgeText: 'دورات وشامل',
  },
];

const YEAR_ROOT_CONFIGS: {
  folderId: string;
  yearId: AcademicYearId;
  name: string;
  orderIndex: number;
}[] = [
  { folderId: 'fld-year-prep', yearId: 'year-prep', name: 'السنة التحضيرية', orderIndex: 1 },
  { folderId: 'fld-year-2', yearId: 'year-2', name: 'السنة الثانية', orderIndex: 2 },
  { folderId: 'fld-year-3', yearId: 'year-3', name: 'السنة الثالثة', orderIndex: 3 },
  { folderId: 'fld-year-4', yearId: 'year-4', name: 'year-4' === 'year-4' ? 'السنة الرابعة' : '', orderIndex: 4 },
  { folderId: 'fld-year-5', yearId: 'year-5', name: 'السنة الخامسة', orderIndex: 5 },
  { folderId: 'fld-year-6', yearId: 'year-6', name: 'السنة السادسة', orderIndex: 6 },
];

/**
 * Generates the canonical complete Library folder hierarchy:
 * 1. Keeps root Academic Year folders as standard root folders (without semester badges).
 * 2. Inside EVERY Academic Year folder, ensures "الفصل الأول" (badge '1') and "الفصل الثاني" (badge '2') exist.
 * 3. Inside EVERY Semester folder, ensures all Subject folders for that year & semester exist with `isSubject: true`
 *    and the exact same `icon`, `coverColor`, and `department` as in the Automation Bank.
 * 4. Preserves any custom folders created or modified by the Admin.
 */
export function buildCompleteLibraryFolders(
  subjects: SubjectItem[],
  existingFolders: LibraryFolderItem[] = []
): LibraryFolderItem[] {
  const folderMap = new Map<string, LibraryFolderItem>();

  // Load existing folders first so custom folders and admin reorders are preserved
  for (const fld of existingFolders) {
    folderMap.set(fld.id, { ...fld });
  }

  // 1. Root Year Folders (kept as standard root folders)
  for (const yr of YEAR_ROOT_CONFIGS) {
    const existing = folderMap.get(yr.folderId);
    folderMap.set(yr.folderId, {
      id: yr.folderId,
      name: existing?.name || yr.name,
      parentId: null,
      type: 'folder',
      yearId: yr.yearId,
      orderIndex: existing?.orderIndex ?? yr.orderIndex,
    });
  }

  // General Medical References root folder
  if (!folderMap.has('fld-med-refs')) {
    folderMap.set('fld-med-refs', {
      id: 'fld-med-refs',
      name: 'مراجع طبية عامة',
      parentId: null,
      type: 'folder',
      orderIndex: 7,
    });
  }

  // 2. Semester 1 & Semester 2 Folders inside ALL Academic Year Folders with badges '1' and '2'
  for (const yr of YEAR_ROOT_CONFIGS) {
    const sem1Id = yr.yearId === 'year-3' ? 'fld-y3-sem-1' : `fld-${yr.yearId}-sem-1`;
    const sem2Id = yr.yearId === 'year-3' ? 'fld-y3-sem-2' : `fld-${yr.yearId}-sem-2`;

    const existingSem1 = folderMap.get(sem1Id);
    folderMap.set(sem1Id, {
      ...existingSem1,
      id: sem1Id,
      name: existingSem1?.name || 'الفصل الأول',
      parentId: yr.folderId,
      type: 'folder',
      yearId: yr.yearId,
      semester: 'first',
      semesterBadge: '1',
      orderIndex: existingSem1?.orderIndex ?? 1,
    });

    const existingSem2 = folderMap.get(sem2Id);
    folderMap.set(sem2Id, {
      ...existingSem2,
      id: sem2Id,
      name: existingSem2?.name || 'الفصل الثاني',
      parentId: yr.folderId,
      type: 'folder',
      yearId: yr.yearId,
      semester: 'second',
      semesterBadge: '2',
      orderIndex: existingSem2?.orderIndex ?? 2,
    });

    // 3. Subject Folders inside each Semester Folder with the exact same icons & colors as Automation Bank
    const firstSemSubjects = subjects.filter(
      (s) => s.yearId === yr.yearId && s.semester === 'first'
    );
    firstSemSubjects.forEach((sub, idx) => {
      // Check if an existing folder already links to this subjectId under sem1Id
      const existingBySubject = Array.from(folderMap.values()).find(
        (f) => f.parentId === sem1Id && (f.subjectId === sub.id || f.name === sub.name)
      );
      const fldId = existingBySubject?.id || `fld-${sub.id}`;
      folderMap.set(fldId, {
        ...existingBySubject,
        id: fldId,
        name: existingBySubject?.name || sub.name,
        parentId: sem1Id,
        type: 'folder',
        yearId: yr.yearId,
        semester: 'first',
        isSubject: true,
        subjectId: sub.id,
        icon: sub.icon,
        coverColor: existingBySubject?.coverColor || sub.color,
        department: sub.department,
        orderIndex: existingBySubject?.orderIndex ?? idx + 1,
      });
    });

    const secondSemSubjects = subjects.filter(
      (s) => s.yearId === yr.yearId && s.semester === 'second'
    );
    secondSemSubjects.forEach((sub, idx) => {
      const existingBySubject = Array.from(folderMap.values()).find(
        (f) => f.parentId === sem2Id && (f.subjectId === sub.id || f.name === sub.name)
      );
      const fldId = existingBySubject?.id || `fld-${sub.id}`;
      folderMap.set(fldId, {
        ...existingBySubject,
        id: fldId,
        name: existingBySubject?.name || sub.name,
        parentId: sem2Id,
        type: 'folder',
        yearId: yr.yearId,
        semester: 'second',
        isSubject: true,
        subjectId: sub.id,
        icon: sub.icon,
        coverColor: existingBySubject?.coverColor || sub.color,
        department: sub.department,
        orderIndex: existingBySubject?.orderIndex ?? idx + 1,
      });
    });
  }

  return Array.from(folderMap.values());
}

export interface CreateCustomQuizInput {
  id?: string;
  title: string;
  description?: string;
  yearId?: AcademicYearId;
  semester?: 'first' | 'second';
  subjectIds: string[];
  categories?: ChapterCategory[];
  chapterIds: string[];
  questionLimit: number | 'all';
  sourceFilter: CustomQuizSourceFilter;
  shuffleQuestions: boolean;
  timeLimitMinutes?: number;
}

/**
 * Filters and resolves questions matching a student's custom quiz criteria.
 * Works both with pre-saved questionIds and dynamically when new questions are added to the selected subject/categories/chapters.
 */
export function resolveCustomQuizQuestions(
  quiz: Pick<
    StudentCustomQuiz,
    | 'subjectIds'
    | 'categories'
    | 'chapterIds'
    | 'questionLimit'
    | 'sourceFilter'
    | 'shuffleQuestions'
    | 'questionIds'
  >,
  allQuestions: QuestionItem[],
  subjects: SubjectItem[],
  options?: {
    solvedQuestions?: Record<string, { chosenOption: number; isCorrect: boolean }>;
    wrongQuestionIds?: string[];
    savedQuestionIds?: string[];
  }
): QuestionItem[] {
  // If quiz has a locked snapshot of questionIds that exist in allQuestions, use them in order
  if (Array.isArray(quiz.questionIds) && quiz.questionIds.length > 0) {
    const byId = new Map(allQuestions.map((q) => [q.id, q]));
    const matchedSnapshot = quiz.questionIds
      .map((id) => byId.get(id))
      .filter((q): q is QuestionItem => Boolean(q));
    if (matchedSnapshot.length > 0) {
      return matchedSnapshot;
    }
  }

  // Otherwise dynamically match from selected subjects, categories, and chapters
  const selectedSubSet = new Set(quiz.subjectIds);
  const selectedCategorySet = new Set(quiz.categories || []);
  const selectedChapterSet = new Set(quiz.chapterIds);

  // Build chapter lookup for category & name matching
  const chapterById = new Map<string, { name: string; category: ChapterCategory }>();
  const chapterByName = new Map<string, { id: string; category: ChapterCategory }>();
  const selectedChapterNames = new Set<string>();

  for (const sub of subjects) {
    if (selectedSubSet.size > 0 && !selectedSubSet.has(sub.id)) continue;
    for (const ch of sub.chapters || []) {
      const cat: ChapterCategory = ch.category || 'section';
      chapterById.set(ch.id, { name: ch.name, category: cat });
      chapterByName.set(ch.name, { id: ch.id, category: cat });
      if (selectedChapterSet.has(ch.id)) {
        selectedChapterNames.add(ch.name);
      }
    }
  }

  let pool = allQuestions.filter((q) => {
    if (selectedSubSet.size > 0 && !selectedSubSet.has(q.subjectId)) {
      return false;
    }

    // If specific chapters are checked, match by chapterId or chapterName
    if (selectedChapterSet.size > 0) {
      const matchId = selectedChapterSet.has(q.chapterId);
      const matchName = Boolean(q.chapterName && selectedChapterNames.has(q.chapterName));
      if (!matchId && !matchName) return false;
    } else if (selectedCategorySet.size > 0 && selectedCategorySet.size < 3) {
      // If no specific chapters are locked, filter by selected categories (section | lecture | comprehensive_partial)
      const resolvedCat: ChapterCategory =
        q.category ||
        chapterById.get(q.chapterId)?.category ||
        (q.chapterName ? chapterByName.get(q.chapterName)?.category : undefined) ||
        'section';
      if (!selectedCategorySet.has(resolvedCat)) {
        return false;
      }
    }

    if (quiz.sourceFilter === 'unsolved' && options?.solvedQuestions) {
      if (options.solvedQuestions[q.id] !== undefined) return false;
    }
    if (quiz.sourceFilter === 'wrong' && options?.wrongQuestionIds) {
      if (!options.wrongQuestionIds.includes(q.id)) return false;
    }
    if (quiz.sourceFilter === 'saved' && options?.savedQuestionIds) {
      if (!options.savedQuestionIds.includes(q.id)) return false;
    }
    return true;
  });

  if (quiz.shuffleQuestions) {
    pool = [...pool];
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
  }

  if (quiz.questionLimit !== 'all' && typeof quiz.questionLimit === 'number' && quiz.questionLimit > 0) {
    pool = pool.slice(0, quiz.questionLimit);
  }

  return pool;
}

/**
 * Builds a new StudentCustomQuiz object from form inputs.
 */
export function buildStudentCustomQuiz(
  input: CreateCustomQuizInput,
  allQuestions: QuestionItem[],
  subjects: SubjectItem[],
  filterContext?: {
    solvedQuestions?: Record<string, { chosenOption: number; isCorrect: boolean }>;
    wrongQuestionIds?: string[];
    savedQuestionIds?: string[];
  }
): StudentCustomQuiz {
  const cleanTitle = input.title.trim() || 'اختبار مخصص';
  const matchedQuestions = resolveCustomQuizQuestions(
    {
      subjectIds: input.subjectIds,
      categories: input.categories,
      chapterIds: input.chapterIds,
      questionLimit: input.questionLimit,
      sourceFilter: input.sourceFilter,
      shuffleQuestions: input.shuffleQuestions,
      questionIds: [],
    },
    allQuestions,
    subjects,
    filterContext
  );

  return {
    id: input.id || `myquiz-${Date.now()}`,
    title: cleanTitle,
    description: input.description?.trim() || undefined,
    yearId: input.yearId,
    semester: input.semester,
    subjectIds: input.subjectIds,
    categories: input.categories && input.categories.length > 0 ? input.categories : undefined,
    chapterIds: input.chapterIds,
    questionLimit: input.questionLimit,
    sourceFilter: input.sourceFilter,
    shuffleQuestions: input.shuffleQuestions,
    timeLimitMinutes:
      input.timeLimitMinutes && input.timeLimitMinutes > 0
        ? input.timeLimitMinutes
        : undefined,
    questionIds: matchedQuestions.map((q) => q.id),
    createdAt: new Date().toLocaleDateString('ar-SY'),
  };
}

import {
  AcademicYearId,
  QuestionCommentItem,
  QuestionItem,
  SemesterType,
  SubjectItem,
} from '../types';

export const YEAR_LABELS_AR: Record<AcademicYearId, string> = {
  'year-prep': 'السنة التحضيرية',
  'year-2': 'السنة الثانية',
  'year-3': 'السنة الثالثة',
  'year-4': 'السنة الرابعة',
  'year-5': 'السنة الخامسة',
  'year-6': 'السنة السادسة',
};

export const SEMESTER_LABELS_AR: Record<SemesterType, string> = {
  first: 'فصل أول',
  second: 'فصل ثاني',
};

export interface StructuredMediaNameInput {
  itemType?: 'file' | 'video';
  mediaType?: 'file' | 'video';
  title: string;
  yearId?: AcademicYearId | string;
  academicYearLabel?: string;
  yearLabel?: string;
  semester?: SemesterType | string;
  subjectOrFolderName?: string;
  chapterOrCategory?: string;
  extension?: string;
}

export interface StructuredMediaNameResult {
  fileName: string; // e.g., "MedFur - السنة الثالثة - فصل أول - تشريح 3 - فيديو - الجذع الدماغي.mp4"
  virtualPath: string; // e.g., "MedFur / السنة الثالثة / فصل أول / تشريح 3 / فيديو"
  extension: string;
}

function sanitizeSegment(text?: string): string {
  if (!text) return '';
  return text
    .replace(/[\\/:*?"<>|]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Generates an organized filename and folder hierarchy starting with "MedFur"
 * so downloaded files and videos are neatly sorted on the user's device and inside the app.
 */
export function buildStructuredMedFurFileName(
  input: StructuredMediaNameInput
): StructuredMediaNameResult {
  const resolvedType = input.itemType || input.mediaType || 'file';
  const yearLabel =
    sanitizeSegment(input.academicYearLabel || input.yearLabel) ||
    (input.yearId && YEAR_LABELS_AR[input.yearId as AcademicYearId]) ||
    'كلية الطب البشري';

  const semLabel = input.semester
    ? SEMESTER_LABELS_AR[input.semester as SemesterType] ||
      (input.semester === 'sem-1'
        ? 'فصل أول'
        : input.semester === 'sem-2'
          ? 'فصل ثاني'
          : sanitizeSegment(input.semester))
    : '';
  const subjectLabel = sanitizeSegment(input.subjectOrFolderName) || 'مقرر عام';
  const chapterLabel = sanitizeSegment(input.chapterOrCategory);
  const typeLabel = resolvedType === 'video' ? 'فيديو' : 'ملف';
  const cleanTitle =
    sanitizeSegment(input.title.replace(/\.[^/.]+$/, '')) || 'محتوى تعليمي';

  const rawExt = (
    input.extension ||
    (resolvedType === 'video' ? 'mp4' : 'pdf')
  )
    .replace(/^\.+/, '')
    .toLowerCase();

  const segments = ['MedFur', yearLabel];
  if (semLabel) segments.push(semLabel);
  if (subjectLabel) segments.push(subjectLabel);
  if (chapterLabel && chapterLabel !== subjectLabel) {
    segments.push(chapterLabel);
  }
  segments.push(typeLabel);

  const virtualPath = segments.join(' / ');
  const fileSegments = [...segments, cleanTitle];
  const fileName = `${fileSegments.join(' - ')}.${rawExt}`;

  return {
    fileName,
    virtualPath,
    extension: rawExt,
  };
}

export interface OfflineAutomationPackRecord {
  scope: 'all' | 'subject';
  subjectId?: string;
  subjectName?: string;
  questionsCount: number;
  subjectsCount: number;
  savedAt: string;
  questions: QuestionItem[];
  subjects: SubjectItem[];
}

export interface OfflineAutomationStatusMap {
  allPack?: {
    questionsCount: number;
    subjectsCount: number;
    savedAt: string;
  };
  bySubjectId: Record<
    string,
    {
      subjectId: string;
      subjectName: string;
      questionsCount: number;
      savedAt: string;
    }
  >;
}

const OFFLINE_AUTOMATION_STATUS_KEY = 'medfur_offline_automation_status_v1';
const OFFLINE_AUTOMATION_PACK_PREFIX = 'medfur_offline_qpack_v1_';

export function buildOfflineAutomationPack(params: {
  scope: 'all' | 'subject';
  subjects: SubjectItem[];
  questions: QuestionItem[];
  targetSubjectId?: string;
}): OfflineAutomationPackRecord {
  if (params.scope === 'subject' && params.targetSubjectId) {
    const targetSub = params.subjects.find(
      (s) => s.id === params.targetSubjectId
    );
    const subQuestions = params.questions.filter(
      (q) => q.subjectId === params.targetSubjectId
    );
    return {
      scope: 'subject',
      subjectId: params.targetSubjectId,
      subjectName: targetSub?.name || 'مادة دراسية',
      questionsCount: subQuestions.length,
      subjectsCount: targetSub ? 1 : 0,
      savedAt: new Date().toISOString(),
      questions: subQuestions,
      subjects: targetSub ? [targetSub] : [],
    };
  }

  return {
    scope: 'all',
    questionsCount: params.questions.length,
    subjectsCount: params.subjects.length,
    savedAt: new Date().toISOString(),
    questions: params.questions,
    subjects: params.subjects,
  };
}

export function loadOfflineAutomationStatus(): OfflineAutomationStatusMap {
  if (typeof window === 'undefined') {
    return { bySubjectId: {} };
  }
  try {
    const raw = localStorage.getItem(OFFLINE_AUTOMATION_STATUS_KEY);
    if (!raw) return { bySubjectId: {} };
    const parsed = JSON.parse(raw);
    return {
      allPack: parsed?.allPack,
      bySubjectId: parsed?.bySubjectId || {},
    };
  } catch {
    return { bySubjectId: {} };
  }
}

export function saveOfflineAutomationPackToStorage(
  pack: OfflineAutomationPackRecord
): OfflineAutomationStatusMap {
  const currentStatus = loadOfflineAutomationStatus();
  const nextStatus: OfflineAutomationStatusMap = {
    allPack: currentStatus.allPack,
    bySubjectId: { ...currentStatus.bySubjectId },
  };

  if (pack.scope === 'all') {
    nextStatus.allPack = {
      questionsCount: pack.questionsCount,
      subjectsCount: pack.subjectsCount,
      savedAt: pack.savedAt,
    };
    pack.subjects.forEach((sub) => {
      const subQCount = pack.questions.filter(
        (q) => q.subjectId === sub.id
      ).length;
      nextStatus.bySubjectId[sub.id] = {
        subjectId: sub.id,
        subjectName: sub.name,
        questionsCount: subQCount,
        savedAt: pack.savedAt,
      };
    });
  } else if (pack.scope === 'subject' && pack.subjectId) {
    nextStatus.bySubjectId[pack.subjectId] = {
      subjectId: pack.subjectId,
      subjectName: pack.subjectName || 'مادة دراسية',
      questionsCount: pack.questionsCount,
      savedAt: pack.savedAt,
    };
  }

  if (typeof window !== 'undefined') {
    try {
      const storageKey =
        pack.scope === 'all'
          ? `${OFFLINE_AUTOMATION_PACK_PREFIX}all`
          : `${OFFLINE_AUTOMATION_PACK_PREFIX}sub_${pack.subjectId}`;
      localStorage.setItem(storageKey, JSON.stringify(pack));
      localStorage.setItem(
        OFFLINE_AUTOMATION_STATUS_KEY,
        JSON.stringify(nextStatus)
      );
    } catch {
      // Ignore quota errors while still returning updated status
    }
  }

  return nextStatus;
}

/**
 * Checks if the current user is allowed to edit or delete a question discussion comment.
 */
export function canUserModifyComment(
  comment: Pick<QuestionCommentItem, 'authorId'>,
  currentUserId?: string | null,
  isAdmin?: boolean
): boolean {
  if (isAdmin) return true;
  if (!currentUserId) return false;
  return comment.authorId === currentUserId;
}

/**
 * Applies a student or admin edit to a QuestionCommentItem.
 */
export function applyCommentUpdate(
  comment: QuestionCommentItem,
  newContent: string
): QuestionCommentItem {
  const trimmed = newContent.trim();
  if (!trimmed) return comment;
  return {
    ...comment,
    content: trimmed,
    isEdited: true,
    updatedAt: 'معدّل الآن',
  };
}

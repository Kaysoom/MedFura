import {
  AccountType,
  QuizBehaviorPreferences,
  StudentCustomQuiz,
  StudyBackupPayload,
  UIDensityMode,
} from '../types';
import { processOptionClick, DualClickState } from './automationLogic';

export const DEFAULT_QUIZ_PREFERENCES: QuizBehaviorPreferences = {
  confirmMode: 'double',
  autoAdvanceOnCorrect: false,
  autoExpandExplanation: true,
  soundEffects: true,
};

export interface DensityLayoutClasses {
  isCompact: boolean;
  pageContainerPadding: string;
  sectionGap: string;
  cardPadding: string;
  cardRadius: string;
  homeServicesGrid: string;
  homeCardMinHeight: string;
  subjectsGrid: string;
  chaptersGrid: string;
  libraryFoldersGrid: string;
  libraryFilesGrid: string;
  questionStreamGap: string;
  questionCardPadding: string;
  optionButtonPadding: string;
}

/**
 * Returns adaptive layout, spacing, and multi-column grid classes based on the selected UI Density mode.
 * - 'balanced': Preserves the default comfortable spacing and column counts.
 * - 'compact': Tightens margins/paddings and displays more items per row across views.
 */
export function getDensityLayoutClasses(density: UIDensityMode): DensityLayoutClasses {
  if (density === 'compact') {
    return {
      isCompact: true,
      pageContainerPadding: 'px-2.5 sm:px-3.5 py-2 sm:py-3',
      sectionGap: 'space-y-2.5 sm:space-y-3',
      cardPadding: 'p-2.5 sm:p-3',
      cardRadius: 'rounded-xl sm:rounded-2xl',
      homeServicesGrid: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-2.5',
      homeCardMinHeight: 'min-h-[104px] sm:min-h-[124px]',
      subjectsGrid: 'grid grid-cols-1 sm:grid-cols-2 gap-2',
      chaptersGrid: 'grid grid-cols-1 sm:grid-cols-2 gap-2',
      libraryFoldersGrid: 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2',
      libraryFilesGrid: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2',
      questionStreamGap: 'space-y-3',
      questionCardPadding: 'p-3 sm:p-4 space-y-2.5',
      optionButtonPadding: 'p-2.5 rounded-xl',
    };
  }

  return {
    isCompact: false,
    pageContainerPadding: 'px-3.5 sm:px-4 py-3.5 sm:py-5',
    sectionGap: 'space-y-4 sm:space-y-5',
    cardPadding: 'p-3.5 sm:p-5',
    cardRadius: 'rounded-2xl sm:rounded-3xl',
    homeServicesGrid: 'grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-4',
    homeCardMinHeight: 'min-h-[132px] sm:min-h-[165px]',
    subjectsGrid: 'space-y-3',
    chaptersGrid: 'space-y-2.5',
    libraryFoldersGrid: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3',
    libraryFilesGrid: 'grid grid-cols-1 lg:grid-cols-2 gap-3',
    questionStreamGap: 'space-y-5',
    questionCardPadding: 'p-4 sm:p-6 space-y-3.5',
    optionButtonPadding: 'p-3.5 rounded-2xl',
  };
}

/**
 * Resolves option click behavior according to user's QuizBehaviorPreferences.
 * If confirmMode === 'single', the very first click immediately confirms the answer.
 * If confirmMode === 'double', delegates to the standard 2-step blue-highlight confirmation.
 */
export function resolveOptionClickWithPreferences(
  currentTempChoice: number | null,
  clickedOptionIdx: number,
  alreadySolved: boolean,
  confirmMode: 'double' | 'single'
): DualClickState {
  if (alreadySolved) {
    return { action: 'noop', nextTempChoice: null };
  }
  if (confirmMode === 'single') {
    return {
      action: 'confirm',
      nextTempChoice: null,
      chosenOption: clickedOptionIdx,
    };
  }
  return processOptionClick(currentTempChoice, clickedOptionIdx, alreadySolved);
}

/**
 * Creates a clean, deterministic JSON-serializable study backup object for export.
 */
export function createStudyBackupPayload(params: {
  accountType: AccountType;
  solvedQuestions: Record<string, { chosenOption: number; isCorrect: boolean }>;
  savedQuestionIds: string[];
  wrongQuestionIds: string[];
  questionNotes: Record<string, string>;
  studentCustomQuizzes: StudentCustomQuiz[];
}): StudyBackupPayload {
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    accountType: params.accountType,
    solvedQuestions: { ...params.solvedQuestions },
    savedQuestionIds: [...params.savedQuestionIds],
    wrongQuestionIds: [...params.wrongQuestionIds],
    questionNotes: { ...params.questionNotes },
    studentCustomQuizzes: [...params.studentCustomQuizzes],
  };
}

/**
 * Validates and parses a JSON string representing a StudyBackupPayload.
 */
export function parseAndValidateStudyBackup(rawJson: string): {
  valid: boolean;
  payload?: StudyBackupPayload;
  error?: string;
} {
  try {
    const parsed = JSON.parse(rawJson);
    if (!parsed || typeof parsed !== 'object') {
      return { valid: false, error: 'ملف النسخة الاحتياطية غير صالح.' };
    }
    if (
      typeof parsed.solvedQuestions !== 'object' ||
      !Array.isArray(parsed.savedQuestionIds) ||
      !Array.isArray(parsed.wrongQuestionIds)
    ) {
      return {
        valid: false,
        error: 'بنية ملف النسخة الاحتياطية غير مكتملة أو تالفة.',
      };
    }

    const payload: StudyBackupPayload = {
      version: Number(parsed.version) || 1,
      exportedAt:
        typeof parsed.exportedAt === 'string'
          ? parsed.exportedAt
          : new Date().toISOString(),
      accountType:
        parsed.accountType === 'admin' ||
        parsed.accountType === 'student' ||
        parsed.accountType === 'guest'
          ? parsed.accountType
          : 'student',
      solvedQuestions: parsed.solvedQuestions || {},
      savedQuestionIds: parsed.savedQuestionIds.filter(
        (id: unknown) => typeof id === 'string'
      ),
      wrongQuestionIds: parsed.wrongQuestionIds.filter(
        (id: unknown) => typeof id === 'string'
      ),
      questionNotes:
        parsed.questionNotes && typeof parsed.questionNotes === 'object'
          ? parsed.questionNotes
          : {},
      studentCustomQuizzes: Array.isArray(parsed.studentCustomQuizzes)
        ? parsed.studentCustomQuizzes
        : [],
    };

    return { valid: true, payload };
  } catch {
    return {
      valid: false,
      error: 'تعذر قراءة ملف JSON. تأكد من اختيار ملف نسخة احتياطية صحيح من MedFur.',
    };
  }
}

/**
 * Synthesizes a subtle, pleasant Web Audio feedback chime for quiz answers without external audio assets.
 */
export function playQuizFeedbackTone(isCorrect: boolean, enabled: boolean): void {
  if (!enabled || typeof window === 'undefined') return;
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    const now = ctx.currentTime;
    if (isCorrect) {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, now); // C5
      osc.frequency.exponentialRampToValueAtTime(659.25, now + 0.12); // E5
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
      osc.start(now);
      osc.stop(now + 0.22);
    } else {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(310, now);
      osc.frequency.exponentialRampToValueAtTime(220, now + 0.18);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);
      osc.start(now);
      osc.stop(now + 0.24);
    }
  } catch {
    // Ignore audio context restrictions if user hasn't interacted
  }
}

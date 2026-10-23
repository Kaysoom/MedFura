export interface SolvedEntry {
  chosenOption: number;
  isCorrect: boolean;
}

export interface DetailedQuestionStats {
  totalQuestions: number;
  solvedCount: number;
  remainingCount: number;
  correctCount: number;
  wrongCount: number;
  accuracy: number;
}

export type QuestionStatsSummary = DetailedQuestionStats;

/**
 * Calculates comprehensive question statistics (Total, Solved, Remaining, Correct, Wrong, Accuracy)
 * for any subset of questions (global, per-subject, or per-chapter).
 */
export function computeQuestionStats(
  targetQuestions: { id: string }[],
  solvedMap: Record<string, SolvedEntry>
): DetailedQuestionStats {
  const totalQuestions = targetQuestions.length;
  let solvedCount = 0;
  let correctCount = 0;
  let wrongCount = 0;

  for (const q of targetQuestions) {
    const entry = solvedMap[q.id];
    if (entry !== undefined) {
      solvedCount += 1;
      if (entry.isCorrect) {
        correctCount += 1;
      } else {
        wrongCount += 1;
      }
    }
  }

  const remainingCount = Math.max(0, totalQuestions - solvedCount);
  const accuracy = solvedCount > 0 ? Math.round((correctCount / solvedCount) * 100) : 0;

  return {
    totalQuestions,
    solvedCount,
    remainingCount,
    correctCount,
    wrongCount,
    accuracy,
  };
}

export type OptionClickResult =
  | { action: 'noop'; nextTempChoice: number | null }
  | { action: 'select'; nextTempChoice: number }
  | { action: 'confirm'; chosenOption: number; nextTempChoice: null };

/**
 * Dual-verification option click state machine:
 * - 1st click on an option selects it (blue state).
 * - 2nd click on the SAME selected option immediately confirms & checks the answer (green/red).
 * - Clicking a different option switches the blue selection to the new option.
 */
export function processOptionClick(
  currentTempChoice: number | null,
  clickedIndex: number,
  alreadySolved: boolean
): OptionClickResult {
  if (alreadySolved) {
    return { action: 'noop', nextTempChoice: currentTempChoice };
  }

  if (currentTempChoice === clickedIndex) {
    return {
      action: 'confirm',
      chosenOption: clickedIndex,
      nextTempChoice: null,
    };
  }

  return {
    action: 'select',
    nextTempChoice: clickedIndex,
  };
}

/**
 * Reconciles the Mistakes Bank list when the student exits the Mistakes tab/view.
 * Questions answered correctly during the session are removed upon exit;
 * questions left unanswered or answered wrong remain in the Mistakes Bank.
 */
export function reconcileMistakesOnExit(
  wrongQuestionIds: string[],
  sessionSolved: Record<string, SolvedEntry>
): string[] {
  return wrongQuestionIds.filter((qId) => {
    const attempt = sessionSolved[qId];
    if (attempt && attempt.isCorrect) {
      return false; // Remove from mistakes bank upon exit
    }
    return true; // Keep if unsolved or answered wrong again
  });
}

/**
 * Resolves the starting question index when a student enters or returns to a chapter.
 */
export function getResumeQuestionIndex(
  chapterId: string,
  totalInChapter: number,
  savedLastIndexMap: Record<string, number>
): number {
  if (totalInChapter <= 0) return 0;
  const savedIdx = savedLastIndexMap[chapterId];
  if (typeof savedIdx !== 'number' || Number.isNaN(savedIdx) || savedIdx < 0) {
    return 0;
  }
  if (savedIdx >= totalInChapter) {
    return totalInChapter - 1;
  }
  return savedIdx;
}

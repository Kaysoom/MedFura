import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import {
  ChevronRight,
  ChevronLeft,
  Plus,
  Edit3,
  Trash2,
  CheckCircle2,
  HelpCircle,
  Award,
  RotateCcw,
  Sparkles,
  Check,
  X,
  Layers,
  BookOpen,
  Bookmark,
  FileText,
  AlertTriangle,
  BarChart3,
  CheckCheck,
  ShieldCheck,
  Eye,
  EyeOff,
  Type,
  ArrowUp,
  ArrowDown,
  Compass,
  Filter,
  MessageSquare,
  Flag,
  Search,
  Timer,
  Play,
  Pause,
  Sun,
  Moon,
  ChevronDown,
  ChevronUp,
  Pin,
  Shuffle,
  Brain,
  FileCode2,
} from 'lucide-react';
import {
  SubjectItem,
  QuestionItem,
  ChapterItem,
  AcademicYearId,
  ChapterCategory,
  getQuestionOptions,
} from '../../types';
import { INITIAL_YEARS } from '../../initialData';
import { SubjectModal } from '../Admin/SubjectModal';
import { QuestionModal } from '../Admin/QuestionModal';
import { BulkImportModal } from '../Admin/BulkImportModal';
import { ConfirmationDialog } from '../Common/ConfirmationDialog';
import { InAppSelect } from '../Common/InAppSelect';
import { SubjectMedicalIcon, resolveSubjectMedicalIcon } from '../Common/SubjectMedicalIcon';
import { StatCircleButton, StatsCircleModal } from './StatsCircleModal';
import { QuestionDiscussionModal } from './QuestionDiscussionModal';
import { ReportQuestionModal } from './ReportQuestionModal';
import { AITutorModal } from './AITutorModal';
import { GeminiContextChatModal } from './GeminiContextChatModal';
import { SupervisorReportsPanel } from './SupervisorReportsPanel';
import {
  computeQuestionStats,
  processOptionClick,
  SolvedEntry,
  QuestionStatsSummary,
} from '../../utils/automationLogic';
import confetti from 'canvas-confetti';

export const AutomationBankView: React.FC = () => {
  const {
    subjects,
    questions,
    activeYear,
    setActiveYear,
    activeSemester,
    setActiveSemester,
    isAdmin,
    setActiveSection,
    deleteSubject,
    deleteQuestion,
    addChapterToSubject,
    renameChapterInSubject,
    deleteChapterFromSubject,
    selectedSubjectId,
    setSelectedSubjectId,
    selectedChapterId,
    setSelectedChapterId,
    darkMode,
    toggleDarkMode,
    eyeComfortMode,
    toggleEyeComfortMode,
    questionFontScale,
    setQuestionFontScale,
    savedQuestionIds,
    toggleSaveQuestion,
    questionNotes,
    saveQuestionNote,
    deleteQuestionNote,
    wrongQuestionIds,
    removeWrongQuestions,
    solvedQuestions,
    recordQuestionAnswer,
    resetQuestionStatus,
    resetQuestionsBatch,
    resetAllQuestionStatus,
    questionComments,
    deleteQuestionComment,
    questionReports,
  } = useApp();

  // Top Tabs: 'bank' | 'mistakes' | 'saved_notes' | 'stats' | 'reports'
  const [activeTab, setActiveTab] = useState<'bank' | 'mistakes' | 'saved_notes' | 'stats' | 'reports'>('bank');

  // Inside Subject Sub-tab: 'chapters' | 'subject_stats'
  const [subjectSubTab, setSubjectSubTab] = useState<'chapters' | 'subject_stats'>('chapters');

  // Inside Subject Chapters Organization: Category Tabs (3 tabs: الأقسام | المحاضرات | شامل وجزئي), Search, Status Filter, Pinned Chapters & Last Visited Chapter
  const [activeChapterCategoryTab, setActiveChapterCategoryTab] = useState<'section' | 'lecture' | 'comprehensive_partial'>('section');
  const [chapterListSearch, setChapterListSearch] = useState('');
  const [chapterStatusFilter, setChapterStatusFilter] = useState<'all' | 'in_progress' | 'completed' | 'not_started'>('all');

  const [pinnedChapterIds, setPinnedChapterIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('uni_pinned_chapters_v1');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [lastVisitedChapterBySubject, setLastVisitedChapterBySubject] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem('uni_last_visited_chapter_v1');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Custom Multi-Chapter Random Quiz Builder State
  const [isCustomQuizModalOpen, setIsCustomQuizModalOpen] = useState(false);
  const [customQuizSelectedChapterIds, setCustomQuizSelectedChapterIds] = useState<string[]>([]);
  const [customQuizQuestionLimit, setCustomQuizQuestionLimit] = useState<number | 'all'>(15);
  const [customQuizQuestionIds, setCustomQuizQuestionIds] = useState<string[]>([]);

  // Chapter Stream Filter: 'all' | 'unsolved' | 'wrong' | 'saved'
  const [chapterStreamFilter, setChapterStreamFilter] = useState<'all' | 'unsolved' | 'wrong' | 'saved'>('all');
  const [chapterSearchQuery, setChapterSearchQuery] = useState('');
  const [isFilterPopoverOpen, setIsFilterPopoverOpen] = useState(false);
  const [quickJumpNumber, setQuickJumpNumber] = useState('');

  // Track last solved question ID for the middle Green Dot navigation button
  const [lastSolvedQuestionId, setLastSolvedQuestionId] = useState<string | null>(null);
  const [highlightedQuestionId, setHighlightedQuestionId] = useState<string | null>(null);

  // Collapsible academic explanations per question ID (collapsed by default on user toggle)
  const [collapsedExplanations, setCollapsedExplanations] = useState<Record<string, boolean>>({});

  // Option Elimination (strikethrough distractors while thinking): questionId -> eliminated option indices
  const [eliminatedOptions, setEliminatedOptions] = useState<Record<string, number[]>>({});

  // Calm Study & Focus Timer state
  const [studySeconds, setStudySeconds] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(true);

  // Modals state
  const [isSubjectModalOpen, setIsSubjectModalOpen] = useState(false);
  const [subjectToEdit, setSubjectToEdit] = useState<SubjectItem | null>(null);

  const [isQuestionModalOpen, setIsQuestionModalOpen] = useState(false);
  const [questionToEdit, setQuestionToEdit] = useState<QuestionItem | null>(null);
  const [modalTargetSubjectId, setModalTargetSubjectId] = useState<string | null>(null);

  // Bulk Import & Syntax Parser Modal state (for Supervisor)
  const [isBulkImportModalOpen, setIsBulkImportModalOpen] = useState(false);
  const [bulkImportSubjectId, setBulkImportSubjectId] = useState<string | null>(null);
  const [bulkImportChapterId, setBulkImportChapterId] = useState<string | null>(null);

  // Circular Stats Modal State (for any Chapter or Subject)
  const [statsModalConfig, setStatsModalConfig] = useState<{
    isOpen: boolean;
    title: string;
    subtitle?: string;
    stats: QuestionStatsSummary;
    questionIds: string[];
    onStartSolving?: () => void;
  } | null>(null);

  // Unified Confirmation Dialog State for Deletions & Resets
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    itemName?: string;
    confirmLabel?: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  const openConfirmDialog = (config: {
    title: string;
    message: string;
    itemName?: string;
    confirmLabel?: string;
    onConfirm: () => void;
  }) => {
    setConfirmDialog({
      isOpen: true,
      ...config,
    });
  };

  // Chapter management state
  const [isAddingChapter, setIsAddingChapter] = useState(false);
  const [newChapterName, setNewChapterName] = useState('');
  const [newChapterCategory, setNewChapterCategory] = useState<ChapterCategory>('section');
  const [renamingChapterId, setRenamingChapterId] = useState<string | null>(null);
  const [renamedChapterName, setRenamedChapterName] = useState('');
  const [renamedChapterCategory, setRenamedChapterCategory] = useState<ChapterCategory>('section');

  // Vertical Stream Temporary Choices per Question ID (1st click blue, 2nd click confirms)
  const [chapterTempChoices, setChapterTempChoices] = useState<Record<string, number | null>>({});
  const [activeNoteModalQId, setActiveNoteModalQId] = useState<string | null>(null);
  const [currentNoteText, setCurrentNoteText] = useState('');

  // Independent Pop-up Modals for Discussion, Report Question, AI Academic Tutor, and Context-Aware Gemini Chat
  const [discussionQuestion, setDiscussionQuestion] = useState<QuestionItem | null>(null);
  const [reportQuestion, setReportQuestion] = useState<QuestionItem | null>(null);
  const [aiTutorQuestion, setAiTutorQuestion] = useState<QuestionItem | null>(null);
  const [isGeminiContextChatOpen, setIsGeminiContextChatOpen] = useState(false);

  // Refs for scrolling to specific questions in the vertical stream
  const questionCardRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Saved / Notes Sub-tab: 'saved' | 'notes'
  const [savedNotesSubTab, setSavedNotesSubTab] = useState<'saved' | 'notes'>('saved');

  // Local Session State for Mistakes Bank (questions start unsolved; correct ones are synced to chapter immediately and removed from Mistakes Bank on exit)
  const [mistakesTempChoice, setMistakesTempChoice] = useState<Record<string, number | null>>({});
  const [mistakesSessionSolved, setMistakesSessionSolved] = useState<Record<string, SolvedEntry>>({});
  const mistakesSessionSolvedRef = useRef<Record<string, SolvedEntry>>({});
  mistakesSessionSolvedRef.current = mistakesSessionSolved;

  // Local Session State for Saved Questions (questions start unsolved every time user visits Saved tab)
  const [savedTempChoice, setSavedTempChoice] = useState<Record<string, number | null>>({});
  const [savedSessionSolved, setSavedSessionSolved] = useState<Record<string, SolvedEntry>>({});

  // Reconcile Mistakes Bank & reset Saved session when leaving tabs
  const commitExitFromMistakesOrSaved = () => {
    const currentMistakesSolved = mistakesSessionSolvedRef.current;
    const solvedCorrectlyInMistakes = Object.entries(currentMistakesSolved)
      .filter(([, val]) => val.isCorrect)
      .map(([qId]) => qId);

    if (solvedCorrectlyInMistakes.length > 0) {
      removeWrongQuestions(solvedCorrectlyInMistakes);
    }
    setMistakesSessionSolved({});
    setMistakesTempChoice({});
    setSavedSessionSolved({});
    setSavedTempChoice({});
  };

  const handleSwitchTab = (nextTab: 'bank' | 'mistakes' | 'saved_notes' | 'stats' | 'reports') => {
    if (nextTab === activeTab) return;
    if (activeTab === 'mistakes' || activeTab === 'saved_notes') {
      commitExitFromMistakesOrSaved();
    }
    setActiveTab(nextTab);
  };

  const pendingReportsCount = useMemo(
    () => questionReports.filter(r => r.status === 'pending').length,
    [questionReports]
  );

  useEffect(() => {
    if (!selectedChapterId || !isTimerRunning) return;
    const interval = setInterval(() => {
      setStudySeconds(prev => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [selectedChapterId, isTimerRunning]);

  const formatStudyTimer = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const toggleEliminateOption = (questionId: string, optionIdx: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setEliminatedOptions(prev => {
      const current = prev[questionId] || [];
      const exists = current.includes(optionIdx);
      return {
        ...prev,
        [questionId]: exists ? current.filter(i => i !== optionIdx) : [...current, optionIdx],
      };
    });
  };

  // Render Shared Modals (Discussion, Report Question, AI Academic Tutor) across all levels
  const renderAdvancedQuestionModals = () => {
    const aiSubject = aiTutorQuestion
      ? subjects.find(s => s.id === aiTutorQuestion.subjectId)
      : null;

    const discussionSubject = discussionQuestion
      ? subjects.find(s => s.id === discussionQuestion.subjectId)
      : null;
    const reportSubject = reportQuestion
      ? subjects.find(s => s.id === reportQuestion.subjectId)
      : null;

    return (
      <>
        <QuestionDiscussionModal
          isOpen={!!discussionQuestion}
          onClose={() => setDiscussionQuestion(null)}
          question={discussionQuestion}
          subjectName={discussionSubject?.name}
          onRequestDeleteComment={(commentId, preview) =>
            openConfirmDialog({
              title: 'حذف التعليق من المناقشة',
              message: 'هل أنت متأكد من رغبتك في حذف هذا التعليق من مناقشة السؤال؟',
              itemName: preview,
              onConfirm: () => deleteQuestionComment(commentId),
            })
          }
        />

        <ReportQuestionModal
          isOpen={!!reportQuestion}
          onClose={() => setReportQuestion(null)}
          question={reportQuestion}
          subjectName={reportSubject?.name}
        />

        <AITutorModal
          isOpen={!!aiTutorQuestion}
          onClose={() => setAiTutorQuestion(null)}
          question={aiTutorQuestion}
          subjectName={aiSubject?.name || activeSubject?.name || 'المقرر العلمي'}
          questionNote={aiTutorQuestion ? questionNotes[aiTutorQuestion.id] : undefined}
          onReportQuestion={(q) => {
            setAiTutorQuestion(null);
            setReportQuestion(q);
          }}
        />

        {/* Floating Context-Aware Gemini Medical Chatbot Trigger (Bottom-Left) */}
        <button
          type="button"
          onClick={() => setIsGeminiContextChatOpen(true)}
          className="fixed left-3 bottom-4 z-40 px-3.5 py-2.5 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white shadow-xl shadow-violet-950/60 border border-violet-400/40 flex items-center gap-2 transition-all cursor-pointer group"
          title="محادثة Gemini الذكية الواعية بالسياق (High Thinking)"
          aria-label="فتح مساعد Gemini الطبي السياقي"
        >
          <div className="w-7 h-7 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
            <Brain className="w-4 h-4 text-pink-200 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-right">
            <span className="block text-[11px] font-black leading-tight">
              مساعد Gemini الذكي
            </span>
            <span className="block text-[9px] text-violet-200 font-bold leading-tight">
              تفكير عميق · واعي بالسياق
            </span>
          </div>
        </button>

        <GeminiContextChatModal
          isOpen={isGeminiContextChatOpen}
          onClose={() => setIsGeminiContextChatOpen(false)}
          contextData={{
            yearName: INITIAL_YEARS.find(y => y.id === activeYear)?.name || 'السنة الثالثة',
            semesterName: activeSemester === 'first' ? 'الفصل الأول' : 'الفصل الثاني',
            subjectName: activeSubject?.name,
            chapterName:
              selectedChapterId === '__custom_quiz__'
                ? 'اختبار عشوائي مخصص'
                : activeSubject?.chapters?.find(c => c.id === selectedChapterId)?.name,
            statsSummary: (() => {
              const scopeQuestions =
                currentSubjectQuestions.length > 0
                  ? currentSubjectQuestions
                  : activeSubject
                  ? questions.filter(q => q.subjectId === activeSubject.id)
                  : questions;
              const st = computeQuestionStats(
                scopeQuestions,
                solvedQuestions
              );
              return {
                total: st.totalQuestions,
                solved: st.solvedCount,
                correct: st.correctCount,
                wrong: st.wrongCount,
                accuracy: st.accuracy,
              };
            })(),
            recentMistakes: wrongQuestionIds
              .map(id => questions.find(q => q.id === id))
              .filter((q): q is QuestionItem => !!q && (!activeSubject || q.subjectId === activeSubject.id))
              .slice(0, 6)
              .map(q => {
                const opts = getQuestionOptions(q).map(o => o.text);
                return {
                  questionText: q.questionText,
                  correctAnswer: opts[q.correctOptionIndex] || q.optionA,
                  explanation: q.explanation,
                  chapterName: q.chapterName,
                };
              }),
            savedNotes: Object.entries(questionNotes)
              .map(([qId, note]) => {
                const q = questions.find(item => item.id === qId);
                return q && note ? { questionText: q.questionText, note } : null;
              })
              .filter((item): item is { questionText: string; note: string } => !!item)
              .slice(0, 5),
            activeQuestionsSample: (currentSubjectQuestions.length > 0
              ? currentSubjectQuestions
              : activeSubject
              ? questions.filter(q => q.subjectId === activeSubject.id)
              : questions
            )
              .slice(0, 6)
              .map(q => {
                const opts = getQuestionOptions(q).map(o => o.text);
                return {
                  questionText: q.questionText,
                  correctAnswer: opts[q.correctOptionIndex] || q.optionA,
                  explanation: q.explanation,
                };
              }),
          }}
        />

        <BulkImportModal
          isOpen={isBulkImportModalOpen}
          onClose={() => setIsBulkImportModalOpen(false)}
          defaultSubjectId={
            bulkImportSubjectId || activeSubject?.id || currentSubjects[0]?.id || subjects[0]?.id
          }
          defaultChapterId={
            bulkImportChapterId ||
            (selectedChapterId && selectedChapterId !== '__custom_quiz__' ? selectedChapterId : null)
          }
        />
      </>
    );
  };

  // Subjects for active year and semester
  const currentSubjects = useMemo(() => {
    return subjects.filter(s => s.yearId === activeYear && s.semester === activeSemester);
  }, [subjects, activeYear, activeSemester]);

  // Active Subject details if drilled in
  const activeSubject = useMemo(() => {
    return subjects.find(s => s.id === selectedSubjectId) || null;
  }, [subjects, selectedSubjectId]);

  // Questions for active subject and chapter (supports single chapter OR custom multi-chapter random quiz)
  const currentSubjectQuestions = useMemo(() => {
    if (!selectedSubjectId) return [];
    if (!selectedChapterId) return questions.filter(q => q.subjectId === selectedSubjectId);
    if (selectedChapterId === '__custom_quiz__') {
      const idSet = new Set(customQuizQuestionIds);
      return customQuizQuestionIds
        .map(id => questions.find(q => q.id === id))
        .filter((q): q is QuestionItem => !!q && idSet.has(q.id));
    }
    const chName = activeSubject?.chapters?.find(c => c.id === selectedChapterId)?.name;
    return questions.filter(
      q => q.subjectId === selectedSubjectId && (q.chapterId === selectedChapterId || (chName && q.chapterName === chName))
    );
  }, [questions, selectedSubjectId, selectedChapterId, activeSubject, customQuizQuestionIds]);

  // Filtered questions in the chapter vertical stream (by status tab + instant keyword search)
  const filteredChapterQuestions = useMemo(() => {
    const query = chapterSearchQuery.trim().toLowerCase();
    return currentSubjectQuestions.filter(q => {
      if (chapterStreamFilter === 'unsolved' && solvedQuestions[q.id] !== undefined) return false;
      if (chapterStreamFilter === 'wrong' && solvedQuestions[q.id]?.isCorrect !== false) return false;
      if (chapterStreamFilter === 'saved' && !savedQuestionIds.includes(q.id)) return false;

      if (query) {
        const optsText = getQuestionOptions(q).map(o => o.text).join(' ');
        const hay = `${q.questionText} ${optsText} ${q.explanation || ''} ${q.year || ''}`.toLowerCase();
        if (!hay.includes(query)) return false;
      }
      return true;
    });
  }, [currentSubjectQuestions, chapterStreamFilter, chapterSearchQuery, solvedQuestions, savedQuestionIds]);

  // Mistakes questions list
  const mistakeQuestionsList = useMemo(() => {
    return questions.filter(q => wrongQuestionIds.includes(q.id));
  }, [questions, wrongQuestionIds]);

  // Saved questions list
  const savedQuestionsList = useMemo(() => {
    return questions.filter(q => savedQuestionIds.includes(q.id));
  }, [questions, savedQuestionIds]);

  // Questions with notes
  const noteQuestionsList = useMemo(() => {
    return questions.filter(q => !!questionNotes[q.id]);
  }, [questions, questionNotes]);

  // Global statistics (including totalQuestions and remainingCount)
  const globalStats = useMemo(() => {
    return computeQuestionStats(questions, solvedQuestions);
  }, [questions, solvedQuestions]);

  // Current Chapter statistics
  const activeChapterStats = useMemo(() => {
    return computeQuestionStats(currentSubjectQuestions, solvedQuestions);
  }, [currentSubjectQuestions, solvedQuestions]);

  const triggerCelebration = () => {
    try {
      confetti({
        particleCount: 35,
        spread: 60,
        origin: { y: 0.8 },
        colors: ['#10B981', '#38BDF8', '#F59E0B'],
      });
    } catch {
      // safe fallback
    }
  };

  // Font size helper classes for question text and options
  const questionTitleFontClass =
    questionFontScale === 'xlarge'
      ? 'text-lg sm:text-xl'
      : questionFontScale === 'large'
      ? 'text-base sm:text-lg'
      : 'text-sm sm:text-base';

  const optionTextFontClass =
    questionFontScale === 'xlarge'
      ? 'text-sm sm:text-base'
      : questionFontScale === 'large'
      ? 'text-xs sm:text-sm'
      : 'text-xs sm:text-sm';

  const cardSurfaceClass = eyeComfortMode
    ? 'bg-[#1C1915] border-amber-900/40'
    : 'bg-[#131D2E] border-slate-800';

  // ========================================================
  // Dual-Verification in Chapter Vertical Stream Mode:
  // 1st click -> Blue selection
  // 2nd click on same option -> Confirm & check answer (Green/Red)
  // ========================================================
  const handleStreamOptionClick = (question: QuestionItem, optionIdx: number) => {
    const alreadyConfirmed = solvedQuestions[question.id] !== undefined;
    const currentTemp = chapterTempChoices[question.id] ?? null;
    const result = processOptionClick(currentTemp, optionIdx, alreadyConfirmed);

    if (result.action === 'select') {
      setChapterTempChoices(prev => ({ ...prev, [question.id]: result.nextTempChoice }));
    } else if (result.action === 'confirm') {
      const isCorrect = result.chosenOption === question.correctOptionIndex;
      recordQuestionAnswer(question.id, result.chosenOption, isCorrect);
      setLastSolvedQuestionId(question.id);
      setChapterTempChoices(prev => ({ ...prev, [question.id]: null }));
      if (isCorrect) triggerCelebration();
    }
  };

  // Button 1: علامة صح (✓) لتأكيد الخيار في السرد الطولي
  const handleStreamConfirmButton = (question: QuestionItem) => {
    const chosen = chapterTempChoices[question.id];
    if (chosen === null || chosen === undefined) return;
    const isCorrect = chosen === question.correctOptionIndex;
    recordQuestionAnswer(question.id, chosen, isCorrect);
    setLastSolvedQuestionId(question.id);
    setChapterTempChoices(prev => ({ ...prev, [question.id]: null }));
    if (isCorrect) triggerCelebration();
  };

  // Dual-Verification inside Mistakes Bank & Saved Questions interactive cards
  // IMPORTANT: When a question is solved correctly in Mistakes Bank ('mistakes'),
  // we ALSO call recordQuestionAnswer(question.id, chosenOption, true) so it becomes
  // Correct ('صح') inside its original chapter/subject immediately!
  const handleCardOptionClick = (
    question: QuestionItem,
    optionIdx: number,
    mode: 'mistakes' | 'saved'
  ) => {
    const solvedMap = mode === 'mistakes' ? mistakesSessionSolved : savedSessionSolved;
    const tempMap = mode === 'mistakes' ? mistakesTempChoice : savedTempChoice;
    const setSolvedMap = mode === 'mistakes' ? setMistakesSessionSolved : setSavedSessionSolved;
    const setTempMap = mode === 'mistakes' ? setMistakesTempChoice : setSavedTempChoice;

    const alreadySolved = solvedMap[question.id] !== undefined;
    const currentTemp = tempMap[question.id] ?? null;
    const result = processOptionClick(currentTemp, optionIdx, alreadySolved);

    if (result.action === 'select') {
      setTempMap(prev => ({ ...prev, [question.id]: result.nextTempChoice }));
    } else if (result.action === 'confirm') {
      const isCorrect = result.chosenOption === question.correctOptionIndex;
      setSolvedMap(prev => ({
        ...prev,
        [question.id]: { chosenOption: result.chosenOption, isCorrect },
      }));
      setTempMap(prev => ({ ...prev, [question.id]: null }));
      if (mode === 'mistakes' && isCorrect) {
        recordQuestionAnswer(question.id, result.chosenOption, true);
      }
      if (isCorrect) triggerCelebration();
    }
  };

  const handleCardConfirmButton = (question: QuestionItem, mode: 'mistakes' | 'saved') => {
    const tempMap = mode === 'mistakes' ? mistakesTempChoice : savedTempChoice;
    const setSolvedMap = mode === 'mistakes' ? setMistakesSessionSolved : setSavedSessionSolved;
    const setTempMap = mode === 'mistakes' ? setMistakesTempChoice : setSavedTempChoice;

    const chosen = tempMap[question.id];
    if (chosen === null || chosen === undefined) return;
    const isCorrect = chosen === question.correctOptionIndex;
    setSolvedMap(prev => ({
      ...prev,
      [question.id]: { chosenOption: chosen, isCorrect },
    }));
    setTempMap(prev => ({ ...prev, [question.id]: null }));
    if (mode === 'mistakes' && isCorrect) {
      recordQuestionAnswer(question.id, chosen, true);
    }
    if (isCorrect) triggerCelebration();
  };

  const handleCardResetButton = (questionId: string, mode: 'mistakes' | 'saved') => {
    const setSolvedMap = mode === 'mistakes' ? setMistakesSessionSolved : setSavedSessionSolved;
    const setTempMap = mode === 'mistakes' ? setMistakesTempChoice : setSavedTempChoice;

    setSolvedMap(prev => {
      const copy = { ...prev };
      delete copy[questionId];
      return copy;
    });
    setTempMap(prev => ({ ...prev, [questionId]: null }));
    setEliminatedOptions(prev => ({ ...prev, [questionId]: [] }));
  };

  // Button 4: إعادة تعيين السؤال وجعله غير محلول داخل القسم
  const handleResetStreamQuestion = (qId: string) => {
    resetQuestionStatus(qId);
    setChapterTempChoices(prev => ({ ...prev, [qId]: null }));
    setEliminatedOptions(prev => ({ ...prev, [qId]: [] }));
  };

  // Button 3: فتح تسجيل ملاحظة
  const handleOpenNoteModal = (qId: string) => {
    setActiveNoteModalQId(qId);
    setCurrentNoteText(questionNotes[qId] || '');
  };

  const handleSaveNoteSubmit = () => {
    if (!activeNoteModalQId) return;
    if (!currentNoteText.trim()) {
      deleteQuestionNote(activeNoteModalQId);
    } else {
      saveQuestionNote(activeNoteModalQId, currentNoteText.trim());
    }
    setActiveNoteModalQId(null);
  };

  // Toggle pinning a chapter to the top of the list
  const togglePinChapter = (chapterId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setPinnedChapterIds(prev => {
      const next = prev.includes(chapterId)
        ? prev.filter(id => id !== chapterId)
        : [...prev, chapterId];
      try {
        localStorage.setItem('uni_pinned_chapters_v1', JSON.stringify(next));
      } catch {
        // ignore storage quota errors
      }
      return next;
    });
  };

  // Start Custom Multi-Chapter Random Quiz
  const handleStartCustomQuiz = () => {
    if (!activeSubject || customQuizSelectedChapterIds.length === 0) return;
    const selectedChNames = new Set(
      (activeSubject.chapters || [])
        .filter(c => customQuizSelectedChapterIds.includes(c.id))
        .map(c => c.name)
    );
    const pool = questions.filter(
      q =>
        q.subjectId === activeSubject.id &&
        (customQuizSelectedChapterIds.includes(q.chapterId) ||
          (q.chapterName && selectedChNames.has(q.chapterName)))
    );
    // Shuffle pool using Fisher-Yates
    const shuffled = [...pool];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    const finalQuestions =
      customQuizQuestionLimit === 'all'
        ? shuffled
        : shuffled.slice(0, customQuizQuestionLimit);

    setCustomQuizQuestionIds(finalQuestions.map(q => q.id));
    setIsCustomQuizModalOpen(false);
    setSelectedChapterId('__custom_quiz__');
    setChapterStreamFilter('all');
    setChapterSearchQuery('');
    setIsFilterPopoverOpen(false);
    setChapterTempChoices({});
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Open chapter in Vertical Stream mode & record as last visited chapter for this subject
  const handleOpenChapter = (ch: ChapterItem) => {
    if (selectedSubjectId) {
      setLastVisitedChapterBySubject(prev => {
        const next = { ...prev, [selectedSubjectId]: ch.id };
        try {
          localStorage.setItem('uni_last_visited_chapter_v1', JSON.stringify(next));
        } catch {
          // ignore storage errors
        }
        return next;
      });
    }
    setSelectedChapterId(ch.id);
    setChapterStreamFilter('all');
    setChapterSearchQuery('');
    setIsFilterPopoverOpen(false);
    setChapterTempChoices({});
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Green Dot (●) in the middle of the Up/Down capsule: Jump to LAST SOLVED question (or first unsolved if none solved yet)
  const handleJumpToLastSolvedQuestion = () => {
    // 1. Prefer the explicitly tracked lastSolvedQuestionId in this chapter
    let targetQ = currentSubjectQuestions.find(q => q.id === lastSolvedQuestionId);

    // 2. Otherwise find the last question in the chapter that has been solved
    if (!targetQ) {
      const solvedInChapter = currentSubjectQuestions.filter(q => solvedQuestions[q.id] !== undefined);
      if (solvedInChapter.length > 0) {
        targetQ = solvedInChapter[solvedInChapter.length - 1];
      }
    }

    // 3. Fallback to first unsolved question or first question
    if (!targetQ) {
      targetQ =
        currentSubjectQuestions.find(q => solvedQuestions[q.id] === undefined) ||
        currentSubjectQuestions[0];
    }

    if (!targetQ) return;

    const targetId = targetQ.id;
    if (chapterStreamFilter !== 'all') {
      setChapterStreamFilter('all');
    }
    setTimeout(() => {
      const el = questionCardRefs.current[targetId];
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setHighlightedQuestionId(targetId);
        setTimeout(() => {
          setHighlightedQuestionId(prev => (prev === targetId ? null : prev));
        }, 1800);
      }
    }, 60);
  };

  const handleQuickJumpByNumber = (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseInt(quickJumpNumber, 10);
    if (isNaN(num) || num < 1 || num > currentSubjectQuestions.length) return;
    const targetQ = currentSubjectQuestions[num - 1];
    if (!targetQ) return;
    if (chapterStreamFilter !== 'all') {
      setChapterStreamFilter('all');
    }
    setIsFilterPopoverOpen(false);
    setQuickJumpNumber('');
    setTimeout(() => {
      const el = questionCardRefs.current[targetQ.id];
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setHighlightedQuestionId(targetQ.id);
        setTimeout(() => {
          setHighlightedQuestionId(prev => (prev === targetQ.id ? null : prev));
        }, 1800);
      }
    }, 60);
  };

  const handleScrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleScrollToBottom = () => {
    window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' });
  };

  // Submit new chapter
  const handleCreateChapter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSubject || !newChapterName.trim()) return;
    await addChapterToSubject(activeSubject.id, newChapterName.trim(), newChapterCategory);
    setNewChapterName('');
    setIsAddingChapter(false);
  };

  // Submit rename chapter
  const handleRenameChapterSubmit = async (chapterId: string) => {
    if (!activeSubject || !renamedChapterName.trim()) return;
    await renameChapterInSubject(activeSubject.id, chapterId, renamedChapterName.trim(), renamedChapterCategory);
    setRenamingChapterId(null);
    setRenamedChapterName('');
  };

  // Reusable Interactive Question Card for Mistakes Bank & Saved Questions
  const renderInteractivePracticeCard = (
    q: QuestionItem,
    idx: number,
    mode: 'mistakes' | 'saved'
  ) => {
    const solvedState = mode === 'mistakes' ? mistakesSessionSolved[q.id] : savedSessionSolved[q.id];
    const tempChoice = mode === 'mistakes' ? (mistakesTempChoice[q.id] ?? null) : (savedTempChoice[q.id] ?? null);
    const isSaved = savedQuestionIds.includes(q.id);
    const hasNote = !!questionNotes[q.id];
    const subjectObj = subjects.find(s => s.id === q.subjectId);

    return (
      <div
        key={q.id}
        className={`${cardSurfaceClass} rounded-3xl p-5 sm:p-6 border space-y-4 shadow-lg text-right transition-colors`}
      >
        {/* Top Meta Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-800/80">
          <div className="flex items-center gap-2 flex-wrap text-xs text-slate-400">
            <span className={`font-black ${mode === 'mistakes' ? 'text-rose-400' : 'text-amber-400'}`}>
              {mode === 'mistakes' ? `سؤال للمراجعة #${idx + 1}` : `سؤال محفوظ #${idx + 1}`}
            </span>
            {subjectObj && (
              <>
                <span aria-hidden="true">·</span>
                <span className="text-slate-300 font-semibold">{subjectObj.name}</span>
              </>
            )}
            {q.chapterName && (
              <>
                <span aria-hidden="true">·</span>
                <span>{q.chapterName}</span>
              </>
            )}
            {q.year && (
              <>
                <span aria-hidden="true">·</span>
                <span className="text-emerald-400 font-semibold">{q.year}</span>
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            {solvedState && (
              <span
                className={`text-xs font-bold ${
                  solvedState.isCorrect ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {solvedState.isCorrect
                  ? mode === 'mistakes'
                    ? 'إجابة صحيحة ✓ (تم تصحيحه في قسمه وسيُزال عند الخروج)'
                    : 'إجابة صحيحة ✓'
                  : 'إجابة خاطئة ✗'}
              </span>
            )}

            {isAdmin && (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => {
                    setModalTargetSubjectId(q.subjectId);
                    setQuestionToEdit(q);
                    setIsQuestionModalOpen(true);
                  }}
                  className="text-slate-400 hover:text-white p-1.5 rounded-lg bg-slate-800/60 cursor-pointer"
                  title="تعديل السؤال"
                  aria-label={`تعديل السؤال ${idx + 1}`}
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() =>
                    openConfirmDialog({
                      title: 'حذف السؤال نهائياً',
                      message: 'هل أنت متأكد من رغبتك في حذف هذا السؤال من بنك الأتمتة؟',
                      itemName: q.questionText,
                      onConfirm: () => deleteQuestion(q.id),
                    })
                  }
                  className="text-slate-400 hover:text-rose-400 p-1.5 rounded-lg bg-slate-800/60 cursor-pointer"
                  title="حذف السؤال"
                  aria-label={`حذف السؤال ${idx + 1}`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Question Text */}
        <h3 className={`${questionTitleFontClass} font-bold text-white leading-relaxed text-right`}>
          {q.questionText}
        </h3>

        {/* Hint for Dual Verification */}
        {!solvedState && (
          <p className="text-[11px] text-slate-400">
            اضغط مرة لتحديد الخيار بالأزرق، واضغط عليه مرة ثانية أو اضغط رمز (✓) للتحقق، أو استخدم أيقونة العين لشطب الخيارات المستبعدة.
          </p>
        )}

        {/* Options List (Supports Dynamic 4 to 8 Options) */}
        <div className="space-y-2.5">
          {getQuestionOptions(q).map((choice) => {
            const isConfirmed = solvedState !== undefined;
            const isSelected = isConfirmed
              ? solvedState.chosenOption === choice.idx
              : tempChoice === choice.idx;
            const isCorrect = choice.idx === q.correctOptionIndex;
            const isEliminated = !isConfirmed && (eliminatedOptions[q.id] || []).includes(choice.idx);

            let btnStyle = 'bg-[#182438] border-slate-700/80 hover:border-sky-500/50 text-slate-200';
            if (isConfirmed) {
              if (isCorrect) {
                btnStyle = 'bg-emerald-950/75 border-emerald-500 text-emerald-200 font-bold';
              } else if (isSelected && !isCorrect) {
                btnStyle = 'bg-rose-950/75 border-rose-500 text-rose-200 font-bold';
              } else {
                btnStyle = 'opacity-45 bg-[#182438] border-slate-800 text-slate-400';
              }
            } else if (isSelected) {
              btnStyle = 'bg-sky-950/80 border-sky-400 text-sky-200 font-bold ring-1 ring-sky-400';
            } else if (isEliminated) {
              btnStyle = 'bg-[#121B2B]/60 border-slate-800/80 text-slate-500 opacity-50';
            }

            return (
              <div key={choice.idx} className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={isConfirmed}
                  onClick={() => handleCardOptionClick(q, choice.idx, mode)}
                  className={`flex-1 p-3.5 rounded-2xl border text-right transition-all flex items-center justify-between gap-3 cursor-pointer ${btnStyle}`}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`w-7 h-7 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                        isConfirmed && isCorrect
                          ? 'bg-emerald-600 text-white'
                          : isConfirmed && isSelected
                          ? 'bg-rose-600 text-white'
                          : isSelected
                          ? 'bg-sky-600 text-white'
                          : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      {choice.label}
                    </span>
                    <span className={`${optionTextFontClass} font-semibold ${isEliminated ? 'line-through text-slate-500' : ''}`}>
                      {choice.text}
                    </span>
                  </div>
                  {!isConfirmed && isSelected && (
                    <span className="text-[10px] font-bold text-sky-300 shrink-0">
                      انقر مجدداً للتأكيد
                    </span>
                  )}
                  {isConfirmed && isCorrect && <Check className="w-5 h-5 text-emerald-400 shrink-0" />}
                  {isConfirmed && isSelected && !isCorrect && <X className="w-5 h-5 text-rose-400 shrink-0" />}
                </button>

                {!isConfirmed && (
                  <button
                    type="button"
                    onClick={(e) => toggleEliminateOption(q.id, choice.idx, e)}
                    className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 transition-colors cursor-pointer ${
                      isEliminated
                        ? 'bg-rose-500/20 border-rose-500/40 text-rose-300'
                        : 'bg-[#152033] border-slate-800 text-slate-500 hover:text-slate-300'
                    }`}
                    title={isEliminated ? 'إلغاء شطب الخيار' : 'شطب واستبعاد هذا الخيار أثناء التفكير'}
                    aria-label={isEliminated ? 'إلغاء شطب الخيار' : 'شطب واستبعاد هذا الخيار'}
                  >
                    {isEliminated ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Explanation if answered */}
        {solvedState && q.explanation && (
          <div className="p-4 rounded-2xl bg-emerald-950/30 border border-emerald-900/60 text-xs text-slate-300 leading-relaxed text-right space-y-1 animate-in fade-in duration-150">
            <span className="font-bold text-emerald-400 block">شرح وتعليل الإجابة الأكاديمي:</span>
            <p>{q.explanation}</p>
          </div>
        )}

        {/* Student Saved Note if exists */}
        {hasNote && (
          <div className="p-3.5 rounded-2xl bg-amber-950/30 border border-amber-900/50 text-xs text-amber-200 text-right flex items-start justify-between gap-2">
            <div className="flex items-start gap-2">
              <FileText className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <strong className="block text-amber-300 font-bold mb-0.5">ملاحظتك الشخصية على السؤال:</strong>
                <p>{questionNotes[q.id]}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => handleOpenNoteModal(q.id)}
              className="text-[11px] text-amber-400 underline hover:text-white shrink-0 cursor-pointer"
            >
              تعديل
            </button>
          </div>
        )}

        {/* Icon-Only Action Bar below Interactive Card */}
        <div className="pt-3 border-t border-slate-800/90 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            {!solvedState ? (
              <button
                type="button"
                onClick={() => handleCardConfirmButton(q, mode)}
                disabled={tempChoice === null}
                className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                  tempChoice !== null
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/30 ring-1 ring-emerald-400'
                    : 'bg-slate-800/80 border border-slate-700/80 text-slate-500 opacity-50 cursor-not-allowed'
                }`}
                title="تأكيد الإجابة (✓)"
                aria-label="تأكيد الإجابة"
              >
                <Check className="w-4 h-4" />
              </button>
            ) : (
              <span
                className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center"
                title="تم التحقق من الإجابة"
              >
                <CheckCheck className="w-4 h-4" />
              </span>
            )}

            <button
              type="button"
              onClick={() => toggleSaveQuestion(q.id)}
              className={`w-10 h-10 rounded-xl border flex items-center justify-center transition-colors cursor-pointer ${
                isSaved
                  ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                  : 'bg-[#182438] border-slate-700 text-slate-300 hover:text-white'
              }`}
              title={isSaved ? 'إزالة من المحفوظات' : 'حفظ السؤال في المحفوظات'}
              aria-label={isSaved ? 'إزالة من المحفوظات' : 'حفظ السؤال في المحفوظات'}
            >
              <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-amber-400 text-amber-400' : ''}`} />
            </button>

            <button
              type="button"
              onClick={() => handleOpenNoteModal(q.id)}
              className={`relative w-10 h-10 rounded-xl border flex items-center justify-center transition-colors cursor-pointer ${
                hasNote
                  ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-300'
                  : 'bg-[#182438] border-slate-700 text-slate-300 hover:text-white'
              }`}
              title="تسجيل ملاحظة شخصية على السؤال"
              aria-label="تسجيل ملاحظة شخصية على السؤال"
            >
              <FileText className="w-4 h-4" />
              {hasNote && (
                <span className="absolute -top-1.5 -left-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-indigo-500 text-white text-[10px] font-black flex items-center justify-center tabular-nums shadow-xs">
                  1
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => handleCardResetButton(q.id, mode)}
              disabled={!solvedState && tempChoice === null}
              className="w-10 h-10 rounded-xl bg-[#182438] border border-slate-700 text-slate-400 hover:text-white disabled:opacity-40 flex items-center justify-center transition-colors cursor-pointer"
              title="إعادة المحاولة"
              aria-label="إعادة المحاولة"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            {/* AI Tutor Button (Restored Previous Violet/Pink Sparkles Icon Style) */}
            <button
              type="button"
              onClick={() => setAiTutorQuestion(q)}
              className="w-10 h-10 rounded-xl bg-violet-600/15 border border-violet-500/40 text-violet-300 hover:bg-violet-600/25 hover:text-white flex items-center justify-center transition-all cursor-pointer shadow-xs shadow-violet-950/50"
              title="اشرح السؤال بالذكاء الاصطناعي"
              aria-label="اشرح السؤال بالذكاء الاصطناعي"
            >
              <Sparkles className="w-4 h-4 text-pink-400" />
            </button>

            {/* Student Discussion Button (Icon + Numeric Badge) */}
            {(() => {
              const commentsCount = questionComments.filter(c => c.questionId === q.id).length;
              return (
                <button
                  type="button"
                  onClick={() => setDiscussionQuestion(q)}
                  className="relative w-10 h-10 rounded-xl bg-sky-500/15 border border-sky-500/40 text-sky-300 hover:bg-sky-500/25 hover:text-white flex items-center justify-center transition-all cursor-pointer"
                  title="مناقشة الطلاب والتبريرات السريرية"
                  aria-label="مناقشة الطلاب"
                >
                  <MessageSquare className="w-4 h-4 text-sky-400" />
                  {commentsCount > 0 && (
                    <span className="absolute -top-1.5 -left-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-sky-500 text-white text-[10px] font-black flex items-center justify-center tabular-nums shadow-xs">
                      {commentsCount}
                    </span>
                  )}
                </button>
              );
            })()}

            {/* Report Question Button (Icon Only) */}
            <button
              type="button"
              onClick={() => setReportQuestion(q)}
              className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-300 hover:bg-amber-500/25 hover:text-white flex items-center justify-center transition-all cursor-pointer"
              title="إبلاغ عن خطأ علمي أو مطبعي"
              aria-label="إبلاغ عن خطأ"
            >
              <Flag className="w-4 h-4 text-amber-400" />
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ==========================================
  // LEVEL 3: Inside Chapter -> Vertical Question Stream (السرد الطولي للأسئلة)
  // ==========================================
  if (activeSubject && selectedChapterId) {
    const isCustomQuiz = selectedChapterId === '__custom_quiz__';
    const chapterObj = isCustomQuiz
      ? null
      : activeSubject.chapters?.find(c => c.id === selectedChapterId);
    const streamTitle = isCustomQuiz
      ? `اختبار عشوائي مخصص (${currentSubjectQuestions.length} سؤال)`
      : chapterObj?.name || 'أسئلة المقرر';
    const completionPct =
      activeChapterStats.totalQuestions > 0
        ? Math.round((activeChapterStats.solvedCount / activeChapterStats.totalQuestions) * 100)
        : 0;
    const savedInChapterCount = currentSubjectQuestions.filter(q => savedQuestionIds.includes(q.id)).length;

    const filterLabelMap: Record<'all' | 'unsolved' | 'wrong' | 'saved', string> = {
      all: 'الكل',
      unsolved: 'المتبقية',
      wrong: 'الخاطئة',
      saved: 'المحفوظة',
    };

    return (
      <div className="w-full max-w-md mx-auto sm:max-w-2xl lg:max-w-3xl px-3 sm:px-4 py-3 sm:py-4 space-y-3.5 pb-24 overflow-x-hidden">
        {/* Header Breadcrumb (Statistics confined strictly inside StatCircleButton) */}
        <div className="flex flex-wrap items-center justify-between pb-2.5 border-b border-slate-800 gap-2">
          <button
            type="button"
            onClick={() => {
              setSelectedChapterId(null);
              setChapterTempChoices({});
              setIsFilterPopoverOpen(false);
            }}
            className="px-2.5 py-1.5 rounded-xl bg-[#131D2E] text-slate-300 hover:text-white flex items-center gap-1 text-xs font-bold transition-colors cursor-pointer shrink-0 border border-slate-800"
          >
            <ChevronRight className="w-4 h-4" />
            <span>العودة للمقرر</span>
          </button>

          <div className="text-right flex-1 min-w-0 px-1">
            <h2 className="text-xs sm:text-base font-black text-white line-clamp-1">
              {streamTitle}
            </h2>
            <span className="text-[10px] sm:text-[11px] text-slate-400 block truncate">
              {activeSubject.name} · اضغط الدائرة للإحصائيات
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <StatCircleButton
              stats={activeChapterStats}
              title={`إحصائيات ${streamTitle}`}
              onClick={() =>
                setStatsModalConfig({
                  isOpen: true,
                  title: streamTitle,
                  subtitle: activeSubject.name,
                  stats: activeChapterStats,
                  questionIds: currentSubjectQuestions.map(q => q.id),
                })
              }
            />

            {isAdmin && !isCustomQuiz && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setBulkImportSubjectId(activeSubject.id);
                    setBulkImportChapterId(selectedChapterId);
                    setIsBulkImportModalOpen(true);
                  }}
                  className="p-1.5 sm:p-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold flex items-center gap-1 cursor-pointer"
                  title="استيراد دفعي ذكي بالرموز (/q)"
                >
                  <FileCode2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">استيراد دفعي (/q)</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setModalTargetSubjectId(activeSubject.id);
                    setQuestionToEdit(null);
                    setIsQuestionModalOpen(true);
                  }}
                  className="p-1.5 sm:p-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">سؤال جديد</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Non-Sticky Top Study Bar (متحرك في أعلى الصفحة فقط وبدون أرقام إحصائية مزدحمة) */}
        <div
          className={`${
            eyeComfortMode
              ? 'bg-[#1C1915] border-amber-900/50'
              : 'bg-[#131D2E] border-slate-800'
          } p-3 sm:p-3.5 rounded-2xl border shadow-md space-y-2.5 transition-colors`}
        >
          {/* Row 1: Calm Study Timer + Slim Progress Bar */}
          <div className="flex items-center justify-between gap-3">
            {/* Calm Study & Focus Timer */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-800/90 border border-slate-700/80 text-[11px] font-bold text-slate-200 tabular-nums shrink-0">
              <Timer className={`w-3.5 h-3.5 ${isTimerRunning ? 'text-sky-400' : 'text-slate-400'}`} />
              <span>{formatStudyTimer(studySeconds)}</span>
              <button
                type="button"
                onClick={() => setIsTimerRunning(prev => !prev)}
                className="p-0.5 rounded-md hover:bg-slate-700 text-slate-300 hover:text-white cursor-pointer"
                title={isTimerRunning ? 'إيقاف مؤقت الدراسة' : 'استئناف مؤقت الدراسة'}
              >
                {isTimerRunning ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
              </button>
              {studySeconds > 0 && (
                <button
                  type="button"
                  onClick={() => setStudySeconds(0)}
                  className="p-0.5 rounded-md hover:bg-slate-700 text-slate-400 hover:text-white cursor-pointer"
                  title="تصفير المؤقت"
                >
                  <RotateCcw className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Live Progress Bar */}
            <div className="flex-1 flex items-center gap-2">
              <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden flex">
                <div
                  style={{ width: `${completionPct}%` }}
                  className="bg-gradient-to-l from-emerald-500 to-sky-500 h-full transition-all duration-300"
                />
              </div>
            </div>
          </div>

          {/* Row 2: Instant Keyword Search inside Chapter Questions */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={chapterSearchQuery}
              onChange={(e) => setChapterSearchQuery(e.target.value)}
              placeholder="ابحث بكلمة مفتاحية داخل أسئلة هذا القسم أو خياراتها..."
              className="w-full pr-8 pl-8 py-1.5 bg-slate-900/80 border border-slate-700/80 focus:border-sky-500 rounded-xl text-xs text-white placeholder:text-slate-400 focus:outline-hidden text-right"
            />
            {chapterSearchQuery && (
              <button
                type="button"
                onClick={() => setChapterSearchQuery('')}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
                title="مسح البحث"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Row 3: Compact Filter Trigger + Dark/Light Mode + Eye Protection + Font Size */}
          <div className="flex flex-wrap items-center justify-between gap-1.5 pt-1 border-t border-slate-800/80">
            {/* Compact Filter Trigger Pill (also accessible via the tiny right-side floating button) */}
            <button
              type="button"
              onClick={() => setIsFilterPopoverOpen(prev => !prev)}
              className="px-2.5 py-1 rounded-xl bg-emerald-600/20 border border-emerald-500/40 text-emerald-400 text-[11px] font-bold flex items-center gap-1.5 cursor-pointer hover:bg-emerald-600/30 transition-colors tabular-nums"
              title="فتح خانة تصنيف الأسئلة (الكل / المتبقي / الخطأ / المحفوظ)"
            >
              <Filter className="w-3.5 h-3.5" />
              <span>التصفية: {filterLabelMap[chapterStreamFilter]}</span>
              <ChevronDown className="w-3 h-3" />
            </button>

            {/* Theme (Dark/Light), Eye Protection & Font Scale Controls */}
            <div className="flex items-center gap-1 flex-wrap">
              <button
                type="button"
                onClick={toggleDarkMode}
                className={`px-2 py-1 rounded-xl text-[11px] font-bold flex items-center gap-1 border cursor-pointer transition-colors ${
                  darkMode
                    ? 'bg-slate-800/80 border-slate-700 text-amber-300'
                    : 'bg-sky-500/15 border-sky-500/40 text-sky-600'
                }`}
                title="التبديل بين الوضع الليلي والنهاري"
              >
                {darkMode ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-sky-600" />}
                <span>{darkMode ? 'نهاري' : 'ليلي'}</span>
              </button>

              <button
                type="button"
                onClick={toggleEyeComfortMode}
                className={`px-2 py-1 rounded-xl text-[11px] font-bold flex items-center gap-1 border cursor-pointer transition-colors ${
                  eyeComfortMode
                    ? 'bg-amber-500/25 border-amber-500/50 text-amber-400'
                    : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:text-white'
                }`}
                title="تبديل وضع حماية العين (مناسب للوضع الليلي والنهاري)"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>حماية العين</span>
              </button>

              <div className="flex items-center bg-slate-800/90 border border-slate-700 rounded-xl p-0.5 text-[11px] font-bold">
                <Type className="w-3 h-3 text-slate-400 mx-1" />
                <button
                  type="button"
                  onClick={() => setQuestionFontScale('normal')}
                  className={`px-1.5 py-0.5 rounded-lg cursor-pointer ${
                    questionFontScale === 'normal' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  عادي
                </button>
                <button
                  type="button"
                  onClick={() => setQuestionFontScale('large')}
                  className={`px-1.5 py-0.5 rounded-lg cursor-pointer ${
                    questionFontScale === 'large' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  كبير
                </button>
                <button
                  type="button"
                  onClick={() => setQuestionFontScale('xlarge')}
                  className={`px-1.5 py-0.5 rounded-lg cursor-pointer ${
                    questionFontScale === 'xlarge' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  أكبر
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Vertical Stream Body (السرد الطولي للأسئلة تحت بعضها) */}
        {currentSubjectQuestions.length === 0 ? (
          <div className={`text-center py-16 ${cardSurfaceClass} rounded-3xl border border-dashed p-8 space-y-4`}>
            <HelpCircle className="w-12 h-12 mx-auto text-slate-500" />
            <h3 className="font-bold text-base text-white">لا توجد أسئلة مسجلة في هذا الجزء بعد</h3>
            <p className="text-xs text-slate-400">يمكن للمشرف إضافة أسئلة أتمتة جديدة لهذا القسم أو المحاضرة بنقرة واحدة.</p>
            {isAdmin && (
              <div className="flex items-center justify-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => {
                    setModalTargetSubjectId(activeSubject.id);
                    setQuestionToEdit(null);
                    setIsQuestionModalOpen(true);
                  }}
                  className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-bold text-xs cursor-pointer"
                >
                  إضافة أول سؤال الآن (+)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setBulkImportSubjectId(activeSubject.id);
                    setBulkImportChapterId(selectedChapterId);
                    setIsBulkImportModalOpen(true);
                  }}
                  className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <FileCode2 className="w-4 h-4" />
                  <span>استيراد دفعي بالرموز (/q)</span>
                </button>
              </div>
            )}
          </div>
        ) : filteredChapterQuestions.length === 0 ? (
          <div className={`text-center py-12 ${cardSurfaceClass} rounded-3xl border p-6 space-y-3`}>
            <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
            <h3 className="font-bold text-sm text-white">لا توجد أسئلة مطابقة لفلتر العرض أو البحث الحالي</h3>
            <button
              type="button"
              onClick={() => {
                setChapterStreamFilter('all');
                setChapterSearchQuery('');
              }}
              className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold cursor-pointer"
            >
              عرض جميع الأسئلة ({currentSubjectQuestions.length})
            </button>
          </div>
        ) : (
          <div className="space-y-5">
            {filteredChapterQuestions.map((q) => {
              const originalIndex = currentSubjectQuestions.findIndex(item => item.id === q.id);
              const solvedState = solvedQuestions[q.id];
              const tempChoice = chapterTempChoices[q.id] ?? null;
              const isSaved = savedQuestionIds.includes(q.id);
              const hasNote = !!questionNotes[q.id];
              const commentsCount = questionComments.filter(c => c.questionId === q.id).length;

              return (
                <div
                  key={q.id}
                  ref={(el) => {
                    questionCardRefs.current[q.id] = el;
                  }}
                  className={`${cardSurfaceClass} rounded-3xl p-4 sm:p-6 border space-y-3.5 shadow-xl transition-all duration-300 ${
                    highlightedQuestionId === q.id
                      ? 'ring-2 ring-emerald-500 shadow-emerald-500/20'
                      : ''
                  }`}
                >
                  {/* Question Card Header */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-800/80">
                    <div className="flex items-center gap-2 flex-wrap text-xs text-slate-400 tabular-nums">
                      <span className="px-2.5 py-1 rounded-xl bg-emerald-500/15 text-emerald-400 font-black">
                        السؤال #{q.sequenceNumber ?? originalIndex + 1} من {currentSubjectQuestions.length}
                      </span>
                      {q.year && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="font-bold text-amber-400">{q.year}</span>
                        </>
                      )}
                      {q.category && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="font-semibold text-slate-300">
                            {q.category === 'section'
                              ? 'قسم'
                              : q.category === 'lecture'
                              ? 'محاضرة'
                              : 'شامل وجزئي'}
                          </span>
                        </>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {solvedState && (
                        <span
                          className={`text-xs font-bold ${
                            solvedState.isCorrect ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {solvedState.isCorrect ? 'إجابة صحيحة ✓' : 'إجابة خاطئة ✗'}
                        </span>
                      )}

                      {isAdmin && (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              setModalTargetSubjectId(activeSubject.id);
                              setQuestionToEdit(q);
                              setIsQuestionModalOpen(true);
                            }}
                            className="text-slate-400 hover:text-white p-1.5 rounded-lg bg-slate-800/60 cursor-pointer flex items-center gap-1 text-xs font-bold"
                            title="تعديل السؤال"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              openConfirmDialog({
                                title: 'حذف السؤال نهائياً',
                                message: 'هل أنت متأكد من حذف هذا السؤال من القسم الحالي؟',
                                itemName: q.questionText,
                                onConfirm: () => deleteQuestion(q.id),
                              })
                            }
                            className="text-slate-400 hover:text-rose-400 p-1.5 rounded-lg bg-slate-800/60 cursor-pointer flex items-center gap-1 text-xs font-bold"
                            title="حذف السؤال"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Question Text */}
                  <h3 className={`${questionTitleFontClass} font-bold text-white leading-relaxed text-right`}>
                    {q.questionText}
                  </h3>

                  {!solvedState && (
                    <p className="text-[11px] text-slate-400 text-right">
                      اضغط مرة لتحديد الخيار بالأزرق، واضغط عليه مرة ثانية أو اضغط رمز (✓) للتحقق، أو استخدم أيقونة العين لشطب الخيارات المستبعدة.
                    </p>
                  )}

                  {/* Options List (Supports Dynamic 4 to 8 Options) */}
                  <div className="space-y-2.5">
                    {getQuestionOptions(q).map((choice) => {
                      const isConfirmed = solvedState !== undefined;
                      const isSelected = isConfirmed
                        ? solvedState.chosenOption === choice.idx
                        : tempChoice === choice.idx;
                      const isCorrect = choice.idx === q.correctOptionIndex;
                      const isEliminated = !isConfirmed && (eliminatedOptions[q.id] || []).includes(choice.idx);

                      let btnStyle = eyeComfortMode
                        ? 'bg-[#25211C] border-amber-900/40 hover:border-sky-500/50 text-amber-50'
                        : 'bg-[#182438] border-slate-700/80 hover:border-sky-500/50 text-slate-200';

                      if (isConfirmed) {
                        if (isCorrect) {
                          btnStyle = 'bg-emerald-950/75 border-emerald-500 text-emerald-200 font-bold';
                        } else if (isSelected && !isCorrect) {
                          btnStyle = 'bg-rose-950/75 border-rose-500 text-rose-200 font-bold';
                        } else {
                          btnStyle = 'opacity-40 bg-[#182438] border-slate-800 text-slate-400';
                        }
                      } else if (isSelected) {
                        btnStyle = 'bg-sky-950/80 border-sky-400 text-sky-200 font-bold ring-1 ring-sky-400';
                      } else if (isEliminated) {
                        btnStyle = 'bg-[#121B2B]/60 border-slate-800/80 text-slate-500 opacity-50';
                      }

                      return (
                        <div key={choice.idx} className="flex items-center gap-2">
                          <button
                            type="button"
                            disabled={isConfirmed}
                            onClick={() => handleStreamOptionClick(q, choice.idx)}
                            className={`flex-1 p-3.5 rounded-2xl border text-right transition-all flex items-center justify-between gap-3 cursor-pointer ${btnStyle}`}
                          >
                            <div className="flex items-center gap-3">
                              <span
                                className={`w-7 h-7 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                                  isConfirmed && isCorrect
                                    ? 'bg-emerald-600 text-white'
                                    : isConfirmed && isSelected
                                    ? 'bg-rose-600 text-white'
                                    : isSelected
                                    ? 'bg-sky-600 text-white'
                                    : 'bg-slate-800 text-slate-300'
                                }`}
                              >
                                {choice.label}
                              </span>
                              <span className={`${optionTextFontClass} font-semibold ${isEliminated ? 'line-through text-slate-500' : ''}`}>
                                {choice.text}
                              </span>
                            </div>
                            {!isConfirmed && isSelected && (
                              <span className="text-[10px] font-bold text-sky-300 shrink-0">
                                انقر مجدداً للتأكيد
                              </span>
                            )}
                            {isConfirmed && isCorrect && <Check className="w-5 h-5 text-emerald-400 shrink-0" />}
                            {isConfirmed && isSelected && !isCorrect && <X className="w-5 h-5 text-rose-400 shrink-0" />}
                          </button>

                          {!isConfirmed && (
                            <button
                              type="button"
                              onClick={(e) => toggleEliminateOption(q.id, choice.idx, e)}
                              className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 transition-colors cursor-pointer ${
                                isEliminated
                                  ? 'bg-rose-500/20 border-rose-500/40 text-rose-300'
                                  : 'bg-[#152033] border-slate-800 text-slate-500 hover:text-slate-300'
                              }`}
                              title={isEliminated ? 'إلغاء شطب الخيار' : 'شطب واستبعاد هذا الخيار أثناء التفكير'}
                              aria-label={isEliminated ? 'إلغاء شطب الخيار' : 'شطب واستبعاد هذا الخيار'}
                            >
                              {isEliminated ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Collapsible Explanation if answered */}
                  {solvedState && q.explanation && (
                    <div className="rounded-2xl bg-emerald-950/30 border border-emerald-900/60 text-xs text-slate-300 leading-relaxed text-right overflow-hidden animate-in fade-in duration-150">
                      <button
                        type="button"
                        onClick={() =>
                          setCollapsedExplanations(prev => ({
                            ...prev,
                            [q.id]: !prev[q.id],
                          }))
                        }
                        className="w-full px-3.5 py-2.5 flex items-center justify-between text-emerald-400 font-bold cursor-pointer hover:bg-emerald-950/40 transition-colors"
                      >
                        <span>شرح وتعليل الإجابة الأكاديمي</span>
                        {collapsedExplanations[q.id] ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronUp className="w-4 h-4" />
                        )}
                      </button>
                      {!collapsedExplanations[q.id] && (
                        <div className="px-3.5 pb-3 pt-0.5">
                          <p>{q.explanation}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Student Saved Note if exists */}
                  {hasNote && (
                    <div className="p-3.5 rounded-2xl bg-amber-950/30 border border-amber-900/50 text-xs text-amber-200 text-right flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2">
                        <FileText className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                        <div>
                          <strong className="block text-amber-300 font-bold mb-0.5">ملاحظتك الشخصية على السؤال:</strong>
                          <p>{questionNotes[q.id]}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleOpenNoteModal(q.id)}
                        className="text-[11px] text-amber-400 underline hover:text-white shrink-0 cursor-pointer"
                      >
                        تعديل
                      </button>
                    </div>
                  )}

                  {/* Icon-Only Action Bar Under Question Card */}
                  <div className="pt-3 border-t border-slate-800/90 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Action 1: Confirm selection (علامة صح لتأكيد الخيار) */}
                      {!solvedState ? (
                        <button
                          type="button"
                          onClick={() => handleStreamConfirmButton(q)}
                          disabled={tempChoice === null}
                          className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                            tempChoice !== null
                              ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/30 ring-1 ring-emerald-400'
                              : 'bg-slate-800/80 border border-slate-700/80 text-slate-500 opacity-50 cursor-not-allowed'
                          }`}
                          title="تأكيد الإجابة (✓)"
                          aria-label="تأكيد الإجابة"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                      ) : (
                        <span
                          className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center"
                          title="تم التأكيد"
                        >
                          <CheckCheck className="w-4 h-4" />
                        </span>
                      )}

                      {/* Action 2: Bookmark / Save */}
                      <button
                        type="button"
                        onClick={() => toggleSaveQuestion(q.id)}
                        className={`w-10 h-10 rounded-xl border flex items-center justify-center transition-colors cursor-pointer ${
                          isSaved
                            ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                            : 'bg-[#182438] border-slate-700 text-slate-300 hover:text-white'
                        }`}
                        title={isSaved ? 'إزالة من المحفوظات' : 'حفظ السؤال في المحفوظات'}
                        aria-label={isSaved ? 'إزالة من المحفوظات' : 'حفظ السؤال في المحفوظات'}
                      >
                        <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-amber-400 text-amber-400' : ''}`} />
                      </button>

                      {/* Action 3: Take Note (with small badge if note exists) */}
                      <button
                        type="button"
                        onClick={() => handleOpenNoteModal(q.id)}
                        className={`relative w-10 h-10 rounded-xl border flex items-center justify-center transition-colors cursor-pointer ${
                          hasNote
                            ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-300'
                            : 'bg-[#182438] border-slate-700 text-slate-300 hover:text-white'
                        }`}
                        title="تسجيل ملاحظة خاصة على هذا السؤال"
                        aria-label="تسجيل ملاحظة خاصة على هذا السؤال"
                      >
                        <FileText className="w-4 h-4" />
                        {hasNote && (
                          <span className="absolute -top-1.5 -left-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-indigo-500 text-white text-[10px] font-black flex items-center justify-center tabular-nums shadow-xs">
                            1
                          </span>
                        )}
                      </button>

                      {/* Action 4: Reset question */}
                      <button
                        type="button"
                        onClick={() => handleResetStreamQuestion(q.id)}
                        disabled={!solvedState && tempChoice === null}
                        className="w-10 h-10 rounded-xl bg-[#182438] border border-slate-700 text-slate-400 hover:text-white disabled:opacity-40 flex items-center justify-center transition-colors cursor-pointer"
                        title="إعادة السؤال وجعله غير محلول"
                        aria-label="إعادة السؤال وجعله غير محلول"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </button>

                      {/* Action 5: AI Academic Tutor (Restored Previous Violet/Pink Sparkles Icon Style) */}
                      <button
                        type="button"
                        onClick={() => setAiTutorQuestion(q)}
                        className="w-10 h-10 rounded-xl bg-violet-600/15 border border-violet-500/40 text-violet-300 hover:bg-violet-600/25 hover:text-white flex items-center justify-center transition-all cursor-pointer shadow-xs shadow-violet-950/50"
                        title="اشرح السؤال بالذكاء الاصطناعي"
                        aria-label="اشرح السؤال بالذكاء الاصطناعي"
                      >
                        <Sparkles className="w-4 h-4 text-pink-400" />
                      </button>

                      {/* Action 6: Student Discussion (Icon + Numeric Badge) */}
                      <button
                        type="button"
                        onClick={() => setDiscussionQuestion(q)}
                        className="relative w-10 h-10 rounded-xl bg-sky-500/15 border border-sky-500/40 text-sky-300 hover:bg-sky-500/25 hover:text-white flex items-center justify-center transition-all cursor-pointer"
                        title="مناقشة الطلاب والتبريرات السريرية"
                        aria-label="مناقشة الطلاب"
                      >
                        <MessageSquare className="w-4 h-4 text-sky-400" />
                        {commentsCount > 0 && (
                          <span className="absolute -top-1.5 -left-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-sky-500 text-white text-[10px] font-black flex items-center justify-center tabular-nums shadow-xs">
                            {commentsCount}
                          </span>
                        )}
                      </button>

                      {/* Action 7: Report Question (Icon Only) */}
                      <button
                        type="button"
                        onClick={() => setReportQuestion(q)}
                        className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-300 hover:bg-amber-500/25 hover:text-white flex items-center justify-center transition-all cursor-pointer"
                        title="إبلاغ عن خطأ علمي أو مطبعي"
                        aria-label="إبلاغ عن خطأ علمي أو مطبعي"
                      >
                        <Flag className="w-4 h-4 text-amber-400" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Right-Side Micro Controls:
            1) Small Filter & Stats Trigger Button (الكل / المتبقي / الخطأ / المحفوظ)
            2) Slim Navigation Capsule: Up Arrow (↑) + Green Dot in the middle (● Last Solved Question) + Down Arrow (↓)
            Designed with w-8 (32px) on the right margin so it NEVER blocks or alters the screen size/layout */}
        {currentSubjectQuestions.length > 0 && (
          <div className="fixed right-1.5 bottom-4 z-40 flex flex-col items-center gap-1.5">
            {/* Compact Popover Card when Filter Trigger is clicked */}
            {isFilterPopoverOpen && (
              <div className="fixed right-11 bottom-4 z-50 w-60 rounded-2xl bg-[#111A2E]/95 backdrop-blur-md border border-slate-700/90 p-3 shadow-2xl space-y-2.5 text-right animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                  <button
                    type="button"
                    onClick={() => setIsFilterPopoverOpen(false)}
                    className="p-1 rounded-lg text-slate-400 hover:text-white cursor-pointer"
                    aria-label="إغلاق قائمة الفلترة"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-xs font-black text-white flex items-center gap-1">
                    <span>تصنيف ومعلومات الأسئلة</span>
                    <Filter className="w-3.5 h-3.5 text-emerald-400" />
                  </span>
                </div>

                {/* Quick Summary Stats */}
                <div className="grid grid-cols-2 gap-1.5 text-[11px] font-bold tabular-nums bg-[#0E1628] p-2 rounded-xl border border-slate-800">
                  <div className="text-slate-300">
                    المحلولة: <strong className="text-sky-400">{activeChapterStats.solvedCount}</strong>
                  </div>
                  <div className="text-slate-300">
                    الدقة: <strong className="text-emerald-400">{activeChapterStats.accuracy}%</strong>
                  </div>
                </div>

                {/* 4 Selectable Filter Options: الكل | المتبقي | الخطأ | المحفوظ */}
                <div className="space-y-1 text-xs font-bold tabular-nums">
                  {[
                    {
                      id: 'all' as const,
                      label: 'الكل',
                      count: currentSubjectQuestions.length,
                      activeClass: 'bg-emerald-600 text-white',
                      badgeClass: 'text-emerald-400',
                    },
                    {
                      id: 'unsolved' as const,
                      label: 'المتبقي (غير محلول)',
                      count: activeChapterStats.remainingCount,
                      activeClass: 'bg-amber-600 text-white',
                      badgeClass: 'text-amber-400',
                    },
                    {
                      id: 'wrong' as const,
                      label: 'الخطأ',
                      count: activeChapterStats.wrongCount,
                      activeClass: 'bg-rose-600 text-white',
                      badgeClass: 'text-rose-400',
                    },
                    {
                      id: 'saved' as const,
                      label: 'المحفوظ',
                      count: savedInChapterCount,
                      activeClass: 'bg-indigo-600 text-white',
                      badgeClass: 'text-indigo-400',
                    },
                  ].map((item) => {
                    const isSelected = chapterStreamFilter === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          setChapterStreamFilter(item.id);
                          setIsFilterPopoverOpen(false);
                        }}
                        className={`w-full px-2.5 py-1.5 rounded-xl flex items-center justify-between transition-colors cursor-pointer ${
                          isSelected
                            ? item.activeClass
                            : 'bg-[#162238] hover:bg-slate-800 text-slate-200'
                        }`}
                      >
                        <span className={isSelected ? 'text-white font-black' : item.badgeClass}>
                          {item.count}
                        </span>
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Quick Jump to Question Number */}
                <form onSubmit={handleQuickJumpByNumber} className="pt-1.5 border-t border-slate-800 flex items-center gap-1">
                  <button
                    type="submit"
                    className="px-2.5 py-1 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-[11px] font-bold cursor-pointer shrink-0"
                  >
                    انتقال
                  </button>
                  <input
                    type="number"
                    min={1}
                    max={currentSubjectQuestions.length}
                    value={quickJumpNumber}
                    onChange={(e) => setQuickJumpNumber(e.target.value)}
                    placeholder={`رقم السؤال (1-${currentSubjectQuestions.length})`}
                    className="w-full px-2 py-1 rounded-lg bg-[#0E1628] border border-slate-700 text-[11px] text-white placeholder:text-slate-500 focus:outline-hidden text-right tabular-nums"
                  />
                </form>
              </div>
            )}

            {/* Small Right-Side Filter & Info Button */}
            <button
              type="button"
              onClick={() => setIsFilterPopoverOpen(prev => !prev)}
              className={`relative w-8 h-8 rounded-full backdrop-blur-md border shadow-md flex items-center justify-center transition-all cursor-pointer opacity-85 hover:opacity-100 ${
                chapterStreamFilter !== 'all' || isFilterPopoverOpen
                  ? 'bg-emerald-600 border-emerald-400 text-white'
                  : 'bg-[#131D2E]/90 border-slate-700 text-slate-200 hover:text-white'
              }`}
              title="خانة تصنيف ومعلومات الأتمتات (الكل / المتبقي / الخطأ / المحفوظ)"
              aria-label="خانة تصنيف ومعلومات الأتمتات"
            >
              <Filter className="w-3.5 h-3.5" />
              {chapterStreamFilter !== 'all' && (
                <span className="absolute -top-0.5 -left-0.5 w-2.5 h-2.5 rounded-full bg-amber-400 ring-1 ring-slate-900" />
              )}
            </button>

            {/* Slim Navigation Capsule: Up Arrow (↑) + Middle Green Dot (● Last Solved) + Down Arrow (↓) */}
            <div className="w-8 py-1.5 rounded-full bg-[#131D2E]/90 backdrop-blur-md border border-slate-700/90 shadow-lg flex flex-col items-center gap-2 opacity-85 hover:opacity-100 transition-opacity">
              <button
                type="button"
                onClick={handleScrollToTop}
                className="w-6 h-6 rounded-full hover:bg-slate-800 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                title="الصعود لأعلى الصفحة"
                aria-label="الصعود لأعلى الصفحة"
              >
                <ArrowUp className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={handleJumpToLastSolvedQuestion}
                className="w-5 h-5 rounded-full flex items-center justify-center cursor-pointer group"
                title="الانتقال إلى آخر سؤال تم حله"
                aria-label="الانتقال إلى آخر سؤال تم حله"
              >
                <span className="w-3 h-3 rounded-full bg-emerald-500 group-hover:scale-125 ring-2 ring-emerald-400/40 shadow-sm shadow-emerald-500/80 transition-transform" />
              </button>

              <button
                type="button"
                onClick={handleScrollToBottom}
                className="w-6 h-6 rounded-full hover:bg-slate-800 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                title="النزول لأسفل الصفحة"
                aria-label="النزول لأسفل الصفحة"
              >
                <ArrowDown className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Note Dialog Modal */}
        {activeNoteModalQId && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-[#131D2E] border border-slate-800 rounded-3xl p-5 w-full max-w-md space-y-4 shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <div className="flex items-center gap-2 text-indigo-400 text-sm font-bold">
                  <FileText className="w-4 h-4" />
                  <span>تسجيل ملاحظة على السؤال</span>
                </div>
                <button type="button" onClick={() => setActiveNoteModalQId(null)} className="text-slate-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <p className="text-xs text-slate-400 text-right">
                اكتب ملاحظتك التوضيحية أو النقطة الهامة لتتذكرها لاحقاً في قسم المحفوظات والملاحظات:
              </p>

              <textarea
                rows={4}
                value={currentNoteText}
                onChange={(e) => setCurrentNoteText(e.target.value)}
                placeholder="مثلاً: انتبه للفرق بين العصب البكري وبقية الأعصاب..."
                className="w-full p-3 bg-slate-900 border border-slate-700 rounded-2xl text-xs sm:text-sm font-medium text-white focus:outline-hidden text-right leading-relaxed"
              />

              <div className="flex items-center justify-between gap-3 pt-2">
                {questionNotes[activeNoteModalQId] && (
                  <button
                    type="button"
                    onClick={() => {
                      deleteQuestionNote(activeNoteModalQId);
                      setActiveNoteModalQId(null);
                    }}
                    className="px-3 py-2 bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 text-xs font-bold rounded-xl cursor-pointer"
                  >
                    حذف الملاحظة
                  </button>
                )}
                <div className="flex items-center gap-2 ml-auto">
                  <button
                    type="button"
                    onClick={() => setActiveNoteModalQId(null)}
                    className="px-3 py-2 bg-slate-800 text-slate-300 text-xs font-bold rounded-xl cursor-pointer"
                  >
                    إلغاء
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveNoteSubmit}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl cursor-pointer"
                  >
                    حفظ الملاحظة
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Advanced Question Modals (Discussion, Report, AI Tutor) */}
        {renderAdvancedQuestionModals()}

        {/* Question Modal for Admin */}
        <QuestionModal
          isOpen={isQuestionModalOpen}
          onClose={() => setIsQuestionModalOpen(false)}
          subjectId={modalTargetSubjectId || activeSubject.id}
          questionToEdit={questionToEdit}
          chapters={activeSubject.chapters ? activeSubject.chapters.map(c => c.name) : []}
          defaultChapterName={chapterObj?.name}
        />

        {/* Circular Stats Detail Modal */}
        {statsModalConfig && (
          <StatsCircleModal
            isOpen={statsModalConfig.isOpen}
            onClose={() => setStatsModalConfig(null)}
            title={statsModalConfig.title}
            subtitle={statsModalConfig.subtitle}
            stats={statsModalConfig.stats}
            onResetStats={() => {
              const targetIds = statsModalConfig.questionIds;
              const targetTitle = statsModalConfig.title;
              setStatsModalConfig(null);
              openConfirmDialog({
                title: 'تصفير إجابات القسم',
                message: 'هل أنت متأكد من رغبتك في تصفير جميع إجاباتك في هذا القسم والبدء من جديد؟',
                itemName: targetTitle,
                confirmLabel: 'نعم، تصفير الإجابات',
                onConfirm: () => resetQuestionsBatch(targetIds),
              });
            }}
          />
        )}

        {/* Confirmation Dialog */}
        <ConfirmationDialog
          isOpen={confirmDialog.isOpen}
          title={confirmDialog.title}
          message={confirmDialog.message}
          itemName={confirmDialog.itemName}
          confirmLabel={confirmDialog.confirmLabel}
          onConfirm={confirmDialog.onConfirm}
          onCancel={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
        />
      </div>
    );
  }

  // ==========================================
  // LEVEL 2: Inside Subject -> Chapters Organized by Fast Tabs + Custom Quiz + Pinning + Search
  // ==========================================
  if (activeSubject) {
    const chaptersList = activeSubject.chapters || [];
    const subjectQuestionsAll = questions.filter(q => q.subjectId === activeSubject.id);
    const subjectStats = computeQuestionStats(subjectQuestionsAll, solvedQuestions);

    // Group chapters into: 'section' | 'lecture' | 'comprehensive_partial'
    const sectionChapters = chaptersList.filter(c => !c.category || c.category === 'section');
    const lectureChapters = chaptersList.filter(c => c.category === 'lecture');
    const compChapters = chaptersList.filter(c => c.category === 'comprehensive_partial');

    // Last visited chapter in this subject
    const lastVisitedChapterId = lastVisitedChapterBySubject[activeSubject.id];
    const lastVisitedChapter = lastVisitedChapterId
      ? chaptersList.find(c => c.id === lastVisitedChapterId) || null
      : null;
    const lastVisitedStats = lastVisitedChapter
      ? computeQuestionStats(
          questions.filter(
            q =>
              q.subjectId === activeSubject.id &&
              (q.chapterId === lastVisitedChapter.id || q.chapterName === lastVisitedChapter.name)
          ),
          solvedQuestions
        )
      : null;

    // Filter chapters by active category tab, search query, and completion status, then sort pinned chapters first
    const baseCategoryChapters =
      activeChapterCategoryTab === 'section'
        ? sectionChapters
        : activeChapterCategoryTab === 'lecture'
        ? lectureChapters
        : compChapters;

    const displayedChapters = baseCategoryChapters
      .filter((ch) => {
        if (chapterListSearch.trim()) {
          if (!ch.name.toLowerCase().includes(chapterListSearch.trim().toLowerCase())) {
            return false;
          }
        }
        if (chapterStatusFilter !== 'all') {
          const chQs = questions.filter(
            q => q.subjectId === activeSubject.id && (q.chapterId === ch.id || q.chapterName === ch.name)
          );
          const st = computeQuestionStats(chQs, solvedQuestions);
          if (chapterStatusFilter === 'completed' && !(st.totalQuestions > 0 && st.remainingCount === 0)) {
            return false;
          }
          if (chapterStatusFilter === 'in_progress' && !(st.solvedCount > 0 && st.remainingCount > 0)) {
            return false;
          }
          if (chapterStatusFilter === 'not_started' && st.solvedCount > 0) {
            return false;
          }
        }
        return true;
      })
      .sort((a, b) => {
        const aPinned = pinnedChapterIds.includes(a.id) ? 1 : 0;
        const bPinned = pinnedChapterIds.includes(b.id) ? 1 : 0;
        return bPinned - aPinned;
      });

    return (
      <div className="w-full max-w-md mx-auto sm:max-w-2xl lg:max-w-3xl px-3.5 py-3.5 space-y-3.5 overflow-x-hidden">
        {/* Header Breadcrumb */}
        <div className="space-y-2 pb-2.5 border-b border-slate-800">
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => {
                setSelectedSubjectId(null);
                setSubjectSubTab('chapters');
              }}
              className="px-2.5 py-1.5 rounded-xl bg-[#131D2E] border border-slate-800 text-slate-300 hover:text-white flex items-center gap-1 text-xs font-bold transition-colors cursor-pointer shrink-0"
            >
              <ChevronRight className="w-4 h-4" />
              <span>المواد</span>
            </button>

            <div className="flex items-center gap-2 text-right flex-1 px-1 justify-end min-w-0">
              <div className="min-w-0 flex-1">
                <h2 className="text-sm sm:text-lg font-black text-white line-clamp-1">
                  {activeSubject.name}
                </h2>
                <span className="text-[11px] text-slate-400 block truncate">{activeSubject.department}</span>
              </div>
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border border-white/5"
                style={{
                  backgroundColor: `${resolveSubjectMedicalIcon(activeSubject).accentColor}20`,
                  color: resolveSubjectMedicalIcon(activeSubject).accentColor,
                }}
              >
                <SubjectMedicalIcon subject={activeSubject} className="w-5 h-5" />
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <StatCircleButton
                stats={subjectStats}
                title={`إحصائيات مادة ${activeSubject.name}`}
                onClick={() =>
                  setStatsModalConfig({
                    isOpen: true,
                    title: `إحصائيات مادة ${activeSubject.name}`,
                    subtitle: `${chaptersList.length} أقسام ومحاضرات`,
                    stats: subjectStats,
                    questionIds: subjectQuestionsAll.map(q => q.id),
                  })
                }
              />
            </div>
          </div>

          {isAdmin && (
            <div className="flex items-center justify-end gap-1.5 flex-wrap pt-0.5">
              <button
                type="button"
                onClick={() => {
                  setBulkImportSubjectId(activeSubject.id);
                  setBulkImportChapterId(activeSubject.chapters?.[0]?.id || null);
                  setIsBulkImportModalOpen(true);
                }}
                className="px-2.5 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                title="استيراد دفعي ذكي بالرموز (/q)"
              >
                <FileCode2 className="w-3.5 h-3.5" />
                <span>استيراد دفعي (/q)</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setModalTargetSubjectId(activeSubject.id);
                  setQuestionToEdit(null);
                  setIsQuestionModalOpen(true);
                }}
                className="px-2.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>سؤال جديد</span>
              </button>
              <button
                type="button"
                onClick={() => setIsAddingChapter(true)}
                className="px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>إضافة قسم</span>
              </button>
            </div>
          )}
        </div>

        {/* Sub-Tabs Inside Subject: 1. أقسام ومحاضرات المادة | 2. إحصائيات المادة */}
        <div className="grid grid-cols-2 gap-2 p-1 bg-[#131D2E] rounded-2xl border border-slate-800 text-xs font-bold">
          <button
            type="button"
            onClick={() => setSubjectSubTab('chapters')}
            className={`py-2.5 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              subjectSubTab === 'chapters'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>أقسام ومحاضرات المادة</span>
          </button>

          <button
            type="button"
            onClick={() => setSubjectSubTab('subject_stats')}
            className={`py-2.5 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              subjectSubTab === 'subject_stats'
                ? 'bg-sky-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>إحصائيات المادة</span>
          </button>
        </div>

        {/* Add Chapter Form (Admin) */}
        {isAddingChapter && (
          <form onSubmit={handleCreateChapter} className="p-4 bg-[#131D2E] rounded-2xl border border-emerald-500/40 space-y-3 text-right">
            <div className="flex items-center justify-between text-xs font-bold text-emerald-400">
              <span>إضافة قسم / محاضرة جديدة للمقرر</span>
              <button type="button" onClick={() => setIsAddingChapter(false)}>
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>

            <input
              type="text"
              required
              placeholder="مثلاً: الفصل الثالث: الجراثيم العنقودية والمناعة"
              value={newChapterName}
              onChange={(e) => setNewChapterName(e.target.value)}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs sm:text-sm font-semibold text-white focus:outline-hidden"
            />

            <div className="space-y-1.5 text-xs">
              <span className="text-slate-400 block font-bold">تصنيف الجزء:</span>
              <InAppSelect<ChapterCategory>
                value={newChapterCategory}
                onChange={(val) => setNewChapterCategory(val)}
                size="sm"
                options={[
                  { value: 'section', label: 'أقسام المقرر' },
                  { value: 'lecture', label: 'محاضرات المادة' },
                  { value: 'comprehensive_partial', label: 'شامل وجزئي' },
                ]}
              />
            </div>

            <button
              type="submit"
              className="px-4 py-2 bg-emerald-600 text-white font-bold text-xs rounded-xl cursor-pointer"
            >
              حفظ القسم
            </button>
          </form>
        )}

        {subjectSubTab === 'chapters' ? (
          <div className="space-y-4">
            {/* Feature 1: Continue Last Visited Chapter Banner + Custom Multi-Chapter Quiz Button */}
            <div className="flex flex-col sm:flex-row items-stretch gap-2.5">
              {lastVisitedChapter && lastVisitedStats && (
                <div
                  onClick={() => handleOpenChapter(lastVisitedChapter)}
                  className="flex-1 p-3 rounded-2xl bg-[#131D2E] border border-emerald-500/40 hover:border-emerald-500 flex items-center justify-between gap-2.5 cursor-pointer transition-all shadow-xs"
                >
                  <div className="flex items-center gap-2 shrink-0">
                    <StatCircleButton
                      size="sm"
                      stats={lastVisitedStats}
                      title={`إحصائيات ${lastVisitedChapter.name}`}
                      onClick={() =>
                        setStatsModalConfig({
                          isOpen: true,
                          title: lastVisitedChapter.name,
                          subtitle: activeSubject.name,
                          stats: lastVisitedStats,
                          questionIds: questions
                            .filter(
                              q =>
                                q.subjectId === activeSubject.id &&
                                (q.chapterId === lastVisitedChapter.id || q.chapterName === lastVisitedChapter.name)
                            )
                            .map(q => q.id),
                          onStartSolving: () => handleOpenChapter(lastVisitedChapter),
                        })
                      }
                    />
                    <span className="px-2.5 py-1.5 rounded-xl bg-emerald-600 text-white text-[11px] font-bold flex items-center gap-1 whitespace-nowrap">
                      <span>متابعة فورية</span>
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </span>
                  </div>

                  <div className="text-right flex-1 min-w-0">
                    <span className="text-[10px] font-bold text-emerald-400 block">
                      آخر قسم كنت تدرسه:
                    </span>
                    <span className="font-bold text-xs sm:text-sm text-white truncate block">
                      {lastVisitedChapter.name}
                    </span>
                  </div>
                </div>
              )}

              {/* Feature 2: Custom Multi-Chapter Random Quiz Trigger */}
              <button
                type="button"
                onClick={() => {
                  setCustomQuizSelectedChapterIds(chaptersList.map(c => c.id));
                  setIsCustomQuizModalOpen(true);
                }}
                className="p-3 rounded-2xl bg-[#131D2E] hover:bg-[#182438] border border-sky-500/40 hover:border-sky-500 flex items-center justify-between sm:justify-center gap-2.5 cursor-pointer transition-all shrink-0"
              >
                <div className="w-8 h-8 rounded-xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400 shrink-0">
                  <Shuffle className="w-4 h-4" />
                </div>
                <div className="text-right">
                  <span className="text-xs font-black text-white block">اختبار عشوائي مخصص</span>
                  <span className="text-[10px] text-slate-400 block">دمج عدة أقسام باختبار واحد</span>
                </div>
              </button>
            </div>

            {/* Feature 3: Top Category Tabs (3 تبويبات: الأقسام | المحاضرات | شامل وجزئي) */}
            <div className="grid grid-cols-3 gap-1.5 p-1 bg-[#131D2E] rounded-2xl border border-slate-800 text-[11px] sm:text-xs font-bold tabular-nums">
              {[
                { id: 'section' as const, label: 'الأقسام', count: sectionChapters.length },
                { id: 'lecture' as const, label: 'المحاضرات', count: lectureChapters.length },
                { id: 'comprehensive_partial' as const, label: 'شامل وجزئي', count: compChapters.length },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveChapterCategoryTab(tab.id)}
                  className={`py-2 px-1.5 rounded-xl text-center transition-all cursor-pointer whitespace-nowrap ${
                    activeChapterCategoryTab === tab.id
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {tab.label} ({tab.count})
                </button>
              ))}
            </div>

            {/* Feature 4: Search & Completion Status Filter Bar */}
            <div className="bg-[#131D2E] border border-slate-800 rounded-2xl p-2.5 space-y-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={chapterListSearch}
                  onChange={(e) => setChapterListSearch(e.target.value)}
                  placeholder="ابحث عن اسم القسم أو المحاضرة..."
                  className="w-full pr-8 pl-8 py-1.5 bg-slate-900/80 border border-slate-700/80 focus:border-emerald-500 rounded-xl text-xs text-white placeholder:text-slate-400 focus:outline-hidden text-right"
                />
                {chapterListSearch && (
                  <button
                    type="button"
                    onClick={() => setChapterListSearch('')}
                    className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="flex items-center justify-between gap-1.5 flex-wrap text-[11px] font-bold">
                <span className="text-slate-400">الفلترة حسب الإنجاز:</span>
                <div className="flex items-center gap-1 flex-wrap">
                  {[
                    { id: 'all' as const, label: 'الكل' },
                    { id: 'in_progress' as const, label: 'قيد الدراسة' },
                    { id: 'completed' as const, label: 'مكتمل' },
                    { id: 'not_started' as const, label: 'لم يبدأ' },
                  ].map((stTab) => (
                    <button
                      key={stTab.id}
                      type="button"
                      onClick={() => setChapterStatusFilter(stTab.id)}
                      className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                        chapterStatusFilter === stTab.id
                          ? 'bg-sky-600 text-white'
                          : 'bg-slate-800/80 text-slate-300 hover:text-white'
                      }`}
                    >
                      {stTab.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Clean Organized Chapters List (All stats confined to StatCircleButton) */}
            {displayedChapters.length === 0 ? (
              <div className="text-center py-10 bg-[#131D2E] rounded-2xl border border-dashed border-slate-800 p-6 space-y-2">
                <Layers className="w-8 h-8 text-slate-500 mx-auto" />
                <p className="text-xs font-bold text-white">لا توجد أقسام مطابقة للبحث أو التصنيف المحدد</p>
                <button
                  type="button"
                  onClick={() => {
                    setActiveChapterCategoryTab('section');
                    setChapterListSearch('');
                    setChapterStatusFilter('all');
                  }}
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-bold cursor-pointer"
                >
                  إظهار الأقسام الأساس
                </button>
              </div>
            ) : (
              <div className="space-y-2.5">
                {displayedChapters.map((ch, idx) => renderChapterRow(ch, idx))}
              </div>
            )}
          </div>
        ) : (
          /* Sub-Tab 2: Dedicated Per-Subject Statistics View (خانة إحصائيات خاصة بالمادة) */
          <div className="space-y-5 text-right">
            <div className="bg-[#131D2E] border border-slate-800 rounded-3xl p-5 sm:p-6 space-y-5">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <button
                  type="button"
                  disabled={subjectStats.solvedCount === 0}
                  onClick={() =>
                    openConfirmDialog({
                      title: `تصفير إحصائيات مادة ${activeSubject.name}`,
                      message: 'هل تريد إعادة ضبط جميع إجاباتك في هذه المادة والبدء من جديد؟',
                      itemName: activeSubject.name,
                      confirmLabel: 'نعم، تصفير المادة',
                      onConfirm: () => resetQuestionsBatch(subjectQuestionsAll.map(q => q.id)),
                    })
                  }
                  className="px-3 py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 disabled:opacity-40 text-xs font-bold flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>تصفير المادة</span>
                </button>

                <h3 className="text-base font-black text-white flex items-center gap-2">
                  <span>إحصائيات مادة {activeSubject.name}</span>
                  <BarChart3 className="w-5 h-5 text-sky-400" />
                </h3>
              </div>

              {/* 6 KPI Cards for Active Subject */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 tabular-nums">
                <div className="bg-[#0E172A] p-4 rounded-2xl border border-slate-800 text-center space-y-1">
                  <span className="text-2xl font-black text-white block">{subjectStats.totalQuestions}</span>
                  <span className="text-xs text-slate-400 font-semibold">الأسئلة الكلية</span>
                </div>
                <div className="bg-[#0E172A] p-4 rounded-2xl border border-slate-800 text-center space-y-1">
                  <span className="text-2xl font-black text-amber-400 block">{subjectStats.remainingCount}</span>
                  <span className="text-xs text-slate-400 font-semibold">الأسئلة المتبقية</span>
                </div>
                <div className="bg-[#0E172A] p-4 rounded-2xl border border-slate-800 text-center space-y-1">
                  <span className="text-2xl font-black text-sky-400 block">{subjectStats.solvedCount}</span>
                  <span className="text-xs text-slate-400 font-semibold">الأسئلة المحلولة</span>
                </div>
                <div className="bg-[#0E172A] p-4 rounded-2xl border border-slate-800 text-center space-y-1">
                  <span className="text-2xl font-black text-emerald-400 block">{subjectStats.correctCount}</span>
                  <span className="text-xs text-slate-400 font-semibold">إجابات صحيحة</span>
                </div>
                <div className="bg-[#0E172A] p-4 rounded-2xl border border-slate-800 text-center space-y-1">
                  <span className="text-2xl font-black text-rose-400 block">{subjectStats.wrongCount}</span>
                  <span className="text-xs text-slate-400 font-semibold">إجابات خاطئة</span>
                </div>
                <div className="bg-[#0E172A] p-4 rounded-2xl border border-slate-800 text-center space-y-1">
                  <span className="text-2xl font-black text-emerald-400 block">{subjectStats.accuracy}%</span>
                  <span className="text-xs text-slate-400 font-semibold">نسبة الدقة</span>
                </div>
              </div>

              {/* Per-Chapter Breakdown inside Subject Stats Tab (Numbers confined to StatCircleButton) */}
              <div className="space-y-2.5 pt-2">
                <h4 className="text-xs font-extrabold text-slate-300">
                  اضغط على الدائرة الإحصائية بجانب أي قسم لعرض بطاقته التفصيلية:
                </h4>
                {chaptersList.map((ch) => {
                  const chQs = questions.filter(
                    q => q.subjectId === activeSubject.id && (q.chapterId === ch.id || q.chapterName === ch.name)
                  );
                  const chSt = computeQuestionStats(chQs, solvedQuestions);
                  return (
                    <div
                      key={ch.id}
                      onClick={() => handleOpenChapter(ch)}
                      className="p-3.5 rounded-2xl bg-[#0E172A] hover:bg-slate-900 border border-slate-800 flex items-center justify-between gap-3 cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-2 shrink-0">
                        <StatCircleButton
                          size="sm"
                          stats={chSt}
                          title={`عرض الدائرة الإحصائية لقسم ${ch.name}`}
                          onClick={() =>
                            setStatsModalConfig({
                              isOpen: true,
                              title: ch.name,
                              subtitle: activeSubject.name,
                              stats: chSt,
                              questionIds: chQs.map(q => q.id),
                              onStartSolving: () => handleOpenChapter(ch),
                            })
                          }
                        />
                      </div>

                      <div className="text-right flex-1">
                        <span className="font-bold text-xs sm:text-sm text-white block">{ch.name}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Custom Multi-Chapter Random Quiz Builder Modal */}
        {isCustomQuizModalOpen && (
          <div
            className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
            onClick={() => setIsCustomQuizModalOpen(false)}
          >
            <div
              className="bg-[#131D2E] border border-slate-700 rounded-3xl p-5 w-full max-w-md space-y-4 shadow-2xl text-right"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <button
                  type="button"
                  onClick={() => setIsCustomQuizModalOpen(false)}
                  className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
                <div className="flex items-center gap-2 text-sky-400 font-black text-sm">
                  <span>إنشاء اختبار عشوائي مخصص</span>
                  <Shuffle className="w-4 h-4" />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setCustomQuizSelectedChapterIds(chaptersList.map(c => c.id))}
                      className="text-sky-400 hover:underline font-bold cursor-pointer"
                    >
                      تحديد الكل
                    </button>
                    <span className="text-slate-500">·</span>
                    <button
                      type="button"
                      onClick={() => setCustomQuizSelectedChapterIds([])}
                      className="text-slate-400 hover:underline font-bold cursor-pointer"
                    >
                      إلغاء الكل
                    </button>
                  </div>
                  <span className="font-bold text-white">اختر الأقسام الداخلة بالاختبار:</span>
                </div>

                <div className="max-h-52 overflow-y-auto space-y-1.5 pr-1">
                  {chaptersList.map((ch) => {
                    const checked = customQuizSelectedChapterIds.includes(ch.id);
                    return (
                      <button
                        key={ch.id}
                        type="button"
                        onClick={() =>
                          setCustomQuizSelectedChapterIds(prev =>
                            prev.includes(ch.id)
                              ? prev.filter(id => id !== ch.id)
                              : [...prev, ch.id]
                          )
                        }
                        className={`w-full p-2.5 rounded-xl border text-right flex items-center justify-between gap-2 text-xs font-bold transition-colors cursor-pointer ${
                          checked
                            ? 'bg-sky-500/15 border-sky-500/50 text-white'
                            : 'bg-[#0E172A] border-slate-800 text-slate-400'
                        }`}
                      >
                        <span
                          className={`w-4 h-4 rounded-md flex items-center justify-center border ${
                            checked
                              ? 'bg-sky-600 border-sky-500 text-white'
                              : 'border-slate-600'
                          }`}
                        >
                          {checked && <Check className="w-3 h-3" />}
                        </span>
                        <span className="truncate flex-1">{ch.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <span className="text-xs font-bold text-white block">عدد الأسئلة العشوائية:</span>
                <div className="grid grid-cols-4 gap-2 text-xs font-bold tabular-nums">
                  {([10, 20, 30, 'all'] as const).map((limit) => (
                    <button
                      key={String(limit)}
                      type="button"
                      onClick={() => setCustomQuizQuestionLimit(limit)}
                      className={`py-2 rounded-xl border cursor-pointer transition-all ${
                        customQuizQuestionLimit === limit
                          ? 'bg-emerald-600 border-emerald-500 text-white'
                          : 'bg-[#0E172A] border-slate-800 text-slate-300'
                      }`}
                    >
                      {limit === 'all' ? 'الكل' : `${limit} سؤال`}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCustomQuizModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  disabled={customQuizSelectedChapterIds.length === 0}
                  onClick={handleStartCustomQuiz}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white text-xs font-bold cursor-pointer"
                >
                  بدء الاختبار الآن
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Question Modal for Admin */}
        <QuestionModal
          isOpen={isQuestionModalOpen}
          onClose={() => setIsQuestionModalOpen(false)}
          subjectId={modalTargetSubjectId || activeSubject.id}
          questionToEdit={questionToEdit}
          chapters={activeSubject.chapters ? activeSubject.chapters.map(c => c.name) : []}
        />

        {/* Shared Modals including BulkImportModal & Gemini Chat */}
        {renderAdvancedQuestionModals()}

        {/* Circular Stats Detail Modal */}
        {statsModalConfig && (
          <StatsCircleModal
            isOpen={statsModalConfig.isOpen}
            onClose={() => setStatsModalConfig(null)}
            title={statsModalConfig.title}
            subtitle={statsModalConfig.subtitle}
            stats={statsModalConfig.stats}
            onStartSolving={statsModalConfig.onStartSolving}
            onResetStats={() => {
              const targetIds = statsModalConfig.questionIds;
              const targetTitle = statsModalConfig.title;
              setStatsModalConfig(null);
              openConfirmDialog({
                title: 'تصفير إجابات القسم',
                message: 'هل أنت متأكد من رغبتك في تصفير جميع إجاباتك في هذا القسم والبدء من جديد؟',
                itemName: targetTitle,
                confirmLabel: 'نعم، تصفير الإجابات',
                onConfirm: () => resetQuestionsBatch(targetIds),
              });
            }}
          />
        )}

        {/* Confirmation Dialog */}
        <ConfirmationDialog
          isOpen={confirmDialog.isOpen}
          title={confirmDialog.title}
          message={confirmDialog.message}
          itemName={confirmDialog.itemName}
          confirmLabel={confirmDialog.confirmLabel}
          onConfirm={confirmDialog.onConfirm}
          onCancel={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
        />
      </div>
    );
  }

  function renderChapterRow(ch: ChapterItem, index: number) {
    if (!activeSubject) return null;
    const chQuestions = questions.filter(
      q => q.subjectId === activeSubject.id && (q.chapterId === ch.id || q.chapterName === ch.name)
    );
    const chStats = computeQuestionStats(chQuestions, solvedQuestions);
    const isPinned = pinnedChapterIds.includes(ch.id);

    const categoryLabel =
      ch.category === 'lecture'
        ? 'محاضرة'
        : ch.category === 'comprehensive_partial'
        ? 'شامل وجزئي'
        : 'قسم المقرر';

    return (
      <div
        key={ch.id}
        className={`${cardSurfaceClass} hover:bg-[#162238] border ${
          isPinned ? 'border-amber-500/40' : ''
        } rounded-2xl p-2.5 sm:p-3.5 transition-all flex items-center justify-between gap-2 min-w-0`}
      >
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          {isAdmin && (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => {
                  setRenamingChapterId(ch.id);
                  setRenamedChapterName(ch.name);
                  setRenamedChapterCategory(ch.category || 'section');
                }}
                className="text-slate-400 hover:text-white p-1.5 rounded-lg bg-slate-800/60 cursor-pointer"
                title="تعديل القسم"
                aria-label={`تعديل القسم ${ch.name}`}
              >
                <Edit3 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              </button>
              <button
                type="button"
                onClick={() =>
                  openConfirmDialog({
                    title: 'حذف القسم وكافة أسئلته',
                    message: 'هل أنت متأكد من حذف هذا القسم وجميع أسئلة الأتمتة المرتبطة به نهائياً؟',
                    itemName: ch.name,
                    onConfirm: () => deleteChapterFromSubject(activeSubject.id, ch.id),
                  })
                }
                className="text-slate-400 hover:text-rose-400 p-1.5 rounded-lg bg-slate-800/60 cursor-pointer"
                title="حذف القسم"
                aria-label={`حذف القسم ${ch.name}`}
              >
                <Trash2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              </button>
            </div>
          )}

          {/* Pin Chapter to Top Button */}
          <button
            type="button"
            onClick={(e) => togglePinChapter(ch.id, e)}
            className={`w-8 h-8 rounded-xl border flex items-center justify-center transition-colors cursor-pointer ${
              isPinned
                ? 'bg-amber-500/20 border-amber-500/50 text-amber-400'
                : 'bg-[#0E172A]/80 border-slate-700/80 text-slate-400 hover:text-white'
            }`}
            title={isPinned ? 'إلغاء تثبيت القسم من الأعلى' : 'تثبيت هذا القسم في أعلى القائمة'}
            aria-label={isPinned ? 'إلغاء تثبيت القسم' : 'تثبيت القسم'}
          >
            <Pin className={`w-3 h-3 ${isPinned ? 'fill-amber-400' : ''}`} />
          </button>

          {/* Interactive Circular Statistical Icon beside every section/chapter */}
          <StatCircleButton
            size="sm"
            stats={chStats}
            title={`إحصائيات ${ch.name}`}
            onClick={() =>
              setStatsModalConfig({
                isOpen: true,
                title: ch.name,
                subtitle: activeSubject.name,
                stats: chStats,
                questionIds: chQuestions.map(q => q.id),
                onStartSolving: () => handleOpenChapter(ch),
              })
            }
          />

          <button
            type="button"
            onClick={() => handleOpenChapter(ch)}
            className="flex items-center gap-0.5 px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold cursor-pointer shadow-xs whitespace-nowrap"
          >
            <span>{chStats.solvedCount > 0 ? 'متابعة' : 'بدء'}</span>
            <ChevronLeft className="w-3 h-3" />
          </button>
        </div>

        <div className="text-right flex-1 min-w-0 pr-0.5">
          {renamingChapterId === ch.id ? (
            <div className="flex flex-wrap items-center justify-end gap-1.5">
              <input
                type="text"
                value={renamedChapterName}
                onChange={(e) => setRenamedChapterName(e.target.value)}
                className="px-2 py-1 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white w-full sm:w-auto"
              />
              <div className="w-32">
                <InAppSelect<ChapterCategory>
                  value={renamedChapterCategory}
                  onChange={(val) => setRenamedChapterCategory(val)}
                  size="sm"
                  inlineExpand={false}
                  options={[
                    { value: 'section', label: 'قسم' },
                    { value: 'lecture', label: 'محاضرة' },
                    { value: 'comprehensive_partial', label: 'شامل وجزئي' },
                  ]}
                />
              </div>
              <button
                type="button"
                onClick={() => handleRenameChapterSubmit(ch.id)}
                className="px-2.5 py-1 bg-emerald-600 text-white text-xs font-bold rounded-lg cursor-pointer"
              >
                حفظ
              </button>
              <button
                type="button"
                onClick={() => setRenamingChapterId(null)}
                className="px-2 py-1 bg-slate-800 text-slate-300 text-xs rounded-lg cursor-pointer"
              >
                إلغاء
              </button>
            </div>
          ) : (
            <div
              onClick={() => handleOpenChapter(ch)}
              className="flex items-center justify-end gap-2 cursor-pointer min-w-0"
            >
              <div className="space-y-0.5 min-w-0 flex-1">
                <h4 className="font-bold text-xs sm:text-sm text-white hover:text-emerald-400 transition-colors leading-snug line-clamp-2 break-words">
                  {ch.name}
                </h4>
                <div className="flex items-center justify-end gap-1 text-[10px] text-slate-400">
                  {isPinned && (
                    <>
                      <span className="text-amber-400 font-bold">مثبت</span>
                      <span aria-hidden="true">·</span>
                    </>
                  )}
                  <span>{categoryLabel}</span>
                </div>
              </div>

              <span className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-slate-800/80 border border-slate-700/70 flex items-center justify-center text-[10px] sm:text-[11px] font-black text-emerald-400 tabular-nums shrink-0">
                {String(index + 1).padStart(2, '0')}
              </span>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ==========================================
  // LEVEL 1: Main Automation Hub Tabs
  // ==========================================
  return (
    <div className="w-full max-w-md mx-auto sm:max-w-2xl lg:max-w-3xl px-3.5 py-3.5 space-y-4 overflow-x-hidden">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
        <button
          type="button"
          onClick={() => {
            commitExitFromMistakesOrSaved();
            setActiveSection('home');
          }}
          className="p-1.5 rounded-xl text-emerald-400 hover:text-emerald-300 transition-colors cursor-pointer"
          title="العودة للرئيسية"
          aria-label="العودة للرئيسية"
        >
          <ChevronRight className="w-6 h-6" />
        </button>

        <h1 className="text-lg sm:text-xl font-black text-emerald-400 text-center">
          بنك الأتمتة الأكاديمي
        </h1>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={toggleDarkMode}
            className="p-2 rounded-xl border bg-[#131D2E] border-slate-800 text-slate-300 hover:text-white cursor-pointer transition-colors"
            title={darkMode ? 'التبديل إلى الوضع النهاري' : 'التبديل إلى الوضع الليلي'}
            aria-label="تبديل الوضع الليلي والنهاري"
          >
            {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-sky-600" />}
          </button>

          <button
            type="button"
            onClick={toggleEyeComfortMode}
            className={`p-2 rounded-xl border text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors ${
              eyeComfortMode
                ? 'bg-amber-500/20 border-amber-500/50 text-amber-400'
                : 'bg-[#131D2E] border-slate-800 text-slate-400 hover:text-white'
            }`}
            title="وضع القراءة المريح للعين"
            aria-label="وضع القراءة المريح للعين"
          >
            <Eye className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main View Tabs (5 Tabs including Supervisor Reports & Review Panel) */}
      <div className={`grid ${isAdmin ? 'grid-cols-5' : 'grid-cols-4'} gap-1 sm:gap-1.5 p-1 bg-[#131D2E] rounded-2xl border border-slate-800 text-[10px] sm:text-xs font-bold min-w-0`}>
        <button
          type="button"
          onClick={() => handleSwitchTab('bank')}
          className={`py-2 px-1 rounded-xl text-center transition-all cursor-pointer truncate ${
            activeTab === 'bank'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          المقررات
        </button>

        <button
          type="button"
          onClick={() => handleSwitchTab('mistakes')}
          className={`py-2 px-1 rounded-xl text-center transition-all cursor-pointer truncate ${
            activeTab === 'mistakes'
              ? 'bg-rose-600 text-white shadow-xs'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          الأخطاء ({wrongQuestionIds.length})
        </button>

        <button
          type="button"
          onClick={() => handleSwitchTab('saved_notes')}
          className={`py-2 px-1 rounded-xl text-center transition-all cursor-pointer truncate ${
            activeTab === 'saved_notes'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          المحفوظات ({savedQuestionIds.length})
        </button>

        <button
          type="button"
          onClick={() => handleSwitchTab('stats')}
          className={`py-2 px-1 rounded-xl text-center transition-all cursor-pointer truncate ${
            activeTab === 'stats'
              ? 'bg-sky-600 text-white shadow-xs'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          الإحصائيات
        </button>

        {isAdmin && (
          <button
            type="button"
            onClick={() => handleSwitchTab('reports')}
            className={`py-2 px-1 rounded-xl text-center transition-all cursor-pointer truncate flex items-center justify-center gap-0.5 sm:gap-1 ${
              activeTab === 'reports'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-amber-300 hover:text-white'
            }`}
          >
            <Flag className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
            <span className="truncate">البلاغات ({pendingReportsCount})</span>
          </button>
        )}
      </div>

      {/* TAB 1: SUBJECTS CATALOG */}
      {activeTab === 'bank' && (
        <div className="space-y-4">
          <p className="text-xs sm:text-sm text-slate-400 text-center">
            اختر المادة للبدء بحل الأسئلة بنظام السرد الطولي، أو اضغط على الدائرة الإحصائية لعرض إحصائيات المادة.
          </p>

          {/* In-App Expandable Year Selector */}
          <InAppSelect<AcademicYearId>
            ariaLabel="السنة الدراسية"
            value={activeYear}
            onChange={(val) => setActiveYear(val)}
            size="lg"
            options={INITIAL_YEARS.map((y) => ({
              value: y.id,
              label: y.name,
            }))}
          />

          {/* Semester Toggles (فصل أول / فصل ثاني) */}
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setActiveSemester('first')}
              className={`py-2.5 rounded-2xl text-xs sm:text-sm font-black transition-all cursor-pointer ${
                activeSemester === 'first'
                  ? 'bg-[#10B981] text-slate-950 shadow-md shadow-emerald-500/20'
                  : 'bg-[#131D2E] text-slate-400 border border-slate-800'
              }`}
            >
              فصل أول
            </button>

            <button
              type="button"
              onClick={() => setActiveSemester('second')}
              className={`py-2.5 rounded-2xl text-xs sm:text-sm font-black transition-all cursor-pointer ${
                activeSemester === 'second'
                  ? 'bg-[#10B981] text-slate-950 shadow-md shadow-emerald-500/20'
                  : 'bg-[#131D2E] text-slate-400 border border-slate-800'
              }`}
            >
              فصل ثاني
            </button>
          </div>

          {/* Supervisor Management Bar */}
          {isAdmin && (
            <div className="bg-[#131D2E] border border-emerald-500/30 rounded-2xl p-3.5 flex flex-wrap items-center justify-between gap-2 text-right">
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => {
                    setSubjectToEdit(null);
                    setIsSubjectModalOpen(true);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>إضافة مادة جديدة</span>
                </button>
                {currentSubjects.length > 0 && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setModalTargetSubjectId(currentSubjects[0].id);
                        setQuestionToEdit(null);
                        setIsQuestionModalOpen(true);
                      }}
                      className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>إضافة سؤال سريع</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setBulkImportSubjectId(currentSubjects[0].id);
                        setBulkImportChapterId(currentSubjects[0].chapters?.[0]?.id || null);
                        setIsBulkImportModalOpen(true);
                      }}
                      className="px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                    >
                      <FileCode2 className="w-4 h-4" />
                      <span>استيراد دفعي ذكي (/q)</span>
                    </button>
                  </>
                )}
                <button
                  type="button"
                  onClick={() => handleSwitchTab('reports')}
                  className="px-3.5 py-2 rounded-xl bg-amber-500/20 border border-amber-500/40 hover:bg-amber-500/30 text-amber-300 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Flag className="w-4 h-4" />
                  <span>مراجعة البلاغات ({pendingReportsCount})</span>
                </button>
              </div>

              <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400">
                <span>لوحة تحكم المشرف: إضافة وتعديل وحذف المواد والأقسام والأسئلة</span>
                <ShieldCheck className="w-4 h-4 shrink-0" />
              </div>
            </div>
          )}

          {/* Subjects Vertical List (All statistics confined strictly inside StatCircleButton) */}
          <div className="space-y-3">
            {currentSubjects.map((sub) => {
              const subQuestions = questions.filter(q => q.subjectId === sub.id);
              const subStats = computeQuestionStats(subQuestions, solvedQuestions);

              return (
                <div
                  key={sub.id}
                  onClick={() => {
                    setSelectedSubjectId(sub.id);
                    setSubjectSubTab('chapters');
                  }}
                  className={`group ${cardSurfaceClass} hover:bg-[#162238] border hover:border-emerald-500/40 rounded-2xl p-3.5 sm:p-4 transition-all duration-200 cursor-pointer flex items-center justify-between gap-2.5 sm:gap-3 shadow-md min-w-0`}
                >
                  <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                    {isAdmin && (
                      <div className="flex items-center gap-1 mr-0.5" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => {
                            setSubjectToEdit(sub);
                            setIsSubjectModalOpen(true);
                          }}
                          className="text-slate-400 hover:text-white p-1.5 rounded-lg bg-slate-800/70 cursor-pointer"
                          title="تعديل المادة"
                          aria-label={`تعديل المادة ${sub.name}`}
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            openConfirmDialog({
                              title: 'حذف المادة الدراسية',
                              message: 'هل أنت متأكد من حذف هذه المادة وكافة أقسامها وأسئلتها من بنك الأتمتة؟',
                              itemName: sub.name,
                              onConfirm: () => deleteSubject(sub.id),
                            })
                          }
                          className="text-slate-400 hover:text-rose-400 p-1.5 rounded-lg bg-slate-800/70 cursor-pointer"
                          title="حذف المادة"
                          aria-label={`حذف المادة ${sub.name}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}

                    {/* Interactive Circular Progress Ring beside each Subject (holds ALL subject statistics) */}
                    <StatCircleButton
                      stats={subStats}
                      title={`إحصائيات مادة ${sub.name}`}
                      onClick={() =>
                        setStatsModalConfig({
                          isOpen: true,
                          title: `إحصائيات مادة ${sub.name}`,
                          subtitle: `${sub.chapters?.length || 0} أقسام ومحاضرات`,
                          stats: subStats,
                          questionIds: subQuestions.map(q => q.id),
                          onStartSolving: () => {
                            setSelectedSubjectId(sub.id);
                            setSubjectSubTab('chapters');
                          },
                        })
                      }
                    />
                  </div>

                  <div className="flex items-center gap-2.5 sm:gap-3 text-right flex-1 justify-end min-w-0">
                    <div className="space-y-0.5 min-w-0 flex-1">
                      <span className="font-black text-sm sm:text-base text-white group-hover:text-emerald-400 transition-colors block truncate">
                        {sub.name}
                      </span>
                      <span className="text-[11px] text-slate-400 block truncate">
                        {sub.chapters?.length || 0} أقسام ومحاضرات
                      </span>
                    </div>

                    {(() => {
                      const { accentColor } = resolveSubjectMedicalIcon(sub);
                      return (
                        <div
                          className="subject-medical-badge w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border border-white/5 transition-transform group-hover:scale-105"
                          style={{ backgroundColor: `${accentColor}20`, borderColor: `${accentColor}40`, color: accentColor }}
                        >
                          <SubjectMedicalIcon subject={sub} className="w-5 h-5" />
                        </div>
                      );
                    })()}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: MISTAKES BANK (بطاقات أتمتة تفاعلية غير محلولة، وتتحول إلى صح ضمن قسمها فور حلها وتختفي من الأخطاء بعد الخروج) */}
      {activeTab === 'mistakes' && (
        <div className="space-y-4">
          <div className="bg-[#1A1325] border border-rose-500/40 rounded-3xl p-5 text-right space-y-2 shadow-lg">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-rose-300 tabular-nums">
                {mistakeQuestionsList.length} سؤال للمراجعة
              </span>
              <h2 className="text-base font-black text-rose-400 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-rose-400" />
                <span>بنك الأخطاء وتصحيح المسار</span>
              </h2>
            </div>
            <p className="text-xs text-slate-200 leading-relaxed">
              تُعرض هنا الأسئلة التي أخطأت بها كبطاقات أتمتة غير محلولة لتختبر نفسك بها مجدداً. عند الإجابة الصحيحة على أي سؤال هنا يتحول فوراً إلى (صح ✓) ضمن قسمه الأصلي، ويبقى أمامك لمراجعة التعليل ثم يختفي تلقائياً من بنك الأخطاء عند خروجك.
            </p>
          </div>

          {mistakeQuestionsList.length === 0 ? (
            <div className="text-center py-16 bg-[#131D2E] rounded-3xl border border-dashed border-slate-800 p-8 space-y-3">
              <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
              <h3 className="font-bold text-base text-white">سجلك خالٍ من الأخطاء حالياً!</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                أي سؤال تخطئ في حله داخل أقسام المواد سيظهر تلقائياً هنا كبطاقة اختبار غير محلولة لتتمكن من إتقانه.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {mistakeQuestionsList.map((q, idx) =>
                renderInteractivePracticeCard(q, idx, 'mistakes')
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: SAVED & NOTES (تظهر المحفوظات كبطاقات أتمتة غير محلولة وتبقى محفوظة بعد الحل) */}
      {activeTab === 'saved_notes' && (
        <div className="space-y-4">
          {/* Sub tabs */}
          <div className="flex items-center justify-center gap-2 border-b border-slate-800 pb-3">
            <button
              type="button"
              onClick={() => setSavedNotesSubTab('saved')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                savedNotesSubTab === 'saved'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-[#131D2E] text-slate-400 hover:text-white'
              }`}
            >
              <Bookmark className="w-4 h-4" />
              <span>الأسئلة المحفوظة ({savedQuestionsList.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setSavedNotesSubTab('notes')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                savedNotesSubTab === 'notes'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-[#131D2E] text-slate-400 hover:text-white'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>ملاحظاتي على الأتمتات ({noteQuestionsList.length})</span>
            </button>
          </div>

          {savedNotesSubTab === 'saved' && (
            <div className="space-y-4">
              {savedQuestionsList.length === 0 ? (
                <div className="text-center py-16 bg-[#131D2E] rounded-3xl border border-dashed border-slate-800 p-8 space-y-3">
                  <Bookmark className="w-12 h-12 text-slate-500 mx-auto" />
                  <h3 className="font-bold text-base text-white">لم تقم بحفظ أي سؤال بعد</h3>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    عند حل أي سؤال، اضغط على زر الحفظ ليتم حفظه هنا كبطاقة أتمتة غير محلولة للتدرب عليه متى شئت.
                  </p>
                </div>
              ) : (
                savedQuestionsList.map((q, idx) =>
                  renderInteractivePracticeCard(q, idx, 'saved')
                )
              )}
            </div>
          )}

          {savedNotesSubTab === 'notes' && (
            <div className="space-y-3">
              {noteQuestionsList.length === 0 ? (
                <div className="text-center py-16 bg-[#131D2E] rounded-3xl border border-dashed border-slate-800 p-8 space-y-3">
                  <FileText className="w-12 h-12 text-slate-500 mx-auto" />
                  <h3 className="font-bold text-base text-white">لا توجد ملاحظات مدونة بعد</h3>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    يمكنك كتابة ملاحظة توضيحية على أي سؤال عبر زر الملاحظة لتظهر لك جميعاً في هذا السجل الأكاديمي.
                  </p>
                </div>
              ) : (
                noteQuestionsList.map((q) => (
                  <div key={q.id} className="bg-[#131D2E] border border-slate-800 rounded-2xl p-4 text-right space-y-2.5">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                      <button
                        type="button"
                        onClick={() =>
                          openConfirmDialog({
                            title: 'حذف الملاحظة الشخصية',
                            message: 'هل تريد حذف ملاحظتك المدونة على هذا السؤال؟',
                            itemName: questionNotes[q.id],
                            onConfirm: () => deleteQuestionNote(q.id),
                          })
                        }
                        className="text-xs text-rose-400 hover:underline cursor-pointer"
                      >
                        حذف الملاحظة
                      </button>
                      <span className="text-xs font-bold text-indigo-400">سؤال مع ملاحظة</span>
                    </div>

                    <p className="text-xs sm:text-sm font-bold text-white">{q.questionText}</p>

                    <div className="p-3 bg-indigo-950/30 border border-indigo-900/50 rounded-xl text-xs text-indigo-200">
                      <strong className="block text-indigo-300 font-bold mb-1">الملاحظة المدونة:</strong>
                      <p>{questionNotes[q.id]}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: STATISTICS (الأسئلة الكلية، المتبقية، المحلولة، الصح، الخطأ، ونسبة الدقة + الدوائر الإحصائية للمواد) */}
      {activeTab === 'stats' && (
        <div className="space-y-5 text-right">
          <div className="bg-[#131D2E] border border-slate-800 rounded-3xl p-6 space-y-5">
            <h2 className="text-lg font-black text-white flex items-center justify-end gap-2">
              <span>إحصائيات الإنجاز والتقدم الدراسي الشاملة</span>
              <BarChart3 className="w-5 h-5 text-sky-400" />
            </h2>
            <p className="text-xs text-slate-300 leading-relaxed">
              نظرة تحليلية شاملة على إجمالي الأسئلة الكلية، الأسئلة المتبقية، المحلولة، والإجابات الصحيحة والخاطئة في بنك الأتمتة. اضغط على الدائرة الإحصائية بجانب أي مادة لعرض نافذتها التفصيلية.
            </p>

            {/* 6 KPI Cards Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-1 tabular-nums">
              <div className="bg-[#0E172A] p-4 rounded-2xl border border-slate-800 text-center space-y-1">
                <span className="text-2xl font-black text-white block">{globalStats.totalQuestions}</span>
                <span className="text-xs text-slate-400 font-semibold">الأسئلة الكلية</span>
              </div>

              <div className="bg-[#0E172A] p-4 rounded-2xl border border-slate-800 text-center space-y-1">
                <span className="text-2xl font-black text-amber-400 block">{globalStats.remainingCount}</span>
                <span className="text-xs text-slate-400 font-semibold">الأسئلة المتبقية</span>
              </div>

              <div className="bg-[#0E172A] p-4 rounded-2xl border border-slate-800 text-center space-y-1">
                <span className="text-2xl font-black text-sky-400 block">{globalStats.solvedCount}</span>
                <span className="text-xs text-slate-400 font-semibold">الأسئلة المحلولة</span>
              </div>

              <div className="bg-[#0E172A] p-4 rounded-2xl border border-slate-800 text-center space-y-1">
                <span className="text-2xl font-black text-emerald-400 block">{globalStats.correctCount}</span>
                <span className="text-xs text-slate-400 font-semibold">إجابات صحيحة</span>
              </div>

              <div className="bg-[#0E172A] p-4 rounded-2xl border border-slate-800 text-center space-y-1">
                <span className="text-2xl font-black text-rose-400 block">{globalStats.wrongCount}</span>
                <span className="text-xs text-slate-400 font-semibold">إجابات خاطئة</span>
              </div>

              <div className="bg-[#0E172A] p-4 rounded-2xl border border-slate-800 text-center space-y-1">
                <span className="text-2xl font-black text-emerald-400 block">{globalStats.accuracy}%</span>
                <span className="text-xs text-slate-400 font-semibold">نسبة الدقة</span>
              </div>
            </div>
          </div>

          {/* Per-Subject Breakdown in Statistics Tab (Numbers confined to StatCircleButton) */}
          <div className="bg-[#131D2E] border border-slate-800 rounded-3xl p-5 space-y-3">
            <h3 className="text-sm font-black text-white">
              إحصائيات مواد الفصل الحالي (اضغط الدائرة لعرض التفاصيل):
            </h3>
            <div className="space-y-2.5">
              {currentSubjects.map((sub) => {
                const subQs = questions.filter(q => q.subjectId === sub.id);
                const st = computeQuestionStats(subQs, solvedQuestions);
                return (
                  <div
                    key={sub.id}
                    onClick={() => {
                      setSelectedSubjectId(sub.id);
                      setSubjectSubTab('subject_stats');
                      setActiveTab('bank');
                    }}
                    className="p-3.5 rounded-2xl bg-[#0E172A] hover:bg-slate-900 border border-slate-800 flex items-center justify-between gap-3 text-xs tabular-nums cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-2.5 shrink-0">
                      <StatCircleButton
                        size="sm"
                        stats={st}
                        title={`إحصائيات مادة ${sub.name}`}
                        onClick={() =>
                          setStatsModalConfig({
                            isOpen: true,
                            title: `إحصائيات مادة ${sub.name}`,
                            subtitle: `${sub.chapters?.length || 0} أقسام`,
                            stats: st,
                            questionIds: subQs.map(q => q.id),
                            onStartSolving: () => {
                              setSelectedSubjectId(sub.id);
                              setActiveTab('bank');
                            },
                          })
                        }
                      />
                    </div>

                    <div className="text-right flex-1">
                      <span className="font-bold text-sm text-white block">{sub.name}</span>
                      <span className="text-[11px] text-slate-400 block mt-0.5">
                        {sub.chapters?.length || 0} أقسام ومحاضرات
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Reset Stats Option */}
          <div className="p-4 bg-[#131D2E] rounded-2xl border border-slate-800 flex items-center justify-between text-xs tabular-nums">
            <button
              type="button"
              onClick={() =>
                openConfirmDialog({
                  title: 'إعادة ضبط تقدم الأتمتات',
                  message: 'هل تريد تصفير تقدمك الحالي في حل جميع الأسئلة والبدء من جديد؟',
                  confirmLabel: 'نعم، تصفير التقدم',
                  onConfirm: () => resetAllQuestionStatus(),
                })
              }
              className="px-3.5 py-2 bg-rose-600/20 text-rose-300 hover:bg-rose-600/30 rounded-xl font-bold cursor-pointer"
            >
              إعادة ضبط تقدمي الشامل
            </button>
            <span className="text-slate-400 font-semibold">
              الأسئلة الكلية: <strong className="text-white">{globalStats.totalQuestions}</strong> · المتبقية: <strong className="text-amber-400">{globalStats.remainingCount}</strong>
            </span>
          </div>
        </div>
      )}

      {/* TAB 5: SUPERVISOR REPORTS & REVIEW PANEL */}
      {activeTab === 'reports' && (
        <SupervisorReportsPanel
          onEditQuestion={(q) => {
            setModalTargetSubjectId(q.subjectId);
            setQuestionToEdit(q);
            setIsQuestionModalOpen(true);
          }}
          onAddNewSubject={() => {
            setSubjectToEdit(null);
            setIsSubjectModalOpen(true);
          }}
          onAddNewQuestion={() => {
            setModalTargetSubjectId(currentSubjects[0]?.id || subjects[0]?.id || null);
            setQuestionToEdit(null);
            setIsQuestionModalOpen(true);
          }}
          onOpenQuestionInStream={(q) => {
            setSelectedSubjectId(q.subjectId);
            setSelectedChapterId(q.chapterId);
            setActiveTab('bank');
          }}
          onConfirmAction={openConfirmDialog}
        />
      )}

      {/* Advanced Question Modals (Discussion, Report Question, AI Tutor) */}
      {renderAdvancedQuestionModals()}

      {/* Note Dialog Modal (when triggered from Mistakes/Saved tabs) */}
      {activeNoteModalQId && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#131D2E] border border-slate-800 rounded-3xl p-5 w-full max-w-md space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2 text-indigo-400 text-sm font-bold">
                <FileText className="w-4 h-4" />
                <span>تسجيل ملاحظة على السؤال</span>
              </div>
              <button type="button" onClick={() => setActiveNoteModalQId(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <textarea
              rows={4}
              value={currentNoteText}
              onChange={(e) => setCurrentNoteText(e.target.value)}
              placeholder="اكتب ملاحظتك الخاصة على هذا السؤال..."
              className="w-full p-3 bg-slate-900 border border-slate-700 rounded-2xl text-xs sm:text-sm font-medium text-white focus:outline-hidden text-right leading-relaxed"
            />

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setActiveNoteModalQId(null)}
                className="px-3 py-2 bg-slate-800 text-slate-300 text-xs font-bold rounded-xl cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleSaveNoteSubmit}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl cursor-pointer"
              >
                حفظ الملاحظة
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Subject Modal */}
      <SubjectModal
        isOpen={isSubjectModalOpen}
        onClose={() => setIsSubjectModalOpen(false)}
        subjectToEdit={subjectToEdit}
      />

      {/* Question Modal (when triggered from Level 1 or Mistakes/Saved/Reports tabs) */}
      {isQuestionModalOpen && (
        <QuestionModal
          isOpen={isQuestionModalOpen}
          onClose={() => setIsQuestionModalOpen(false)}
          subjectId={modalTargetSubjectId || currentSubjects[0]?.id || subjects[0]?.id || ''}
          questionToEdit={questionToEdit}
          chapters={
            subjects
              .find(s => s.id === (modalTargetSubjectId || currentSubjects[0]?.id))
              ?.chapters?.map(c => c.name) || ['الفصل الأول: المفاهيم الأساسية']
          }
        />
      )}

      {/* Circular Stats Detail Modal */}
      {statsModalConfig && (
        <StatsCircleModal
          isOpen={statsModalConfig.isOpen}
          onClose={() => setStatsModalConfig(null)}
          title={statsModalConfig.title}
          subtitle={statsModalConfig.subtitle}
          stats={statsModalConfig.stats}
          onStartSolving={statsModalConfig.onStartSolving}
          onResetStats={() => {
            const targetIds = statsModalConfig.questionIds;
            const targetTitle = statsModalConfig.title;
            setStatsModalConfig(null);
            openConfirmDialog({
              title: 'تصفير الإجابات',
              message: 'هل أنت متأكد من رغبتك في تصفير جميع إجاباتك في هذا القسم/المادة والبدء من جديد؟',
              itemName: targetTitle,
              confirmLabel: 'نعم، تصفير الإجابات',
              onConfirm: () => resetQuestionsBatch(targetIds),
            });
          }}
        />
      )}

      {/* Unified Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        itemName={confirmDialog.itemName}
        confirmLabel={confirmDialog.confirmLabel}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};

import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import {
  ChapterCategory,
  CustomQuizSourceFilter,
  QuestionItem,
  StudentCustomQuiz,
  SubjectItem,
} from '../../types';
import {
  buildStudentCustomQuiz,
  resolveCustomQuizQuestions,
} from '../../utils/customQuizAndLibraryLogic';
import { computeQuestionStats } from '../../utils/automationLogic';
import {
  SubjectMedicalIcon,
  resolveSubjectMedicalIcon,
} from '../Common/SubjectMedicalIcon';
import {
  Plus,
  Play,
  RotateCcw,
  Trash2,
  Edit3,
  Check,
  X,
  SlidersHorizontal,
  Sparkles,
  Layers,
  Shuffle,
  Timer,
  CheckCircle2,
  HelpCircle,
  BookOpen,
  ClipboardList,
  Award,
} from 'lucide-react';

interface MyQuizzesPanelProps {
  subject: SubjectItem;
  onLaunchQuiz: (quiz: StudentCustomQuiz, resolvedQuestions: QuestionItem[]) => void;
  onConfirmAction: (config: {
    title: string;
    message: string;
    itemName?: string;
    confirmLabel?: string;
    onConfirm: () => void;
  }) => void;
}

const ALL_CATEGORIES: ChapterCategory[] = [
  'section',
  'lecture',
  'comprehensive_partial',
];

const CATEGORY_META: Record<
  ChapterCategory,
  { label: string; shortLabel: string; badgeClass: string }
> = {
  section: {
    label: 'الأقسام',
    shortLabel: 'قسم',
    badgeClass: 'bg-emerald-500/15 border-emerald-500/35 text-emerald-300',
  },
  lecture: {
    label: 'المحاضرات',
    shortLabel: 'محاضرة',
    badgeClass: 'bg-sky-500/15 border-sky-500/35 text-sky-300',
  },
  comprehensive_partial: {
    label: 'الشامل وجزئي',
    shortLabel: 'شامل وجزئي',
    badgeClass: 'bg-purple-500/15 border-purple-500/35 text-purple-300',
  },
};

export const MyQuizzesPanel: React.FC<MyQuizzesPanelProps> = ({
  subject,
  onLaunchQuiz,
  onConfirmAction,
}) => {
  const {
    subjects,
    questions,
    solvedQuestions,
    wrongQuestionIds,
    savedQuestionIds,
    resetQuestionsBatch,
    studentCustomQuizzes,
    saveStudentCustomQuiz,
    deleteStudentCustomQuiz,
    eyeComfortMode,
  } = useApp();

  // Strictly scoped to this single subject
  const subjectQuizzes = useMemo(() => {
    return studentCustomQuizzes.filter((q) => q.subjectIds.includes(subject.id));
  }, [studentCustomQuizzes, subject.id]);

  const subjectQuestionsAll = useMemo(() => {
    return questions.filter((q) => q.subjectId === subject.id);
  }, [questions, subject.id]);

  // Builder Modal State (Scoped to `subject`)
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [editingQuizId, setEditingQuizId] = useState<string | null>(null);
  const [quizTitle, setQuizTitle] = useState('');
  const [quizDescription, setQuizDescription] = useState('');
  const [selectedCategories, setSelectedCategories] =
    useState<ChapterCategory[]>(ALL_CATEGORIES);
  const [selectedChapterIds, setSelectedChapterIds] = useState<string[]>([]);
  const [chapterBrowseTab, setChapterBrowseTab] = useState<
    'all' | ChapterCategory
  >('all');
  const [questionLimit, setQuestionLimit] = useState<number | 'all'>(15);
  const [customLimitInput, setCustomLimitInput] = useState<string>('');
  const [sourceFilter, setSourceFilter] = useState<CustomQuizSourceFilter>('all');
  const [shuffleQuestions, setShuffleQuestions] = useState<boolean>(true);
  const [timeLimitMinutes, setTimeLimitMinutes] = useState<number>(0);
  const [validationError, setValidationError] = useState<string | null>(null);

  const openCreateModal = () => {
    setEditingQuizId(null);
    setQuizTitle('');
    setQuizDescription('');
    setSelectedCategories(ALL_CATEGORIES);
    setSelectedChapterIds([]);
    setChapterBrowseTab('all');
    setQuestionLimit(15);
    setCustomLimitInput('');
    setSourceFilter('all');
    setShuffleQuestions(true);
    setTimeLimitMinutes(0);
    setValidationError(null);
    setIsBuilderOpen(true);
  };

  const openEditModal = (quiz: StudentCustomQuiz) => {
    setEditingQuizId(quiz.id);
    setQuizTitle(quiz.title);
    setQuizDescription(quiz.description || '');
    setSelectedCategories(
      quiz.categories && quiz.categories.length > 0
        ? quiz.categories
        : ALL_CATEGORIES
    );
    setSelectedChapterIds(quiz.chapterIds);
    setChapterBrowseTab('all');
    setQuestionLimit(quiz.questionLimit);
    setCustomLimitInput(
      typeof quiz.questionLimit === 'number' &&
        ![5, 10, 15, 20, 30, 50].includes(quiz.questionLimit)
        ? String(quiz.questionLimit)
        : ''
    );
    setSourceFilter(quiz.sourceFilter);
    setShuffleQuestions(quiz.shuffleQuestions);
    setTimeLimitMinutes(quiz.timeLimitMinutes || 0);
    setValidationError(null);
    setIsBuilderOpen(true);
  };

  // All chapters/lectures/exams inside this subject
  const subjectChapters = useMemo(() => {
    return (subject.chapters || []).map((ch) => {
      const cat: ChapterCategory = ch.category || 'section';
      const qCount = subjectQuestionsAll.filter(
        (q) => q.chapterId === ch.id || q.chapterName === ch.name
      ).length;
      return {
        id: ch.id,
        name: ch.name,
        category: cat,
        questionCount: qCount,
      };
    });
  }, [subject.chapters, subjectQuestionsAll]);

  // Count chapters and questions per category in this subject
  const categoryStats = useMemo(() => {
    const chapterCatById = new Map<string, ChapterCategory>();
    const chapterCatByName = new Map<string, ChapterCategory>();
    for (const ch of subjectChapters) {
      chapterCatById.set(ch.id, ch.category);
      chapterCatByName.set(ch.name, ch.category);
    }

    const counts: Record<
      ChapterCategory,
      { chaptersCount: number; questionsCount: number }
    > = {
      section: {
        chaptersCount: subjectChapters.filter((c) => c.category === 'section')
          .length,
        questionsCount: 0,
      },
      lecture: {
        chaptersCount: subjectChapters.filter((c) => c.category === 'lecture')
          .length,
        questionsCount: 0,
      },
      comprehensive_partial: {
        chaptersCount: subjectChapters.filter(
          (c) => c.category === 'comprehensive_partial'
        ).length,
        questionsCount: 0,
      },
    };

    for (const q of subjectQuestionsAll) {
      const cat: ChapterCategory =
        q.category ||
        chapterCatById.get(q.chapterId) ||
        (q.chapterName ? chapterCatByName.get(q.chapterName) : undefined) ||
        'section';
      counts[cat].questionsCount += 1;
    }

    return counts;
  }, [subjectChapters, subjectQuestionsAll]);

  const displayedBuilderChapters = useMemo(() => {
    return subjectChapters.filter((ch) => {
      if (chapterBrowseTab !== 'all' && ch.category !== chapterBrowseTab) {
        return false;
      }
      return true;
    });
  }, [subjectChapters, chapterBrowseTab]);

  // Live preview of matching questions in builder for this subject
  const previewMatchedQuestions = useMemo(() => {
    return resolveCustomQuizQuestions(
      {
        subjectIds: [subject.id],
        categories: selectedCategories,
        chapterIds: selectedChapterIds,
        questionLimit: 'all',
        sourceFilter,
        shuffleQuestions: false,
        questionIds: [],
      },
      questions,
      subjects,
      {
        solvedQuestions,
        wrongQuestionIds,
        savedQuestionIds,
      }
    );
  }, [
    subject.id,
    selectedCategories,
    selectedChapterIds,
    sourceFilter,
    questions,
    subjects,
    solvedQuestions,
    wrongQuestionIds,
    savedQuestionIds,
  ]);

  const effectiveLimit: number | 'all' = useMemo(() => {
    if (customLimitInput.trim()) {
      const parsed = parseInt(customLimitInput.trim(), 10);
      if (!isNaN(parsed) && parsed > 0) return parsed;
    }
    return questionLimit;
  }, [customLimitInput, questionLimit]);

  const finalPreviewCount =
    effectiveLimit === 'all'
      ? previewMatchedQuestions.length
      : Math.min(previewMatchedQuestions.length, effectiveLimit);

  const toggleCategory = (cat: ChapterCategory) => {
    setValidationError(null);
    setSelectedCategories((prev) => {
      if (prev.includes(cat)) {
        if (prev.length === 1) return prev; // Keep at least one category selected
        return prev.filter((c) => c !== cat);
      }
      return [...prev, cat];
    });
  };

  const toggleChapterSelection = (chId: string, chCategory: ChapterCategory) => {
    setValidationError(null);
    setSelectedChapterIds((prev) => {
      const exists = prev.includes(chId);
      const next = exists ? prev.filter((id) => id !== chId) : [...prev, chId];
      // Ensure the chapter's category is enabled when checking it
      if (!exists && !selectedCategories.includes(chCategory)) {
        setSelectedCategories((cats) => [...cats, chCategory]);
      }
      return next;
    });
  };

  const selectAllChaptersInCategory = (cat: ChapterCategory) => {
    setValidationError(null);
    const catChapterIds = subjectChapters
      .filter((c) => c.category === cat)
      .map((c) => c.id);
    if (!selectedCategories.includes(cat)) {
      setSelectedCategories((prev) => [...prev, cat]);
    }
    setSelectedChapterIds((prev) => {
      const set = new Set([...prev, ...catChapterIds]);
      return Array.from(set);
    });
  };

  const handleSaveQuiz = (launchImmediately: boolean) => {
    if (!quizTitle.trim()) {
      setValidationError(
        `يرجى تسمية اختبارك في مادة ${subject.name} (مثلاً: مراجعة المحاضرات والشامل).`
      );
      return;
    }

    const builtQuiz = buildStudentCustomQuiz(
      {
        id: editingQuizId || undefined,
        title: quizTitle.trim(),
        description: quizDescription.trim() || undefined,
        yearId: subject.yearId,
        semester: subject.semester,
        subjectIds: [subject.id],
        categories: selectedCategories,
        chapterIds: selectedChapterIds,
        questionLimit: effectiveLimit,
        sourceFilter,
        shuffleQuestions,
        timeLimitMinutes: timeLimitMinutes > 0 ? timeLimitMinutes : undefined,
      },
      questions,
      subjects,
      {
        solvedQuestions,
        wrongQuestionIds,
        savedQuestionIds,
      }
    );

    saveStudentCustomQuiz(builtQuiz);

    if (launchImmediately) {
      const resolved = resolveCustomQuizQuestions(
        builtQuiz,
        questions,
        subjects,
        {
          solvedQuestions,
          wrongQuestionIds,
          savedQuestionIds,
        }
      );
      setIsBuilderOpen(false);
      if (resolved.length > 0) {
        onLaunchQuiz(builtQuiz, resolved);
      }
    } else {
      setIsBuilderOpen(false);
    }
  };

  const sourceFilterLabels: Record<CustomQuizSourceFilter, string> = {
    all: 'جميع الأسئلة',
    unsolved: 'غير المحلولة فقط',
    wrong: 'الأخطاء فقط',
    saved: 'المحفوظات فقط',
  };

  const subjectAccent = resolveSubjectMedicalIcon(subject).accentColor;

  return (
    <div className="space-y-3.5 text-right">
      {/* Subject-Scoped Hero Card: Create Custom Random Quiz for THIS Subject */}
      <div
        className={`${
          eyeComfortMode
            ? 'bg-[#1C1915] border-amber-900/40'
            : 'bg-[#131D2E] border-emerald-500/35'
        } border rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-3.5`}
      >
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 text-emerald-400 text-[11px] font-black">
            <Shuffle className="w-3.5 h-3.5" />
            <span>اختباراتي العشوائية المخصصة · {subject.name}</span>
          </div>
          <h3 className="text-sm sm:text-base font-black text-white">
            اصنع اختباراً عشوائياً مخصصاً في مادة {subject.name}
          </h3>
          <p className="text-[11px] sm:text-xs text-slate-400 leading-relaxed">
            حدد من أين تريد الاختبار داخل المادة (اختر ونوّع بين الأقسام، المحاضرات، والشامل وجزئي كما تشاء)، حدد عدد الأسئلة وسمِّ اختبارك ليُحفظ هنا.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 cursor-pointer shrink-0 transition-all active:scale-98 whitespace-nowrap"
        >
          <Plus className="w-4 h-4" />
          <span>إنشاء اختبار عشوائي للمادة</span>
        </button>
      </div>

      {/* Saved Custom Quizzes List for this Subject */}
      {subjectQuizzes.length === 0 ? (
        <div className="bg-[#131D2E] border border-dashed border-slate-800 rounded-2xl p-6 text-center space-y-3">
          <div
            className="w-11 h-11 rounded-2xl flex items-center justify-center mx-auto border border-white/10"
            style={{
              backgroundColor: `${subjectAccent}20`,
              color: subjectAccent,
            }}
          >
            <ClipboardList className="w-5 h-5" />
          </div>
          <div className="space-y-1 max-w-md mx-auto">
            <h4 className="text-xs sm:text-sm font-black text-white">
              لا توجد اختبارات مخصصة محفوظة في مادة {subject.name} بعد
            </h4>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              اضغط على «إنشاء اختبار عشوائي للمادة» لتختار الأقسام والمحاضرات والشامل التي تريد دمجها، وتسمي اختبارك الخاص في {subject.name}.
            </p>
          </div>
          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black cursor-pointer transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>إنشاء أول اختبار في {subject.name}</span>
          </button>
        </div>
      ) : (
        <div className="space-y-2.5">
          <div className="flex items-center justify-between px-1">
            <h4 className="text-xs sm:text-sm font-black text-white flex items-center gap-1.5">
              <ClipboardList className="w-4 h-4 text-emerald-400" />
              <span>
                اختباراتي في مادة {subject.name} ({subjectQuizzes.length})
              </span>
            </h4>
            <span className="text-[10px] text-slate-400 font-semibold">
              محفوظة لحسابك في هذه المادة
            </span>
          </div>

          <div className="grid grid-cols-1 gap-2.5">
            {subjectQuizzes.map((quiz) => {
              const resolvedQs = resolveCustomQuizQuestions(
                quiz,
                questions,
                subjects,
                {
                  solvedQuestions,
                  wrongQuestionIds,
                  savedQuestionIds,
                }
              );
              const stats = computeQuestionStats(resolvedQs, solvedQuestions);
              const pct =
                stats.totalQuestions > 0
                  ? Math.round((stats.solvedCount / stats.totalQuestions) * 100)
                  : 0;

              const quizCats =
                quiz.categories && quiz.categories.length > 0
                  ? quiz.categories
                  : ALL_CATEGORIES;

              const selectedChapterNames = (subject.chapters || [])
                .filter((c) => quiz.chapterIds.includes(c.id))
                .map((c) => c.name);

              return (
                <div
                  key={quiz.id}
                  className="bg-[#131D2E] hover:bg-[#162238] border border-slate-800 hover:border-emerald-500/40 rounded-2xl p-3.5 sm:p-4 transition-all shadow-md space-y-3"
                >
                  {/* Top Row: Title + Actions */}
                  <div className="flex items-start justify-between gap-2.5">
                    <div className="flex items-start gap-2.5 min-w-0 flex-1">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border border-white/10"
                        style={{
                          backgroundColor: `${subjectAccent}20`,
                          color: subjectAccent,
                        }}
                      >
                        <SubjectMedicalIcon
                          subject={subject}
                          className="w-5 h-5"
                        />
                      </div>

                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h5 className="font-black text-xs sm:text-sm text-white truncate">
                            {quiz.title}
                          </h5>
                          <span className="text-[11px] font-black text-emerald-400 tabular-nums">
                            ({resolvedQs.length} سؤال)
                          </span>
                        </div>

                        {quiz.description && (
                          <p className="text-[11px] text-slate-400 line-clamp-1">
                            {quiz.description}
                          </p>
                        )}

                        {/* Clean unboxed metadata showing selected sources inside the subject */}
                        <div className="flex items-center gap-1.5 flex-wrap text-[10px] sm:text-[11px] text-slate-400">
                          <span className="font-bold text-slate-300">
                            التنوع:
                          </span>
                          <span>
                            {quizCats
                              .map((c) => CATEGORY_META[c].label)
                              .join(' + ')}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span>
                            {selectedChapterNames.length === 0
                              ? 'كامل أجزاء التصنيف'
                              : selectedChapterNames.slice(0, 3).join('، ') +
                                (selectedChapterNames.length > 3
                                  ? ` (+${selectedChapterNames.length - 3})`
                                  : '')}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span>{sourceFilterLabels[quiz.sourceFilter]}</span>
                          {quiz.timeLimitMinutes ? (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="text-amber-300 font-bold">
                                {quiz.timeLimitMinutes} دقيقة
                              </span>
                            </>
                          ) : null}
                        </div>
                      </div>
                    </div>

                    {/* Edit / Reset / Delete buttons */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => openEditModal(quiz)}
                        className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                        title="تعديل إعدادات الاختبار"
                        aria-label={`تعديل الاختبار ${quiz.title}`}
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>

                      {stats.solvedCount > 0 && (
                        <button
                          type="button"
                          onClick={() =>
                            onConfirmAction({
                              title: 'تصفير إجابات الاختبار المخصص',
                              message:
                                'هل تريد تصفير إجابات أسئلة هذا الاختبار والبدء بحله من جديد؟',
                              itemName: quiz.title,
                              confirmLabel: 'نعم، تصفير الإجابات',
                              onConfirm: () =>
                                resetQuestionsBatch(resolvedQs.map((q) => q.id)),
                            })
                          }
                          className="p-2 rounded-xl bg-slate-800/80 hover:bg-amber-500/20 text-slate-300 hover:text-amber-300 transition-colors cursor-pointer"
                          title="تصفير إجابات هذا الاختبار"
                          aria-label={`تصفير إجابات ${quiz.title}`}
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() =>
                          onConfirmAction({
                            title: 'حذف الاختبار المخصص',
                            message:
                              'هل أنت متأكد من حذف هذا الاختبار المخصص من قائمة اختبارات المادة؟',
                            itemName: quiz.title,
                            confirmLabel: 'حذف الاختبار',
                            onConfirm: () => deleteStudentCustomQuiz(quiz.id),
                          })
                        }
                        className="p-2 rounded-xl bg-slate-800/80 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
                        title="حذف الاختبار"
                        aria-label={`حذف الاختبار ${quiz.title}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Progress & Stats Bar */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] font-bold tabular-nums">
                      <div className="flex items-center gap-3">
                        <span className="text-slate-300">
                          المحلول: {stats.solvedCount}/{stats.totalQuestions}
                        </span>
                        <span className="text-emerald-400">
                          صح: {stats.correctCount}
                        </span>
                        <span className="text-rose-400">
                          خطأ: {stats.wrongCount}
                        </span>
                      </div>
                      <span className="text-sky-400">{pct}% مكتمل</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        style={{ width: `${pct}%` }}
                        className="h-full bg-gradient-to-l from-emerald-500 to-sky-500 transition-all duration-300"
                      />
                    </div>
                  </div>

                  {/* Launch Action Row */}
                  <div className="flex items-center justify-between gap-2 pt-0.5">
                    <span className="text-[10px] text-slate-500 font-semibold">
                      تاريخ الإنشاء: {quiz.createdAt}
                    </span>

                    <button
                      type="button"
                      onClick={() => onLaunchQuiz(quiz, resolvedQs)}
                      disabled={resolvedQs.length === 0}
                      className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-black text-xs flex items-center gap-1.5 shadow-md shadow-emerald-600/20 cursor-pointer transition-all"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>
                        {stats.solvedCount > 0 &&
                        stats.solvedCount < stats.totalQuestions
                          ? 'متابعة حل الاختبار'
                          : stats.solvedCount === stats.totalQuestions &&
                            stats.totalQuestions > 0
                          ? 'مراجعة الاختبار'
                          : 'بدء حل الاختبار'}
                      </span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Subject-Scoped Custom Quiz Builder Modal */}
      {isBuilderOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
          onClick={() => setIsBuilderOpen(false)}
        >
          <div
            className="bg-[#0F172A] border border-slate-800 rounded-3xl w-full max-w-xl p-4 sm:p-6 space-y-4 shadow-2xl my-auto max-h-[92dvh] overflow-y-auto text-right"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center border border-white/10 shrink-0"
                  style={{
                    backgroundColor: `${subjectAccent}20`,
                    color: subjectAccent,
                  }}
                >
                  <SubjectMedicalIcon subject={subject} className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black text-white">
                    {editingQuizId
                      ? `تعديل اختبار في مادة ${subject.name}`
                      : `إنشاء اختبار عشوائي مخصص — ${subject.name}`}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    سمِّ اختبارك، وحدد من أين تريده داخل {subject.name} (أقسام، محاضرات، شامل وجزئي)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsBuilderOpen(false)}
                className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
                aria-label="إغلاق نافذة صنع الاختبار"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {validationError && (
              <div className="p-3 rounded-2xl bg-rose-500/15 border border-rose-500/40 text-rose-200 text-xs font-bold">
                {validationError}
              </div>
            )}

            {/* Step 1: Quiz Name & Optional Description */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="block text-xs font-black text-slate-200">
                  1. اسم الاختبار في {subject.name}{' '}
                  <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  value={quizTitle}
                  onChange={(e) => {
                    setQuizTitle(e.target.value);
                    setValidationError(null);
                  }}
                  placeholder={`مثلاً: مراجعة ${subject.name} (محاضرات + شامل)...`}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 focus:border-emerald-500 text-xs sm:text-sm text-white placeholder:text-slate-500 focus:outline-hidden"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-black text-slate-200">
                  وصف أو ملاحظة للاختبار (اختياري)
                </label>
                <input
                  type="text"
                  value={quizDescription}
                  onChange={(e) => setQuizDescription(e.target.value)}
                  placeholder="مثلاً: تركيز على المحاضرات الأولى وأسئلة الشامل..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 focus:border-emerald-500 text-xs sm:text-sm text-white placeholder:text-slate-500 focus:outline-hidden"
                />
              </div>
            </div>

            {/* Step 2: Diversify Sources within the Subject (الأقسام + المحاضرات + الشامل وجزئي) */}
            <div className="space-y-2.5 pt-2 border-t border-slate-800/80">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <label className="text-xs font-black text-slate-200 flex items-center gap-1.5">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-emerald-400" />
                  <span>
                    2. من أين تريد الاختبار داخل {subject.name}؟ (نوّع كما تشاء)
                  </span>
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCategories(ALL_CATEGORIES);
                    setSelectedChapterIds([]);
                  }}
                  className="text-[11px] font-bold text-emerald-400 hover:underline cursor-pointer"
                >
                  شمول كامل المادة (أقسام + محاضرات + شامل)
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {ALL_CATEGORIES.map((cat) => {
                  const isCatSelected = selectedCategories.includes(cat);
                  const st = categoryStats[cat];
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => toggleCategory(cat)}
                      className={`p-2.5 rounded-2xl border text-right flex flex-col justify-between gap-1.5 transition-all cursor-pointer ${
                        isCatSelected
                          ? 'bg-emerald-950/30 border-emerald-500 text-white ring-1 ring-emerald-500/40'
                          : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1 w-full">
                        <span className="text-xs font-black truncate">
                          {CATEGORY_META[cat].label}
                        </span>
                        <span
                          className={`w-4 h-4 rounded-md flex items-center justify-center shrink-0 ${
                            isCatSelected
                              ? 'bg-emerald-500 text-slate-950'
                              : 'border border-slate-600'
                          }`}
                        >
                          {isCatSelected && <Check className="w-3 h-3" />}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 tabular-nums">
                        {st.chaptersCount} جزء · {st.questionsCount} سؤال
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Step 3: Select Specific Sections, Lectures, or Comprehensive Exams inside this Subject */}
            <div className="space-y-2.5 pt-2 border-t border-slate-800/80">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label className="text-xs font-black text-slate-200 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-sky-400" />
                  <span>
                    3. تخصيص محاضرات أو أقسام أو شامل محدد (
                    {selectedChapterIds.length === 0
                      ? 'الكل مشمول تلقائياً'
                      : `${selectedChapterIds.length} محدد`}
                    )
                  </span>
                </label>

                {subjectChapters.length > 0 && (
                  <div className="flex items-center gap-2 text-[11px] font-bold">
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedChapterIds(subjectChapters.map((c) => c.id))
                      }
                      className="text-emerald-400 hover:underline cursor-pointer"
                    >
                      تحديد الكل
                    </button>
                    <span className="text-slate-600">·</span>
                    <button
                      type="button"
                      onClick={() => setSelectedChapterIds([])}
                      className="text-slate-400 hover:text-white cursor-pointer"
                    >
                      إلغاء التخصيص (شمول الكل)
                    </button>
                  </div>
                )}
              </div>

              {/* Filter Tabs inside Builder: الكل | الأقسام | المحاضرات | الشامل وجزئي */}
              <div className="grid grid-cols-4 gap-1 p-1 bg-slate-900 rounded-xl border border-slate-800 text-[11px] font-bold tabular-nums">
                {(
                  [
                    { id: 'all', label: 'الكل', count: subjectChapters.length },
                    {
                      id: 'section',
                      label: 'الأقسام',
                      count: categoryStats.section.chaptersCount,
                    },
                    {
                      id: 'lecture',
                      label: 'المحاضرات',
                      count: categoryStats.lecture.chaptersCount,
                    },
                    {
                      id: 'comprehensive_partial',
                      label: 'شامل وجزئي',
                      count: categoryStats.comprehensive_partial.chaptersCount,
                    },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setChapterBrowseTab(tab.id)}
                    className={`py-1.5 px-1 rounded-lg text-center transition-colors cursor-pointer truncate ${
                      chapterBrowseTab === tab.id
                        ? 'bg-sky-600 text-white'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {tab.label} ({tab.count})
                  </button>
                ))}
              </div>

              {displayedBuilderChapters.length === 0 ? (
                <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 text-center space-y-1.5">
                  <p className="text-xs text-slate-300 font-bold">
                    لا توجد أجزاء مضافة في هذا التصنيف حالياً داخل {subject.name}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    سيقوم الاختبار بسحب الأسئلة تلقائياً من التصنيفات المفعّلة أعلاه بمجرد توفرها في المادة.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {chapterBrowseTab !== 'all' && (
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() =>
                          selectAllChaptersInCategory(chapterBrowseTab)
                        }
                        className="text-[11px] font-bold text-sky-400 hover:underline cursor-pointer"
                      >
                        + إضافة كل {CATEGORY_META[chapterBrowseTab].label} إلى الاختبار
                      </button>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-44 overflow-y-auto p-1">
                    {displayedBuilderChapters.map((ch) => {
                      const isChecked = selectedChapterIds.includes(ch.id);
                      return (
                        <button
                          key={ch.id}
                          type="button"
                          onClick={() =>
                            toggleChapterSelection(ch.id, ch.category)
                          }
                          className={`p-2.5 rounded-xl border text-right flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                            isChecked
                              ? 'bg-emerald-950/30 border-emerald-500 text-white'
                              : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:border-slate-700'
                          }`}
                        >
                          <div className="min-w-0 flex-1 space-y-0.5">
                            <p className="text-xs font-bold truncate">
                              {ch.name}
                            </p>
                            <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                              <span className="text-emerald-400 font-bold">
                                {CATEGORY_META[ch.category].shortLabel}
                              </span>
                              <span aria-hidden="true">·</span>
                              <span className="tabular-nums">
                                {ch.questionCount} سؤال
                              </span>
                            </div>
                          </div>
                          <span
                            className={`w-4 h-4 rounded-md flex items-center justify-center shrink-0 ${
                              isChecked
                                ? 'bg-sky-500 text-slate-950'
                                : 'border border-slate-600'
                            }`}
                          >
                            {isChecked && <Check className="w-3 h-3" />}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Step 4: Question Count & Source Filter */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-800/80">
              {/* Question Count */}
              <div className="space-y-1.5">
                <label className="block text-xs font-black text-slate-200">
                  4. عدد أسئلة الاختبار العشوائي
                </label>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {([5, 10, 15, 20, 30, 50, 'all'] as const).map((lim) => {
                    const isSelected =
                      !customLimitInput.trim() && questionLimit === lim;
                    return (
                      <button
                        key={String(lim)}
                        type="button"
                        onClick={() => {
                          setQuestionLimit(lim);
                          setCustomLimitInput('');
                        }}
                        className={`px-2.5 py-1.5 rounded-xl text-xs font-black border transition-colors cursor-pointer tabular-nums ${
                          isSelected
                            ? 'bg-emerald-600 border-emerald-400 text-white'
                            : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                        }`}
                      >
                        {lim === 'all' ? 'الكل' : lim}
                      </button>
                    );
                  })}
                  <input
                    type="number"
                    min={1}
                    max={500}
                    value={customLimitInput}
                    onChange={(e) => setCustomLimitInput(e.target.value)}
                    placeholder="عدد مخصص..."
                    className="w-24 px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs font-bold text-white placeholder:text-slate-500 focus:outline-hidden tabular-nums"
                  />
                </div>
              </div>

              {/* Source Filter */}
              <div className="space-y-1.5">
                <label className="block text-xs font-black text-slate-200">
                  5. فلترة الأسئلة المختارة
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {(
                    [
                      { id: 'all', label: 'جميع الأسئلة' },
                      { id: 'unsolved', label: 'غير المحلولة' },
                      { id: 'wrong', label: 'الأخطاء فقط' },
                      { id: 'saved', label: 'المحفوظات فقط' },
                    ] as const
                  ).map((src) => (
                    <button
                      key={src.id}
                      type="button"
                      onClick={() => setSourceFilter(src.id)}
                      className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold border transition-colors cursor-pointer ${
                        sourceFilter === src.id
                          ? 'bg-sky-600 border-sky-400 text-white'
                          : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      {src.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Shuffle & Optional Timer */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800/80">
              <button
                type="button"
                onClick={() => setShuffleQuestions((prev) => !prev)}
                className={`px-3 py-2 rounded-xl border text-xs font-bold flex items-center gap-2 cursor-pointer transition-colors ${
                  shuffleQuestions
                    ? 'bg-purple-500/20 border-purple-500/50 text-purple-300'
                    : 'bg-slate-900 border-slate-800 text-slate-400'
                }`}
              >
                <Shuffle className="w-4 h-4" />
                <span>خلط الأسئلة عشوائياً</span>
                {shuffleQuestions && <Check className="w-3.5 h-3.5" />}
              </button>

              <div className="flex items-center gap-2">
                <Timer className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-bold text-slate-300">
                  مؤقت زمني (دقائق):
                </span>
                <input
                  type="number"
                  min={0}
                  max={240}
                  value={timeLimitMinutes || ''}
                  onChange={(e) =>
                    setTimeLimitMinutes(
                      Math.max(0, parseInt(e.target.value || '0', 10))
                    )
                  }
                  placeholder="بدون"
                  className="w-20 px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs font-bold text-white text-center tabular-nums focus:outline-hidden"
                />
              </div>
            </div>

            {/* Footer: Live Match Summary + Save & Start Buttons */}
            <div className="pt-3 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs">
                <HelpCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="text-slate-300 font-bold">
                  الأسئلة المطابقة في {subject.name}:{' '}
                  <strong className="text-emerald-400 font-black tabular-nums">
                    {finalPreviewCount}
                  </strong>{' '}
                  سؤال (من أصل {previewMatchedQuestions.length} متاح)
                </span>
              </div>

              <div className="flex items-center gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => handleSaveQuiz(false)}
                  className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs cursor-pointer transition-colors"
                >
                  حفظ في اختباراتي
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveQuiz(true)}
                  className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-600/25 cursor-pointer transition-all"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>حفظ وبدء الاختبار الآن</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

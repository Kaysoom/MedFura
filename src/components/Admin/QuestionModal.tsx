import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { X, HelpCircle, Plus, Trash2 } from 'lucide-react';
import { QuestionItem, OPTION_LABELS, getQuestionOptions } from '../../types';
import { InAppSelect } from '../Common/InAppSelect';

interface QuestionModalProps {
  isOpen: boolean;
  onClose: () => void;
  subjectId: string;
  questionToEdit?: QuestionItem | null;
  chapters?: string[];
  defaultChapterName?: string;
}

export const QuestionModal: React.FC<QuestionModalProps> = ({
  isOpen,
  onClose,
  subjectId,
  questionToEdit,
  chapters = ['الفصل الأول: المفاهيم الأساسية'],
  defaultChapterName,
}) => {
  const { addQuestion, updateQuestion, user, subjects } = useApp();

  const [questionText, setQuestionText] = useState('');
  const [optionsList, setOptionsList] = useState<string[]>(['', '', '', '']);
  const [correctIndex, setCorrectIndex] = useState<number>(0);
  const [chapter, setChapter] = useState(defaultChapterName || chapters[0] || 'عام');
  const [explanation, setExplanation] = useState('');
  const [examSession, setExamSession] = useState('');
  const [sequenceNumber, setSequenceNumber] = useState<string>('');

  useEffect(() => {
    if (questionToEdit) {
      setQuestionText(questionToEdit.questionText);
      const existingOpts = getQuestionOptions(questionToEdit).map((o) => o.text);
      while (existingOpts.length < 4) {
        existingOpts.push('');
      }
      setOptionsList(existingOpts);
      setCorrectIndex(
        questionToEdit.correctOptionIndex < existingOpts.length
          ? questionToEdit.correctOptionIndex
          : 0
      );
      setChapter(
        questionToEdit.chapterName ||
          questionToEdit.chapterId ||
          defaultChapterName ||
          chapters[0] ||
          'عام'
      );
      setExplanation(questionToEdit.explanation || '');
      setExamSession(questionToEdit.year || '');
      setSequenceNumber(
        questionToEdit.sequenceNumber !== undefined
          ? String(questionToEdit.sequenceNumber)
          : ''
      );
    } else {
      setQuestionText('');
      setOptionsList(['', '', '', '']);
      setCorrectIndex(0);
      setChapter(defaultChapterName || chapters[0] || 'عام');
      setExplanation('');
      setExamSession('');
      setSequenceNumber('');
    }
  }, [questionToEdit, isOpen, chapters, defaultChapterName]);

  if (!isOpen) return null;

  const handleOptionChange = (idx: number, val: string) => {
    setOptionsList((prev) => prev.map((item, i) => (i === idx ? val : item)));
  };

  const handleAddExtraOption = () => {
    if (optionsList.length >= 8) return;
    setOptionsList((prev) => [...prev, '']);
  };

  const handleRemoveExtraOption = (idx: number) => {
    if (optionsList.length <= 4) return;
    setOptionsList((prev) => {
      const next = prev.filter((_, i) => i !== idx);
      if (correctIndex >= next.length) {
        setCorrectIndex(0);
      } else if (correctIndex > idx) {
        setCorrectIndex((c) => Math.max(0, c - 1));
      }
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!questionText.trim() || !optionsList[0]?.trim() || !optionsList[1]?.trim()) return;

    const targetSubject = subjects.find((s) => s.id === subjectId);
    const matchedChapterObj = targetSubject?.chapters?.find(
      (c) => c.name === chapter || c.id === chapter
    );
    const resolvedChapterId = matchedChapterObj?.id || chapter;
    const resolvedChapterName = matchedChapterObj?.name || chapter;

    const trimmedSession = examSession.trim();
    const parsedSeq = sequenceNumber.trim() ? parseInt(sequenceNumber.trim(), 10) : undefined;

    const cleanedOptions = optionsList.map((opt, idx) => {
      const trimmed = opt.trim();
      if (trimmed) return trimmed;
      if (idx === 2) return 'لا شيء مما سبق';
      if (idx === 3) return 'جميع ما سبق صحيح';
      return '';
    }).filter((opt, idx) => idx < 4 || opt.length > 0);

    const payload: Partial<QuestionItem> = {
      questionText: questionText.trim(),
      optionA: cleanedOptions[0] || '',
      optionB: cleanedOptions[1] || '',
      optionC: cleanedOptions[2] || 'لا شيء مما سبق',
      optionD: cleanedOptions[3] || 'جميع ما سبق صحيح',
      ...(cleanedOptions[4] ? { optionE: cleanedOptions[4] } : {}),
      ...(cleanedOptions[5] ? { optionF: cleanedOptions[5] } : {}),
      ...(cleanedOptions[6] ? { optionG: cleanedOptions[6] } : {}),
      ...(cleanedOptions[7] ? { optionH: cleanedOptions[7] } : {}),
      options: cleanedOptions,
      correctOptionIndex: Math.min(correctIndex, cleanedOptions.length - 1),
      chapterId: resolvedChapterId,
      chapterName: resolvedChapterName,
      ...(explanation.trim() ? { explanation: explanation.trim() } : {}),
      ...(trimmedSession ? { year: trimmedSession } : {}),
      ...(parsedSeq && !isNaN(parsedSeq) ? { sequenceNumber: parsedSeq } : {}),
    };

    if (questionToEdit) {
      await updateQuestion(questionToEdit.id, payload);
    } else {
      await addQuestion({
        subjectId,
        chapterId: resolvedChapterId,
        chapterName: resolvedChapterName,
        ...(matchedChapterObj?.category ? { category: matchedChapterObj.category } : {}),
        ...(payload.sequenceNumber !== undefined ? { sequenceNumber: payload.sequenceNumber } : {}),
        questionText: payload.questionText!,
        optionA: payload.optionA!,
        optionB: payload.optionB!,
        optionC: payload.optionC!,
        optionD: payload.optionD!,
        ...(payload.optionE ? { optionE: payload.optionE } : {}),
        ...(payload.optionF ? { optionF: payload.optionF } : {}),
        ...(payload.optionG ? { optionG: payload.optionG } : {}),
        ...(payload.optionH ? { optionH: payload.optionH } : {}),
        options: payload.options,
        correctOptionIndex: payload.correctOptionIndex!,
        ...(payload.explanation ? { explanation: payload.explanation } : {}),
        ...(payload.year ? { year: payload.year } : {}),
        createdBy: user?.displayName || 'المشرف الأكاديمي',
      });
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in overflow-y-auto">
      <div className="relative w-full max-w-xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-6 text-right">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-700 p-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur-md flex items-center justify-center">
              <HelpCircle className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-extrabold text-lg text-white">
                {questionToEdit ? 'تعديل سؤال أتمتة' : 'إضافة سؤال أتمتة جديد'}
              </h3>
              <p className="text-xs text-blue-100">
                يدعم من 4 إلى 8 خيارات ديناميكية (A–H) مع الملاحظة العلمية والترقيم
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق نافذة السؤال"
            className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Chapter, Exam Session & Optional Sequence Number */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                القسم أو المحاضرة <span className="text-rose-500">*</span>
              </label>
              <InAppSelect
                value={chapter}
                onChange={(val) => setChapter(val)}
                size="sm"
                variant="adaptive"
                options={chapters.map((ch) => ({
                  value: ch,
                  label: ch,
                }))}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                الدورة الامتحانية <span className="text-slate-400 font-normal">(اختياري)</span>
              </label>
              <input
                type="text"
                placeholder="مثال: دورة 2024"
                value={examSession}
                onChange={(e) => setExamSession(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                رقم السؤال <span className="text-slate-400 font-normal">(تلقائي)</span>
              </label>
              <input
                type="number"
                min={1}
                placeholder="مثال: 8"
                value={sequenceNumber}
                onChange={(e) => setSequenceNumber(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-hidden tabular-nums"
              />
            </div>
          </div>

          {/* Question Text */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              نص السؤال الأتمتي <span className="text-rose-500">*</span>
            </label>
            <textarea
              required
              rows={3}
              placeholder="اكتب نص السؤال بدقة ووضوح..."
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 dark:text-white focus:outline-hidden focus:border-indigo-500"
            />
          </div>

          {/* Dynamic Options (4 to 8) */}
          <div className="space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                الخيارات ({optionsList.length} خيارات — حدد الدائرة بجانب الخيار الصحيح){' '}
                <span className="text-rose-500">*</span>
              </label>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-indigo-600 dark:text-indigo-400 font-bold">
                  الإجابة الصحيحة: الخيار {OPTION_LABELS[correctIndex]}
                </span>
                {optionsList.length < 8 && (
                  <button
                    type="button"
                    onClick={handleAddExtraOption}
                    className="px-2.5 py-1 rounded-lg bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-400 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>إضافة خيار ({OPTION_LABELS[optionsList.length]})</span>
                  </button>
                )}
              </div>
            </div>

            {optionsList.map((optVal, idx) => {
              const label = OPTION_LABELS[idx] || String.fromCharCode(65 + idx);
              return (
                <div
                  key={idx}
                  className={`flex items-center gap-2 p-2 rounded-xl border transition-all ${
                    correctIndex === idx
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-400 dark:border-emerald-700'
                      : 'bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <input
                    type="radio"
                    name="correctChoice"
                    checked={correctIndex === idx}
                    onChange={() => setCorrectIndex(idx)}
                    className="w-4 h-4 text-emerald-600 cursor-pointer"
                  />
                  <span className="font-bold text-xs w-5 text-center text-slate-500">{label}</span>
                  <input
                    type="text"
                    required={idx < 2}
                    placeholder={`الخيار ${label}...`}
                    value={optVal}
                    onChange={(e) => handleOptionChange(idx, e.target.value)}
                    className="flex-1 bg-transparent border-0 text-xs sm:text-sm font-medium text-slate-900 dark:text-white focus:outline-hidden"
                  />
                  {idx >= 4 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveExtraOption(idx)}
                      className="p-1 text-slate-400 hover:text-rose-500 cursor-pointer"
                      title="حذف الخيار الإضافي"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Explanation / Note (/n) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              ملاحظة السؤال والتعليل العلمي (/n)
            </label>
            <textarea
              rows={2}
              placeholder="اكتب التفسير العلمي للإجابة الصحيحة أو ملاحظة السؤال..."
              value={explanation}
              onChange={(e) => setExplanation(e.target.value)}
              className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-hidden focus:border-indigo-500"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-sm shadow-md transition-all cursor-pointer"
            >
              {questionToEdit ? 'حفظ تعديلات السؤال' : 'إضافة السؤال لبنك الأتمتة'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

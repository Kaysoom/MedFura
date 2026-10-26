import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  FileCode2,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Copy,
  Check,
  Plus,
  Layers,
  Hash,
  FileText,
  Trash2,
  UploadCloud,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import {
  parseBulkQuestionsText,
  convertParsedToMedFurSchema,
  SAMPLE_MEDFUR_BULK_TEXT,
  ParsedBulkQuestion,
} from '../../utils/bulkQuestionParser';
import { ChapterCategory, OPTION_LABELS } from '../../types';
import { InAppSelect } from '../Common/InAppSelect';

interface BulkImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultSubjectId?: string | null;
  defaultChapterId?: string | null;
}

export const BulkImportModal: React.FC<BulkImportModalProps> = ({
  isOpen,
  onClose,
  defaultSubjectId,
  defaultChapterId,
}) => {
  const {
    subjects,
    questions,
    addQuestionsBatch,
    addChapterToSubject,
    user,
  } = useApp();

  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
  const [selectedChapterId, setSelectedChapterId] = useState<string>('');
  const [examSession, setExamSession] = useState<string>('');
  const [startSequenceNumber, setStartSequenceNumber] = useState<number>(1);
  const [rawText, setRawText] = useState<string>('');
  const [activeViewTab, setActiveViewTab] = useState<'preview' | 'json'>('preview');

  // Interactive overrides: tempId -> chosen correctOptionIndex (when supervisor clicks an option in preview to set/fix the answer)
  const [manualCorrectOverrides, setManualCorrectOverrides] = useState<Record<string, number>>({});
  const [copiedJson, setCopiedJson] = useState(false);
  const [importSuccessCount, setImportSuccessCount] = useState<number | null>(null);

  // Quick inline new chapter creation inside modal
  const [isCreatingChapter, setIsCreatingChapter] = useState(false);
  const [newChapterName, setNewChapterName] = useState('');
  const [newChapterCategory, setNewChapterCategory] = useState<ChapterCategory>('section');
  const [uploadedFileMeta, setUploadedFileMeta] = useState<{ name: string; size: string } | null>(null);
  const bulkFileInputRef = React.useRef<HTMLInputElement | null>(null);

  const handleBulkFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.max(0, Math.floor(Math.log(Math.max(1, file.size)) / Math.log(k)));
    const formattedSize = parseFloat((file.size / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    setUploadedFileMeta({ name: file.name, size: formattedSize });

    const reader = new FileReader();
    reader.onload = () => {
      const content = String(reader.result || '');
      setRawText(content);
      setManualCorrectOverrides({});
      setImportSuccessCount(null);
    };
    reader.readAsText(file, 'utf-8');
  };

  // Initialize default subject & chapter when modal opens
  useEffect(() => {
    if (!isOpen) return;
    setImportSuccessCount(null);
    setCopiedJson(false);

    const initialSubId =
      defaultSubjectId || subjects[0]?.id || '';
    setSelectedSubjectId(initialSubId);

    const subObj = subjects.find((s) => s.id === initialSubId);
    const chList = subObj?.chapters || [];
    const initialChId =
      defaultChapterId && chList.some((c) => c.id === defaultChapterId)
        ? defaultChapterId
        : chList[0]?.id || '';
    setSelectedChapterId(initialChId);
  }, [isOpen, defaultSubjectId, defaultChapterId, subjects]);

  const currentSubject = useMemo(
    () => subjects.find((s) => s.id === selectedSubjectId) || null,
    [subjects, selectedSubjectId]
  );

  const currentChapters = useMemo(
    () => currentSubject?.chapters || [],
    [currentSubject]
  );

  const currentChapterObj = useMemo(
    () => currentChapters.find((c) => c.id === selectedChapterId) || currentChapters[0] || null,
    [currentChapters, selectedChapterId]
  );

  // Automatically compute next sequence number when subject/chapter changes
  useEffect(() => {
    if (!selectedSubjectId || !currentChapterObj) return;
    const existingInChapter = questions.filter(
      (q) =>
        q.subjectId === selectedSubjectId &&
        (q.chapterId === currentChapterObj.id || q.chapterName === currentChapterObj.name)
    );
    setStartSequenceNumber(existingInChapter.length + 1);
  }, [selectedSubjectId, currentChapterObj?.id, questions.length]);

  // Parse bulk text in real time
  const baseParseResult = useMemo(
    () => parseBulkQuestionsText(rawText, startSequenceNumber),
    [rawText, startSequenceNumber]
  );

  // If the pasted text includes a section hint (e.g., "أضف للقسم الأول"), try matching chapter automatically
  useEffect(() => {
    if (!baseParseResult.detectedSectionHint || currentChapters.length === 0) return;
    const hint = baseParseResult.detectedSectionHint.toLowerCase();
    const matched = currentChapters.find((c) => c.name.toLowerCase().includes(hint));
    if (matched && matched.id !== selectedChapterId) {
      setSelectedChapterId(matched.id);
    }
  }, [baseParseResult.detectedSectionHint, currentChapters]);

  // Merge manual supervisor clicks on options to resolve missing/multiple capital letters
  const effectiveQuestions: ParsedBulkQuestion[] = useMemo(() => {
    return baseParseResult.questions.map((q) => {
      const overrideIdx = manualCorrectOverrides[q.tempId];
      if (overrideIdx !== undefined && overrideIdx >= 0 && overrideIdx < q.options.length) {
        const updatedOptions = q.options.map((opt, idx) => ({
          ...opt,
          isMarkedCorrect: idx === overrideIdx,
          rawTag: `/${idx === overrideIdx ? opt.letter.toUpperCase() : opt.letter.toLowerCase()}`,
        }));
        const hasEnoughOptions = updatedOptions.length >= 2;
        const hasStem = q.questionText.trim().length > 0;
        return {
          ...q,
          options: updatedOptions,
          correctOptionIndex: overrideIdx,
          validationStatus: !hasStem
            ? 'missing_question_text'
            : !hasEnoughOptions
            ? 'too_few_options'
            : 'valid',
          validationMessage: undefined,
        };
      }
      return q;
    });
  }, [baseParseResult.questions, manualCorrectOverrides]);

  const validQuestionsCount = useMemo(
    () => effectiveQuestions.filter((q) => q.validationStatus === 'valid').length,
    [effectiveQuestions]
  );

  const unresolvedIssuesCount = effectiveQuestions.length - validQuestionsCount;

  // Generate structured JSON output for preview & export
  const structuredJsonString = useMemo(() => {
    const dbReadyItems = convertParsedToMedFurSchema(effectiveQuestions, {
      subjectId: selectedSubjectId || 'subject-id',
      chapterId: currentChapterObj?.id || 'chapter-id',
      chapterName: currentChapterObj?.name || 'القسم العام',
      category: currentChapterObj?.category,
      year: examSession,
      createdBy: user?.displayName || 'المشرف الأكاديمي',
    });

    const enrichedExport = dbReadyItems.map((item, idx) => {
      const pq = effectiveQuestions[idx];
      return {
        sequenceNumber: item.sequenceNumber,
        questionText: item.questionText,
        optionsCount: pq?.optionsCount || item.options?.length || 4,
        correctOptionLetter:
          pq?.correctOptionIndex !== null && pq?.correctOptionIndex !== undefined
            ? OPTION_LABELS[pq.correctOptionIndex]
            : null,
        correctOptionIndex: item.correctOptionIndex,
        options: item.options,
        optionA: item.optionA,
        optionB: item.optionB,
        optionC: item.optionC,
        optionD: item.optionD,
        ...(item.optionE ? { optionE: item.optionE } : {}),
        ...(item.optionF ? { optionF: item.optionF } : {}),
        ...(item.optionG ? { optionG: item.optionG } : {}),
        ...(item.optionH ? { optionH: item.optionH } : {}),
        explanation: item.explanation || null,
        subjectId: item.subjectId,
        chapterId: item.chapterId,
        chapterName: item.chapterName,
        ...(item.year ? { year: item.year } : {}),
      };
    });

    return JSON.stringify(enrichedExport, null, 2);
  }, [effectiveQuestions, selectedSubjectId, currentChapterObj, examSession, user]);

  if (!isOpen) return null;

  const handleSelectCorrectOptionInPreview = (tempId: string, optionIdx: number) => {
    setManualCorrectOverrides((prev) => ({
      ...prev,
      [tempId]: optionIdx,
    }));
  };

  const handleCopyJson = async () => {
    try {
      await navigator.clipboard.writeText(structuredJsonString);
      setCopiedJson(true);
      setTimeout(() => setCopiedJson(false), 2000);
    } catch {
      // fallback
    }
  };

  const handleCreateQuickChapter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSubjectId || !newChapterName.trim()) return;
    await addChapterToSubject(selectedSubjectId, newChapterName.trim(), newChapterCategory);
    setNewChapterName('');
    setIsCreatingChapter(false);
  };

  const handleBatchSave = async () => {
    if (
      !selectedSubjectId ||
      !currentChapterObj ||
      effectiveQuestions.length === 0 ||
      unresolvedIssuesCount > 0
    ) {
      return;
    }

    const itemsToInsert = convertParsedToMedFurSchema(effectiveQuestions, {
      subjectId: selectedSubjectId,
      chapterId: currentChapterObj.id,
      chapterName: currentChapterObj.name,
      category: currentChapterObj.category,
      year: examSession,
      createdBy: user?.displayName || 'المشرف الأكاديمي',
    });

    await addQuestionsBatch(itemsToInsert);
    setImportSuccessCount(itemsToInsert.length);
    setRawText('');
    setManualCorrectOverrides({});
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-2.5 sm:p-4 overflow-y-auto animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-label="محرك الاستيراد الدفعي ومحلل الرموز النصية الذكي"
    >
      <div className="bg-[#111A2E] border border-emerald-500/40 rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden text-right">
        {/* Top Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-l from-emerald-950/90 via-[#131F36] to-[#0E1628] border-b border-slate-800 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800/80 text-slate-400 hover:text-white transition-colors cursor-pointer shrink-0"
            aria-label="إغلاق نافذة الاستيراد الدفعي"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <h2 className="text-sm sm:text-lg font-black text-white flex items-center justify-end gap-2">
                <span>محرك الاستيراد الدفعي ومحلل الرموز الذكي (MedFur Parser)</span>
              </h2>
              <p className="text-[11px] sm:text-xs text-emerald-300 font-semibold">
                تحويل التكتلات النصية (حتى 10+ أسئلة بالدفعة) مع دعم 4–8 خيارات ديناميكية والترقيم التلقائي
              </p>
            </div>
            <div className="w-11 h-11 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0 shadow-lg shadow-emerald-950/50">
              <FileCode2 className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {/* Syntax Cheat-Sheet Banner */}
          <div className="p-3.5 rounded-2xl bg-[#0E1628] border border-slate-800 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => {
                  setRawText(SAMPLE_MEDFUR_BULK_TEXT);
                  setManualCorrectOverrides({});
                  setImportSuccessCount(null);
                }}
                className="px-3 py-1.5 rounded-xl bg-violet-600/20 hover:bg-violet-600/30 border border-violet-500/40 text-violet-200 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-pink-400" />
                <span>إدراج نموذج تجريبي جاهز (3 أسئلة مع 5 خيارات)</span>
              </button>

              <span className="text-xs font-black text-emerald-400">
                دليل الرموز النصية السريع (Syntax Rules):
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-[11px] font-bold">
              <div className="p-2 rounded-xl bg-[#152036] border border-slate-800 flex items-center justify-between">
                <span className="text-slate-300">نص السؤال</span>
                <code className="px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 font-mono" dir="ltr">
                  /q
                </code>
              </div>
              <div className="p-2 rounded-xl bg-[#152036] border border-slate-800 flex items-center justify-between">
                <span className="text-slate-300">الخيارات (4–8)</span>
                <code className="px-1.5 py-0.5 rounded bg-slate-700 text-slate-200 font-mono" dir="ltr">
                  /a .. /h
                </code>
              </div>
              <div className="p-2 rounded-xl bg-[#152036] border border-emerald-500/30 flex items-center justify-between">
                <span className="text-emerald-300">الجواب الصحيح</span>
                <code className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono" dir="ltr">
                  /C أو /B
                </code>
              </div>
              <div className="p-2 rounded-xl bg-[#152036] border border-slate-800 flex items-center justify-between">
                <span className="text-amber-300">ملاحظة السؤال</span>
                <code className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono" dir="ltr">
                  /n
                </code>
              </div>
              <div className="p-2 rounded-xl bg-[#152036] border border-slate-800 flex items-center justify-between col-span-2 sm:col-span-1">
                <span className="text-slate-300">فاصل الأسئلة</span>
                <code className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono" dir="ltr">
                  _______
                </code>
              </div>
            </div>
          </div>

          {/* Target Destination & Auto-Increment Numbering Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-[#152036] p-3.5 rounded-2xl border border-slate-800">
            {/* Subject Selector */}
            <div>
              <label className="block text-[11px] font-bold text-slate-300 mb-1">
                المادة الدراسية المستهدفة
              </label>
              <InAppSelect
                value={selectedSubjectId}
                onChange={(nextSubId) => {
                  setSelectedSubjectId(nextSubId);
                  const nextSub = subjects.find((s) => s.id === nextSubId);
                  setSelectedChapterId(nextSub?.chapters?.[0]?.id || '');
                }}
                size="sm"
                options={subjects.map((sub) => ({
                  value: sub.id,
                  label: sub.name,
                }))}
              />
            </div>

            {/* Chapter Selector + Quick Add */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <button
                  type="button"
                  onClick={() => setIsCreatingChapter((prev) => !prev)}
                  className="text-[10px] font-bold text-emerald-400 hover:underline flex items-center gap-0.5 cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  <span>قسم جديد</span>
                </button>
                <label className="text-[11px] font-bold text-slate-300">
                  القسم / المحاضرة
                </label>
              </div>
              <InAppSelect
                value={currentChapterObj?.id || ''}
                onChange={(val) => setSelectedChapterId(val)}
                size="sm"
                options={currentChapters.map((ch) => ({
                  value: ch.id,
                  label: ch.name,
                }))}
              />
            </div>

            {/* Starting Sequence Number */}
            <div>
              <label className="block text-[11px] font-bold text-slate-300 mb-1">
                بدء الترقيم التلقائي من الرقم
              </label>
              <div className="relative">
                <input
                  type="number"
                  min={1}
                  value={
                    baseParseResult.detectedStartNumber !== null
                      ? baseParseResult.detectedStartNumber
                      : startSequenceNumber
                  }
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    setStartSequenceNumber(isNaN(val) || val < 1 ? 1 : val);
                  }}
                  className="w-full px-3 py-2 rounded-xl bg-[#0E1628] border border-slate-700 text-xs font-black text-emerald-400 tabular-nums focus:outline-hidden text-right"
                />
                <Hash className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* Optional Exam Session */}
            <div>
              <label className="block text-[11px] font-bold text-slate-300 mb-1">
                الدورة الامتحانية (اختياري)
              </label>
              <input
                type="text"
                value={examSession}
                onChange={(e) => setExamSession(e.target.value)}
                placeholder="مثال: دورة 2024"
                className="w-full px-3 py-2 rounded-xl bg-[#0E1628] border border-slate-700 text-xs font-semibold text-white placeholder:text-slate-500 focus:outline-hidden text-right"
              />
            </div>
          </div>

          {/* Inline New Chapter Form if opened */}
          {isCreatingChapter && (
            <form
              onSubmit={handleCreateQuickChapter}
              className="p-3.5 rounded-2xl bg-[#0E1628] border border-emerald-500/40 flex flex-wrap items-center justify-end gap-2"
            >
              <button
                type="button"
                onClick={() => setIsCreatingChapter(false)}
                className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="submit"
                className="px-3.5 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-bold cursor-pointer"
              >
                إنشاء القسم الآن
              </button>
              <div className="w-36">
                <InAppSelect<ChapterCategory>
                  value={newChapterCategory}
                  onChange={(val) => setNewChapterCategory(val)}
                  size="sm"
                  inlineExpand={false}
                  options={[
                    { value: 'section', label: 'قسم' },
                    { value: 'lecture', label: 'محاضرة' },
                    { value: 'comprehensive_partial', label: 'شامل وجزئي' },
                  ]}
                />
              </div>
              <input
                type="text"
                required
                value={newChapterName}
                onChange={(e) => setNewChapterName(e.target.value)}
                placeholder="اكتب اسم القسم أو المحاضرة الجديدة..."
                className="flex-1 min-w-[200px] px-3 py-1.5 rounded-xl bg-[#152036] border border-slate-700 text-xs text-white text-right focus:outline-hidden"
              />
            </form>
          )}

          {/* Raw Pasted Text Input Area + Direct File Upload */}
          <div className="space-y-2">
            <input
              type="file"
              ref={bulkFileInputRef}
              accept=".txt,.md,.json"
              onChange={handleBulkFileUpload}
              className="hidden"
            />

            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => bulkFileInputRef.current?.click()}
                  className="px-3 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-300 text-[11px] font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <UploadCloud className="w-3.5 h-3.5" />
                  <span>رفع ملف أسئلة (.txt / .json) من الجهاز</span>
                </button>

                {uploadedFileMeta && (
                  <span className="px-2.5 py-1 rounded-lg bg-sky-500/15 border border-sky-500/30 text-sky-300 text-[11px] font-bold tabular-nums">
                    {uploadedFileMeta.name} ({uploadedFileMeta.size})
                  </span>
                )}

                {rawText.trim().length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setRawText('');
                      setUploadedFileMeta(null);
                      setManualCorrectOverrides({});
                      setImportSuccessCount(null);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-rose-500/15 text-rose-300 hover:bg-rose-500/25 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>مسح النص</span>
                  </button>
                )}
                {baseParseResult.detectedStartNumber !== null && (
                  <span className="px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[11px] font-bold">
                    تم تفعيل الترقيم التلقائي من النص بدءاً من #{baseParseResult.detectedStartNumber}
                  </span>
                )}
              </div>

              <label className="text-xs font-black text-white">
                الصق تكتل الأسئلة هنا أو ارفع ملفاً (يستخرج العدد والخيارات تلقائياً):
              </label>
            </div>

            <textarea
              rows={7}
              value={rawText}
              onChange={(e) => {
                setRawText(e.target.value);
                setImportSuccessCount(null);
              }}
              placeholder={`مثال:\nأضف للقسم الأول بدءاً من الرقم 8\n/q نص السؤال الأول...\n/a الخيار الأول\n/B الخيار الثاني (حرف كبير لأنه الجواب الصحيح)\n/c الخيار الثالث\n/d الخيار الرابع\n/e الخيار الخامس (اختياري حتى /h)\n/n ملاحظة السؤال وتوضيحه العلمي...\n_______________\n/q نص السؤال الثاني...`}
              className="w-full p-3.5 rounded-2xl bg-[#0B1220] border border-slate-700 focus:border-emerald-500 text-xs sm:text-sm font-medium text-white placeholder:text-slate-500 leading-relaxed focus:outline-hidden text-right"
            />
          </div>

          {/* Success Banner if batch was just saved */}
          {importSuccessCount !== null && (
            <div className="p-4 rounded-2xl bg-emerald-950/60 border border-emerald-500/50 flex items-center justify-between gap-3 text-emerald-200 animate-in fade-in">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black cursor-pointer shrink-0"
              >
                الانتقال لعرض الأسئلة في القسم
              </button>
              <div className="flex items-center gap-2 text-right">
                <div>
                  <span className="font-black text-sm text-emerald-300 block">
                    تم استيراد وحفظ {importSuccessCount} أسئلة بنجاح في «{currentChapterObj?.name}»!
                  </span>
                  <span className="text-xs text-emerald-200/80">
                    يمكنك لصق دفعة جديدة الآن أو إغلاق النافذة لمعاينة الأسئلة في بنك الأتمتة.
                  </span>
                </div>
                <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
              </div>
            </div>
          )}

          {/* Parsed Output Preview & JSON Tabs */}
          {effectiveQuestions.length > 0 && (
            <div className="space-y-3 pt-2 border-t border-slate-800">
              {/* Summary Status Bar + View Switcher */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 bg-[#0E1628] p-1 rounded-xl border border-slate-800">
                  <button
                    type="button"
                    onClick={() => setActiveViewTab('preview')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      activeViewTab === 'preview'
                        ? 'bg-emerald-600 text-white'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>المعاينة التفاعلية ({effectiveQuestions.length})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveViewTab('json')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      activeViewTab === 'json'
                        ? 'bg-sky-600 text-white'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <FileCode2 className="w-3.5 h-3.5" />
                    <span>مخرجات JSON المهيكلة</span>
                  </button>
                </div>

                <div className="flex items-center gap-2 text-xs font-bold tabular-nums">
                  <span className="px-2.5 py-1 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                    جاهز: {validQuestionsCount}
                  </span>
                  {unresolvedIssuesCount > 0 && (
                    <span className="px-2.5 py-1 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>يتطلب تحديد الجواب: {unresolvedIssuesCount}</span>
                    </span>
                  )}
                </div>
              </div>

              {activeViewTab === 'preview' ? (
                <div className="space-y-3">
                  {effectiveQuestions.map((pq) => {
                    const isReady = pq.validationStatus === 'valid';
                    return (
                      <div
                        key={pq.tempId}
                        className={`p-4 rounded-2xl border space-y-3 transition-all ${
                          isReady
                            ? 'bg-[#152036] border-slate-800'
                            : 'bg-amber-950/20 border-amber-500/60'
                        }`}
                      >
                        {/* Card Top Header */}
                        <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-800/80">
                          <div className="flex items-center gap-2">
                            {isReady ? (
                              <span className="px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-400 text-[11px] font-black flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>
                                  الإجابة الصحيحة: الخيار{' '}
                                  {pq.correctOptionIndex !== null
                                    ? OPTION_LABELS[pq.correctOptionIndex]
                                    : ''}
                                </span>
                              </span>
                            ) : (
                              <span className="px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 text-[11px] font-black flex items-center gap-1">
                                <AlertTriangle className="w-3.5 h-3.5" />
                                <span>ينقصه تحديد الإجابة الصحيحة</span>
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2 text-xs font-bold tabular-nums">
                            <span className="px-2 py-0.5 rounded-lg bg-slate-800 text-sky-300">
                              {pq.optionsCount} خيارات ديناميكية
                            </span>
                            <span className="px-2.5 py-1 rounded-xl bg-emerald-500/20 text-emerald-300 font-black">
                              السؤال #{pq.sequenceNumber}
                            </span>
                          </div>
                        </div>

                        {/* Validation Alert Banner with One-Click Instruction */}
                        {!isReady && pq.validationMessage && (
                          <div className="p-3 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-200 text-xs font-bold flex items-center justify-end gap-2">
                            <span>{pq.validationMessage}</span>
                            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                          </div>
                        )}

                        {/* Question Text */}
                        <p className="text-xs sm:text-sm font-bold text-white leading-relaxed">
                          {pq.questionText || (
                            <span className="text-rose-400">نص السؤال فارغ! أضف الرمز /q متبوعاً بنص السؤال.</span>
                          )}
                        </p>

                        {/* Dynamic Options Grid (1-click sets/changes correct option) */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {pq.options.map((opt, oIdx) => {
                            const isSelectedCorrect = pq.correctOptionIndex === oIdx;
                            return (
                              <button
                                key={oIdx}
                                type="button"
                                onClick={() => handleSelectCorrectOptionInPreview(pq.tempId, oIdx)}
                                className={`p-2.5 rounded-xl border text-right flex items-center justify-between gap-2 transition-all cursor-pointer ${
                                  isSelectedCorrect
                                    ? 'bg-emerald-950/60 border-emerald-500 text-emerald-200 font-bold shadow-xs'
                                    : 'bg-[#0E1628] border-slate-800 hover:border-amber-400/60 text-slate-300'
                                }`}
                                title="اضغط لتعيين هذا الخيار كإجابة صحيحة"
                              >
                                <div className="flex items-center gap-1.5 shrink-0">
                                  {isSelectedCorrect ? (
                                    <span className="px-1.5 py-0.5 rounded bg-emerald-600 text-white text-[10px] font-black">
                                      الجواب الصحيح ✓
                                    </span>
                                  ) : (
                                    <span className="text-[10px] text-slate-500 hover:text-amber-300">
                                      اضغط لتعيينه صح
                                    </span>
                                  )}
                                </div>

                                <div className="flex items-center justify-end gap-2 min-w-0 flex-1">
                                  <span className="text-xs truncate">{opt.text}</span>
                                  <span
                                    className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-black shrink-0 ${
                                      isSelectedCorrect
                                        ? 'bg-emerald-600 text-white'
                                        : 'bg-slate-800 text-slate-400'
                                    }`}
                                  >
                                    {opt.letter}
                                  </span>
                                </div>
                              </button>
                            );
                          })}
                        </div>

                        {/* Extracted Question Note (/n) */}
                        {pq.note && (
                          <div className="p-2.5 rounded-xl bg-sky-950/30 border border-sky-500/30 text-xs text-sky-200 flex items-start justify-end gap-2">
                            <div className="text-right flex-1">
                              <span className="font-black text-sky-400 block mb-0.5">
                                ملاحظة وتوضيح السؤال (/n):
                              </span>
                              <span>{pq.note}</span>
                            </div>
                            <FileText className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* Structured JSON Output View */
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={handleCopyJson}
                      className="px-3.5 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-black flex items-center gap-1.5 cursor-pointer transition-colors"
                    >
                      {copiedJson ? (
                        <>
                          <Check className="w-4 h-4" />
                          <span>تم نسخ كود JSON بنجاح ✓</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          <span>نسخ JSON المهيكل</span>
                        </>
                      )}
                    </button>
                    <span className="text-xs font-bold text-slate-400">
                      مخرجات JSON النظيفة المطابقة لقاعدة بيانات MedFur:
                    </span>
                  </div>

                  <pre
                    dir="ltr"
                    className="p-4 rounded-2xl bg-[#090F1B] border border-slate-800 text-emerald-300 text-xs font-mono overflow-x-auto max-h-80 leading-relaxed text-left"
                  >
                    {structuredJsonString}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-[#0E1628] border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={
                effectiveQuestions.length === 0 ||
                unresolvedIssuesCount > 0 ||
                !selectedSubjectId ||
                !currentChapterObj
              }
              onClick={handleBatchSave}
              className="px-5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs sm:text-sm font-black flex items-center gap-2 shadow-lg shadow-emerald-950/50 transition-all cursor-pointer"
            >
              <UploadCloud className="w-4 h-4" />
              <span>
                حفظ الدفعة في القسم ({validQuestionsCount} من {effectiveQuestions.length} سؤال)
              </span>
            </button>

            {effectiveQuestions.length > 0 && (
              <button
                type="button"
                onClick={handleCopyJson}
                className="px-3.5 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                {copiedJson ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                <span>{copiedJson ? 'تم النسخ' : 'نسخ JSON'}</span>
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-2xl bg-slate-800/80 hover:bg-slate-800 text-slate-300 text-xs font-bold cursor-pointer"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};

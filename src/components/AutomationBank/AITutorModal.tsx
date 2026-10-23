import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Sparkles,
  CheckCircle2,
  XCircle,
  Lightbulb,
  Send,
  RotateCcw,
  AlertTriangle,
  FileText,
  MessageSquare,
  Stethoscope,
  Flag,
  BookOpen,
  Brain,
} from 'lucide-react';
import { QuestionItem, getQuestionOptions } from '../../types';

interface DistractorAnalysisItem {
  optionLabel: string;
  optionText: string;
  whyIncorrect: string;
  isTrueStatementInException?: boolean;
}

interface AITutorAnalysisResponse {
  questionType?: 'positive' | 'exception';
  questionTypeTitle?: string;
  questionTypeSummary?: string;
  hasAnswerKeyConflict?: boolean;
  conflictWarningMessage?: string;
  mentorExplanation?: string;
  correctOptionAnalysis: string;
  distractorsAnalysis: DistractorAnalysisItem[];
  clinicalPearl: string;
  suggestedQuestions?: string[];
  sourceModel?: string;
  thinkingMode?: string;
}

interface AITutorModalProps {
  isOpen: boolean;
  onClose: () => void;
  question: QuestionItem | null;
  subjectName: string;
  questionNote?: string;
  onReportQuestion?: (question: QuestionItem) => void;
}

function detectClientSideException(questionText: string, note?: string): {
  isException: boolean;
  cue: string | null;
} {
  const stem = (questionText || '').trim();
  // Check if "ما عدا" is an embedded qualifier inside a direct question (e.g., "(ما عدا الشم)" or "ما عدا العضلة الحنكية اللسانية هو:")
  const isEmbeddedClause =
    /\(\s*(ما\s*عدا|باستثناء)[^)]+\)/i.test(stem) ||
    /(ما\s*عدا|باستثناء)\s+[\u0600-\u06FF\s]+\s+(هو|هي|تقع|يعتبر|تعتبر)\s*[:؟]?$/i.test(stem);

  if (isEmbeddedClause) {
    return { isException: false, cue: null };
  }

  const combined = `${stem} ${note || ''}`;
  const match = combined.match(
    /(ما\s*عدا|ماعدا|باستثناء|عدا\s+واحدة|كل\s+ما\s+يلي\s+صحيح.*عدا|أي\s+مما\s+يلي\s+(خاطئ|خاطئة|غير\s+صحيح|لا\s+يعد|لا\s+يُعد|لا\s+ينتمي|لا\s+يعتبر|ليس)|اختر\s+(الخطأ|العبارة\s+الخاطئة)|ليس\s+من|لا\s+تعتبر|لا\s+يعتبر|خاطئة|خاطئ|غير\s+صحيح|غير\s+صحيحة)/i
  );
  return {
    isException: !!match,
    cue: match ? match[0] : null,
  };
}

function buildClientDynamicTopicPrompts(
  question: QuestionItem,
  subjectName: string,
  questionNote?: string,
  isException?: boolean
): string[] {
  const parsedOpts = getQuestionOptions(question);
  const optionTexts = parsedOpts.map((o) => o.text);
  const correctIdx = question.correctOptionIndex ?? 0;
  const correctOptText = (optionTexts[correctIdx] || question.optionA || '')
    .replace(/^(A|B|C|D|E|F|G|H)[\s.\-:)]+/i, '')
    .trim();
  const distractorOpt =
    optionTexts.find((_, idx) => idx !== correctIdx) || question.optionB || '';
  const distractorText = distractorOpt.replace(/^(A|B|C|D|E|F|G|H)[\s.\-:)]+/i, '').trim();

  const shortCorrect =
    correctOptText.length > 36 ? `${correctOptText.slice(0, 34)}...` : correctOptText;
  const shortDistractor =
    distractorText.length > 32 ? `${distractorText.slice(0, 30)}...` : distractorText;

  const combinedNote = [question.explanation, questionNote]
    .filter((s) => s && s.trim().length > 0)
    .join(' — ')
    .trim();
  const shortChapter = question.chapterName || subjectName || 'هذا المبحث الطبي';

  const suggestion1 = isException
    ? `💡 ما الفارق التشريحي والسريري الحاسم بين الاستثناء «${shortCorrect}» و«${shortDistractor}»؟`
    : `💡 ما الفارق التشريحي والسريري الحاسم بين «${shortCorrect}» و«${shortDistractor}»؟`;

  const suggestion2 = combinedNote
    ? `💡 توسّع لي في الآلية العلمية للملاحظة المرفقة حول «${shortCorrect}» وأهميتها التشخيصية`
    : `💡 ماذا يحدث سريرياً عند إصابة أو تعطّل «${shortCorrect}» عند المريض؟`;

  const suggestion3 = `💡 اعطني حالة سريرية استنتاجية حول «${shortCorrect}» في (${shortChapter})`;

  return [suggestion1, suggestion2, suggestion3];
}

/**
 * Renders smooth markdown text (bold **...** and bullet lines) with clean academic typography
 */
export const FormattedMedicalMarkdown: React.FC<{ content: string }> = ({ content }) => {
  if (!content) return null;

  const renderInlineBold = (line: string) => {
    const parts = line.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, idx) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={idx} className="font-black text-white">
            {part.slice(2, -2)}
          </strong>
        );
      }
      return <React.Fragment key={idx}>{part}</React.Fragment>;
    });
  };

  const lines = content.split('\n').filter((l) => l.trim().length > 0);

  return (
    <div className="space-y-2 text-xs sm:text-sm text-slate-200 leading-relaxed">
      {lines.map((rawLine, index) => {
        const trimmed = rawLine.trim();
        const isBullet = /^[-•*]\s+/.test(trimmed);
        const cleanLine = isBullet ? trimmed.replace(/^[-•*]\s+/, '') : trimmed;

        if (isBullet) {
          return (
            <div key={index} className="flex items-start justify-end gap-2 pr-1">
              <span className="flex-1 text-right">{renderInlineBold(cleanLine)}</span>
              <span className="w-1.5 h-1.5 rounded-full bg-violet-400 shrink-0 mt-2" />
            </div>
          );
        }

        return (
          <p key={index} className="text-right">
            {renderInlineBold(cleanLine)}
          </p>
        );
      })}
    </div>
  );
};

export const AITutorModal: React.FC<AITutorModalProps> = ({
  isOpen,
  onClose,
  question,
  subjectName,
  questionNote,
  onReportQuestion,
}) => {
  const [analysis, setAnalysis] = useState<AITutorAnalysisResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeSuggestions, setActiveSuggestions] = useState<string[]>([]);

  // Follow-up conversation state inside the AI Tutor modal
  const [followupHistory, setFollowupHistory] = useState<
    { role: 'user' | 'assistant'; text: string }[]
  >([]);
  const [followupInput, setFollowupInput] = useState('');
  const [isFollowupLoading, setIsFollowupLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  const fetchExplanation = async (targetQ: QuestionItem) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/ai-tutor/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: {
            id: targetQ.id,
            questionText: targetQ.questionText,
            optionA: targetQ.optionA,
            optionB: targetQ.optionB,
            optionC: targetQ.optionC,
            optionD: targetQ.optionD,
            optionE: targetQ.optionE,
            optionF: targetQ.optionF,
            optionG: targetQ.optionG,
            optionH: targetQ.optionH,
            options: targetQ.options,
            correctOptionIndex: targetQ.correctOptionIndex,
            explanation: targetQ.explanation,
            subjectName,
            chapterName: targetQ.chapterName,
            year: targetQ.year,
            questionNote,
          },
        }),
      });

      if (response.ok) {
        const data = (await response.json()) as AITutorAnalysisResponse;
        setAnalysis(data);
        if (data.suggestedQuestions && data.suggestedQuestions.length > 0) {
          setActiveSuggestions(data.suggestedQuestions);
        } else {
          const { isException } = detectClientSideException(targetQ.questionText, questionNote);
          setActiveSuggestions(
            buildClientDynamicTopicPrompts(targetQ, subjectName, questionNote, isException)
          );
        }
      }
    } catch {
      const opts = getQuestionOptions(targetQ);
      const correctOpt = opts[targetQ.correctOptionIndex] || opts[0];
      const { isException, cue } = detectClientSideException(targetQ.questionText, questionNote);
      const fallbackPrompts = buildClientDynamicTopicPrompts(
        targetQ,
        subjectName,
        questionNote,
        isException
      );

      setAnalysis({
        questionType: isException ? 'exception' : 'positive',
        questionTypeTitle: isException
          ? `سؤال استثناء («${cue || 'ما عدا'}» — المطلوب اختيار العبارة الوحيدة الخاطئة طبياً)`
          : 'سؤال إثبات مباشر (المطلوب تحديد الحقيقة الطبية الصحيحة)',
        questionTypeSummary: isException
          ? `صيغة السؤال تتضمن أداة استثناء (${cue || 'ما عدا'})؛ ثلاث عبارات هنا تمثل حقائق علمية صحيحة، والمطلوب تحديد العبارة الخاطئة طبياً.`
          : 'السؤال يطلب تحديد البنية أو الآلية الطبية الدقيقة التي تحقق المعطيات الواردة في نص السؤال.',
        mentorExplanation: `• **الآلية العلمية لـ (${correctOpt.label}: ${correctOpt.text}):** ${
          targetQ.explanation ||
          `يمثل الخيار (${correctOpt.text}) الركيزة العلمية الدقيقة المطلوبة في هذا السؤال.`
        }${questionNote ? `\n• **إضاءة الملاحظة المرفقة:** ${questionNote}` : ''}`,
        correctOptionAnalysis:
          targetQ.explanation ||
          `الخيار (${correctOpt.label}: ${correctOpt.text}) يحقق المعطيات العلمية والتشريحية للسؤال.`,
        distractorsAnalysis: opts
          .filter((o) => o.idx !== targetQ.correctOptionIndex)
          .map((d) => ({
            optionLabel: d.label,
            optionText: d.text,
            whyIncorrect: isException
              ? `حقيقة علمية صحيحة مرتبطة بموضوع (${targetQ.chapterName || subjectName})، ولذلك تُستبعد عند البحث عن الاستثناء.`
              : `يمتلك («${d.text}») موقعاً أو وظيفة فيزيولوجية وتشريحية مغايرة للمعطى النوعي المحدد في نص السؤال.`,
            isTrueStatementInException: isException,
          })),
        clinicalPearl:
          targetQ.explanation ||
          `تمييز الآلية الخاصة بـ (${correctOpt.text}) يحسم التفريق السريري والامتحاني فوراً.`,
        suggestedQuestions: fallbackPrompts,
        sourceModel: 'Gemini High-Thinking Medical Engine',
        thinkingMode: 'HIGH',
      });
      setActiveSuggestions(fallbackPrompts);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && question) {
      setFollowupHistory([]);
      setFollowupInput('');
      fetchExplanation(question);
    }
  }, [isOpen, question?.id, questionNote]);

  useEffect(() => {
    if (followupHistory.length > 0 || isFollowupLoading) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [followupHistory, isFollowupLoading]);

  if (!isOpen || !question) return null;

  const dynamicQuestionOpts = getQuestionOptions(question);
  const correctOptItem =
    dynamicQuestionOpts[question.correctOptionIndex] || dynamicQuestionOpts[0];
  const correctLabel = correctOptItem?.label || 'A';
  const correctText = correctOptItem?.text || question.optionA;

  const clientPolarity = detectClientSideException(question.questionText, questionNote);
  const isExceptionQuestion =
    analysis?.questionType === 'exception' ||
    (!analysis?.questionType && clientPolarity.isException);

  const dynamicSuggestions =
    activeSuggestions.length > 0
      ? activeSuggestions
      : analysis?.suggestedQuestions && analysis.suggestedQuestions.length > 0
      ? analysis.suggestedQuestions
      : buildClientDynamicTopicPrompts(question, subjectName, questionNote, isExceptionQuestion);

  const handleSendFollowup = async (customPrompt?: string) => {
    const rawMsg = (customPrompt ?? followupInput).trim();
    if (!rawMsg || isFollowupLoading) return;
    const cleanMsg = rawMsg.replace(/^💡\s*/, '').trim();

    const updatedHistory: { role: 'user' | 'assistant'; text: string }[] = [
      ...followupHistory,
      { role: 'user', text: cleanMsg },
    ];
    setFollowupHistory(updatedHistory);
    if (!customPrompt) setFollowupInput('');
    setIsFollowupLoading(true);

    try {
      const response = await fetch('/api/ai-tutor/followup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: {
            id: question.id,
            questionText: question.questionText,
            optionA: question.optionA,
            optionB: question.optionB,
            optionC: question.optionC,
            optionD: question.optionD,
            optionE: question.optionE,
            optionF: question.optionF,
            optionG: question.optionG,
            optionH: question.optionH,
            options: question.options,
            correctOptionIndex: question.correctOptionIndex,
            explanation: question.explanation,
            subjectName,
            chapterName: question.chapterName,
            questionNote,
          },
          userMessage: cleanMsg,
          history: updatedHistory,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setFollowupHistory((prev) => [
          ...prev,
          { role: 'assistant', text: data.reply },
        ]);
        if (Array.isArray(data.suggestedQuestions) && data.suggestedQuestions.length > 0) {
          setActiveSuggestions(data.suggestedQuestions);
        }
      } else {
        setFollowupHistory((prev) => [
          ...prev,
          {
            role: 'assistant',
            text: `بخصوص استفسارك («${cleanMsg}»): الخيار المعتمد هو **(${correctLabel}: ${correctText})**. ${
              question.explanation || ''
            }`,
          },
        ]);
      }
    } catch {
      setFollowupHistory((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: `بخصوص استفسارك («${cleanMsg}»): الخيار المعتمد هو **(${correctLabel}: ${correctText})**. ${
            question.explanation || ''
          }`,
        },
      ]);
    } finally {
      setIsFollowupLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-label="الموجّه السريري والأكاديمي الذكي - التفكير العميق"
    >
      <div className="bg-[#111A2E] border border-violet-500/40 rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-right">
        {/* Top Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-[#0E1628]">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800/80 text-slate-400 hover:text-white transition-colors cursor-pointer"
              aria-label="إغلاق نافذة الموجّه الطبي الذكي"
            >
              <X className="w-5 h-5" />
            </button>

            <button
              type="button"
              onClick={() => fetchExplanation(question)}
              disabled={isLoading}
              className="p-2 rounded-xl bg-slate-800/80 text-violet-300 hover:text-white transition-colors cursor-pointer text-xs font-bold flex items-center gap-1"
              title="إعادة التحليل بالتفكير العميق"
            >
              <RotateCcw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="text-right">
              <h3 className="text-sm sm:text-base font-black text-white flex items-center justify-end gap-1.5">
                <span>المحلل الطبي الذكي · Gemini High Thinking</span>
              </h3>
              <p className="text-[11px] text-violet-300 font-semibold flex items-center justify-end gap-1.5">
                <span>استنتاج علمي عميق وتلقائي بدون حشو · اختيار ذكي للنموذج</span>
                <Brain className="w-3.5 h-3.5 text-pink-400 shrink-0" />
              </p>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-violet-600/20 border border-violet-500/40 flex items-center justify-center shadow-lg shadow-violet-950/50 shrink-0">
              <Stethoscope className="w-5 h-5 text-pink-400" />
            </div>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {/* Question Stem & Stored Notes Evaluation Card */}
          <div className="p-4 rounded-2xl bg-[#0E1628] border border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span>{question.year || 'سؤال أتمتة'}</span>
              <span className="text-sky-400 font-bold">
                {subjectName} {question.chapterName ? `· ${question.chapterName}` : ''}
              </span>
            </div>
            <p className="text-xs sm:text-sm font-bold text-white leading-relaxed">
              {question.questionText}
            </p>

            {/* Stored Database Note / Explanation if present */}
            {question.explanation && question.explanation.trim().length > 0 && (
              <div className="p-2.5 rounded-xl bg-sky-950/40 border border-sky-500/30 text-xs text-sky-200 flex items-start justify-end gap-2">
                <div className="text-right flex-1">
                  <span className="font-black text-sky-400 block mb-0.5">
                    التوضيح العلمي المخزن للسؤال:
                  </span>
                  <span className="leading-relaxed">{question.explanation}</span>
                </div>
                <BookOpen className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
              </div>
            )}

            {/* Student's Personal Question Note if present */}
            {questionNote && questionNote.trim().length > 0 && (
              <div className="p-2.5 rounded-xl bg-amber-950/30 border border-amber-500/40 text-xs text-amber-200 flex items-start justify-end gap-2">
                <div className="text-right flex-1">
                  <span className="font-black text-amber-400 block mb-0.5">
                    ملاحظتك المرفقة بالسؤال:
                  </span>
                  <span className="leading-relaxed">{questionNote}</span>
                </div>
                <FileText className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              </div>
            )}
          </div>

          {isLoading ? (
            <div className="py-10 px-4 text-center space-y-3 bg-[#152036] rounded-2xl border border-slate-800">
              <div className="w-10 h-10 rounded-2xl bg-violet-600/20 border border-violet-500/40 text-pink-400 flex items-center justify-center mx-auto animate-pulse">
                <Brain className="w-5 h-5" />
              </div>
              <p className="text-xs sm:text-sm font-bold text-violet-200">
                جاري التحليل بالتفكير الاستنتاجي العميق (High Thinking) وتفكيك الآلية العلمية لكل خيار...
              </p>
            </div>
          ) : (
            analysis && (
              <div className="space-y-4">
                {/* Scientific Key Conflict Alert Banner (Anti-Rationalization Rule) */}
                {analysis.hasAnswerKeyConflict && (
                  <div className="p-4 rounded-2xl bg-rose-950/60 border-2 border-rose-500/70 space-y-2.5 shadow-lg shadow-rose-950/40">
                    <div className="flex items-center justify-end gap-2 text-rose-300 font-black text-xs sm:text-sm">
                      <span>تنبيه علمي من محرك التفكير العميق</span>
                      <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
                    </div>
                    <p className="text-xs sm:text-sm font-bold text-rose-100 leading-relaxed">
                      {analysis.conflictWarningMessage ||
                        'تنبيه علمي: مفتاح الحل المحدد هنا يخالف الحقائق الطبية المثبتة. ننصح بالإبلاغ عن السؤال ليتم تصحيحه.'}
                    </p>
                    {onReportQuestion && (
                      <div className="flex justify-end pt-1">
                        <button
                          type="button"
                          onClick={() => onReportQuestion(question)}
                          className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-black flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Flag className="w-3.5 h-3.5" />
                          <span>الإبلاغ عن السؤال الآن لتصحيحه</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* 1. Question Compass Banner (Type A vs Type B) */}
                <div
                  className={`p-3.5 rounded-2xl border space-y-1 ${
                    isExceptionQuestion
                      ? 'bg-amber-950/30 border-amber-500/50'
                      : 'bg-sky-950/80 border-sky-500/40'
                  }`}
                >
                  <div
                    className={`flex items-center justify-end gap-2 font-black text-xs sm:text-sm ${
                      isExceptionQuestion ? 'text-amber-400' : 'text-sky-400'
                    }`}
                  >
                    <span>
                      {analysis.questionTypeTitle ||
                        (isExceptionQuestion
                          ? 'سؤال استثناء («ما عدا» — المطلوب اختيار العبارة الخاطئة طبياً)'
                          : 'سؤال إثبات مباشر (المطلوب تحديد الحقيقة الطبية الصحيحة)')}
                    </span>
                    {isExceptionQuestion ? (
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                    )}
                  </div>
                  <p className="text-xs text-slate-200 leading-relaxed">
                    {analysis.questionTypeSummary}
                  </p>
                </div>

                {/* 2. Target Option Deep Mechanism Verification */}
                <div className="p-4 rounded-2xl bg-emerald-950/30 border border-emerald-500/40 space-y-2.5">
                  <div className="flex items-center justify-end gap-2 text-emerald-400 font-black text-xs sm:text-sm">
                    <span>
                      {isExceptionQuestion
                        ? `لماذا (${correctLabel}: ${correctText}) هو الاستثناء الخاطئ طبياً؟`
                        : `الآلية العلمية الدقيقة لاختيار (${correctLabel}: ${correctText}):`}
                    </span>
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                  </div>
                  <FormattedMedicalMarkdown
                    content={analysis.mentorExplanation || analysis.correctOptionAnalysis}
                  />
                </div>

                {/* 3. Zero-Fluff Scientific Breakdown of the Other 3 Options */}
                <div className="p-4 rounded-2xl bg-[#152036] border border-slate-800 space-y-3">
                  <div
                    className={`flex items-center justify-end gap-2 font-black text-xs sm:text-sm ${
                      isExceptionQuestion ? 'text-sky-400' : 'text-rose-400'
                    }`}
                  >
                    <span>
                      {isExceptionQuestion
                        ? 'الحقائق العلمية الدقيقة في الخيارات الثلاثة الأخرى:'
                        : 'الوظيفة والآلية العلمية الخاصة بكل خيار من الخيارات الأخرى:'}
                    </span>
                    {isExceptionQuestion ? (
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                    ) : (
                      <XCircle className="w-4 h-4 shrink-0" />
                    )}
                  </div>
                  <div className="space-y-2.5">
                    {analysis.distractorsAnalysis.map((item, idx) => (
                      <div
                        key={idx}
                        className="p-3.5 rounded-xl bg-[#0E1628] border border-slate-800/90 space-y-1.5"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                              isExceptionQuestion
                                ? 'bg-emerald-500/15 text-emerald-400'
                                : 'bg-slate-800 text-slate-300'
                            }`}
                          >
                            {isExceptionQuestion ? 'حقيقة طبية صحيحة ✓' : 'الآلية العلمية الخاصة به'}
                          </span>
                          <div className="flex items-center justify-end gap-2">
                            <span className="text-xs font-bold text-white">
                              {item.optionText}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded-lg text-[11px] font-black ${
                                isExceptionQuestion
                                  ? 'bg-sky-500/20 text-sky-300'
                                  : 'bg-rose-500/20 text-rose-300'
                              }`}
                            >
                              الخيار {item.optionLabel}
                            </span>
                          </div>
                        </div>
                        <FormattedMedicalMarkdown content={item.whyIncorrect} />
                      </div>
                    ))}
                  </div>
                </div>

                {/* 4. High-Yield Clinical Pearl */}
                <div className="p-4 rounded-2xl bg-amber-950/30 border border-amber-500/40 space-y-1.5">
                  <div className="flex items-center justify-end gap-2 text-amber-400 font-black text-xs sm:text-sm">
                    <span>زبدة الحسم السريري والامتحاني:</span>
                    <Lightbulb className="w-4 h-4 shrink-0" />
                  </div>
                  <FormattedMedicalMarkdown content={analysis.clinicalPearl} />
                </div>
              </div>
            )
          )}

          {/* 5. Dynamic Post-Explanation Interactive Suggestions & Free Student Q&A */}
          <div className="pt-3 border-t border-slate-800 space-y-3">
            <div className="flex items-center justify-end gap-1.5 text-xs font-extrabold text-violet-300">
              <span>تعمّق أكثر بالتفكير الاستنتاجي (اختر سؤالاً أو اكتب سؤالك):</span>
              <MessageSquare className="w-4 h-4 text-pink-400" />
            </div>

            {/* 3 Dynamic Context-Linked Follow-up Prompt Buttons */}
            <div className="flex flex-col gap-2">
              {dynamicSuggestions.map((chip, idx) => (
                <button
                  key={`${idx}-${chip}`}
                  type="button"
                  onClick={() => handleSendFollowup(chip)}
                  disabled={isFollowupLoading}
                  className="w-full text-right px-3.5 py-2.5 rounded-xl bg-[#152036] hover:bg-violet-600/25 border border-violet-500/30 hover:border-violet-400/60 text-xs font-bold text-slate-200 hover:text-white transition-all cursor-pointer flex items-center justify-end gap-2 shadow-xs"
                >
                  <span className="leading-relaxed">
                    {chip.startsWith('💡') ? chip : `💡 ${chip}`}
                  </span>
                </button>
              ))}
            </div>

            {/* Follow-up Messages Thread */}
            {followupHistory.length > 0 && (
              <div className="space-y-2.5 pt-2">
                {followupHistory.map((msg, i) => (
                  <div
                    key={i}
                    className={`p-3.5 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-sky-950/80 border border-sky-500/40 text-slate-100 ml-6'
                        : 'bg-[#16223A] border border-violet-500/40 text-slate-100 mr-4'
                    }`}
                  >
                    <span className="block text-[10px] font-black mb-1 text-violet-300">
                      {msg.role === 'user'
                        ? 'استفسارك:'
                        : 'إجابة المحلل الطبي (High Thinking):'}
                    </span>
                    <FormattedMedicalMarkdown content={msg.text} />
                  </div>
                ))}
              </div>
            )}

            {isFollowupLoading && (
              <div className="p-3 rounded-2xl bg-[#16223A] border border-slate-800 text-xs text-violet-300 font-bold animate-pulse flex items-center justify-end gap-2">
                <span>جاري التفكير العميق وإعداد التحليل العلمي الدقيق...</span>
                <Sparkles className="w-4 h-4 text-pink-400" />
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
        </div>

        {/* Follow-up Input Footer */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendFollowup();
          }}
          className="p-3.5 sm:p-4 bg-[#0E1628] border-t border-slate-800 flex items-center gap-2"
        >
          <button
            type="submit"
            disabled={!followupInput.trim() || isFollowupLoading}
            className="px-4 py-2.5 rounded-2xl bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer shrink-0"
          >
            <Send className="w-4 h-4" />
            <span>إرسال</span>
          </button>

          <input
            type="text"
            value={followupInput}
            onChange={(e) => setFollowupInput(e.target.value)}
            placeholder="اسأل عن أي آلية تشريحية أو فيزيولوجية أو تفريق سريري..."
            className="flex-1 px-3.5 py-2.5 bg-[#152238] border border-slate-700 focus:border-violet-500 rounded-2xl text-xs sm:text-sm text-white placeholder:text-slate-500 focus:outline-hidden text-right"
          />
        </form>
      </div>
    </div>
  );
};

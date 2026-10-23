import React, { useState, useEffect } from 'react';
import {
  X,
  Flag,
  AlertTriangle,
  CheckCircle2,
  Send,
  FileWarning,
} from 'lucide-react';
import { QuestionItem, QuestionReportIssueType } from '../../types';
import { useApp } from '../../context/AppContext';

interface ReportQuestionModalProps {
  isOpen: boolean;
  onClose: () => void;
  question: QuestionItem | null;
  subjectName?: string;
}

const ISSUE_OPTIONS: {
  id: QuestionReportIssueType;
  label: string;
  subtitle: string;
}[] = [
  {
    id: 'wrong_key',
    label: 'خطأ علمي في مفتاح الحل',
    subtitle: 'الخيار المعتمد كإجابة صحيحة غير دقيق علمياً أو سريرياً',
  },
  {
    id: 'typo',
    label: 'خطأ مطبعي أو صياغة غير واضحة',
    subtitle: 'خطأ إملائي في نص السؤال أو المصطلح الطبي يؤثر على الفهم',
  },
  {
    id: 'missing_options',
    label: 'نقص أو خطأ في الخيارات أو الشرح',
    subtitle: 'تكرار في الخيارات أو حاجة لتصحيح التعليل الأكاديمي المرفق',
  },
  {
    id: 'other',
    label: 'ملاحظة علمية أخرى للمشرفين',
    subtitle: 'أي ملاحظة إضافية لمراجعة السؤال من اللجنة العلمية',
  },
];

export const ReportQuestionModal: React.FC<ReportQuestionModalProps> = ({
  isOpen,
  onClose,
  question,
  subjectName,
}) => {
  const { submitQuestionReport, questionReports } = useApp();

  const [issueType, setIssueType] = useState<QuestionReportIssueType>('wrong_key');
  const [description, setDescription] = useState('');
  const [isSubmittedSuccess, setIsSubmittedSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIssueType('wrong_key');
      setDescription('');
      setIsSubmittedSuccess(false);
    }
  }, [isOpen, question?.id]);

  if (!isOpen || !question) return null;

  const existingPendingCount = questionReports.filter(
    (r) => r.questionId === question.id && r.status === 'pending'
  ).length;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const fallbackDesc =
      ISSUE_OPTIONS.find((o) => o.id === issueType)?.label || 'مراجعة علمية للسؤال';
    await submitQuestionReport({
      questionId: question.id,
      issueType,
      description: description.trim() || fallbackDesc,
    });
    setIsSubmittedSuccess(true);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-label="إبلاغ عن خطأ علمي أو مطبعي في السؤال"
    >
      <div className="bg-[#111A2E] border border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden text-right">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-[#0E1628]">
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800/80 text-slate-400 hover:text-white transition-colors cursor-pointer"
            aria-label="إغلاق نافذة الإبلاغ"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2.5">
            <div>
              <h3 className="text-sm sm:text-base font-black text-white">
                إبلاغ عن خطأ علمي / مطبعي
              </h3>
              <p className="text-[11px] text-slate-400">
                يُرسل مباشرة إلى لوحة مراجعة المشرفين الأكاديميين في مدفور
              </p>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
              <Flag className="w-5 h-5" />
            </div>
          </div>
        </div>

        {isSubmittedSuccess ? (
          <div className="p-6 sm:p-8 text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div className="space-y-1.5">
              <h4 className="text-base font-black text-white">
                تم إرسال بلاغك العلمي إلى المشرفين بنجاح
              </h4>
              <p className="text-xs text-slate-300 leading-relaxed max-w-sm mx-auto">
                شكراً لمساهمتك في تدقيق بنك أتمتة طب الفرات (MedFur). سيقوم المشرف الأكاديمي بمراجعة السؤال وتصحيحه فوراً.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-full py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black transition-colors cursor-pointer"
            >
              العودة لمتابعة الأسئلة
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4">
            {/* Target Question Box */}
            <div className="p-3.5 rounded-2xl bg-[#152238] border border-slate-800 space-y-1.5">
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                {existingPendingCount > 0 && (
                  <span className="text-amber-400 font-bold flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>قيد المراجعة ({existingPendingCount} بلاغ سابق)</span>
                  </span>
                )}
                <span className="font-bold text-sky-400">
                  {subjectName || 'مقرر طبي'} · {question.chapterName || 'الأتمتة'}
                </span>
              </div>
              <p className="text-xs sm:text-sm font-bold text-slate-100 line-clamp-2 leading-relaxed">
                {question.questionText}
              </p>
            </div>

            {/* Issue Type Selection */}
            <div className="space-y-2">
              <label className="block text-xs font-extrabold text-slate-300">
                حدد نوع المشكلة في السؤال:
              </label>
              <div className="space-y-2">
                {ISSUE_OPTIONS.map((opt) => {
                  const isSelected = issueType === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setIssueType(opt.id)}
                      className={`w-full p-3 rounded-2xl border text-right transition-all flex items-start justify-between gap-3 cursor-pointer ${
                        isSelected
                          ? 'bg-amber-500/15 border-amber-500 text-white ring-1 ring-amber-500/50'
                          : 'bg-[#162238] border-slate-800 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded-full border flex items-center justify-center mt-0.5 shrink-0 ${
                          isSelected
                            ? 'border-amber-400 bg-amber-500 text-slate-950'
                            : 'border-slate-600'
                        }`}
                      >
                        {isSelected && <div className="w-2 h-2 rounded-full bg-slate-950" />}
                      </div>
                      <div className="flex-1">
                        <span className="block text-xs font-black text-white">
                          {opt.label}
                        </span>
                        <span className="block text-[11px] text-slate-400 mt-0.5">
                          {opt.subtitle}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Detailed Justification Input */}
            <div className="space-y-1.5">
              <label className="block text-xs font-extrabold text-slate-300">
                توضيح الخطأ أو التصحيح المقترح (مع المرجع إن وجد):
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="مثلاً: بحسب محاضرة الدكتور ص 14 فإن العصب المسؤول هو العصب المبهم وليس الوجهي..."
                className="w-full p-3 bg-[#152238] border border-slate-700 focus:border-amber-500 rounded-2xl text-xs sm:text-sm text-white placeholder:text-slate-500 focus:outline-hidden text-right leading-relaxed resize-none"
              />
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white text-xs font-bold cursor-pointer"
              >
                إلغاء
              </button>

              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black flex items-center gap-1.5 transition-colors cursor-pointer shadow-lg shadow-amber-950/40"
              >
                <FileWarning className="w-4 h-4" />
                <span>تأكيد وإرسال البلاغ للمشرفين</span>
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

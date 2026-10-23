import React, { useState, useMemo } from 'react';
import {
  ShieldCheck,
  Flag,
  Edit3,
  CheckCircle2,
  XCircle,
  Trash2,
  Plus,
  AlertTriangle,
  ExternalLink,
  Check,
} from 'lucide-react';
import { QuestionItem, QuestionReportIssueType } from '../../types';
import { useApp } from '../../context/AppContext';

interface SupervisorReportsPanelProps {
  onEditQuestion: (question: QuestionItem) => void;
  onAddNewSubject: () => void;
  onAddNewQuestion: () => void;
  onOpenQuestionInStream: (question: QuestionItem) => void;
  onConfirmAction: (config: {
    title: string;
    message: string;
    itemName?: string;
    confirmLabel?: string;
    onConfirm: () => void;
  }) => void;
}

const ISSUE_LABELS: Record<QuestionReportIssueType, { text: string; colorClass: string }> = {
  wrong_key: {
    text: 'خطأ علمي في مفتاح الحل',
    colorClass: 'bg-rose-500/20 border-rose-500/40 text-rose-300',
  },
  typo: {
    text: 'خطأ مطبعي أو صياغة',
    colorClass: 'bg-amber-500/20 border-amber-500/40 text-amber-300',
  },
  missing_options: {
    text: 'نقص أو خطأ في الخيارات/الشرح',
    colorClass: 'bg-indigo-500/20 border-indigo-500/40 text-indigo-300',
  },
  other: {
    text: 'ملاحظة علمية أخرى',
    colorClass: 'bg-sky-500/20 border-sky-500/40 text-sky-300',
  },
};

export const SupervisorReportsPanel: React.FC<SupervisorReportsPanelProps> = ({
  onEditQuestion,
  onAddNewSubject,
  onAddNewQuestion,
  onOpenQuestionInStream,
  onConfirmAction,
}) => {
  const {
    questions,
    subjects,
    questionReports,
    resolveQuestionReport,
    deleteQuestionReport,
    deleteQuestion,
  } = useApp();

  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'resolved' | 'dismissed'>('all');
  const [resolutionNotesMap, setResolutionNotesMap] = useState<Record<string, string>>({});

  const pendingCount = useMemo(
    () => questionReports.filter((r) => r.status === 'pending').length,
    [questionReports]
  );
  const resolvedCount = useMemo(
    () => questionReports.filter((r) => r.status === 'resolved').length,
    [questionReports]
  );

  const filteredReports = useMemo(() => {
    if (statusFilter === 'all') return questionReports;
    return questionReports.filter((r) => r.status === statusFilter);
  }, [questionReports, statusFilter]);

  return (
    <div className="space-y-5 text-right">
      {/* Supervisor Header Card */}
      <div className="bg-[#131D2E] border border-amber-500/40 rounded-3xl p-5 space-y-4 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3.5">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={onAddNewSubject}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة مادة</span>
            </button>
            <button
              type="button"
              onClick={onAddNewQuestion}
              className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة سؤال جديد</span>
            </button>
          </div>

          <div className="flex items-center gap-2.5">
            <div>
              <h2 className="text-base sm:text-lg font-black text-white flex items-center justify-end gap-2">
                <span>منصة المشرفين ومراجعة بلاغات الأسئلة</span>
              </h2>
              <p className="text-xs text-slate-400">
                مراجعة الملاحظات العلمية والمطبعية الواردة من الطلاب وتعديل الأسئلة فوراً
              </p>
            </div>
            <div className="w-11 h-11 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* 4 Supervisor KPI Boxes */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 tabular-nums">
          <div className="bg-[#0E172A] p-3.5 rounded-2xl border border-slate-800 text-center space-y-0.5">
            <span className="text-xl font-black text-amber-400 block">{pendingCount}</span>
            <span className="text-[11px] text-slate-400 font-bold">بلاغات قيد المراجعة</span>
          </div>
          <div className="bg-[#0E172A] p-3.5 rounded-2xl border border-slate-800 text-center space-y-0.5">
            <span className="text-xl font-black text-emerald-400 block">{resolvedCount}</span>
            <span className="text-[11px] text-slate-400 font-bold">بلاغات تم حلها</span>
          </div>
          <div className="bg-[#0E172A] p-3.5 rounded-2xl border border-slate-800 text-center space-y-0.5">
            <span className="text-xl font-black text-white block">{questions.length}</span>
            <span className="text-[11px] text-slate-400 font-bold">إجمالي الأسئلة</span>
          </div>
          <div className="bg-[#0E172A] p-3.5 rounded-2xl border border-slate-800 text-center space-y-0.5">
            <span className="text-xl font-black text-sky-400 block">{subjects.length}</span>
            <span className="text-[11px] text-slate-400 font-bold">المقررات الطبية</span>
          </div>
        </div>

        {/* Status Filter Pills */}
        <div className="flex flex-wrap items-center justify-end gap-2 pt-1 text-xs font-bold tabular-nums">
          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-xl cursor-pointer transition-colors ${
              statusFilter === 'all'
                ? 'bg-amber-500 text-slate-950 font-black'
                : 'bg-slate-800 text-slate-300 hover:text-white'
            }`}
          >
            الكل ({questionReports.length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('pending')}
            className={`px-3 py-1.5 rounded-xl cursor-pointer transition-colors ${
              statusFilter === 'pending'
                ? 'bg-rose-600 text-white font-black'
                : 'bg-slate-800 text-slate-300 hover:text-white'
            }`}
          >
            قيد المراجعة ({pendingCount})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('resolved')}
            className={`px-3 py-1.5 rounded-xl cursor-pointer transition-colors ${
              statusFilter === 'resolved'
                ? 'bg-emerald-600 text-white font-black'
                : 'bg-slate-800 text-slate-300 hover:text-white'
            }`}
          >
            تم الحل والتصحيح ({resolvedCount})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('dismissed')}
            className={`px-3 py-1.5 rounded-xl cursor-pointer transition-colors ${
              statusFilter === 'dismissed'
                ? 'bg-slate-600 text-white font-black'
                : 'bg-slate-800 text-slate-300 hover:text-white'
            }`}
          >
            مستبعدة ({questionReports.filter((r) => r.status === 'dismissed').length})
          </button>
        </div>
      </div>

      {/* Reports List */}
      {filteredReports.length === 0 ? (
        <div className="text-center py-14 bg-[#131D2E] rounded-3xl border border-dashed border-slate-800 p-8 space-y-3">
          <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
          <h3 className="font-bold text-base text-white">
            لا توجد بلاغات مطابقة لفلتر العرض الحالي
          </h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            جميع البلاغات العلمية والمطبعية التي يرسلها الطلاب عبر زر (إبلاغ عن خطأ) تظهر هنا للمراجعة الفورية.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredReports.map((report) => {
            const liveQuestion = questions.find((q) => q.id === report.questionId);
            const issueMeta = ISSUE_LABELS[report.issueType] || ISSUE_LABELS.other;
            const isPending = report.status === 'pending';

            const optionLabels = ['A', 'B', 'C', 'D'];
            const optionList = liveQuestion
              ? [
                  liveQuestion.optionA,
                  liveQuestion.optionB,
                  liveQuestion.optionC,
                  liveQuestion.optionD,
                ]
              : [];

            return (
              <div
                key={report.id}
                className={`bg-[#131D2E] rounded-3xl p-5 border space-y-4 shadow-lg transition-colors ${
                  isPending ? 'border-amber-500/40' : 'border-slate-800'
                }`}
              >
                {/* Top Metadata Bar */}
                <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`px-2.5 py-1 rounded-xl text-[11px] font-black border ${
                        report.status === 'pending'
                          ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                          : report.status === 'resolved'
                          ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                          : 'bg-slate-800 border-slate-700 text-slate-400'
                      }`}
                    >
                      {report.status === 'pending'
                        ? 'قيد المراجعة'
                        : report.status === 'resolved'
                        ? 'تم التصحيح والحل ✓'
                        : 'تم الاستبعاد'}
                    </span>

                    <span
                      className={`px-2.5 py-1 rounded-xl text-[11px] font-bold border ${issueMeta.colorClass}`}
                    >
                      {issueMeta.text}
                    </span>

                    <span className="text-[11px] text-slate-400">{report.createdAt}</span>
                  </div>

                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-slate-400">
                      المُبلّغ:{' '}
                      <strong className="text-white">{report.reporterName}</strong>
                      {report.reporterExamNumber
                        ? ` (رقم امتحاني: ${report.reporterExamNumber})`
                        : ''}
                    </span>
                    <Flag className="w-4 h-4 text-amber-400" />
                  </div>
                </div>

                {/* Student's Report Description */}
                <div className="p-3.5 rounded-2xl bg-amber-950/25 border border-amber-500/30 space-y-1">
                  <div className="flex items-center justify-end gap-1.5 text-xs font-extrabold text-amber-300">
                    <span>ملاحظة الطالب وتفاصيل البلاغ:</span>
                    <AlertTriangle className="w-3.5 h-3.5" />
                  </div>
                  <p className="text-xs sm:text-sm text-amber-100 leading-relaxed">
                    {report.description}
                  </p>
                </div>

                {/* Question Snapshot / Live Details */}
                <div className="p-4 rounded-2xl bg-[#0E1628] border border-slate-800 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400">
                    {liveQuestion && (
                      <button
                        type="button"
                        onClick={() => onOpenQuestionInStream(liveQuestion)}
                        className="text-sky-400 hover:underline flex items-center gap-1 font-bold cursor-pointer"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>فتح السؤال في القسم</span>
                      </button>
                    )}
                    <span className="font-bold text-emerald-400">
                      {report.subjectName} · {report.chapterName}
                    </span>
                  </div>

                  <p className="text-xs sm:text-sm font-bold text-white leading-relaxed">
                    {liveQuestion ? liveQuestion.questionText : report.questionTextSnapshot}
                  </p>

                  {liveQuestion ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                      {optionList.map((optText, idx) => {
                        const isCorrect = idx === liveQuestion.correctOptionIndex;
                        return (
                          <div
                            key={idx}
                            className={`p-2.5 rounded-xl border text-xs flex items-center justify-between gap-2 ${
                              isCorrect
                                ? 'bg-emerald-950/50 border-emerald-500/50 text-emerald-200 font-bold'
                                : 'bg-[#152238] border-slate-800 text-slate-300'
                            }`}
                          >
                            {isCorrect && <Check className="w-4 h-4 text-emerald-400 shrink-0" />}
                            <span className="flex-1 text-right">
                              ({optionLabels[idx]}) {optText}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-rose-400 font-bold">
                      تم حذف هذا السؤال من بنك الأتمتة.
                    </p>
                  )}

                  {liveQuestion?.explanation && (
                    <p className="text-[11px] text-slate-400 border-t border-slate-800 pt-2">
                      <strong className="text-emerald-400">الشرح المعتمد حالياً:</strong>{' '}
                      {liveQuestion.explanation}
                    </p>
                  )}
                </div>

                {/* Supervisor Resolution Note if already resolved/dismissed */}
                {report.status !== 'pending' && report.resolutionNote && (
                  <div className="p-3 rounded-2xl bg-emerald-950/20 border border-emerald-500/30 text-xs text-emerald-200">
                    <strong>قرار المشرف ({report.resolvedBy || 'الإشراف الأكاديمي'}):</strong>{' '}
                    {report.resolutionNote}
                  </div>
                )}

                {/* Supervisor Action Controls */}
                <div className="pt-2 border-t border-slate-800 space-y-3">
                  {isPending && (
                    <input
                      type="text"
                      value={resolutionNotesMap[report.id] || ''}
                      onChange={(e) =>
                        setResolutionNotesMap((prev) => ({
                          ...prev,
                          [report.id]: e.target.value,
                        }))
                      }
                      placeholder="ملاحظة المشرف عند إغلاق البلاغ (اختياري — مثلاً: تم تصحيح مفتاح الحل وتحديث الشرح)..."
                      className="w-full px-3.5 py-2 bg-[#0E1628] border border-slate-700 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-hidden"
                    />
                  )}

                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <button
                        type="button"
                        onClick={() =>
                          onConfirmAction({
                            title: 'حذف البلاغ من السجل',
                            message: 'هل أنت متأكد من حذف هذا البلاغ نهائياً من سجل البلاغات؟',
                            itemName: report.description,
                            onConfirm: () => deleteQuestionReport(report.id),
                          })
                        }
                        className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>حذف البلاغ</span>
                      </button>

                      {liveQuestion && (
                        <button
                          type="button"
                          onClick={() =>
                            onConfirmAction({
                              title: 'حذف السؤال نهائياً',
                              message:
                                'هل أنت متأكد من حذف هذا السؤال نهائياً من بنك الأتمتة؟',
                              itemName: liveQuestion.questionText,
                              onConfirm: () => {
                                deleteQuestion(liveQuestion.id);
                                resolveQuestionReport(
                                  report.id,
                                  'resolved',
                                  'تم حذف السؤال المكرر/الخاطئ من بنك الأتمتة.'
                                );
                              },
                            })
                          }
                          className="px-3 py-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>حذف السؤال</span>
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      {liveQuestion && (
                        <button
                          type="button"
                          onClick={() => {
                            onEditQuestion(liveQuestion);
                            if (report.status === 'pending') {
                              resolveQuestionReport(
                                report.id,
                                'resolved',
                                resolutionNotesMap[report.id] ||
                                  'تم تعديل السؤال وتدقيق مفتاح الحل والشرح من قِبل المشرف.'
                              );
                            }
                          }}
                          className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-md shadow-indigo-950/50 transition-colors"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>تعديل وتصحيح السؤال فوراً</span>
                        </button>
                      )}

                      {isPending && (
                        <>
                          <button
                            type="button"
                            onClick={() =>
                              resolveQuestionReport(
                                report.id,
                                'resolved',
                                resolutionNotesMap[report.id]
                              )
                            }
                            className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black flex items-center gap-1.5 cursor-pointer transition-colors"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>اعتماد الحل وإغلاق البلاغ</span>
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              resolveQuestionReport(
                                report.id,
                                'dismissed',
                                resolutionNotesMap[report.id]
                              )
                            }
                            className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            <span>استبعاد البلاغ</span>
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

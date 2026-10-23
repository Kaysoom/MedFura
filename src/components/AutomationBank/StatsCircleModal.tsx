import React from 'react';
import { X, BarChart3, CheckCircle2, XCircle, HelpCircle, Clock, Award, RotateCcw } from 'lucide-react';
import { QuestionStatsSummary } from '../../utils/automationLogic';

interface StatCircleButtonProps {
  stats: QuestionStatsSummary;
  onClick: (e: React.MouseEvent) => void;
  title?: string;
  size?: 'sm' | 'md';
}

export const StatCircleButton: React.FC<StatCircleButtonProps> = ({
  stats,
  onClick,
  title = 'عرض إحصائيات هذا القسم',
  size = 'md',
}) => {
  const completionPct =
    stats.totalQuestions > 0
      ? Math.round((stats.solvedCount / stats.totalQuestions) * 100)
      : 0;

  const dimensions = size === 'sm' ? 38 : 44;
  const strokeWidth = size === 'sm' ? 3.5 : 4;
  const radius = (dimensions - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (completionPct / 100) * circumference;

  // Color based on accuracy when solved, or sky when unsolved
  const strokeColor =
    stats.solvedCount === 0
      ? '#38BDF8'
      : stats.accuracy >= 70
      ? '#10B981'
      : stats.accuracy >= 45
      ? '#F59E0B'
      : '#F43F5E';

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick(e);
      }}
      title={title}
      aria-label={title}
      className="group relative flex items-center justify-center rounded-2xl bg-[#0E172A]/90 hover:bg-slate-800/90 border border-slate-700/80 hover:border-sky-500/60 p-1 transition-all cursor-pointer shrink-0 shadow-xs"
    >
      <div className="relative flex items-center justify-center" style={{ width: dimensions, height: dimensions }}>
        <svg className="w-full h-full -rotate-90" viewBox={`0 0 ${dimensions} ${dimensions}`}>
          {/* Track */}
          <circle
            cx={dimensions / 2}
            cy={dimensions / 2}
            r={radius}
            fill="transparent"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            className="text-slate-400/25"
          />
          {/* Progress */}
          <circle
            cx={dimensions / 2}
            cy={dimensions / 2}
            r={radius}
            fill="transparent"
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-300"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center tabular-nums leading-none">
          <span className="text-[10px] font-black text-white group-hover:text-sky-300 transition-colors">
            {completionPct}%
          </span>
        </div>
      </div>
    </button>
  );
};

interface StatsCircleModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  stats: QuestionStatsSummary;
  onResetStats?: () => void;
  onStartSolving?: () => void;
}

export const StatsCircleModal: React.FC<StatsCircleModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  stats,
  onResetStats,
  onStartSolving,
}) => {
  if (!isOpen) return null;

  const completionPct =
    stats.totalQuestions > 0
      ? Math.round((stats.solvedCount / stats.totalQuestions) * 100)
      : 0;

  const correctPctOfTotal =
    stats.totalQuestions > 0
      ? Math.round((stats.correctCount / stats.totalQuestions) * 100)
      : 0;
  const wrongPctOfTotal =
    stats.totalQuestions > 0
      ? Math.round((stats.wrongCount / stats.totalQuestions) * 100)
      : 0;

  // Large SVG Ring parameters
  const size = 148;
  const strokeWidth = 11;
  const radius = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const completionOffset = circumference - (completionPct / 100) * circumference;

  const ringColor =
    stats.solvedCount === 0
      ? '#38BDF8'
      : stats.accuracy >= 70
      ? '#10B981'
      : stats.accuracy >= 45
      ? '#F59E0B'
      : '#F43F5E';

  return (
    <div
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-[#131D2E] border border-slate-700/90 rounded-3xl p-5 sm:p-6 w-full max-w-md space-y-5 shadow-2xl text-right relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="flex items-start justify-between gap-3 border-b border-slate-800 pb-3.5">
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-800/80 text-slate-400 hover:text-white transition-colors cursor-pointer"
            aria-label="إغلاق نافذة الإحصائيات"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="text-right">
            <div className="flex items-center justify-end gap-1.5 text-sky-400 text-xs font-bold mb-0.5">
              <span>البطاقة الإحصائية التفصيلية</span>
              <BarChart3 className="w-4 h-4" />
            </div>
            <h3 className="text-base sm:text-lg font-black text-white leading-snug">
              {title}
            </h3>
            {subtitle && (
              <p className="text-xs text-slate-400 font-semibold mt-0.5">{subtitle}</p>
            )}
          </div>
        </div>

        {/* Center Circular Ring + Accuracy Highlight */}
        <div className="flex flex-col sm:flex-row items-center justify-around gap-4 py-2 bg-[#0E172A] rounded-2xl p-4 border border-slate-800/90">
          <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
            <svg className="w-full h-full -rotate-90" viewBox={`0 0 ${size} ${size}`}>
              <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="transparent"
                stroke="currentColor"
                strokeWidth={strokeWidth}
                className="text-slate-400/25"
              />
              <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="transparent"
                stroke={ringColor}
                strokeWidth={strokeWidth}
                strokeDasharray={circumference}
                strokeDashoffset={completionOffset}
                strokeLinecap="round"
                className="transition-all duration-500"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center tabular-nums">
              <span className="text-2xl font-black text-white">{completionPct}%</span>
              <span className="text-[11px] font-bold text-slate-400 mt-0.5">نسبة الإنجاز</span>
              <span className="text-[10px] font-bold text-emerald-400 mt-0.5">
                الدقة: {stats.accuracy}%
              </span>
            </div>
          </div>

          <div className="space-y-2.5 text-right w-full sm:w-auto tabular-nums">
            <div className="flex items-center justify-between sm:justify-end gap-3 text-xs">
              <span className="font-black text-white">{stats.totalQuestions} سؤال</span>
              <span className="text-slate-400 font-semibold flex items-center gap-1">
                <span>إجمالي الأسئلة</span>
                <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
              </span>
            </div>
            <div className="flex items-center justify-between sm:justify-end gap-3 text-xs">
              <span className="font-black text-emerald-400">{stats.correctCount} صح</span>
              <span className="text-slate-400 font-semibold flex items-center gap-1">
                <span>إجابات صحيحة</span>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              </span>
            </div>
            <div className="flex items-center justify-between sm:justify-end gap-3 text-xs">
              <span className="font-black text-rose-400">{stats.wrongCount} خطأ</span>
              <span className="text-slate-400 font-semibold flex items-center gap-1">
                <span>إجابات خاطئة</span>
                <XCircle className="w-3.5 h-3.5 text-rose-400" />
              </span>
            </div>
            <div className="flex items-center justify-between sm:justify-end gap-3 text-xs">
              <span className="font-black text-amber-400">{stats.remainingCount} متبقٍ</span>
              <span className="text-slate-400 font-semibold flex items-center gap-1">
                <span>غير محلولة بعد</span>
                <Clock className="w-3.5 h-3.5 text-amber-400" />
              </span>
            </div>
          </div>
        </div>

        {/* Visual Segmented Progress Bar */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 tabular-nums">
            <span>توزيع الإجابات ({stats.solvedCount} من {stats.totalQuestions})</span>
            <span className="text-emerald-400">دقة الإجابات: {stats.accuracy}%</span>
          </div>
          <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden flex">
            {correctPctOfTotal > 0 && (
              <div
                style={{ width: `${correctPctOfTotal}%` }}
                className="bg-emerald-500 h-full transition-all duration-300"
                title={`إجابات صحيحة: ${stats.correctCount}`}
              />
            )}
            {wrongPctOfTotal > 0 && (
              <div
                style={{ width: `${wrongPctOfTotal}%` }}
                className="bg-rose-500 h-full transition-all duration-300"
                title={`إجابات خاطئة: ${stats.wrongCount}`}
              />
            )}
          </div>
        </div>

        {/* 6 Detailed KPI Cards Grid */}
        <div className="grid grid-cols-3 gap-2.5 tabular-nums">
          <div className="bg-[#0E172A] border border-slate-800 rounded-2xl p-3 text-center space-y-0.5">
            <span className="text-lg font-black text-white block">{stats.totalQuestions}</span>
            <span className="text-[11px] text-slate-400 font-semibold block">الأسئلة الكلية</span>
          </div>
          <div className="bg-[#0E172A] border border-slate-800 rounded-2xl p-3 text-center space-y-0.5">
            <span className="text-lg font-black text-sky-400 block">{stats.solvedCount}</span>
            <span className="text-[11px] text-slate-400 font-semibold block">المحلولة</span>
          </div>
          <div className="bg-[#0E172A] border border-slate-800 rounded-2xl p-3 text-center space-y-0.5">
            <span className="text-lg font-black text-amber-400 block">{stats.remainingCount}</span>
            <span className="text-[11px] text-slate-400 font-semibold block">المتبقية</span>
          </div>
          <div className="bg-[#0E172A] border border-slate-800 rounded-2xl p-3 text-center space-y-0.5">
            <span className="text-lg font-black text-emerald-400 block">{stats.correctCount}</span>
            <span className="text-[11px] text-slate-400 font-semibold block">إجابات صحيحة</span>
          </div>
          <div className="bg-[#0E172A] border border-slate-800 rounded-2xl p-3 text-center space-y-0.5">
            <span className="text-lg font-black text-rose-400 block">{stats.wrongCount}</span>
            <span className="text-[11px] text-slate-400 font-semibold block">إجابات خاطئة</span>
          </div>
          <div className="bg-[#0E172A] border border-slate-800 rounded-2xl p-3 text-center space-y-0.5">
            <span className="text-lg font-black text-emerald-400 flex items-center justify-center gap-0.5">
              <Award className="w-3.5 h-3.5" />
              <span>{stats.accuracy}%</span>
            </span>
            <span className="text-[11px] text-slate-400 font-semibold block">نسبة الدقة</span>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between gap-2.5 pt-2 border-t border-slate-800">
          {onResetStats && stats.solvedCount > 0 ? (
            <button
              type="button"
              onClick={onResetStats}
              className="px-3.5 py-2.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>تصفير الإجابات</span>
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold cursor-pointer transition-colors"
            >
              إغلاق
            </button>
            {onStartSolving && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onStartSolving();
                }}
                className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer transition-colors"
              >
                {stats.solvedCount > 0 ? 'متابعة الحل' : 'بدء الحل الآن'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

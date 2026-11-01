import React, { useRef, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { COLOR_THEMES } from '../Header';
import { DarkModeSchedule, UIDensityMode } from '../../types';
import { clearAllOfflineMedia } from '../../utils/fileHelpers';
import { playQuizFeedbackTone } from '../../utils/settingsAndDensityLogic';
import {
  Settings,
  Sun,
  Moon,
  Eye,
  Palette,
  LayoutGrid,
  Minimize2,
  Maximize2,
  Type,
  Volume2,
  VolumeX,
  Zap,
  BookOpen,
  Download,
  Upload,
  RotateCcw,
  Trash2,
  ShieldCheck,
  User,
  LogOut,
  CheckCircle2,
  AlertCircle,
  Clock,
  Laptop,
  ChevronRight,
  Sparkles,
  Check,
  HardDrive,
  MousePointerClick,
} from 'lucide-react';

export const SettingsView: React.FC = () => {
  const {
    user,
    isAdmin,
    accountType,
    canToggleRole,
    setIsAuthModalOpen,
    signOut,
    darkMode,
    toggleDarkMode,
    darkModeSchedule,
    setDarkModeSchedule,
    colorTheme,
    setColorTheme,
    eyeComfortMode,
    toggleEyeComfortMode,
    questionFontScale,
    setQuestionFontScale,
    uiDensity,
    setUiDensity,
    quizPreferences,
    updateQuizPreferences,
    exportStudyBackup,
    importStudyBackup,
    solvedQuestions,
    savedQuestionIds,
    wrongQuestionIds,
    questionNotes,
    studentCustomQuizzes,
    resetAllQuestionStatus,
    switchAccount,
    quickSwitchPersona,
    purgeAllDemoData,
    setActiveSection,
  } = useApp();

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [statusBanner, setStatusBanner] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);
  const [confirmResetStats, setConfirmResetStats] = useState(false);
  const [confirmClearCache, setConfirmClearCache] = useState(false);
  const [confirmPurgeAll, setConfirmPurgeAll] = useState(false);
  const [previewSelectedOpt, setPreviewSelectedOpt] = useState<number>(1);

  const showNotice = (type: 'success' | 'error', message: string) => {
    setStatusBanner({ type, message });
    setTimeout(() => {
      setStatusBanner(null);
    }, 4000);
  };

  const handleExportBackup = () => {
    try {
      const payload = exportStudyBackup();
      const jsonStr = JSON.stringify(payload, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const dateTag = new Date().toISOString().slice(0, 10);
      a.href = url;
      a.download = `medfur-backup-${accountType}-${dateTag}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showNotice(
        'success',
        'تم تصدير النسخة الاحتياطية لإحصائياتك واختباراتك بنجاح.'
      );
    } catch {
      showNotice('error', 'حدث خطأ أثناء تصدير النسخة الاحتياطية.');
    }
  };

  const handleImportBackupFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const content = String(reader.result || '');
      const result = importStudyBackup(content);
      if (result.valid) {
        showNotice(
          'success',
          'تمت استعادة النسخة الاحتياطية وتحديث سجل الدراسة والمحفوظات بنجاح.'
        );
      } else {
        showNotice('error', result.error || 'ملف النسخة الاحتياطية غير صالح.');
      }
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  const solvedCount = Object.keys(solvedQuestions).length;
  const notesCount = Object.keys(questionNotes).length;
  const isCompact = uiDensity === 'compact';

  const previewQuestionFontClass =
    questionFontScale === 'xlarge'
      ? 'text-base sm:text-lg'
      : questionFontScale === 'large'
      ? 'text-sm sm:text-base'
      : 'text-xs sm:text-sm';

  return (
    <div
      dir="rtl"
      className={`w-full max-w-md mx-auto sm:max-w-3xl lg:max-w-5xl ${
        isCompact
          ? 'px-2.5 sm:px-3.5 py-2.5 sm:py-3.5 space-y-3'
          : 'px-3.5 sm:px-4 py-4 sm:py-6 space-y-5'
      } text-right`}
    >
      {/* Top Page Bar */}
      <div className="bg-[#131D2E] border border-slate-800 rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 flex flex-wrap items-center justify-between gap-3 shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0">
            <Settings className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <h1 className="text-base sm:text-xl font-black text-white">
              الإعدادات وتخصيص التجربة
            </h1>
            <p className="text-[11px] sm:text-xs text-slate-400">
              تحكم بكثافة الواجهة، المظهر والألوان، سلوك الأتمتة، والنسخ الاحتياطي
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setActiveSection('home')}
          className="px-3.5 py-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <ChevronRight className="w-4 h-4 text-emerald-400" />
          <span>العودة للرئيسية</span>
        </button>
      </div>

      {/* Feedback Banner */}
      {statusBanner && (
        <div
          className={`p-3.5 rounded-2xl border text-xs font-bold flex items-center justify-between gap-2 animate-in fade-in ${
            statusBanner.type === 'success'
              ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300'
              : 'bg-rose-950/40 border-rose-500/40 text-rose-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {statusBanner.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span>{statusBanner.message}</span>
          </div>
        </div>
      )}

      {/* Main Two-Column Responsive Layout on Desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5 items-start">
        {/* Right Column (7 cols on lg): Appearance, UI Density & Study Preferences */}
        <div className="lg:col-span-7 space-y-4 sm:space-y-5">
          {/* SECTION 1: UI Density Mode (حصرياً داخل صفحة الإعدادات) */}
          <section className="bg-[#131D2E] border border-slate-800 rounded-2xl sm:rounded-3xl p-4 sm:p-5 space-y-4 shadow-md">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <LayoutGrid className="w-5 h-5 text-emerald-400" />
                <div>
                  <h2 className="text-sm sm:text-base font-black text-white">
                    1. كثافة الواجهة وتخطيط العرض
                  </h2>
                  <p className="text-[11px] text-slate-400">
                    اختر بين الوضع المتوازن المريح أو الوضع المدمج والمكثف لعرض عناصر أكثر بالصف
                  </p>
                </div>
              </div>
              <span className="text-xs font-bold text-emerald-400">
                {uiDensity === 'compact' ? 'مدمج ومكثف' : 'متوازن (افتراضي)'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(
                [
                  {
                    id: 'balanced' as UIDensityMode,
                    title: 'الوضع المتوازن (الحالي)',
                    subtitle:
                      'توازن مريح بين وضوح البطاقات والمسافات الفاصلة للقراءة الهادئة',
                    icon: Maximize2,
                    meta: 'مسافات قياسية · قراءة مريحة',
                  },
                  {
                    id: 'compact' as UIDensityMode,
                    title: 'الوضع المدمج والمكثف',
                    subtitle:
                      'تقليص الهوامش والمسافات مع عرض عناصر أكثر بالصف الواحد لإظهار أكبر قدر من المعلومات',
                    icon: Minimize2,
                    meta: 'هوامش مقتضبة · عناصر أكثر بالصف',
                  },
                ] as const
              ).map((mode) => {
                const IconComp = mode.icon;
                const isSelected = uiDensity === mode.id;
                return (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => setUiDensity(mode.id)}
                    aria-pressed={isSelected}
                    className={`p-3.5 sm:p-4 rounded-2xl border text-right flex flex-col justify-between gap-2.5 transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-950/30 border-emerald-500 text-white ring-1 ring-emerald-500/50'
                        : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:bg-slate-800/80'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                          isSelected
                            ? 'bg-emerald-600 text-white'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        <IconComp className="w-4 h-4" />
                      </div>
                      {isSelected && (
                        <span className="text-[11px] font-black text-emerald-400 flex items-center gap-1">
                          <Check className="w-3.5 h-3.5" />
                          <span>مفعل الآن</span>
                        </span>
                      )}
                    </div>

                    <div className="space-y-1">
                      <h3 className="font-black text-xs sm:text-sm text-white">
                        {mode.title}
                      </h3>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        {mode.subtitle}
                      </p>
                    </div>

                    <span className="text-[10px] font-bold text-emerald-400 pt-1 border-t border-slate-800/80 block">
                      {mode.meta}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* SECTION 2: Modes, Colors & Live Preview */}
          <section className="bg-[#131D2E] border border-slate-800 rounded-2xl sm:rounded-3xl p-4 sm:p-5 space-y-4 shadow-md">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Palette className="w-5 h-5 text-emerald-400" />
                <div>
                  <h2 className="text-sm sm:text-base font-black text-white">
                    2. المظهر، الأوضاع، واللون الأساسي
                  </h2>
                  <p className="text-[11px] text-slate-400">
                    خصص إضاءة الشاشة وحماية العين واللون الحيوي للتطبيق
                  </p>
                </div>
              </div>
              <span className="text-xs font-bold text-slate-400">
                {COLOR_THEMES.find((c) => c.id === colorTheme)?.label}
              </span>
            </div>

            {/* Dark/Light & Eye Comfort */}
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={toggleDarkMode}
                className={`p-3 rounded-2xl border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  darkMode
                    ? 'bg-slate-900/90 border-slate-700 text-amber-300'
                    : 'bg-sky-500/15 border-sky-500/40 text-sky-400'
                }`}
              >
                {darkMode ? (
                  <Sun className="w-4 h-4 text-amber-400" />
                ) : (
                  <Moon className="w-4 h-4 text-sky-400" />
                )}
                <span>
                  {darkMode ? 'الوضع الليلي مفعل (تبديل للنهاري)' : 'الوضع النهاري مفعل (تبديل لليلي)'}
                </span>
              </button>

              <button
                type="button"
                onClick={toggleEyeComfortMode}
                className={`p-3 rounded-2xl border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  eyeComfortMode
                    ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                    : 'bg-slate-900/90 border-slate-700 text-slate-300'
                }`}
              >
                <Eye className="w-4 h-4 text-amber-400" />
                <span>
                  {eyeComfortMode ? 'حماية العين: مفعلة' : 'تفعيل حماية العين'}
                </span>
              </button>
            </div>

            {/* Auto Dark Mode Schedule */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-300 block">
                جدولة الوضع الليلي التلقائي:
              </span>
              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    { id: 'system', label: 'حسب النظام', icon: Laptop },
                    { id: 'time', label: 'حسب الوقت', icon: Clock },
                    { id: 'manual', label: 'تحكم يدوي', icon: Sun },
                  ] as {
                    id: DarkModeSchedule;
                    label: string;
                    icon: React.ElementType;
                  }[]
                ).map((mode) => {
                  const IconComp = mode.icon;
                  const isSelected = darkModeSchedule === mode.id;
                  return (
                    <button
                      key={mode.id}
                      type="button"
                      onClick={() => setDarkModeSchedule(mode.id)}
                      className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-emerald-600 text-white border-emerald-400'
                          : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <IconComp className="w-3.5 h-3.5" />
                      <span>{mode.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Color Theme Swatches */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-300 block">
                اللون الأساسي للتطبيق:
              </span>
              <div className="grid grid-cols-5 gap-2">
                {COLOR_THEMES.map((t) => {
                  const isSelected = colorTheme === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setColorTheme(t.id)}
                      className={`p-2.5 rounded-2xl border flex flex-col items-center gap-1.5 cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-slate-800 border-emerald-400 text-white ring-1 ring-emerald-400/50'
                          : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:bg-slate-800'
                      }`}
                    >
                      <span
                        className={`w-5 h-5 rounded-full ${t.swatchClass} flex items-center justify-center`}
                      >
                        {isSelected && <Check className="w-3 h-3 text-white" />}
                      </span>
                      <span className="text-[10px] font-bold">{t.badgeText}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </section>

          {/* SECTION 3: Font Scale & Quiz Solving Behavior */}
          <section className="bg-[#131D2E] border border-slate-800 rounded-2xl sm:rounded-3xl p-4 sm:p-5 space-y-4 shadow-md">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-emerald-400" />
                <div>
                  <h2 className="text-sm sm:text-base font-black text-white">
                    3. التحكم بحجم الخط وسلوك حل الأتمتة
                  </h2>
                  <p className="text-[11px] text-slate-400">
                    خصص حجم نصوص الأسئلة وطريقة التأكيد والأصوات التفاعلية أثناء الدراسة
                  </p>
                </div>
              </div>
            </div>

            {/* Font Size Scale */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Type className="w-4 h-4 text-emerald-400" />
                <span>حجم خط الأسئلة والقراءة:</span>
              </span>
              <div className="grid grid-cols-3 gap-2 text-xs font-bold">
                {(
                  [
                    { id: 'normal', label: 'عادي (افتراضي)' },
                    { id: 'large', label: 'كبير (مريح)' },
                    { id: 'xlarge', label: 'كبير جداً (واضح)' },
                  ] as const
                ).map((sc) => (
                  <button
                    key={sc.id}
                    type="button"
                    onClick={() => setQuestionFontScale(sc.id)}
                    className={`py-2.5 px-2 rounded-xl border cursor-pointer transition-all ${
                      questionFontScale === sc.id
                        ? 'bg-emerald-600 text-white border-emerald-400'
                        : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    {sc.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Answer Confirmation Mode (Double vs Single Click) */}
            <div className="space-y-2 pt-1">
              <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <MousePointerClick className="w-4 h-4 text-emerald-400" />
                <span>طريقة تأكيد الإجابة في بنك الأتمتة:</span>
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs font-bold">
                <button
                  type="button"
                  onClick={() =>
                    updateQuizPreferences({ confirmMode: 'double' })
                  }
                  className={`p-3 rounded-2xl border text-right transition-all cursor-pointer ${
                    quizPreferences.confirmMode === 'double'
                      ? 'bg-emerald-950/30 border-emerald-500 text-white'
                      : 'bg-slate-900/80 border-slate-800 text-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-black">نقرتان للتأكيد (موصى به)</span>
                    {quizPreferences.confirmMode === 'double' && (
                      <Check className="w-4 h-4 text-emerald-400" />
                    )}
                  </div>
                  <p className="text-[10px] text-slate-400 font-normal">
                    النقرة الأولى تظلل الخيار بالأزرق والنقرة الثانية تؤكد الإجابة لمنع اللمس الخاطئ.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    updateQuizPreferences({ confirmMode: 'single' })
                  }
                  className={`p-3 rounded-2xl border text-right transition-all cursor-pointer ${
                    quizPreferences.confirmMode === 'single'
                      ? 'bg-emerald-950/30 border-emerald-500 text-white'
                      : 'bg-slate-900/80 border-slate-800 text-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-black">نقرة واحدة فورية (حل سريع)</span>
                    {quizPreferences.confirmMode === 'single' && (
                      <Check className="w-4 h-4 text-emerald-400" />
                    )}
                  </div>
                  <p className="text-[10px] text-slate-400 font-normal">
                    تأكيد الإجابة وإظهار النتيجة مباشرة بمجرد النقر على الخيار لسرعة المراجعة.
                  </p>
                </button>
              </div>
            </div>

            {/* Interactive Toggles for Quiz Experience */}
            <div className="space-y-2 pt-1">
              {/* Toggle 1: Auto Expand Explanation */}
              <div className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <span className="text-xs font-bold text-white block">
                    إظهار التعليل والشرح الطبي تلقائياً
                  </span>
                  <span className="text-[11px] text-slate-400 block">
                    فتح صندوق الشرح الأكاديمي مباشرة فور تأكيد إجابة السؤال
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    updateQuizPreferences({
                      autoExpandExplanation: !quizPreferences.autoExpandExplanation,
                    })
                  }
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer shrink-0 ${
                    quizPreferences.autoExpandExplanation
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {quizPreferences.autoExpandExplanation ? 'مفعل' : 'متوقف'}
                </button>
              </div>

              {/* Toggle 2: Auto Advance on Correct */}
              <div className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <span className="text-xs font-bold text-white block">
                    الانتقال التلقائي للسؤال التالي عند الإجابة الصحيحة
                  </span>
                  <span className="text-[11px] text-slate-400 block">
                    تمرير الشاشة بسلاسة إلى السؤال الذي يليه بعد الحل الصحيح
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    updateQuizPreferences({
                      autoAdvanceOnCorrect: !quizPreferences.autoAdvanceOnCorrect,
                    })
                  }
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer shrink-0 ${
                    quizPreferences.autoAdvanceOnCorrect
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {quizPreferences.autoAdvanceOnCorrect ? 'مفعل' : 'متوقف'}
                </button>
              </div>

              {/* Toggle 3: Interactive Sound Effects */}
              <div className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    {quizPreferences.soundEffects ? (
                      <Volume2 className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <VolumeX className="w-4 h-4 text-slate-400" />
                    )}
                    <span>أصوات التفاعل عند حل الأسئلة</span>
                  </span>
                  <span className="text-[11px] text-slate-400 block">
                    نغمة صوتية خفيفة ومميزة عند الإجابة الصحيحة أو الخاطئة
                  </span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => playQuizFeedbackTone(true, true)}
                    className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-bold cursor-pointer"
                  >
                    تجربة الصوت
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      updateQuizPreferences({
                        soundEffects: !quizPreferences.soundEffects,
                      })
                    }
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                      quizPreferences.soundEffects
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {quizPreferences.soundEffects ? 'مفعل' : 'صامت'}
                  </button>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Left Column (5 cols on lg): Live Interactive Preview, Study Backup & Account Controls */}
        <div className="lg:col-span-5 space-y-4 sm:space-y-5">
          {/* LIVE INTERACTIVE PREVIEW CARD */}
          <section className="bg-[#131D2E] border border-slate-800 rounded-2xl sm:rounded-3xl p-4 sm:p-5 space-y-3.5 shadow-md">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <h2 className="text-sm font-black text-white">
                  معاينة حية للمظهر والكثافة
                </h2>
              </div>
              <span className="text-[11px] font-bold text-emerald-400">
                {isCompact ? 'الوضع المدمج والمكثف' : 'الوضع المتوازن'}
              </span>
            </div>

            <p className="text-[11px] text-slate-400">
              توضح البطاقة أدناه تأثير الكثافة وحجم الخط واللون المختار على قوائم المواد والأسئلة بشكل فوري:
            </p>

            {/* Preview Container reflecting Balanced vs Compact Grid & Question */}
            <div
              className={`rounded-2xl bg-[#0E172A] border border-slate-800 ${
                isCompact ? 'p-2.5 space-y-2' : 'p-4 space-y-3.5'
              } transition-all`}
            >
              {/* Miniature Subject/Folder Cards Row */}
              <div
                className={
                  isCompact
                    ? 'grid grid-cols-2 gap-2'
                    : 'grid grid-cols-1 gap-2.5'
                }
              >
                <div
                  className={`bg-[#131D2E] border border-slate-800 rounded-xl ${
                    isCompact ? 'p-2' : 'p-3'
                  } flex items-center justify-between`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0">
                      <BookOpen className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-xs font-black text-white block truncate">
                        تشريح 3 (العصبية)
                      </span>
                      <span className="text-[10px] text-slate-400 block">
                        12 محاضرة وقسم
                      </span>
                    </div>
                  </div>
                  <span className="text-[11px] font-black text-emerald-400 tabular-nums">
                    85%
                  </span>
                </div>

                <div
                  className={`bg-[#131D2E] border border-slate-800 rounded-xl ${
                    isCompact ? 'p-2' : 'p-3'
                  } flex items-center justify-between`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-sky-500/15 text-sky-400 flex items-center justify-center shrink-0">
                      <BookOpen className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-xs font-black text-white block truncate">
                        فيزيولوجيا طبية
                      </span>
                      <span className="text-[10px] text-slate-400 block">
                        10 محاضرات
                      </span>
                    </div>
                  </div>
                  <span className="text-[11px] font-black text-sky-400 tabular-nums">
                    70%
                  </span>
                </div>
              </div>

              {/* Miniature Question Preview */}
              <div
                className={`bg-[#131D2E] border border-slate-800 rounded-xl ${
                  isCompact ? 'p-2.5 space-y-2' : 'p-3.5 space-y-3'
                }`}
              >
                <div className="flex items-center justify-between text-[10px] text-slate-400">
                  <span className="font-bold text-emerald-400">
                    سؤال تجريبي للمعاينة
                  </span>
                  <span>
                    حجم الخط:{' '}
                    {questionFontScale === 'xlarge'
                      ? 'كبير جداً'
                      : questionFontScale === 'large'
                      ? 'كبير'
                      : 'عادي'}
                  </span>
                </div>
                <p
                  className={`${previewQuestionFontClass} font-bold text-white leading-relaxed`}
                >
                  أي من الأعصاب القحفية التالية يمر عبر الثقبة الوداجية ويساهم في تعصيب البلعوم والحنجرة؟
                </p>
                <div className={isCompact ? 'space-y-1.5' : 'space-y-2'}>
                  {['العصب الوجهي (VII)', 'العصب المبهم (X)'].map((opt, idx) => {
                    const active = previewSelectedOpt === idx;
                    return (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setPreviewSelectedOpt(idx)}
                        className={`w-full ${
                          isCompact ? 'p-2 rounded-lg' : 'p-2.5 rounded-xl'
                        } border text-right flex items-center justify-between text-xs font-bold transition-all cursor-pointer ${
                          active
                            ? 'bg-emerald-950/30 border-emerald-500 text-emerald-300'
                            : 'bg-slate-900/80 border-slate-800 text-slate-300'
                        }`}
                      >
                        <span>{opt}</span>
                        {active && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>

          {/* SECTION 4: Backup, Restore & Reset Study Statistics */}
          <section className="bg-[#131D2E] border border-slate-800 rounded-2xl sm:rounded-3xl p-4 sm:p-5 space-y-4 shadow-md">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <HardDrive className="w-5 h-5 text-emerald-400" />
                <div>
                  <h2 className="text-sm sm:text-base font-black text-white">
                    4. النسخ الاحتياطي وإحصائيات الدراسة
                  </h2>
                  <p className="text-[11px] text-slate-400">
                    احتفظ بنسخة من تقدمك واختباراتك أو أعد ضبط الإحصائيات
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Progress Summary */}
            <div className="grid grid-cols-4 gap-2 text-center tabular-nums">
              <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
                <span className="text-sm font-black text-emerald-400 block">
                  {solvedCount}
                </span>
                <span className="text-[10px] text-slate-400">محلول</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
                <span className="text-sm font-black text-amber-400 block">
                  {savedQuestionIds.length}
                </span>
                <span className="text-[10px] text-slate-400">محفوظ</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
                <span className="text-sm font-black text-rose-400 block">
                  {wrongQuestionIds.length}
                </span>
                <span className="text-[10px] text-slate-400">أخطاء</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
                <span className="text-sm font-black text-sky-400 block">
                  {studentCustomQuizzes.length + notesCount}
                </span>
                <span className="text-[10px] text-slate-400">اختبار/ملاحظة</span>
              </div>
            </div>

            {/* Export & Import Buttons */}
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={handleExportBackup}
                className="p-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>تصدير نسخة احتياطية</span>
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="p-3 rounded-2xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Upload className="w-4 h-4 text-sky-400" />
                <span>استعادة نسخة احتياطية</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                onChange={handleImportBackupFile}
                className="hidden"
              />
            </div>

            {/* Reset Current Account Study Stats (Inline Confirmation) */}
            {!confirmResetStats ? (
              <button
                type="button"
                onClick={() => setConfirmResetStats(true)}
                className="w-full py-2.5 px-3 rounded-xl bg-slate-900/80 hover:bg-rose-950/30 border border-slate-800 hover:border-rose-500/40 text-rose-300 text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>تصفير إحصائيات الدراسة للحساب الحالي</span>
              </button>
            ) : (
              <div className="p-3 rounded-2xl bg-rose-950/30 border border-rose-500/40 space-y-2.5">
                <p className="text-xs font-bold text-rose-200">
                  هل أنت متأكد من تصفير جميع الأسئلة المحلولة وسجل الأخطاء لهذا الحساب؟
                </p>
                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setConfirmResetStats(false)}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold cursor-pointer"
                  >
                    إلغاء
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      resetAllQuestionStatus();
                      setConfirmResetStats(false);
                      showNotice(
                        'success',
                        'تم تصفير إحصائيات الأسئلة المحلولة والأخطاء للحساب الحالي.'
                      );
                    }}
                    className="px-3 py-1.5 rounded-xl bg-rose-600 text-white text-xs font-bold cursor-pointer"
                  >
                    تأكيد التصفير
                  </button>
                </div>
              </div>
            )}

            {/* Clear Offline Cached Media */}
            {!confirmClearCache ? (
              <button
                type="button"
                onClick={() => setConfirmClearCache(true)}
                className="w-full py-2.5 px-3 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5 text-amber-400" />
                <span>تفريغ ذاكرة الملفات والفيديوهات المؤقتة</span>
              </button>
            ) : (
              <div className="p-3 rounded-2xl bg-slate-900 border border-amber-500/40 space-y-2.5">
                <p className="text-xs font-bold text-amber-200">
                  سيتم مسح الملفات والفيديوهات المحفوظة مؤقتاً في المتصفح لتوفير المساحة.
                </p>
                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setConfirmClearCache(false)}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold cursor-pointer"
                  >
                    إلغاء
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      await clearAllOfflineMedia();
                      setConfirmClearCache(false);
                      showNotice(
                        'success',
                        'تم تفريغ ذاكرة التنزيلات المؤقتة بنجاح.'
                      );
                    }}
                    className="px-3 py-1.5 rounded-xl bg-amber-600 text-white text-xs font-bold cursor-pointer"
                  >
                    تأكيد المسح
                  </button>
                </div>
              </div>
            )}
          </section>

          {/* SECTION 5: Accounts & Permissions */}
          <section className="bg-[#131D2E] border border-slate-800 rounded-2xl sm:rounded-3xl p-4 sm:p-5 space-y-3.5 shadow-md">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <div className="flex items-center gap-2">
                <User className="w-5 h-5 text-emerald-400" />
                <div>
                  <h2 className="text-sm sm:text-base font-black text-white">
                    5. الحسابات وتسجيل الدخول
                  </h2>
                  <p className="text-[11px] text-slate-400">
                    الحساب النشط: {user?.displayName || 'زائر'}
                  </p>
                </div>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-300 block mb-2">
                تبديل الحساب المؤقت المفصول (للاختبار وعزل الإحصائيات):
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => switchAccount('admin')}
                  className={`p-2.5 rounded-2xl border text-xs font-bold flex flex-col items-center gap-1 transition-all cursor-pointer ${
                    accountType === 'admin'
                      ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                      : 'bg-slate-900/80 border-slate-800 text-slate-400'
                  }`}
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>حساب المشرف</span>
                </button>

                <button
                  type="button"
                  onClick={() => switchAccount('student')}
                  className={`p-2.5 rounded-2xl border text-xs font-bold flex flex-col items-center gap-1 transition-all cursor-pointer ${
                    accountType === 'student'
                      ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                      : 'bg-slate-900/80 border-slate-800 text-slate-400'
                  }`}
                >
                  <User className="w-4 h-4" />
                  <span>حساب الطالب</span>
                </button>

                <button
                  type="button"
                  onClick={() => switchAccount('guest')}
                  className={`p-2.5 rounded-2xl border text-xs font-bold flex flex-col items-center gap-1 transition-all cursor-pointer ${
                    accountType === 'guest'
                      ? 'bg-sky-500/20 border-sky-500 text-sky-300'
                      : 'bg-slate-900/80 border-slate-800 text-slate-400'
                  }`}
                >
                  <Eye className="w-4 h-4" />
                  <span>وضع الضيف</span>
                </button>
              </div>
            </div>

            {canToggleRole && (
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-2">
                  التحويل السريع داخل حساب المشرف:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => quickSwitchPersona('admin')}
                    className={`p-2.5 rounded-2xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      isAdmin
                        ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                        : 'bg-slate-900/80 border-slate-800 text-slate-400'
                    }`}
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>وضع المشرف</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => quickSwitchPersona('student')}
                    className={`p-2.5 rounded-2xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      !isAdmin
                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                        : 'bg-slate-900/80 border-slate-800 text-slate-400'
                    }`}
                  >
                    <User className="w-4 h-4" />
                    <span>معاينة كطالب</span>
                  </button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsAuthModalOpen(true)}
                className="py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <User className="w-4 h-4" />
                <span>تسجيل الدخول</span>
              </button>

              <button
                type="button"
                onClick={() => signOut()}
                className="py-2.5 rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-300 hover:bg-rose-500/30 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>تسجيل الخروج</span>
              </button>
            </div>

            {isAdmin && (
              <div className="pt-2 border-t border-slate-800">
                {!confirmPurgeAll ? (
                  <button
                    type="button"
                    onClick={() => setConfirmPurgeAll(true)}
                    className="w-full py-2.5 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-300 hover:bg-amber-500/25 font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>إعادة ضبط بيانات المنصة بالكامل (للمشرف)</span>
                  </button>
                ) : (
                  <div className="p-3 rounded-2xl bg-slate-900 border border-amber-500/40 space-y-2">
                    <p className="text-xs font-bold text-amber-200">
                      هل أنت متأكد من تنظيف وإعادة ضبط جميع بيانات المنصة للوضع الأولي؟
                    </p>
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setConfirmPurgeAll(false)}
                        className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold cursor-pointer"
                      >
                        إلغاء
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          await clearAllOfflineMedia();
                          await purgeAllDemoData();
                          setConfirmPurgeAll(false);
                          showNotice('success', 'تمت إعادة ضبط بيانات المنصة بنجاح.');
                        }}
                        className="px-3 py-1.5 rounded-xl bg-amber-600 text-white text-xs font-bold cursor-pointer"
                      >
                        تأكيد إعادة الضبط
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};

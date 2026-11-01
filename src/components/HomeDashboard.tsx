import React, { useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { 
  CheckCircle2, 
  FolderArchive, 
  Video, 
  ShoppingBag, 
  Award, 
  Users, 
  ChevronLeft, 
  BookOpen,
  TrendingUp,
  HelpCircle,
} from 'lucide-react';
import { ActiveSection } from '../types';
import { computeQuestionStats } from '../utils/automationLogic';
import { getDensityLayoutClasses } from '../utils/settingsAndDensityLogic';

export const HomeDashboard: React.FC = () => {
  const {
    user,
    questions,
    subjects,
    solvedQuestions,
    libraryFiles,
    videos,
    setActiveSection,
    setSelectedSubjectId,
    setSelectedChapterId,
    eyeComfortMode,
    uiDensity,
  } = useApp();

  const density = getDensityLayoutClasses(uiDensity);

  const handleOpenSection = (section: ActiveSection) => {
    setActiveSection(section);
    setSelectedSubjectId(null);
    setSelectedChapterId(null);
  };

  const globalStats = useMemo(() => {
    return computeQuestionStats(questions, solvedQuestions);
  }, [questions, solvedQuestions]);

  const completionPercentage = useMemo(() => {
    if (globalStats.totalQuestions === 0) return 0;
    return Math.round((globalStats.solvedCount / globalStats.totalQuestions) * 100);
  }, [globalStats]);

  const mainCards = [
    {
      id: 'automation' as ActiveSection,
      title: 'بنك الأتمتة والامتحانات',
      subtitle: 'أقسام، محاضرات، شامل وجزئي، واختباراتي',
      icon: CheckCircle2,
      count: `${globalStats.totalQuestions} سؤال أتمتة`,
      color: 'text-rose-400',
      bgColor: 'bg-rose-500/15',
      borderColor: 'hover:border-rose-500/50',
    },
    {
      id: 'library' as ActiveSection,
      title: 'المكتبة والأرشيف',
      subtitle: 'ملفات، نوط، ومذكرات PDF',
      icon: FolderArchive,
      count: `${libraryFiles.length} ملف مرجعي`,
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/15',
      borderColor: 'hover:border-purple-500/50',
    },
    {
      id: 'videos' as ActiveSection,
      title: 'المرئيات والشروحات',
      subtitle: 'محاضرات وسلسلة فيديوهات',
      icon: Video,
      count: `${videos.length > 0 ? `${videos.length} فيديو تعليمي` : 'شروحات مصورة'}`,
      color: 'text-pink-400',
      bgColor: 'bg-pink-500/15',
      borderColor: 'hover:border-pink-500/50',
    },
    {
      id: 'marketplace' as ActiveSection,
      title: 'سوق المستلزمات',
      subtitle: 'بيع، إيجار، وإعارة الكتب',
      icon: ShoppingBag,
      count: 'مستلزمات ومعدات',
      color: 'text-amber-400',
      bgColor: 'bg-amber-500/15',
      borderColor: 'hover:border-amber-500/50',
    },
    {
      id: 'grades' as ActiveSection,
      title: 'العلامات والترتيب',
      subtitle: 'حاسبة المعدل وكشف الدرجات',
      icon: Award,
      count: 'معدل وتراكمي',
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/15',
      borderColor: 'hover:border-blue-500/50',
    },
    {
      id: 'discussions' as ActiveSection,
      title: 'الملتقى والمناقشات',
      subtitle: 'قناة الدفعة والمراسلة المباشرة',
      icon: Users,
      count: 'تواصل طلابي',
      color: 'text-cyan-400',
      bgColor: 'bg-cyan-500/15',
      borderColor: 'hover:border-cyan-500/50',
    },
  ];

  return (
    <div className={`w-full max-w-md mx-auto sm:max-w-3xl lg:max-w-5xl ${density.pageContainerPadding} ${density.sectionGap}`}>
      
      {/* Greeting row */}
      <div className="text-right space-y-0.5 sm:space-y-1">
        <p className="text-[11px] sm:text-sm text-slate-400 font-bold">
          أهلاً بك في منصة مدفور (MedFur) — كلية الطب البشري · جامعة الفرات
        </p>
        <h1 className="text-xl sm:text-3xl font-black text-emerald-400 tracking-tight truncate">
          {user?.displayName || 'زائر (وضع الضيف)'}
        </h1>
      </div>

      {/* 3 Real Dynamic Stats horizontal cards row (Questions Count, Subjects Count, Student Progress) */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4 tabular-nums">
        {/* Actual Questions count card */}
        <div
          onClick={() => handleOpenSection('automation')}
          className={`${eyeComfortMode ? 'bg-[#1D1B18] border-amber-900/40' : 'bg-[#152033] border-slate-800/90'} border hover:border-rose-500/40 rounded-2xl p-2.5 sm:p-4 text-center flex flex-col items-center justify-center space-y-1 cursor-pointer transition-colors min-h-[72px]`}
        >
          <div className="flex items-center gap-1 text-sm sm:text-base font-black text-white">
            <HelpCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-rose-400 shrink-0" />
            <span>{globalStats.totalQuestions}</span>
          </div>
          <span className="text-[10px] sm:text-xs text-slate-400 font-semibold leading-tight">سؤال أتمتة</span>
        </div>

        {/* Subjects count card */}
        <div
          onClick={() => handleOpenSection('automation')}
          className={`${eyeComfortMode ? 'bg-[#1D1B18] border-amber-900/40' : 'bg-[#152033] border-slate-800/90'} border hover:border-emerald-500/40 rounded-2xl p-2.5 sm:p-4 text-center flex flex-col items-center justify-center space-y-1 cursor-pointer transition-colors min-h-[72px]`}
        >
          <div className="flex items-center gap-1 text-sm sm:text-base font-black text-white">
            <BookOpen className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400 shrink-0" />
            <span>{subjects.length}</span>
          </div>
          <span className="text-[10px] sm:text-xs text-slate-400 font-semibold leading-tight">مادة دراسية</span>
        </div>

        {/* Student Completion / Progress percentage card */}
        <div
          onClick={() => handleOpenSection('automation')}
          className={`${eyeComfortMode ? 'bg-[#1D1B18] border-amber-900/40' : 'bg-[#152033] border-slate-800/90'} border hover:border-sky-500/40 rounded-2xl p-2.5 sm:p-4 text-center flex flex-col items-center justify-center space-y-1 cursor-pointer transition-colors min-h-[72px]`}
        >
          <div className="flex items-center gap-1 text-sm sm:text-base font-black text-white">
            <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-sky-400 shrink-0" />
            <span>{completionPercentage}%</span>
          </div>
          <span className="text-[10px] sm:text-xs text-slate-400 font-semibold leading-tight">
            الإنجاز ({globalStats.solvedCount}/{globalStats.totalQuestions})
          </span>
        </div>
      </div>

      {/* Title: الخدمات الأكاديمية */}
      <div className="pt-0.5 flex items-center justify-between">
        <h2 className={`text-sm sm:text-lg font-black ${eyeComfortMode ? 'text-[#F3EDE2]' : 'text-slate-900 dark:text-white'} text-right`}>
          الخدمات الأكاديمية
        </h2>
        <span className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 font-semibold">
          اختر القسم للمتابعة
        </span>
      </div>

      {/* Responsive Grid: Adapts to UI Density (More items per row & tighter spacing in compact mode) */}
      <div className={`grid ${density.homeServicesGrid}`}>
        {mainCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.id}
              onClick={() => handleOpenSection(card.id)}
              className={`group ${eyeComfortMode ? 'bg-[#1B1916] hover:bg-[#23201C] border-amber-900/30' : 'bg-[#131D2E] hover:bg-[#162238] border-slate-800/90'} border ${card.borderColor} ${density.cardRadius} ${density.cardPadding} text-right flex flex-col justify-between transition-all duration-200 cursor-pointer shadow-md ${density.homeCardMinHeight} relative overflow-hidden active:scale-[0.98]`}
            >
              {/* Top Row: Icon & Arrow */}
              <div className="flex items-center justify-between">
                <div className={`${density.isCompact ? 'w-8 h-8 rounded-xl' : 'w-10 h-10 sm:w-11 sm:h-11 rounded-2xl'} ${card.bgColor} border border-white/5 flex items-center justify-center ${card.color} group-hover:scale-105 transition-transform`}>
                  <Icon className={density.isCompact ? 'w-4 h-4' : 'w-5 h-5 sm:w-6 sm:h-6'} />
                </div>
                <div className="text-slate-600 group-hover:text-slate-300 transition-colors">
                  <ChevronLeft className="w-4 h-4" />
                </div>
              </div>

              {/* Bottom: Title & Subtitle */}
              <div className="mt-3 sm:mt-4 space-y-0.5 sm:space-y-1">
                <h3 className={`font-black text-xs sm:text-base text-white group-hover:${card.color} transition-colors line-clamp-1`}>
                  {card.title}
                </h3>
                <p className="text-[10px] sm:text-xs text-slate-400 line-clamp-1">
                  {card.subtitle}
                </p>
                <div className="pt-0.5">
                  <span className="inline-block text-[10px] font-bold text-slate-400 tabular-nums">
                    {card.count}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
};


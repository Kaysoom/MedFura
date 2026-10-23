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
  HelpCircle
} from 'lucide-react';
import { ActiveSection } from '../types';
import { computeQuestionStats } from '../utils/automationLogic';

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
  } = useApp();

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
      subtitle: 'أقسام، محاضرات، شامل وجزئي',
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
    <div className="max-w-md mx-auto sm:max-w-3xl lg:max-w-4xl px-4 py-4 space-y-6">
      
      {/* Greeting row */}
      <div className="text-right space-y-1">
        <p className="text-xs sm:text-sm text-slate-400 font-bold">
          أهلاً بك في منصة مدفور (MedFur) — كلية الطب البشري · جامعة الفرات
        </p>
        <h1 className="text-2xl sm:text-3xl font-black text-emerald-400 tracking-tight">
          {user?.displayName || 'د. محمد'}
        </h1>
      </div>

      {/* 3 Real Dynamic Stats horizontal cards row (Questions Count, Subjects Count, Student Progress) */}
      <div className="grid grid-cols-3 gap-2.5 sm:gap-4 tabular-nums">
        {/* Actual Questions count card */}
        <div
          onClick={() => handleOpenSection('automation')}
          className={`${eyeComfortMode ? 'bg-[#1D1B18] border-amber-900/40' : 'bg-[#152033] border-slate-800/90'} border hover:border-rose-500/40 rounded-2xl p-3 sm:p-4 text-center flex flex-col items-center justify-center space-y-1 cursor-pointer transition-colors`}
        >
          <div className="flex items-center gap-1.5 text-sm sm:text-base font-black text-white">
            <HelpCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{globalStats.totalQuestions}</span>
          </div>
          <span className="text-[10px] sm:text-xs text-slate-400 font-semibold">سؤال أتمتة فعلي</span>
        </div>

        {/* Subjects count card */}
        <div
          onClick={() => handleOpenSection('automation')}
          className={`${eyeComfortMode ? 'bg-[#1D1B18] border-amber-900/40' : 'bg-[#152033] border-slate-800/90'} border hover:border-emerald-500/40 rounded-2xl p-3 sm:p-4 text-center flex flex-col items-center justify-center space-y-1 cursor-pointer transition-colors`}
        >
          <div className="flex items-center gap-1.5 text-sm sm:text-base font-black text-white">
            <BookOpen className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{subjects.length}</span>
          </div>
          <span className="text-[10px] sm:text-xs text-slate-400 font-semibold">مادة دراسية</span>
        </div>

        {/* Student Completion / Progress percentage card */}
        <div
          onClick={() => handleOpenSection('automation')}
          className={`${eyeComfortMode ? 'bg-[#1D1B18] border-amber-900/40' : 'bg-[#152033] border-slate-800/90'} border hover:border-sky-500/40 rounded-2xl p-3 sm:p-4 text-center flex flex-col items-center justify-center space-y-1 cursor-pointer transition-colors`}
        >
          <div className="flex items-center gap-1.5 text-sm sm:text-base font-black text-white">
            <TrendingUp className="w-4 h-4 text-sky-400 shrink-0" />
            <span>{completionPercentage}%</span>
          </div>
          <span className="text-[10px] sm:text-xs text-slate-400 font-semibold">
            نسبة الإنجاز ({globalStats.solvedCount}/{globalStats.totalQuestions})
          </span>
        </div>
      </div>

      {/* Title: الخدمات الأكاديمية */}
      <div className="pt-1 flex items-center justify-between">
        <h2 className={`text-base sm:text-lg font-black ${eyeComfortMode ? 'text-[#F3EDE2]' : 'text-slate-900 dark:text-white'} text-right`}>
          الخدمات الأكاديمية
        </h2>
        <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold">
          اختر القسم للمتابعة
        </span>
      </div>

      {/* 2x3 Grid */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4.5">
        {mainCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.id}
              onClick={() => handleOpenSection(card.id)}
              className={`group ${eyeComfortMode ? 'bg-[#1B1916] hover:bg-[#23201C] border-amber-900/30' : 'bg-[#131D2E] hover:bg-[#162238] border-slate-800/90'} border ${card.borderColor} rounded-3xl p-4 sm:p-5 text-right flex flex-col justify-between transition-all duration-200 cursor-pointer shadow-md min-h-[155px] sm:min-h-[170px] relative overflow-hidden`}
            >
              {/* Top Row: Icon & Arrow */}
              <div className="flex items-center justify-between">
                <div className={`w-11 h-11 rounded-2xl ${card.bgColor} border border-white/5 flex items-center justify-center ${card.color} group-hover:scale-105 transition-transform`}>
                  <Icon className="w-6 h-6" />
                </div>
                <div className="text-slate-600 group-hover:text-slate-300 transition-colors">
                  <ChevronLeft className="w-4 h-4" />
                </div>
              </div>

              {/* Bottom: Title & Subtitle */}
              <div className="mt-4 space-y-1">
                <h3 className={`font-black text-sm sm:text-base text-white group-hover:${card.color} transition-colors line-clamp-1`}>
                  {card.title}
                </h3>
                <p className="text-[11px] sm:text-xs text-slate-400 line-clamp-1">
                  {card.subtitle}
                </p>
                <div className="pt-1">
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


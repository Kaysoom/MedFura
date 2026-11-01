import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { ActiveSection, ColorThemeId, DarkModeSchedule } from '../types';
import {
  Menu,
  X,
  Bell,
  Moon,
  Sun,
  Settings,
  CheckCircle2,
  Video,
  Award,
  ShoppingBag,
  Users,
  Building,
  Info,
  Headphones,
  Timer,
  ShieldCheck,
  User,
  LogOut,
  FolderArchive,
  Home,
  Eye,
  Play,
  Pause,
  RotateCcw,
  Download,
  Palette,
  Search,
  BookOpen,
  FileText,
  HelpCircle,
  CheckCheck,
  Clock,
  Laptop,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { usePWAInstall, MedFurMonogramBadge } from './Common/PWAInstallPrompt';
import { clearAllOfflineMedia } from '../utils/fileHelpers';

export const COLOR_THEMES: {
  id: ColorThemeId;
  label: string;
  swatchClass: string;
  ringClass: string;
  badgeText: string;
}[] = [
  {
    id: 'emerald',
    label: 'الأخضر الزمردي',
    swatchClass: 'bg-emerald-500',
    ringClass: 'ring-emerald-400',
    badgeText: 'الافتراضي',
  },
  {
    id: 'sky',
    label: 'الأزرق السماوي',
    swatchClass: 'bg-sky-500',
    ringClass: 'ring-sky-400',
    badgeText: 'سماوي',
  },
  {
    id: 'orange',
    label: 'البرتقالي الحيوي',
    swatchClass: 'bg-orange-500',
    ringClass: 'ring-orange-400',
    badgeText: 'برتقالي',
  },
  {
    id: 'purple',
    label: 'البنفسجي العصري',
    swatchClass: 'bg-purple-500',
    ringClass: 'ring-purple-400',
    badgeText: 'بنفسجي',
  },
  {
    id: 'rose',
    label: 'الوردي المرجاني',
    swatchClass: 'bg-rose-500',
    ringClass: 'ring-rose-400',
    badgeText: 'مرجاني',
  },
];

export const Header: React.FC = () => {
  const {
    user,
    isAdmin,
    isGuest,
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
    activeSection,
    setActiveSection,
    setSelectedSubjectId,
    setSelectedChapterId,
    quickSwitchPersona,
    switchAccount,
    subjects,
    questions,
    libraryFiles,
    libraryFolders,
    marketplaceItems,
    notifications,
    unreadNotificationsCount,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    purgeAllDemoData,
  } = useApp();

  const { isStandalone, triggerInstall } = usePWAInstall();

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showTimerModal, setShowTimerModal] = useState(false);
  const [showThemePopover, setShowThemePopover] = useState(false);
  const [showNotificationsPopover, setShowNotificationsPopover] = useState(false);
  const [notifFilter, setNotifFilter] = useState<'all' | 'unread'>('all');

  // Global Search State
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [searchCategoryFilter, setSearchCategoryFilter] = useState<
    'all' | 'automation' | 'library' | 'marketplace'
  >('all');
  const searchContainerRef = useRef<HTMLDivElement | null>(null);

  // Close popovers when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(e.target as Node)
      ) {
        setIsSearchFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Built-in Pomodoro Study Timer State (25 mins default)
  const [timerSeconds, setTimerSeconds] = useState(25 * 60);
  const [isTimerRunning, setIsTimerRunning] = useState(false);

  useEffect(() => {
    if (!isTimerRunning) return;
    const interval = setInterval(() => {
      setTimerSeconds((prev) => {
        if (prev <= 1) {
          setIsTimerRunning(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isTimerRunning]);

  const formatTimer = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const rem = secs % 60;
    return `${String(mins).padStart(2, '0')}:${String(rem).padStart(2, '0')}`;
  };

  // Global Search Computation across Automation (Subjects & Questions), Library (Files & Folders), and Marketplace
  const globalSearchResults = useMemo(() => {
    const q = globalSearchQuery.trim().toLowerCase();
    if (!q) {
      return {
        subjects: [],
        questions: [],
        libraryFiles: [],
        libraryFolders: [],
        marketplace: [],
        total: 0,
      };
    }

    const matchedSubjects = subjects
      .filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          (s.department && s.department.toLowerCase().includes(q)) ||
          (s.chapters || []).some((ch) => ch.name.toLowerCase().includes(q))
      )
      .slice(0, 6);

    const matchedQuestions = questions
      .filter(
        (item) =>
          item.questionText.toLowerCase().includes(q) ||
          (item.explanation && item.explanation.toLowerCase().includes(q)) ||
          (item.chapterName && item.chapterName.toLowerCase().includes(q))
      )
      .slice(0, 8);

    const matchedLibFiles = libraryFiles
      .filter(
        (f) =>
          f.title.toLowerCase().includes(q) ||
          f.author.toLowerCase().includes(q) ||
          f.fileType.toLowerCase().includes(q)
      )
      .slice(0, 8);

    const matchedLibFolders = libraryFolders
      .filter((fld) => fld.name.toLowerCase().includes(q))
      .slice(0, 4);

    const matchedMarketplace = marketplaceItems
      .filter(
        (m) =>
          m.title.toLowerCase().includes(q) ||
          m.description.toLowerCase().includes(q) ||
          m.category.toLowerCase().includes(q) ||
          m.dealType.toLowerCase().includes(q) ||
          m.sellerName.toLowerCase().includes(q)
      )
      .slice(0, 6);

    const total =
      matchedSubjects.length +
      matchedQuestions.length +
      matchedLibFiles.length +
      matchedLibFolders.length +
      matchedMarketplace.length;

    return {
      subjects: matchedSubjects,
      questions: matchedQuestions,
      libraryFiles: matchedLibFiles,
      libraryFolders: matchedLibFolders,
      marketplace: matchedMarketplace,
      total,
    };
  }, [globalSearchQuery, subjects, questions, libraryFiles, libraryFolders, marketplaceItems]);

  const filteredNotifications = useMemo(() => {
    if (notifFilter === 'unread') {
      return notifications.filter((n) => !n.isRead);
    }
    return notifications;
  }, [notifications, notifFilter]);

  const menuItems = [
    { id: 'home' as ActiveSection, label: 'الصفحة الرئيسية', icon: Home, color: 'text-emerald-400 bg-emerald-500/15' },
    { id: 'automation' as ActiveSection, label: 'بنك الأتمتة', icon: CheckCircle2, color: 'text-rose-400 bg-rose-500/15' },
    { id: 'library' as ActiveSection, label: 'المكتبة والأرشيف', icon: FolderArchive, color: 'text-purple-400 bg-purple-500/15' },
    { id: 'videos' as ActiveSection, label: 'المرئيات والشروحات', icon: Video, color: 'text-pink-400 bg-pink-500/15' },
    { id: 'grades' as ActiveSection, label: 'العلامات والترتيب', icon: Award, color: 'text-blue-400 bg-blue-500/15' },
    { id: 'marketplace' as ActiveSection, label: 'سوق المستلزمات', icon: ShoppingBag, color: 'text-amber-400 bg-amber-500/15' },
    { id: 'discussions' as ActiveSection, label: 'الملتقى الطلابي', icon: Users, color: 'text-cyan-400 bg-cyan-500/15' },
    { id: 'announcements' as ActiveSection, label: 'دليل الكلية والإعلانات', icon: Building, color: 'text-slate-400 bg-slate-500/15' },
    { id: 'about' as ActiveSection, label: 'من نحن وأعمالنا', icon: Info, color: 'text-teal-400 bg-teal-500/15' },
  ];

  const handleSelectNav = (id: ActiveSection) => {
    setActiveSection(id);
    setSelectedSubjectId(null);
    setSelectedChapterId(null);
    setIsDrawerOpen(false);
  };

  return (
    <>
      {/* Unified Top Header Bar with Global Search, Vibrant Themes & Notifications */}
      <header
        className={`sticky top-0 z-40 ${
          eyeComfortMode
            ? darkMode
              ? 'bg-[#171512]/95 border-amber-900/40'
              : 'bg-[#FBF6EB]/95 border-[#DCCBB1]'
            : darkMode
            ? 'bg-[#0B132B]/90 border-slate-800/80'
            : 'bg-white/95 border-slate-200'
        } backdrop-blur-md border-b transition-colors`}
      >
        <div className="max-w-md mx-auto sm:max-w-3xl lg:max-w-5xl px-2.5 sm:px-4 py-1.5 sm:py-2 space-y-1.5">
          {/* Top Row: Menu + MedFur Brand + Role Switcher (Admin only) + Theme/Eye/Notifications */}
          <div className="flex items-center justify-between gap-1">
            {/* Right Side (First in RTL): 3 Horizontal Lines (☰ Menu) & Pure MedFur Text Brand */}
            <div className="flex items-center gap-1 sm:gap-1.5 min-w-0">
              <button
                onClick={() => setIsDrawerOpen(true)}
                aria-label="القائمة الجانبية"
                className="p-2 rounded-xl text-slate-200 hover:text-white hover:bg-slate-800/80 transition-colors cursor-pointer shrink-0"
                title="القائمة الجانبية"
              >
                <Menu className="w-5 h-5 stroke-[2.2]" />
              </button>

              <button
                onClick={() => {
                  setActiveSection('home');
                  setSelectedSubjectId(null);
                  setSelectedChapterId(null);
                }}
                aria-label="MedFur الصفحة الأساسية"
                className="flex items-center gap-2 cursor-pointer group min-w-0 px-1.5 py-1 rounded-xl hover:bg-white/5 transition-colors"
                title="MedFur - اضغط للعودة إلى الصفحة الرئيسية"
              >
                <MedFurMonogramBadge className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl shadow-md group-hover:scale-105 transition-transform" />
                <span className="font-black text-base sm:text-lg tracking-tight bg-clip-text text-transparent medfur-brand-gradient bg-gradient-to-l from-emerald-400 to-sky-400">
                  MedFur
                </span>
              </button>
            </div>

            {/* Center: Role Switcher ONLY for Admin Account; Login button for Guest; Hidden for Standalone Student */}
            <div className="flex items-center gap-1 shrink-0">
              {canToggleRole && (
                <button
                  onClick={() => quickSwitchPersona(isAdmin ? 'student' : 'admin')}
                  className={`px-2 py-1 rounded-full text-[10px] sm:text-[11px] font-bold border transition-all cursor-pointer flex items-center gap-1 ${
                    isAdmin
                      ? 'bg-amber-500/20 border-amber-500/40 text-amber-500 dark:text-amber-300'
                      : 'bg-emerald-500/20 border-emerald-500/40 text-emerald-600 dark:text-emerald-300'
                  }`}
                  title="حساب المشرف: انقر للتبديل بين وضع المشرف ومعاينة واجهة الطالب"
                >
                  {isAdmin ? (
                    <ShieldCheck className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-400 shrink-0" />
                  ) : (
                    <User className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-400 shrink-0" />
                  )}
                  <span className="whitespace-nowrap">
                    {isAdmin ? 'وضع المشرف' : 'معاينة كطالب'}
                  </span>
                </button>
              )}

              {isGuest && !canToggleRole && (
                <button
                  type="button"
                  onClick={() => setIsAuthModalOpen(true)}
                  className="px-2.5 py-1 rounded-full text-[10px] sm:text-[11px] font-bold border bg-sky-500/15 border-sky-500/40 text-sky-400 hover:bg-sky-500/25 transition-all cursor-pointer flex items-center gap-1"
                  title="تسجيل الدخول أو تبديل الحساب"
                >
                  <User className="w-3 h-3 shrink-0" />
                  <span className="whitespace-nowrap">وضع الضيف · دخول</span>
                </button>
              )}
            </div>

            {/* Left Side (Last in RTL): Install App, Vibrant Theme Palette, Eye Comfort, Dark/Light & Notification Bell */}
            <div className="flex items-center gap-1 shrink-0">
              {!isStandalone && (
                <button
                  type="button"
                  onClick={triggerInstall}
                  className="px-2 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-400 text-[11px] font-black flex items-center gap-1 transition-colors cursor-pointer"
                  title="تثبيت تطبيق MedFur على الهاتف أو الحاسوب"
                  aria-label="تثبيت التطبيق"
                >
                  <Download className="w-3.5 h-3.5 shrink-0" />
                  <span className="hidden sm:inline">تثبيت التطبيق</span>
                </button>
              )}

              {/* Unified Settings Button in Top Bar (Opens Full-Page Settings) */}
              <button
                type="button"
                onClick={() => {
                  setShowThemePopover(false);
                  setShowNotificationsPopover(false);
                  handleSelectNav('settings');
                }}
                className={`px-2.5 py-1.5 rounded-xl border text-[11px] font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                  activeSection === 'settings'
                    ? 'bg-emerald-600 border-emerald-400 text-white'
                    : 'bg-slate-800/80 hover:bg-slate-700 border-slate-700 text-slate-200'
                }`}
                title="الإعدادات (الكثافة، الأوضاع، الألوان، والنسخ الاحتياطي)"
                aria-label="الإعدادات"
              >
                <Settings className={`w-3.5 h-3.5 shrink-0 ${activeSection === 'settings' ? 'text-white' : 'text-emerald-400'}`} />
                <span className="hidden sm:inline">الإعدادات</span>
              </button>

              {/* Local Notifications Bell with Unread Badge & Firebase Sync */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setShowNotificationsPopover((prev) => !prev);
                    setShowThemePopover(false);
                  }}
                  className="relative p-1.5 sm:p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800/60 transition-colors cursor-pointer"
                  title="مركز التنبيهات المحلية والإعلانات"
                  aria-label="التنبيهات"
                >
                  <Bell className="w-4 h-4" />
                  {unreadNotificationsCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-emerald-500 text-white text-[9px] font-black flex items-center justify-center shadow-sm">
                      {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
                    </span>
                  )}
                </button>

                {/* Local Notifications Dropdown Panel */}
                {showNotificationsPopover && (
                  <>
                    <div
                      onClick={() => setShowNotificationsPopover(false)}
                      className="fixed inset-0 z-40"
                    />
                    <div className="absolute left-0 mt-2 w-80 sm:w-96 max-w-[92vw] rounded-2xl bg-[#0E172A] border border-slate-700/90 shadow-2xl p-3.5 z-50 text-white space-y-3 animate-in fade-in zoom-in-95 duration-150">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setShowNotificationsPopover(false)}
                            className="p-1 rounded-lg text-slate-400 hover:text-white cursor-pointer"
                          >
                            <X className="w-4 h-4" />
                          </button>
                          {unreadNotificationsCount > 0 && (
                            <button
                              type="button"
                              onClick={() => markAllNotificationsAsRead()}
                              className="px-2 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-400 text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                            >
                              <CheckCheck className="w-3 h-3" />
                              <span>تحديد الكل كمقروء</span>
                            </button>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-black text-xs text-white">التنبيهات والإشعارات</span>
                          <Bell className="w-4 h-4 text-emerald-400" />
                        </div>
                      </div>

                      {/* Filter Tabs */}
                      <div className="flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setShowNotificationsPopover(false);
                            handleSelectNav('announcements');
                          }}
                          className="text-[10px] font-bold text-emerald-400 hover:underline cursor-pointer"
                        >
                          كل الإعلانات &larr;
                        </button>
                        <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
                          <button
                            type="button"
                            onClick={() => setNotifFilter('all')}
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold cursor-pointer transition-colors ${
                              notifFilter === 'all'
                                ? 'bg-emerald-600 text-white'
                                : 'text-slate-400 hover:text-white'
                            }`}
                          >
                            الكل ({notifications.length})
                          </button>
                          <button
                            type="button"
                            onClick={() => setNotifFilter('unread')}
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold cursor-pointer transition-colors ${
                              notifFilter === 'unread'
                                ? 'bg-emerald-600 text-white'
                                : 'text-slate-400 hover:text-white'
                            }`}
                          >
                            غير مقروء ({unreadNotificationsCount})
                          </button>
                        </div>
                      </div>

                      {/* Notifications List */}
                      <div className="max-h-72 overflow-y-auto space-y-1.5 pr-0.5">
                        {filteredNotifications.length === 0 ? (
                          <div className="py-8 text-center text-xs text-slate-400 space-y-1">
                            <Bell className="w-7 h-7 mx-auto text-slate-600 stroke-[1.5]" />
                            <p className="font-bold">لا توجد تنبيهات غير مقروءة حالياً</p>
                          </div>
                        ) : (
                          filteredNotifications.map((notif) => (
                            <button
                              key={notif.id}
                              type="button"
                              onClick={() => {
                                markNotificationAsRead(notif.id);
                                setShowNotificationsPopover(false);
                                handleSelectNav(notif.targetSection);
                              }}
                              className={`w-full text-right p-2.5 rounded-xl border transition-all flex items-start justify-between gap-2.5 cursor-pointer ${
                                notif.isRead
                                  ? 'bg-slate-900/50 border-slate-800/80 text-slate-400 hover:bg-slate-800/60'
                                  : 'bg-slate-800/90 border-emerald-500/40 text-white hover:bg-slate-800'
                              }`}
                            >
                              <div className="flex flex-col items-start gap-1 shrink-0">
                                <span className="text-[9px] text-slate-400">{notif.createdAt}</span>
                                {!notif.isRead && (
                                  <span className="w-2 h-2 rounded-full bg-emerald-400 self-end" />
                                )}
                              </div>

                              <div className="flex items-start gap-2.5 min-w-0 flex-1 justify-end">
                                <div className="min-w-0 flex-1 text-right">
                                  <p
                                    className={`text-xs font-bold truncate ${
                                      notif.isRead ? 'text-slate-300' : 'text-white'
                                    }`}
                                  >
                                    {notif.title}
                                  </p>
                                  <p className="text-[11px] text-slate-400 line-clamp-2 mt-0.5">
                                    {notif.message}
                                  </p>
                                </div>
                                <div
                                  className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                                    notif.category === 'library'
                                      ? 'bg-purple-500/15 text-purple-400'
                                      : 'bg-emerald-500/15 text-emerald-400'
                                  }`}
                                >
                                  {notif.category === 'library' ? (
                                    <FolderArchive className="w-4 h-4" />
                                  ) : (
                                    <Building className="w-4 h-4" />
                                  )}
                                </div>
                              </div>
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Second Row in Top Header: Global Search Bar (شريط البحث العالمي لجميع الأقسام: المكتبة، الأتمتة، المستلزمات) */}
          <div ref={searchContainerRef} className="relative w-full">
            <div
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all ${
                isSearchFocused
                  ? 'bg-slate-900/95 border-emerald-500/60 ring-2 ring-emerald-500/20'
                  : darkMode
                  ? 'bg-slate-900/75 border-slate-800/90 hover:border-slate-700'
                  : 'bg-slate-100 border-slate-300/90 hover:border-slate-400'
              }`}
            >
              <Search className="w-4 h-4 text-emerald-400 shrink-0" />
              <input
                type="text"
                value={globalSearchQuery}
                onFocus={() => setIsSearchFocused(true)}
                onChange={(e) => {
                  setGlobalSearchQuery(e.target.value);
                  setIsSearchFocused(true);
                }}
                placeholder="ابحث فوراً في جميع الأقسام (المكتبة، بنك الأتمتة، المستلزمات الطبية)..."
                className={`w-full bg-transparent text-xs font-medium focus:outline-none text-right ${
                  darkMode ? 'text-white placeholder:text-slate-400' : 'text-slate-900 placeholder:text-slate-500'
                }`}
              />
              {globalSearchQuery && (
                <button
                  type="button"
                  onClick={() => setGlobalSearchQuery('')}
                  className="p-0.5 rounded-lg text-slate-400 hover:text-white cursor-pointer shrink-0"
                  aria-label="مسح البحث"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Instant Global Search Results Dropdown */}
            {isSearchFocused && globalSearchQuery.trim().length > 0 && (
              <div className="absolute right-0 left-0 mt-1.5 rounded-2xl bg-[#0E172A] border border-slate-700/90 shadow-2xl p-3 z-50 text-white max-h-[72vh] overflow-y-auto space-y-3 animate-in fade-in slide-in-from-top-1 duration-150">
                {/* Category Filter Pills */}
                <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-800 flex-wrap">
                  <span className="text-[11px] font-bold text-emerald-400">
                    نتائج البحث الفورية ({globalSearchResults.total})
                  </span>
                  <div className="flex items-center gap-1 flex-wrap">
                    {(
                      [
                        { id: 'all', label: 'الكل' },
                        {
                          id: 'automation',
                          label: `الأتمتة (${
                            globalSearchResults.subjects.length + globalSearchResults.questions.length
                          })`,
                        },
                        {
                          id: 'library',
                          label: `المكتبة (${
                            globalSearchResults.libraryFiles.length + globalSearchResults.libraryFolders.length
                          })`,
                        },
                        {
                          id: 'marketplace',
                          label: `المستلزمات (${globalSearchResults.marketplace.length})`,
                        },
                      ] as const
                    ).map((tab) => (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setSearchCategoryFilter(tab.id)}
                        className={`px-2 py-1 rounded-lg text-[10px] font-bold cursor-pointer transition-colors ${
                          searchCategoryFilter === tab.id
                            ? 'bg-emerald-600 text-white'
                            : 'bg-slate-800 text-slate-300 hover:text-white'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                </div>

                {globalSearchResults.total === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-400 space-y-1">
                    <Search className="w-7 h-7 mx-auto text-slate-600 stroke-[1.5]" />
                    <p className="font-bold">لم يتم العثور على نتائج مطابقة لـ "{globalSearchQuery}"</p>
                    <p className="text-[11px] text-slate-500">
                      جرّب البحث باسم مادة، سؤال أتمتة، محاضرة في المكتبة، أو أداة طبية في السوق
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* 1. Automation Bank Results (Subjects & Questions) */}
                    {(searchCategoryFilter === 'all' || searchCategoryFilter === 'automation') &&
                      (globalSearchResults.subjects.length > 0 ||
                        globalSearchResults.questions.length > 0) && (
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-end gap-1.5 text-[11px] font-black text-rose-400 px-1">
                            <span>بنك الأتمتة والمواد الدراسية</span>
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          </div>

                          {globalSearchResults.subjects.map((sub) => (
                            <button
                              key={sub.id}
                              type="button"
                              onClick={() => {
                                setActiveSection('automation');
                                setSelectedSubjectId(sub.id);
                                setSelectedChapterId(null);
                                setIsSearchFocused(false);
                              }}
                              className="w-full p-2.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 flex items-center justify-between gap-2 text-right transition-colors cursor-pointer"
                            >
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 shrink-0">
                                {sub.questionsCount} سؤال
                              </span>
                              <div className="flex items-center gap-2 min-w-0">
                                <div className="min-w-0 text-right">
                                  <p className="text-xs font-bold text-white truncate">{sub.name}</p>
                                  <p className="text-[10px] text-slate-400 truncate">
                                    {sub.department || 'مقرر أكاديمي'} • اضغط لفتح بنك المادة
                                  </p>
                                </div>
                                <div className="w-7 h-7 rounded-lg bg-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0">
                                  <BookOpen className="w-3.5 h-3.5" />
                                </div>
                              </div>
                            </button>
                          ))}

                          {globalSearchResults.questions.map((qItem) => {
                            const sub = subjects.find((s) => s.id === qItem.subjectId);
                            return (
                              <button
                                key={qItem.id}
                                type="button"
                                onClick={() => {
                                  setActiveSection('automation');
                                  setSelectedSubjectId(qItem.subjectId);
                                  setSelectedChapterId(qItem.chapterId || null);
                                  setIsSearchFocused(false);
                                }}
                                className="w-full p-2.5 rounded-xl bg-slate-900/60 hover:bg-slate-800 border border-slate-800/80 flex items-center justify-between gap-2 text-right transition-colors cursor-pointer"
                              >
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-300 shrink-0">
                                  سؤال أتمتة
                                </span>
                                <div className="flex items-center gap-2 min-w-0">
                                  <div className="min-w-0 text-right">
                                    <p className="text-xs font-bold text-slate-100 line-clamp-1">
                                      {qItem.questionText}
                                    </p>
                                    <p className="text-[10px] text-slate-400 truncate">
                                      {sub?.name || 'مقرر طبي'} • {qItem.chapterName || 'قسم الأتمتة'}
                                    </p>
                                  </div>
                                  <div className="w-7 h-7 rounded-lg bg-rose-500/15 text-rose-400 flex items-center justify-center shrink-0">
                                    <HelpCircle className="w-3.5 h-3.5" />
                                  </div>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      )}

                    {/* 2. Library & Archive Results */}
                    {(searchCategoryFilter === 'all' || searchCategoryFilter === 'library') &&
                      (globalSearchResults.libraryFiles.length > 0 ||
                        globalSearchResults.libraryFolders.length > 0) && (
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-end gap-1.5 text-[11px] font-black text-purple-400 px-1">
                            <span>المكتبة والأرشيف</span>
                            <FolderArchive className="w-3.5 h-3.5" />
                          </div>

                          {globalSearchResults.libraryFolders.map((fld) => (
                            <button
                              key={fld.id}
                              type="button"
                              onClick={() => {
                                setActiveSection('library');
                                setIsSearchFocused(false);
                              }}
                              className="w-full p-2.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 flex items-center justify-between gap-2 text-right transition-colors cursor-pointer"
                            >
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-300 shrink-0">
                                مجلد
                              </span>
                              <div className="flex items-center gap-2 min-w-0">
                                <p className="text-xs font-bold text-white truncate">{fld.name}</p>
                                <div className="w-7 h-7 rounded-lg bg-purple-500/15 text-purple-400 flex items-center justify-center shrink-0">
                                  <FolderArchive className="w-3.5 h-3.5" />
                                </div>
                              </div>
                            </button>
                          ))}

                          {globalSearchResults.libraryFiles.map((file) => (
                            <button
                              key={file.id}
                              type="button"
                              onClick={() => {
                                setActiveSection('library');
                                setIsSearchFocused(false);
                              }}
                              className="w-full p-2.5 rounded-xl bg-slate-900/60 hover:bg-slate-800 border border-slate-800/80 flex items-center justify-between gap-2 text-right transition-colors cursor-pointer"
                            >
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-300 shrink-0">
                                {file.fileSize}
                              </span>
                              <div className="flex items-center gap-2 min-w-0">
                                <div className="min-w-0 text-right">
                                  <p className="text-xs font-bold text-white truncate">{file.title}</p>
                                  <p className="text-[10px] text-slate-400 truncate">
                                    {file.fileType} • إعداد: {file.author}
                                  </p>
                                </div>
                                <div className="w-7 h-7 rounded-lg bg-purple-500/15 text-purple-400 flex items-center justify-center shrink-0">
                                  <FileText className="w-3.5 h-3.5" />
                                </div>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}

                    {/* 3. Student Marketplace Results */}
                    {(searchCategoryFilter === 'all' || searchCategoryFilter === 'marketplace') &&
                      globalSearchResults.marketplace.length > 0 && (
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-end gap-1.5 text-[11px] font-black text-amber-400 px-1">
                            <span>سوق المستلزمات الطبية</span>
                            <ShoppingBag className="w-3.5 h-3.5" />
                          </div>

                          {globalSearchResults.marketplace.map((item) => (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => {
                                setActiveSection('marketplace');
                                setIsSearchFocused(false);
                              }}
                              className="w-full p-2.5 rounded-xl bg-slate-900/70 hover:bg-slate-800 border border-slate-800 flex items-center justify-between gap-2 text-right transition-colors cursor-pointer"
                            >
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 shrink-0">
                                {item.dealType} • {item.price}
                              </span>
                              <div className="flex items-center gap-2 min-w-0">
                                <div className="min-w-0 text-right">
                                  <p className="text-xs font-bold text-white truncate">{item.title}</p>
                                  <p className="text-[10px] text-slate-400 truncate">
                                    {item.category} • {item.sellerName} ({item.status})
                                  </p>
                                </div>
                                <div className="w-7 h-7 rounded-lg bg-amber-500/15 text-amber-400 flex items-center justify-center shrink-0">
                                  <ShoppingBag className="w-3.5 h-3.5" />
                                </div>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Side Drawer Menu */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            onClick={() => setIsDrawerOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in"
          />

          {/* Drawer container (Right side in RTL) - Clean & Uncluttered */}
          <div className="relative w-full max-w-[295px] sm:max-w-sm bg-[#0E172A] border-l border-slate-800 h-full shadow-2xl z-10 flex flex-col justify-between overflow-y-auto animate-in slide-in-from-right duration-200 text-slate-100">
            {/* Compact Clean User Profile Header */}
            <div className="p-4 border-b border-slate-800/80 space-y-3">
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setIsDrawerOpen(false)}
                  className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                  title="إغلاق القائمة"
                >
                  <X className="w-4 h-4" />
                </button>

                <div className="flex items-center gap-2.5 text-right">
                  <div>
                    <div className="flex items-center justify-end gap-2">
                      <span className="font-black text-xs text-emerald-400 tracking-tight">MedFur</span>
                      <h3 className="font-bold text-sm text-white">
                        {user?.displayName || 'طالب طب بشري'}
                      </h3>
                    </div>
                    <span className="inline-block px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold border border-emerald-500/30 mt-1">
                      {user?.batch || 'كلية الطب البشري'} · جامعة الفرات
                    </span>
                  </div>
                  <MedFurMonogramBadge className="w-10 h-10 rounded-xl shadow-md" />
                </div>
              </div>

              {/* Single Clean Button to Open Full-Page Settings (Density, Modes, Colors, Accounts & Backup) */}
              <button
                type="button"
                onClick={() => {
                  handleSelectNav('settings');
                }}
                className="w-full p-3 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-slate-700/80 flex items-center justify-between text-right transition-all cursor-pointer group"
              >
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  الكثافة · الأوضاع · الحساب
                </span>
                <div className="flex items-center gap-2.5">
                  <span className="font-black text-xs text-white group-hover:text-emerald-400 transition-colors">
                    صفحة الإعدادات
                  </span>
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center">
                    <Settings className="w-4 h-4" />
                  </div>
                </div>
              </button>

              {!isStandalone && (
                <button
                  type="button"
                  onClick={() => {
                    setIsDrawerOpen(false);
                    triggerInstall();
                  }}
                  className="w-full py-2 px-3 rounded-xl bg-gradient-to-l from-emerald-600/20 to-sky-600/20 hover:from-emerald-600/30 hover:to-sky-600/30 border border-emerald-500/35 text-emerald-300 text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-400" />
                  <span>تثبيت تطبيق MedFur على الهاتف</span>
                </button>
              )}
            </div>

            {/* Menu Sections List */}
            <div className="p-3.5 space-y-1.5 flex-1 overflow-y-auto">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeSection === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleSelectNav(item.id)}
                    className={`w-full p-3 rounded-2xl text-right flex items-center justify-between transition-all cursor-pointer ${
                      isActive
                        ? 'bg-slate-800/90 text-white border border-emerald-500/50 shadow-xs'
                        : 'text-slate-300 hover:bg-slate-800/50 hover:text-white'
                    }`}
                  >
                    <span className="text-xs text-slate-500">&gt;</span>

                    <div className="flex items-center gap-3">
                      <span className="font-bold text-sm">{item.label}</span>
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${item.color}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Bottom 3 Quick Actions (الإعدادات | تواصل | المؤقت) */}
            <div className="p-3.5 border-t border-slate-800/80 grid grid-cols-3 gap-2 text-center text-xs text-slate-400">
              <button
                onClick={() => {
                  setIsDrawerOpen(false);
                  setShowTimerModal(true);
                }}
                className="flex flex-col items-center gap-1.5 p-2 rounded-xl hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
              >
                <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-teal-400">
                  <Timer className="w-4 h-4" />
                </div>
                <span>المؤقت</span>
              </button>

              <button
                onClick={() => {
                  setIsDrawerOpen(false);
                  handleSelectNav('discussions');
                }}
                className="flex flex-col items-center gap-1.5 p-2 rounded-xl hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
              >
                <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-blue-400">
                  <Headphones className="w-4 h-4" />
                </div>
                <span>تواصل</span>
              </button>

              <button
                onClick={() => {
                  handleSelectNav('settings');
                }}
                className="flex flex-col items-center gap-1.5 p-2 rounded-xl hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
              >
                <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-emerald-400">
                  <Settings className="w-4 h-4" />
                </div>
                <span>الإعدادات</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Study Timer Modal */}
      {showTimerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-sm bg-[#0E172A] border border-slate-800 rounded-3xl p-6 text-white space-y-5 shadow-2xl text-center">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <button onClick={() => setShowTimerModal(false)} className="cursor-pointer text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
              <h3 className="font-bold text-base flex items-center gap-2 text-teal-400">
                <span>مؤقت المذاكرة الأكاديمي (Pomodoro)</span>
                <Timer className="w-5 h-5" />
              </h3>
            </div>

            <div className="py-4 space-y-2">
              <div className="text-4xl font-black text-white tabular-nums tracking-wider">
                {formatTimer(timerSeconds)}
              </div>
              <p className="text-xs text-slate-400">
                جلسة تركيز دراسية لحل الأتمتات ومراجعة المحاضرات
              </p>
            </div>

            <div className="flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => setIsTimerRunning(!isTimerRunning)}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                {isTimerRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                <span>{isTimerRunning ? 'إيقاف مؤقت' : 'بدء التركيز'}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsTimerRunning(false);
                  setTimerSeconds(25 * 60);
                }}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>إعادة ضبط (25 د)</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};


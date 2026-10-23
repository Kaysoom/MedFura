import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { ActiveSection } from '../types';
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
  RotateCcw
} from 'lucide-react';

export const Header: React.FC = () => {
  const { 
    user, 
    isAdmin, 
    signOut, 
    darkMode, 
    toggleDarkMode, 
    eyeComfortMode,
    toggleEyeComfortMode,
    activeSection, 
    setActiveSection,
    setSelectedSubjectId,
    setSelectedChapterId,
    quickSwitchPersona
  } = useApp();

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showTimerModal, setShowTimerModal] = useState(false);

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
      {activeSection === 'home' ? (
        /* Full Top Header Bar: Visible ONLY on the Home Page */
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
          <div className="max-w-md mx-auto sm:max-w-3xl lg:max-w-5xl px-3.5 py-2.5 flex items-center justify-between">
            
            {/* Right Side (First in RTL): 3 Horizontal Lines (☰ Menu) & Home Icon */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsDrawerOpen(true)}
                aria-label="القائمة الجانبية"
                className="p-2 rounded-xl text-slate-200 hover:text-white hover:bg-slate-800/80 transition-colors cursor-pointer"
                title="القائمة الجانبية (ثلاث خطوط)"
              >
                <Menu className="w-5 h-5 stroke-[2.2]" />
              </button>

              <button
                onClick={() => {
                  setActiveSection('home');
                  setSelectedSubjectId(null);
                  setSelectedChapterId(null);
                }}
                aria-label="الصفحة الأساسية"
                className="p-2 rounded-xl transition-colors cursor-pointer text-emerald-400 bg-emerald-500/15"
                title="الصفحة الأساسية"
              >
                <Home className="w-5 h-5 stroke-[2.2]" />
              </button>
            </div>

            {/* Center: Quick Role Indicator / Switcher */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => quickSwitchPersona(isAdmin ? 'student' : 'admin')}
                className={`px-2.5 py-1 rounded-full text-[11px] font-bold border transition-all cursor-pointer flex items-center gap-1 ${
                  isAdmin 
                    ? 'bg-amber-500/20 border-amber-500/40 text-amber-500 dark:text-amber-300' 
                    : 'bg-emerald-500/20 border-emerald-500/40 text-emerald-600 dark:text-emerald-300'
                }`}
                title="انقر للتبديل بين حساب المشرف والطالب"
              >
                {isAdmin ? <ShieldCheck className="w-3.5 h-3.5 text-amber-400" /> : <User className="w-3.5 h-3.5 text-emerald-400" />}
                <span>{isAdmin ? 'وضع المشرف' : 'وضع الطالب'}</span>
              </button>
            </div>

            {/* Left Side (Last in RTL): Eye Comfort, Theme Toggle (Dark/Light) & Notification Bell */}
            <div className="flex items-center gap-1">
              <button
                onClick={toggleEyeComfortMode}
                className={`p-2 rounded-xl transition-colors cursor-pointer flex items-center gap-1 ${
                  eyeComfortMode
                    ? 'bg-amber-500/25 text-amber-500 dark:text-amber-300 border border-amber-500/50 shadow-xs'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                }`}
                title={eyeComfortMode ? 'إيقاف وضع حماية العين' : 'تفعيل وضع حماية العين (مناسب للوضع الليلي والنهاري)'}
                aria-label="وضع حماية العين"
              >
                <Eye className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>

              <button
                onClick={toggleDarkMode}
                className={`p-2 rounded-xl border transition-colors cursor-pointer flex items-center gap-1 ${
                  darkMode
                    ? 'bg-slate-800/70 border-slate-700 text-amber-400 hover:text-amber-300'
                    : 'bg-sky-500/15 border-sky-500/40 text-sky-600 hover:bg-sky-500/25'
                }`}
                title={darkMode ? 'التحويل إلى الوضع النهاري (Light Mode)' : 'التحويل إلى الوضع الليلي (Dark Mode)'}
                aria-label="تبديل المظهر ليلي أو نهاري"
              >
                {darkMode ? <Sun className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400" /> : <Moon className="w-4 h-4 sm:w-5 sm:h-5 text-sky-600" />}
              </button>

              <button
                onClick={() => {
                  setActiveSection('announcements');
                  setSelectedSubjectId(null);
                  setSelectedChapterId(null);
                }}
                className="relative p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800/60 transition-colors cursor-pointer"
                title="الإعلانات والتنبيهات"
              >
                <Bell className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-emerald-400" />
              </button>
            </div>
          </div>
        </header>
      ) : (
        /* Floating 3-Lines Menu Button at Top-Right when inside any section/sub-page */
        <button
          type="button"
          onClick={() => setIsDrawerOpen(true)}
          aria-label="فتح القائمة الجانبية"
          title="القائمة الجانبية"
          className={`fixed top-3.5 right-3.5 z-40 w-10 h-10 rounded-2xl border shadow-lg backdrop-blur-md flex items-center justify-center transition-all cursor-pointer active:scale-95 ${
            eyeComfortMode
              ? darkMode
                ? 'bg-[#1C1915]/90 border-amber-800/60 text-amber-200 hover:text-white'
                : 'bg-[#FBF6EB]/90 border-[#DCCBB1] text-slate-800'
              : darkMode
              ? 'bg-[#131D2E]/90 border-slate-700/80 text-slate-100 hover:border-emerald-500/50 hover:text-emerald-400 shadow-slate-950/60'
              : 'bg-white/90 border-slate-200 text-slate-800 hover:border-emerald-500/50 shadow-slate-300/50'
          }`}
        >
          <Menu className="w-5 h-5 stroke-[2.3]" />
        </button>
      )}

      {/* Side Drawer Menu */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div 
            onClick={() => setIsDrawerOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in"
          />

          {/* Drawer container (Right side in RTL) */}
          <div className="relative w-full max-w-xs sm:max-w-sm bg-[#0E172A] border-l border-slate-800 h-full shadow-2xl z-10 flex flex-col justify-between overflow-y-auto animate-in slide-in-from-right duration-200 text-slate-100">
            
            {/* Top User Card */}
            <div className="p-6 border-b border-slate-800/80">
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setShowSettingsModal(true)}
                  className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                  title="الإعدادات والتبديل"
                >
                  <Settings className="w-5 h-5" />
                </button>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <h3 className="font-bold text-base text-white">
                      {user?.displayName || 'محمد الكيصوم'}
                    </h3>
                    <span className="inline-block px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold border border-emerald-500/30 mt-1">
                      {user?.batch || 'دفعة 30'}
                    </span>
                  </div>

                  <div className="relative">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center font-bold text-lg text-white ring-2 ring-emerald-500/40">
                      P
                    </div>
                    <span className="absolute -bottom-1 -left-1 w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[10px] font-bold border-2 border-[#0E172A]">
                      +
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Menu Sections List */}
            <div className="p-4 space-y-1.5 flex-1 overflow-y-auto">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeSection === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleSelectNav(item.id)}
                    className={`w-full p-3.5 rounded-2xl text-right flex items-center justify-between transition-all cursor-pointer ${
                      isActive 
                        ? 'bg-slate-800/90 text-white border border-slate-700/80 shadow-xs' 
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

            {/* Bottom 3 Actions (راحة العين | تواصل | المؤقت — App Rating removed) */}
            <div className="p-4 border-t border-slate-800/80 grid grid-cols-3 gap-2 text-center text-xs text-slate-400">
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
                  toggleEyeComfortMode();
                }}
                className="flex flex-col items-center gap-1.5 p-2 rounded-xl hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${eyeComfortMode ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-800 text-amber-400'}`}>
                  <Eye className="w-4 h-4" />
                </div>
                <span>{eyeComfortMode ? 'راحة العين: مفعل' : 'راحة العين'}</span>
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

      {/* Settings Modal (Clean Persona Switch & Sign Out) */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-sm bg-[#0E172A] border border-slate-800 rounded-3xl p-6 text-white space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-base">إعدادات الحساب والصلاحيات</h3>
              <button onClick={() => setShowSettingsModal(false)} className="cursor-pointer">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1.5">
                  التبديل بين الأدوار:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => {
                      quickSwitchPersona('admin');
                      setShowSettingsModal(false);
                    }}
                    className={`p-3 rounded-2xl border text-xs font-bold flex flex-col items-center gap-1 transition-all cursor-pointer ${
                      isAdmin ? 'bg-amber-500/20 border-amber-500 text-amber-300' : 'bg-slate-800 border-slate-700 text-slate-400'
                    }`}
                  >
                    <ShieldCheck className="w-5 h-5" />
                    <span>وضع المشرف (Admin)</span>
                  </button>

                  <button
                    onClick={() => {
                      quickSwitchPersona('student');
                      setShowSettingsModal(false);
                    }}
                    className={`p-3 rounded-2xl border text-xs font-bold flex flex-col items-center gap-1 transition-all cursor-pointer ${
                      !isAdmin ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300' : 'bg-slate-800 border-slate-700 text-slate-400'
                    }`}
                  >
                    <User className="w-5 h-5" />
                    <span>وضع الطالب (Student)</span>
                  </button>
                </div>
              </div>

              <button
                onClick={() => {
                  setShowSettingsModal(false);
                  signOut();
                }}
                className="w-full py-2.5 rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-300 hover:bg-rose-500/30 font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer mt-2"
              >
                <LogOut className="w-4 h-4" />
                <span>تسجيل الخروج</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

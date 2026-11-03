import React, { useEffect, useState } from 'react';
import { APP_LOGO_ASSET_PATH } from '../../utils/redesignStructureLogic';

interface SplashScreenProps {
  isVisible: boolean;
  onFinish: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ isVisible, onFinish }) => {
  const [progress, setProgress] = useState(20);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    if (!isVisible) {
      setProgress(20);
      setIsExiting(false);
      return;
    }

    setIsExiting(false);
    setProgress(28);

    const t1 = setTimeout(() => setProgress(65), 250);
    const t2 = setTimeout(() => setProgress(92), 750);
    const t3 = setTimeout(() => setProgress(100), 1250);
    const tExit = setTimeout(() => setIsExiting(true), 1550);
    const tDone = setTimeout(() => {
      onFinish();
    }, 1820);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(tExit);
      clearTimeout(tDone);
    };
  }, [isVisible, onFinish]);

  if (!isVisible) return null;

  const handleDismissEarly = () => {
    setProgress(100);
    setIsExiting(true);
    setTimeout(() => {
      onFinish();
    }, 200);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="افتتاحية تطبيق MedFur"
      onClick={handleDismissEarly}
      className={`fixed inset-0 z-50 bg-[#070D19] flex flex-col items-center justify-between px-6 py-10 sm:py-14 select-none cursor-pointer transition-opacity duration-300 ${
        isExiting ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
      style={{
        zIndex: 9999,
        backgroundColor: '#070D19',
        backgroundImage:
          'radial-gradient(circle at 50% 36%, rgba(16, 185, 129, 0.22) 0%, rgba(11, 19, 43, 0.98) 58%, #070D19 100%)',
      }}
    >
      {/* Top Skip Action */}
      <div className="w-full max-w-sm flex items-center justify-end">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleDismissEarly();
          }}
          className="px-3.5 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-slate-200 hover:text-white text-xs font-bold transition-colors cursor-pointer"
        >
          تخطي
        </button>
      </div>

      {/* Center Logo Cover & Typography */}
      <div className="flex flex-col items-center text-center max-w-xs sm:max-w-sm mx-auto space-y-6">
        {/* Glow + Emblem Frame */}
        <div className="relative flex items-center justify-center">
          <div
            aria-hidden="true"
            className="absolute -inset-5 rounded-3xl bg-emerald-500/25 blur-2xl animate-pulse"
          />
          <div className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-3xl bg-white shadow-2xl ring-4 ring-emerald-500/35 flex items-center justify-center overflow-hidden">
            <img
              src={APP_LOGO_ASSET_PATH}
              alt="شعار تطبيق MedFur"
              className="w-full h-full object-cover scale-[2.15]"
            />
          </div>
        </div>

        {/* Brand Name & University Subtitle */}
        <div className="space-y-2">
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white">
            Med<span className="text-emerald-400">Fur</span>
          </h1>
          <p className="text-sm sm:text-base font-bold text-emerald-300">
            كلية الطب البشري — جامعة الفرات
          </p>
          <p className="text-xs text-slate-400 font-medium leading-relaxed">
            بنك الأتمتة · المكتبة والأرشيف · المرئيات والشروحات
          </p>
        </div>

        {/* Minimal Smooth Progress Line */}
        <div className="w-48 sm:w-56 space-y-2 pt-1">
          <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden p-0.5">
            <div
              className="h-full rounded-full bg-gradient-to-l from-emerald-400 to-teal-500 transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Bottom Footer Hint */}
      <div className="text-center space-y-1">
        <p className="text-[11px] font-bold text-slate-400">
          المنصة الأكاديمية التفاعلية لطلاب الطب البشري
        </p>
      </div>
    </div>
  );
};

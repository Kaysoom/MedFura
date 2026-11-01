import React, { useState, useEffect } from 'react';
import { Download, X, Share, PlusSquare, Smartphone, CheckCircle2 } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

// Global singleton store so both the Header button and the Smart Banner stay synchronized
let deferredInstallPrompt: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();

function notifyInstallListeners() {
  listeners.forEach((fn) => fn());
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e: Event) => {
    e.preventDefault();
    deferredInstallPrompt = e as BeforeInstallPromptEvent;
    notifyInstallListeners();
  });

  window.addEventListener('appinstalled', () => {
    deferredInstallPrompt = null;
    notifyInstallListeners();
  });
}

export function usePWAInstall() {
  const [, setTick] = useState(0);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showInstructionsModal, setShowInstructionsModal] = useState(false);

  useEffect(() => {
    const checkEnv = () => {
      const standalone =
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
      setIsStandalone(standalone);

      const ua = window.navigator.userAgent.toLowerCase();
      const iosDevice = /iphone|ipad|ipod/.test(ua);
      setIsIOS(iosDevice);
    };

    checkEnv();
    const rerender = () => setTick((t) => t + 1);
    listeners.add(rerender);
    return () => {
      listeners.delete(rerender);
    };
  }, []);

  const triggerInstall = async () => {
    if (deferredInstallPrompt) {
      try {
        await deferredInstallPrompt.prompt();
        const choice = await deferredInstallPrompt.userChoice;
        if (choice.outcome === 'accepted') {
          deferredInstallPrompt = null;
          notifyInstallListeners();
        }
        return;
      } catch {
        // Fallback to manual instructions modal if native prompt fails inside iframe
      }
    }
    setShowInstructionsModal(true);
  };

  return {
    canNativeInstall: Boolean(deferredInstallPrompt),
    isStandalone,
    isIOS,
    triggerInstall,
    showInstructionsModal,
    setShowInstructionsModal,
  };
}

export const MEDFUR_CAP_LOGO_SRC =
  './assets/aistudio/______________1_Nov_2026__4.31_pm_b75ae71b.png';

export const MedFurMonogramBadge: React.FC<{
  className?: string;
  alt?: string;
}> = ({ className = 'w-9 h-9', alt = 'شعار MedFur - قبعة التخرج MF' }) => (
  <div
    className={`relative rounded-xl bg-[#04281E] border border-emerald-500/40 flex items-center justify-center overflow-hidden shadow-md shrink-0 ${className}`}
  >
    <img
      src={MEDFUR_CAP_LOGO_SRC}
      alt={alt}
      className="w-full h-full object-cover select-none"
      loading="eager"
    />
  </div>
);

export const PWAInstallInstructionsModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  isIOS: boolean;
}> = ({ isOpen, onClose, isIOS }) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in"
      role="dialog"
      aria-modal="true"
      aria-label="تثبيت تطبيق MedFur على الهاتف"
    >
      <div className="relative w-full max-w-md bg-[#0E172A] border border-slate-700/90 rounded-3xl p-5 sm:p-6 text-white space-y-4 shadow-2xl text-right">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-800/80 text-slate-400 hover:text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2.5">
            <div>
              <h3 className="font-black text-sm sm:text-base text-white">
                تثبيت تطبيق MedFur على جهازك
              </h3>
              <p className="text-[11px] text-emerald-400 font-bold">
                كلية الطب البشري — جامعة الفرات
              </p>
            </div>
            <MedFurMonogramBadge className="w-10 h-10 rounded-xl" />
          </div>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed">
          لفتح منصة <span className="font-black text-emerald-400">MedFur</span> كتطبيق مستقل بشاشة كاملة وسرعة فائقة على هاتفك:
        </p>

        {isIOS ? (
          <div className="space-y-2.5 text-xs bg-[#131D2E] p-4 rounded-2xl border border-slate-800">
            <div className="flex items-center justify-end gap-2.5">
              <span className="text-slate-200 font-bold">
                1. اضغط على زر المشاركة <strong className="text-sky-400">(Share)</strong> في شريط متصفح Safari
              </span>
              <div className="w-8 h-8 rounded-xl bg-sky-500/15 text-sky-400 flex items-center justify-center shrink-0">
                <Share className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2.5">
              <span className="text-slate-200 font-bold">
                2. اختر <strong className="text-emerald-400">«إضافة إلى الشاشة الرئيسية» (Add to Home Screen)</strong>
              </span>
              <div className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0">
                <PlusSquare className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2.5">
              <span className="text-slate-200 font-bold">
                3. اضغط على <strong className="text-emerald-400">إضافة (Add)</strong> في أعلى الشاشة
              </span>
              <div className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-2.5 text-xs bg-[#131D2E] p-4 rounded-2xl border border-slate-800">
            <div className="flex items-center justify-end gap-2.5">
              <span className="text-slate-200 font-bold">
                1. افتح قائمة المتصفح العلوية <strong className="text-emerald-400">(⋮)</strong> في Chrome أو Edge
              </span>
              <div className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0">
                <Smartphone className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2.5">
              <span className="text-slate-200 font-bold">
                2. اختر <strong className="text-sky-400">«تثبيت التطبيق» (Install App)</strong> أو <strong className="text-sky-400">«الإضافة إلى الشاشة الرئيسية»</strong>
              </span>
              <div className="w-8 h-8 rounded-xl bg-sky-500/15 text-sky-400 flex items-center justify-center shrink-0">
                <Download className="w-4 h-4" />
              </div>
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={onClose}
          className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs cursor-pointer transition-colors"
        >
          حسناً، فهمت
        </button>
      </div>
    </div>
  );
};

export const PWAInstallPrompt: React.FC = () => {
  const {
    isStandalone,
    isIOS,
    triggerInstall,
    showInstructionsModal,
    setShowInstructionsModal,
  } = usePWAInstall();

  const [dismissed, setDismissed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('medfur_pwa_banner_dismissed') === '1';
    } catch {
      return false;
    }
  });

  const handleDismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem('medfur_pwa_banner_dismissed', '1');
    } catch {
      // ignore storage errors
    }
  };

  if (isStandalone) return null;

  return (
    <>
      {!dismissed && (
        <div
          role="region"
          aria-label="شريط تثبيت تطبيق MedFur"
          className="fixed bottom-3 inset-x-3 sm:left-auto sm:right-4 sm:w-96 z-40 bg-[#0E172A]/95 backdrop-blur-md border border-emerald-500/40 rounded-2xl p-3 shadow-2xl flex items-center justify-between gap-2.5 text-right animate-in slide-in-from-bottom-4 duration-200"
        >
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={handleDismiss}
              aria-label="إغلاق شريط التثبيت"
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={triggerInstall}
              className="px-3 py-1.5 rounded-xl bg-gradient-to-l from-emerald-600 to-sky-600 hover:from-emerald-500 hover:to-sky-500 text-white text-xs font-black flex items-center gap-1.5 shadow-md cursor-pointer transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              <span>تثبيت</span>
            </button>
          </div>

          <div className="flex items-center gap-2.5 min-w-0 flex-1 justify-end">
            <div className="min-w-0 flex-1 text-right">
              <h4 className="text-xs font-black text-white truncate">
                تثبيت تطبيق <span className="text-emerald-400">MedFur</span> على هاتفك
              </h4>
              <p className="text-[10px] text-slate-300 truncate">
                تصفح أسرع للأتمتة والمحاضرات بشاشة كاملة
              </p>
            </div>
            <MedFurMonogramBadge className="w-9 h-9 rounded-xl" />
          </div>
        </div>
      )}

      <PWAInstallInstructionsModal
        isOpen={showInstructionsModal}
        onClose={() => setShowInstructionsModal(false)}
        isIOS={isIOS}
      />
    </>
  );
};

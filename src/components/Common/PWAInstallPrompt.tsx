import React, { useState, useEffect } from 'react';
import { Download, X, Share, PlusSquare, Smartphone, CheckCircle2 } from 'lucide-react';
import { APP_LOGO_ASSET_PATH } from '../../utils/redesignStructureLogic';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

// Global singleton store so the Header and Drawer install buttons stay synchronized
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
            <h3 className="font-black text-sm sm:text-base text-white">
              تثبيت تطبيق MedFur على جهازك
            </h3>
            <div className="w-9 h-9 rounded-xl bg-white p-1 shadow-md flex items-center justify-center overflow-hidden shrink-0">
              <img
                src={APP_LOGO_ASSET_PATH}
                alt="MedFur Logo"
                className="w-full h-full object-cover scale-[2.15]"
              />
            </div>
          </div>
        </div>

        {isIOS ? (
          <div className="space-y-2.5 text-xs bg-[#131D2E] p-4 rounded-2xl border border-slate-800">
            <div className="flex items-center justify-end gap-2.5">
              <span className="text-slate-200 font-bold">
                1. اضغط على زر المشاركة <strong className="text-sky-400">(Share)</strong> في متصفح Safari
              </span>
              <div className="w-8 h-8 rounded-xl bg-sky-500/15 text-sky-400 flex items-center justify-center shrink-0">
                <Share className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2.5">
              <span className="text-slate-200 font-bold">
                2. اختر <strong className="text-emerald-400">«إضافة إلى الشاشة الرئيسية»</strong>
              </span>
              <div className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0">
                <PlusSquare className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2.5">
              <span className="text-slate-200 font-bold">
                3. اضغط على <strong className="text-emerald-400">إضافة (Add)</strong>
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
                1. افتح قائمة المتصفح العلوية <strong className="text-emerald-400">(⋮)</strong>
              </span>
              <div className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0">
                <Smartphone className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2.5">
              <span className="text-slate-200 font-bold">
                2. اختر <strong className="text-sky-400">«تثبيت التطبيق»</strong> أو <strong className="text-sky-400">«الإضافة إلى الشاشة الرئيسية»</strong>
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
          حسناً
        </button>
      </div>
    </div>
  );
};

export const PWAInstallPrompt: React.FC = () => {
  const {
    isStandalone,
    isIOS,
    showInstructionsModal,
    setShowInstructionsModal,
  } = usePWAInstall();

  if (isStandalone) return null;

  return (
    <PWAInstallInstructionsModal
      isOpen={showInstructionsModal}
      onClose={() => setShowInstructionsModal(false)}
      isIOS={isIOS}
    />
  );
};

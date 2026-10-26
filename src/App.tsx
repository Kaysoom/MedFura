import React, { useEffect, useRef, useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Header } from './components/Header';
import { AuthModal } from './components/AuthModal';
import { HomeDashboard } from './components/HomeDashboard';
import { AutomationBankView } from './components/AutomationBank/AutomationBankView';
import { LibraryView } from './components/Library/LibraryView';
import { MarketplaceView } from './components/Marketplace/MarketplaceView';
import { VideosView } from './components/Videos/VideosView';
import { GradesView } from './components/Grades/GradesView';
import { AnnouncementsView } from './components/Announcements/AnnouncementsView';
import { DiscussionsView } from './components/Discussions/DiscussionsView';
import { DirectChatWidget } from './components/Chat/DirectChatWidget';
import { PWAInstallPrompt } from './components/Common/PWAInstallPrompt';

const AppContent: React.FC = () => {
  const {
    activeSection,
    setActiveSection,
    selectedSubjectId,
    setSelectedSubjectId,
    selectedChapterId,
    setSelectedChapterId,
    darkMode,
    eyeComfortMode,
  } = useApp();

  const [showExitToast, setShowExitToast] = useState(false);
  const lastBackPressTimeRef = useRef<number>(0);
  const isHandlingPopStateRef = useRef<boolean>(false);

  // Keep refs of current navigation state for the popstate listener
  const navStateRef = useRef({
    activeSection,
    selectedSubjectId,
    selectedChapterId,
  });
  navStateRef.current = {
    activeSection,
    selectedSubjectId,
    selectedChapterId,
  };

  // Push history entry whenever navigation changes so hardware/browser Back button stays inside the app
  useEffect(() => {
    if (isHandlingPopStateRef.current) {
      isHandlingPopStateRef.current = false;
      return;
    }
    try {
      window.history.pushState(
        {
          section: activeSection,
          subjectId: selectedSubjectId,
          chapterId: selectedChapterId,
        },
        ''
      );
    } catch {
      // safe fallback
    }
  }, [activeSection, selectedSubjectId, selectedChapterId]);

  // Ensure initial guard state on mount so Back on Home triggers popstate
  useEffect(() => {
    try {
      window.history.pushState({ section: 'home', guard: true }, '');
    } catch {
      // safe fallback
    }

    const handlePopState = () => {
      const current = navStateRef.current;
      isHandlingPopStateRef.current = true;

      // Step 1: If inside a chapter stream -> go back to Subject view
      if (current.selectedChapterId) {
        setSelectedChapterId(null);
        return;
      }

      // Step 2: If inside a Subject view -> go back to Subjects catalog
      if (current.selectedSubjectId) {
        setSelectedSubjectId(null);
        return;
      }

      // Step 3: If inside any non-home section -> go back to Home dashboard
      if (current.activeSection !== 'home') {
        setActiveSection('home');
        return;
      }

      // Step 4: Already on Home dashboard -> Double-Back to Exit logic
      const now = Date.now();
      if (now - lastBackPressTimeRef.current < 2500) {
        // Second press within 2.5s: allow natural history back
        setShowExitToast(false);
      } else {
        // First press on Home: show toast and re-push guard state
        lastBackPressTimeRef.current = now;
        setShowExitToast(true);
        try {
          window.history.pushState({ section: 'home', guard: true }, '');
        } catch {
          // safe fallback
        }
        setTimeout(() => {
          setShowExitToast(false);
        }, 2500);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [setActiveSection, setSelectedSubjectId, setSelectedChapterId]);

  const rootThemeClass = eyeComfortMode
    ? darkMode
      ? 'bg-[#14110E] text-[#F3EDE2]'
      : 'bg-[#F4ECDC] text-[#2B2118]'
    : darkMode
    ? 'bg-slate-950 text-slate-100'
    : 'bg-slate-100 text-slate-900';

  return (
    <div
      className={`min-h-screen w-full max-w-[100vw] overflow-x-hidden flex flex-col transition-colors duration-200 selection:bg-emerald-500 selection:text-white ${rootThemeClass}`}
    >
      {/* Subtle Blue-Light Protection Filter Overlay when Eye Comfort Mode is active */}
      {eyeComfortMode && (
        <div
          aria-hidden="true"
          className={`pointer-events-none fixed inset-0 z-50 transition-opacity duration-300 ${
            darkMode ? 'bg-amber-500/[0.04]' : 'bg-amber-600/[0.05]'
          }`}
        />
      )}

      {/* Top Header with 3 Horizontal Lines Drawer Menu & Persona Switcher */}
      <Header />

      {/* Main View Area */}
      <main className={`flex-1 w-full max-w-full min-w-0 flex flex-col ${activeSection === 'discussions' ? 'h-screen overflow-hidden' : 'pb-16'}`}>
        {activeSection === 'home' && <HomeDashboard />}
        {activeSection === 'automation' && <AutomationBankView />}
        {activeSection === 'library' && <LibraryView />}
        {activeSection === 'marketplace' && <MarketplaceView />}
        {activeSection === 'discussions' && <DiscussionsView />}
        {activeSection === 'videos' && <VideosView />}
        {activeSection === 'grades' && <GradesView />}
        {(activeSection === 'announcements' || activeSection === 'about') && <AnnouncementsView />}
      </main>

      {/* Smart Dismissible Mobile & Desktop PWA Install Banner + iOS Modal */}
      <PWAInstallPrompt />

      {/* Double-Back to Exit Toast Notification */}
      {showExitToast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl bg-slate-900/95 border border-emerald-500/50 text-white text-xs sm:text-sm font-bold shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-bottom-3 duration-200 whitespace-nowrap"
        >
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span>اضغط رجوع مرة أخرى للخروج من التطبيق</span>
        </div>
      )}

      {/* Direct Peer-to-Peer Chat Widget */}
      <DirectChatWidget />

      {/* Auth Modal */}
      <AuthModal />
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}

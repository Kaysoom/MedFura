import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  UserProfile, 
  AcademicYearId, 
  SemesterType, 
  ActiveSection, 
  SubjectItem, 
  QuestionItem, 
  LibraryFolderItem,
  LibraryFileItem, 
  MarketplaceItem, 
  AnnouncementItem,
  DiscussionPost,
  DiscussionComment,
  DirectMessage,
  VideoItem,
  VideoFolderItem,
  ChannelInfo,
  GradeItem,
  StudentLeaderboardEntry,
  GradeAppealTicket,
  QuestionCommentItem,
  QuestionReportItem,
  QuestionReportIssueType,
  ColorThemeId,
  DarkModeSchedule,
  AppNotificationItem,
  AccountType,
  StudentCustomQuiz,
  UIDensityMode,
  QuizBehaviorPreferences,
  StudyBackupPayload
} from '../types';
import { buildCompleteLibraryFolders } from '../utils/customQuizAndLibraryLogic';
import {
  DEFAULT_QUIZ_PREFERENCES,
  createStudyBackupPayload,
  parseAndValidateStudyBackup
} from '../utils/settingsAndDensityLogic';
import { applyCommentUpdate } from '../utils/mediaAndOfflineLogic';
import { 
  INITIAL_YEARS, 
  INITIAL_SUBJECTS, 
  INITIAL_QUESTIONS, 
  INITIAL_LIBRARY_FOLDERS,
  INITIAL_LIBRARY_FILES, 
  INITIAL_MARKETPLACE, 
  INITIAL_ANNOUNCEMENTS,
  INITIAL_VIDEOS,
  INITIAL_VIDEO_FOLDERS,
  INITIAL_CHANNELS,
  INITIAL_COMMUNITY_MESSAGES,
  INITIAL_GRADES,
  INITIAL_LEADERBOARD,
  INITIAL_GRADE_APPEALS,
  REGISTERED_STUDENTS_MOCK,
  INITIAL_QUESTION_COMMENTS,
  INITIAL_QUESTION_REPORTS
} from '../initialData';
import { 
  auth, 
  db, 
  handleFirestoreError, 
  OperationType, 
  testFirestoreConnection 
} from '../firebase';
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut as fbSignOut, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword 
} from 'firebase/auth';
import { 
  collection, 
  onSnapshot, 
  doc, 
  setDoc, 
  deleteDoc, 
  updateDoc 
} from 'firebase/firestore';

export const ADMIN_EMAIL = 'mohammedkaysoom4@gmail.com';

/**
 * Recursively strips any properties with `undefined` values so Firestore `setDoc` / `updateDoc`
 * never throws synchronous `Unsupported field value: undefined` errors.
 */
function sanitizeForFirestore<T>(obj: T): T {
  if (obj === null || obj === undefined || typeof obj !== 'object') {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj
      .filter((item) => item !== undefined)
      .map((item) => sanitizeForFirestore(item)) as unknown as T;
  }
  const cleaned: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    if (value !== undefined) {
      cleaned[key] = sanitizeForFirestore(value);
    }
  }
  return cleaned as T;
}

function safeLoadStorage<T>(key: string, fallback: T): T {
  try {
    const saved = localStorage.getItem(key);
    if (!saved) return fallback;
    const parsed = JSON.parse(saved);
    return parsed !== null && parsed !== undefined ? (parsed as T) : fallback;
  } catch {
    return fallback;
  }
}

interface AppContextType {
  user: UserProfile | null;
  isAdmin: boolean;
  isGuest: boolean;
  accountType: AccountType;
  canToggleRole: boolean;
  isAuthModalOpen: boolean;
  setIsAuthModalOpen: (open: boolean) => void;
  darkMode: boolean;
  setDarkMode: (val: boolean | ((prev: boolean) => boolean)) => void;
  toggleDarkMode: () => void;
  darkModeSchedule: DarkModeSchedule;
  setDarkModeSchedule: (schedule: DarkModeSchedule) => void;
  colorTheme: ColorThemeId;
  setColorTheme: (theme: ColorThemeId) => void;
  activeSection: ActiveSection;
  setActiveSection: (sec: ActiveSection) => void;
  activeYear: AcademicYearId;
  setActiveYear: (year: AcademicYearId) => void;
  activeSemester: SemesterType;
  setActiveSemester: (sem: SemesterType) => void;
  selectedSubjectId: string | null;
  setSelectedSubjectId: (id: string | null) => void;
  selectedChapterId: string | null;
  setSelectedChapterId: (id: string | null) => void;
  eyeComfortMode: boolean;
  toggleEyeComfortMode: () => void;
  questionFontScale: 'normal' | 'large' | 'xlarge';
  setQuestionFontScale: (scale: 'normal' | 'large' | 'xlarge') => void;
  uiDensity: UIDensityMode;
  setUiDensity: (density: UIDensityMode) => void;
  quizPreferences: QuizBehaviorPreferences;
  updateQuizPreferences: (updates: Partial<QuizBehaviorPreferences>) => void;
  exportStudyBackup: () => StudyBackupPayload;
  importStudyBackup: (rawJson: string) => { valid: boolean; error?: string };

  // Local Notifications & Firebase Read-State Sync
  notifications: AppNotificationItem[];
  readNotificationIds: string[];
  unreadNotificationsCount: number;
  activeToastNotification: AppNotificationItem | null;
  dismissToastNotification: () => void;
  markNotificationAsRead: (notificationId: string) => Promise<void>;
  markAllNotificationsAsRead: () => Promise<void>;

  // Collections
  subjects: SubjectItem[];
  questions: QuestionItem[];
  libraryFolders: LibraryFolderItem[];
  libraryFiles: LibraryFileItem[];
  marketplaceItems: MarketplaceItem[];
  announcements: AnnouncementItem[];
  discussions: DiscussionPost[];
  directMessages: DirectMessage[];

  // Persona & Temporary Isolated Accounts
  quickSwitchPersona: (role: 'admin' | 'student') => void;
  switchAccount: (targetAccount: AccountType) => void;

  // Auth actions
  loginWithGoogle: (studentId: string, academicYear: string) => Promise<void>;
  loginWithEmail: (email: string, pass: string, studentId?: string, academicYear?: string, isNew?: boolean) => Promise<void>;
  signOut: () => Promise<void>;
  updateUserProfile: (profile: Partial<UserProfile>) => void;

  // Admin and CRUD for Subjects & Chapters
  addSubject: (item: Partial<SubjectItem>) => Promise<void>;
  updateSubject: (id: string, updates: Partial<SubjectItem>) => Promise<void>;
  deleteSubject: (id: string) => Promise<void>;
  addChapterToSubject: (subjectId: string, chapterName: string, category?: import('../types').ChapterCategory) => Promise<void>;
  renameChapterInSubject: (subjectId: string, chapterId: string, newName: string, category?: import('../types').ChapterCategory) => Promise<void>;
  deleteChapterFromSubject: (subjectId: string, chapterId: string) => Promise<void>;

  // Questions
  addQuestion: (item: Omit<QuestionItem, 'id'>) => Promise<void>;
  addQuestionsBatch: (items: Omit<QuestionItem, 'id'>[]) => Promise<void>;
  updateQuestion: (id: string, updates: Partial<QuestionItem>) => Promise<void>;
  deleteQuestion: (id: string) => Promise<void>;

  // Library Folders & Files
  addLibraryFolder: (folder: {
    name: string;
    parentId: string | null;
    isSubject?: boolean;
    subjectId?: string;
    icon?: string;
    department?: string;
    coverColor?: string;
    coverImage?: string;
    coverLabel?: string;
    semesterBadge?: '1' | '2';
  }) => Promise<void>;
  updateLibraryFolder: (folderId: string, updates: Partial<LibraryFolderItem>) => Promise<void>;
  renameLibraryFolder: (folderId: string, newName: string) => Promise<void>;
  deleteLibraryFolder: (folderId: string) => Promise<void>;
  moveLibraryFolder: (folderId: string, direction: 'up' | 'down') => Promise<void>;
  addLibraryFile: (item: Omit<LibraryFileItem, 'id'>) => Promise<string>;
  updateLibraryFile: (id: string, updates: Partial<LibraryFileItem>) => Promise<void>;
  deleteLibraryFile: (id: string) => Promise<void>;
  moveLibraryFile: (fileId: string, direction: 'up' | 'down') => Promise<void>;
  togglePinLibraryFile: (fileId: string) => Promise<void>;

  // Marketplace
  addMarketplaceItem: (item: Omit<MarketplaceItem, 'id' | 'createdAt'>) => Promise<void>;
  updateMarketplaceItem: (id: string, updates: Partial<MarketplaceItem>) => Promise<void>;
  updateMarketplaceItemStatus: (id: string, status: 'متاح' | 'تم البيع') => Promise<void>;
  deleteMarketplaceItem: (id: string) => Promise<void>;

  // Videos & Educational Media
  videos: VideoItem[];
  videoFolders: VideoFolderItem[];
  addVideoFolder: (folder: { name: string; parentId: string | null; subjectId?: string; yearId?: AcademicYearId; semester?: SemesterType }) => Promise<void>;
  renameVideoFolder: (folderId: string, newName: string) => Promise<void>;
  deleteVideoFolder: (folderId: string) => Promise<void>;
  addVideo: (video: Omit<VideoItem, 'id' | 'viewsCount'>) => Promise<string>;
  updateVideo: (id: string, updates: Partial<VideoItem>) => Promise<void>;
  deleteVideo: (id: string) => Promise<void>;
  moveVideo: (videoId: string, direction: 'up' | 'down') => Promise<void>;
  togglePinVideo: (videoId: string) => Promise<void>;
  purgeAllDemoData: () => Promise<void>;

  // Announcements
  addAnnouncement: (item: Omit<AnnouncementItem, 'id'>) => Promise<void>;
  updateAnnouncement: (id: string, updates: Partial<AnnouncementItem>) => Promise<void>;
  deleteAnnouncement: (id: string) => Promise<void>;

  // Discussions & Legacy
  addDiscussionPost: (post: { title: string; content: string; academicYear: string }) => Promise<void>;
  addDiscussionComment: (postId: string, content: string) => Promise<void>;
  deleteDiscussionPost: (postId: string) => Promise<void>;

  // Direct Chat
  activeChatPartner: { uid: string; displayName: string; email?: string } | null;
  setActiveChatPartner: (partner: { uid: string; displayName: string; email?: string } | null) => void;
  isChatOpen: boolean;
  setIsChatOpen: (open: boolean) => void;
  openDirectChatWithUser: (partner: { uid: string; displayName: string; email?: string }) => void;
  sendDirectMessage: (receiverId: string, receiverName: string, content: string) => Promise<void>;

  // Telegram-like Community & Channels
  channels: ChannelInfo[];
  activeChannelId: string;
  setActiveChannelId: (channelId: string) => void;
  communityMessages: import('../types').CommunityMessage[];
  joinRequests: import('../types').ChannelJoinRequest[];
  blockedUsers: string[];
  toggleBlockUser: (targetIdOrExam: string) => void;
  createChannel: (channel: Omit<ChannelInfo, 'id' | 'membersCount'>) => Promise<void>;
  sendCommunityMessage: (message: {
    channelId?: string;
    receiverId?: string;
    type: import('../types').ChatMessageType;
    content: string;
    mediaUrl?: string;
    fileName?: string;
    fileSize?: string;
    voiceDuration?: number;
    poll?: import('../types').PollData;
    mcq?: import('../types').MCQData;
  }) => Promise<void>;
  votePoll: (messageId: string, optionIndex: number) => Promise<void>;
  answerMCQInChat: (messageId: string, optionIndex: number) => Promise<void>;
  requestChannelAccess: (channelId: string, examNumber: string) => Promise<void>;
  approveJoinRequest: (requestId: string) => Promise<void>;
  toggleChannelRestriction: (channelId: string, key: 'allowText' | 'allowVoice' | 'allowMedia' | 'allowPolls') => Promise<void>;
  updateUserExamNumber: (examNumber: string) => void;

  // Grades & Leaderboard System (Percentage only, no GPA 4.0)
  grades: GradeItem[];
  leaderboard: StudentLeaderboardEntry[];
  gradeAppeals: GradeAppealTicket[];
  savePreparatoryGrade: (subjectName: string, mark: number, semester: SemesterType) => Promise<void>;
  savePreparatoryGradesBatch: (batch: { subjectName: string; mark: number; semester: SemesterType }[]) => Promise<void>;
  updateStudentGrade: (gradeId: string, newMark: number) => Promise<void>;
  submitGradeAppeal: (ticket: Omit<GradeAppealTicket, 'id' | 'createdAt' | 'status'>) => Promise<void>;
  resolveGradeAppeal: (ticketId: string, status: 'resolved' | 'rejected', replyNote?: string, updatedMark?: number) => Promise<void>;
  addAppealMessage: (ticketId: string, text: string, sender: 'student' | 'admin', senderName: string) => Promise<void>;
  adminUpdateStudentGrades: (studentExamNumber: string, grades: { subjectName: string; mark: number; semester: SemesterType }[]) => Promise<void>;

  // Enhanced Automation Bank
  savedQuestionIds: string[];
  toggleSaveQuestion: (questionId: string) => void;
  questionNotes: Record<string, string>;
  saveQuestionNote: (questionId: string, note: string) => void;
  deleteQuestionNote: (questionId: string) => void;
  wrongQuestionIds: string[];
  removeWrongQuestions: (questionIds: string[]) => void;
  solvedQuestions: Record<string, { chosenOption: number; isCorrect: boolean }>;
  recordQuestionAnswer: (questionId: string, chosenOption: number, isCorrect: boolean) => void;
  resetQuestionStatus: (questionId: string) => void;
  resetQuestionsBatch: (questionIds: string[]) => void;
  resetAllQuestionStatus: () => void;
  chapterLastIndex: Record<string, number>;
  setChapterQuestionIndex: (chapterId: string, index: number) => void;
  studentCustomQuizzes: StudentCustomQuiz[];
  saveStudentCustomQuiz: (quiz: StudentCustomQuiz) => void;
  deleteStudentCustomQuiz: (quizId: string) => void;

  // Question Discussions & Reports (MedFur Advanced Module)
  questionComments: QuestionCommentItem[];
  addQuestionComment: (questionId: string, content: string) => Promise<void>;
  updateQuestionComment: (commentId: string, newContent: string) => Promise<void>;
  deleteQuestionComment: (commentId: string) => Promise<void>;
  toggleLikeQuestionComment: (commentId: string) => Promise<void>;
  questionReports: QuestionReportItem[];
  submitQuestionReport: (report: {
    questionId: string;
    issueType: QuestionReportIssueType;
    description: string;
  }) => Promise<void>;
  resolveQuestionReport: (
    reportId: string,
    status: 'resolved' | 'dismissed',
    resolutionNote?: string
  ) => Promise<void>;
  deleteQuestionReport: (reportId: string) => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Dark mode Schedule ('manual' | 'system' | 'time')
  const [darkModeSchedule, setDarkModeScheduleState] = useState<DarkModeSchedule>(() => {
    const saved = localStorage.getItem('medfur_dark_schedule');
    if (saved === 'system' || saved === 'time' || saved === 'manual') return saved;
    return 'manual';
  });

  // Dark mode by default is true (matching MedFur Dark Navy design) or computed from schedule
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const schedule = localStorage.getItem('medfur_dark_schedule') as DarkModeSchedule | null;
    if (schedule === 'time') {
      const hour = new Date().getHours();
      return hour >= 18 || hour < 6;
    }
    const saved = localStorage.getItem('uniportal_theme');
    if (saved) return saved === 'dark';
    if (schedule === 'system' && typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return true;
  });

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const setDarkModeSchedule = (schedule: DarkModeSchedule) => {
    setDarkModeScheduleState(schedule);
    localStorage.setItem('medfur_dark_schedule', schedule);
    if (schedule === 'system' && typeof window !== 'undefined' && window.matchMedia) {
      const isSystemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setDarkMode(isSystemDark);
      localStorage.setItem('uniportal_theme', isSystemDark ? 'dark' : 'light');
    } else if (schedule === 'time') {
      const hour = new Date().getHours();
      const isNight = hour >= 18 || hour < 6;
      setDarkMode(isNight);
      localStorage.setItem('uniportal_theme', isNight ? 'dark' : 'light');
    }
  };

  const toggleDarkMode = () => {
    setDarkModeScheduleState('manual');
    localStorage.setItem('medfur_dark_schedule', 'manual');
    setDarkMode(prev => {
      const next = !prev;
      localStorage.setItem('uniportal_theme', next ? 'dark' : 'light');
      return next;
    });
  };

  const buildAccountProfile = (type: AccountType, overrideRole?: 'admin' | 'student'): UserProfile => {
    if (type === 'admin') {
      const activeRole = overrideRole || 'admin';
      return {
        uid: 'admin-uid-99',
        email: ADMIN_EMAIL,
        displayName: activeRole === 'admin' ? 'المشرف الأكاديمي' : 'المشرف (معاينة كطالب)',
        lastName: '',
        studentId: 'ADMIN-001',
        examNumber: 'ADMIN-01',
        academicYear: 'السنة الثالثة',
        yearBadge: '0',
        batch: activeRole === 'admin' ? 'الإشراف الأكاديمي' : 'معاينة واجهة الطالب',
        role: activeRole,
        accountType: 'admin',
        canToggleRole: true,
        blockedUsers: [],
        createdAt: new Date().toISOString()
      };
    }
    if (type === 'student') {
      return {
        uid: 'student-uid-12',
        email: 'student.med@univ.edu',
        displayName: 'حساب الطالب التجريبي',
        lastName: '',
        studentId: '2024-30421',
        examNumber: '30421',
        academicYear: 'السنة الثالثة',
        yearBadge: '3',
        batch: 'كلية الطب البشري',
        role: 'student',
        accountType: 'student',
        canToggleRole: false,
        blockedUsers: [],
        createdAt: new Date().toISOString()
      };
    }
    return {
      uid: 'guest-uid-00',
      email: 'guest@medfur.edu',
      displayName: 'زائر (وضع الضيف)',
      lastName: '',
      studentId: 'GUEST',
      examNumber: '',
      academicYear: 'السنة الثالثة',
      yearBadge: '0',
      batch: 'تصفح وتجربة الأتمتة',
      role: 'guest',
      accountType: 'guest',
      canToggleRole: false,
      blockedUsers: [],
      createdAt: new Date().toISOString()
    };
  };

  // Default User: Clean Supervisor Account with Role Toggle enabled
  const [user, setUser] = useState<UserProfile | null>(() => {
    const loaded = safeLoadStorage<UserProfile | null>('medfur_clean_user_v8', null);
    if (loaded && loaded.accountType) {
      return loaded;
    }
    return buildAccountProfile('admin', 'admin');
  });

  const accountType: AccountType = user?.accountType || (user?.role === 'admin' ? 'admin' : user?.role === 'guest' ? 'guest' : 'student');
  const isGuest: boolean = accountType === 'guest' || user?.role === 'guest' || !user;
  const canToggleRole: boolean = Boolean(user?.canToggleRole || accountType === 'admin');

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Navigation
  const [activeSection, setActiveSection] = useState<ActiveSection>('home');
  const [activeYear, setActiveYear] = useState<AcademicYearId>('year-3');
  const [activeSemester, setActiveSemester] = useState<SemesterType>('first');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);
  const [selectedChapterId, setSelectedChapterId] = useState<string | null>(null);

  // Study, Eye Comfort & Vibrant Multi-Color Theme Preferences
  const [eyeComfortMode, setEyeComfortMode] = useState<boolean>(() => {
    return localStorage.getItem('uniportal_eye_comfort') === 'true';
  });

  const [colorTheme, setColorThemeState] = useState<ColorThemeId>(() => {
    const saved = localStorage.getItem('medfur_color_theme') as ColorThemeId | null;
    if (saved && ['emerald', 'sky', 'orange', 'purple', 'rose'].includes(saved)) {
      return saved;
    }
    return 'emerald';
  });

  const [questionFontScale, setQuestionFontScaleState] = useState<'normal' | 'large' | 'xlarge'>(() => {
    const saved = localStorage.getItem('uniportal_font_scale');
    if (saved === 'large' || saved === 'xlarge') return saved;
    return 'normal';
  });

  const [uiDensity, setUiDensityState] = useState<UIDensityMode>(() => {
    const saved = localStorage.getItem('medfur_ui_density');
    if (saved === 'compact' || saved === 'balanced') return saved;
    return 'balanced';
  });

  const [quizPreferences, setQuizPreferencesState] = useState<QuizBehaviorPreferences>(() => {
    const saved = safeLoadStorage<Partial<QuizBehaviorPreferences>>('medfur_quiz_prefs_v1', {});
    return {
      ...DEFAULT_QUIZ_PREFERENCES,
      ...saved,
    };
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-density', uiDensity);
    if (uiDensity === 'compact') {
      document.documentElement.classList.add('density-compact');
    } else {
      document.documentElement.classList.remove('density-compact');
    }
  }, [uiDensity]);

  useEffect(() => {
    if (eyeComfortMode) {
      document.documentElement.classList.add('eye-comfort');
    } else {
      document.documentElement.classList.remove('eye-comfort');
    }
  }, [eyeComfortMode]);

  useEffect(() => {
    // Ensure any legacy Royal Mode keys or classes are permanently removed
    document.documentElement.classList.remove('royal-mode');
    try {
      localStorage.removeItem('medfur_royal_mode');
      localStorage.removeItem('uniportal_royal_mode');
    } catch {
      // ignore
    }
    document.documentElement.setAttribute('data-color-theme', colorTheme);
  }, [colorTheme]);

  // One-time cleanup of old mock localStorage keys
  useEffect(() => {
    const legacyKeys = [
      'uniportal_user_v3',
      'uniportal_subjects_v6',
      'uniportal_questions_v6',
      'uniportal_folders_v3',
      'uniportal_libfiles_v3',
      'uniportal_market_v3',
      'uniportal_announcements_v3',
      'uniportal_videofolders_v4',
      'uniportal_videos_v5',
      'uniportal_discussions_v3',
      'uniportal_direct_msgs_v3',
      'uniportal_channels_v4',
      'uniportal_comm_msgs_v4',
      'uniportal_grades_v5',
      'uniportal_leaderboard_v5',
      'uniportal_appeals_v5',
      'medfur_q_comments_v1',
      'medfur_q_reports_v1',
    ];
    try {
      legacyKeys.forEach((k) => localStorage.removeItem(k));
    } catch {
      // ignore
    }
  }, []);

  const toggleEyeComfortMode = () => {
    setEyeComfortMode(prev => {
      const next = !prev;
      localStorage.setItem('uniportal_eye_comfort', String(next));
      return next;
    });
  };

  const setColorTheme = (theme: ColorThemeId) => {
    setColorThemeState(theme);
    localStorage.setItem('medfur_color_theme', theme);
  };

  const setQuestionFontScale = (scale: 'normal' | 'large' | 'xlarge') => {
    setQuestionFontScaleState(scale);
    localStorage.setItem('uniportal_font_scale', scale);
  };

  const setUiDensity = (density: UIDensityMode) => {
    setUiDensityState(density);
    localStorage.setItem('medfur_ui_density', density);
  };

  const updateQuizPreferences = (updates: Partial<QuizBehaviorPreferences>) => {
    setQuizPreferencesState(prev => {
      const next = { ...prev, ...updates };
      try {
        localStorage.setItem('medfur_quiz_prefs_v1', JSON.stringify(next));
      } catch {
        // ignore storage errors
      }
      return next;
    });
  };

  // Collections state (clean v7 keys with zero demo data)
  const [subjects, setSubjects] = useState<SubjectItem[]>(() =>
    safeLoadStorage('medfur_clean_subjects_v7', INITIAL_SUBJECTS)
  );

  const [questions, setQuestions] = useState<QuestionItem[]>(() =>
    safeLoadStorage('medfur_clean_questions_v7', INITIAL_QUESTIONS)
  );

  const [libraryFolders, setLibraryFolders] = useState<LibraryFolderItem[]>(() => {
    const saved = safeLoadStorage<LibraryFolderItem[]>('medfur_clean_folders_v8', []);
    return buildCompleteLibraryFolders(INITIAL_SUBJECTS, saved);
  });

  const [libraryFiles, setLibraryFiles] = useState<LibraryFileItem[]>(() =>
    safeLoadStorage('medfur_clean_libfiles_v7', INITIAL_LIBRARY_FILES)
  );

  const [marketplaceItems, setMarketplaceItems] = useState<MarketplaceItem[]>(() =>
    safeLoadStorage('medfur_clean_market_v7', INITIAL_MARKETPLACE)
  );

  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>(() =>
    safeLoadStorage('medfur_clean_announcements_v7', INITIAL_ANNOUNCEMENTS)
  );

  const [videoFolders, setVideoFolders] = useState<VideoFolderItem[]>(() =>
    safeLoadStorage('medfur_clean_videofolders_v7', INITIAL_VIDEO_FOLDERS)
  );

  const [videos, setVideos] = useState<VideoItem[]>(() =>
    safeLoadStorage('medfur_clean_videos_v7', INITIAL_VIDEOS)
  );

  const [discussions, setDiscussions] = useState<DiscussionPost[]>(() =>
    safeLoadStorage('medfur_clean_discussions_v7', [])
  );

  const [directMessages, setDirectMessages] = useState<DirectMessage[]>(() =>
    safeLoadStorage('medfur_clean_direct_msgs_v7', [])
  );

  const [channels, setChannels] = useState<ChannelInfo[]>(() =>
    safeLoadStorage('medfur_clean_channels_v7', INITIAL_CHANNELS)
  );
  const [activeChannelId, setActiveChannelId] = useState<string>('general');
  const [communityMessages, setCommunityMessages] = useState<import('../types').CommunityMessage[]>(() =>
    safeLoadStorage('medfur_clean_comm_msgs_v7', INITIAL_COMMUNITY_MESSAGES)
  );
  const [joinRequests, setJoinRequests] = useState<import('../types').ChannelJoinRequest[]>(() =>
    safeLoadStorage('medfur_clean_join_reqs_v7', [])
  );
  const [blockedUsers, setBlockedUsers] = useState<string[]>(() =>
    safeLoadStorage('medfur_clean_blocked_v7', [])
  );

  const [grades, setGrades] = useState<GradeItem[]>(() =>
    safeLoadStorage('medfur_clean_grades_v7', INITIAL_GRADES)
  );
  const [leaderboard, setLeaderboard] = useState<StudentLeaderboardEntry[]>(() =>
    safeLoadStorage('medfur_clean_leaderboard_v7', INITIAL_LEADERBOARD)
  );
  const [gradeAppeals, setGradeAppeals] = useState<GradeAppealTicket[]>(() =>
    safeLoadStorage('medfur_clean_appeals_v7', INITIAL_GRADE_APPEALS)
  );

  // Helper for Account-Isolated Statistics Storage Keys
  const getAccountScopedKey = (acct: AccountType, keySuffix: string) => `medfur_v8_${acct}_${keySuffix}`;

  // Enhanced Automation Bank State (Strictly isolated per accountType: admin / student / guest)
  const [savedQuestionIds, setSavedQuestionIds] = useState<string[]>(() =>
    safeLoadStorage(getAccountScopedKey(accountType, 'saved_qids'), [])
  );
  const [questionNotes, setQuestionNotes] = useState<Record<string, string>>(() =>
    safeLoadStorage(getAccountScopedKey(accountType, 'q_notes'), {})
  );
  const [wrongQuestionIds, setWrongQuestionIds] = useState<string[]>(() =>
    safeLoadStorage(getAccountScopedKey(accountType, 'wrong_qids'), [])
  );
  const [solvedQuestions, setSolvedQuestions] = useState<Record<string, { chosenOption: number; isCorrect: boolean }>>(() =>
    safeLoadStorage(getAccountScopedKey(accountType, 'solved_qs'), {})
  );
  const [chapterLastIndex, setChapterLastIndex] = useState<Record<string, number>>(() =>
    safeLoadStorage(getAccountScopedKey(accountType, 'chapter_last_idx'), {})
  );
  const [studentCustomQuizzes, setStudentCustomQuizzes] = useState<StudentCustomQuiz[]>(() =>
    safeLoadStorage(getAccountScopedKey(accountType, 'custom_quizzes'), [])
  );

  // MedFur Question Discussions & Reports State
  const [questionComments, setQuestionComments] = useState<QuestionCommentItem[]>(() =>
    safeLoadStorage('medfur_clean_q_comments_v7', INITIAL_QUESTION_COMMENTS)
  );

  const [questionReports, setQuestionReports] = useState<QuestionReportItem[]>(() =>
    safeLoadStorage('medfur_clean_q_reports_v7', INITIAL_QUESTION_REPORTS)
  );

  // Direct Peer-to-Peer Chat
  const [activeChatPartner, setActiveChatPartner] = useState<{ uid: string; displayName: string; email?: string } | null>(null);
  const [isChatOpen, setIsChatOpen] = useState<boolean>(false);

  // Sync to local storage safely
  useEffect(() => {
    try { localStorage.setItem('medfur_clean_subjects_v7', JSON.stringify(subjects)); } catch { /* quota safe */ }
  }, [subjects]);

  useEffect(() => {
    try { localStorage.setItem('medfur_clean_questions_v7', JSON.stringify(questions)); } catch { /* quota safe */ }
  }, [questions]);

  useEffect(() => {
    try { localStorage.setItem('medfur_clean_folders_v8', JSON.stringify(libraryFolders)); } catch { /* quota safe */ }
  }, [libraryFolders]);

  useEffect(() => {
    try { localStorage.setItem('medfur_clean_libfiles_v7', JSON.stringify(libraryFiles)); } catch { /* quota safe */ }
  }, [libraryFiles]);

  useEffect(() => {
    try { localStorage.setItem('medfur_clean_market_v7', JSON.stringify(marketplaceItems)); } catch { /* quota safe */ }
  }, [marketplaceItems]);

  useEffect(() => {
    try { localStorage.setItem('medfur_clean_announcements_v7', JSON.stringify(announcements)); } catch { /* quota safe */ }
  }, [announcements]);

  useEffect(() => {
    try { localStorage.setItem('medfur_clean_discussions_v7', JSON.stringify(discussions)); } catch { /* quota safe */ }
  }, [discussions]);

  useEffect(() => {
    try { localStorage.setItem('medfur_clean_direct_msgs_v7', JSON.stringify(directMessages)); } catch { /* quota safe */ }
  }, [directMessages]);

  useEffect(() => {
    try { localStorage.setItem('medfur_clean_videofolders_v7', JSON.stringify(videoFolders)); } catch { /* quota safe */ }
  }, [videoFolders]);

  useEffect(() => {
    try { localStorage.setItem('medfur_clean_videos_v7', JSON.stringify(videos)); } catch { /* quota safe */ }
  }, [videos]);

  useEffect(() => {
    try { localStorage.setItem('medfur_clean_channels_v7', JSON.stringify(channels)); } catch { /* quota safe */ }
  }, [channels]);

  useEffect(() => {
    try { localStorage.setItem('medfur_clean_comm_msgs_v7', JSON.stringify(communityMessages)); } catch { /* quota safe */ }
  }, [communityMessages]);

  useEffect(() => {
    try { localStorage.setItem('medfur_clean_join_reqs_v7', JSON.stringify(joinRequests)); } catch { /* quota safe */ }
  }, [joinRequests]);

  useEffect(() => {
    try { localStorage.setItem('medfur_clean_blocked_v7', JSON.stringify(blockedUsers)); } catch { /* quota safe */ }
  }, [blockedUsers]);

  useEffect(() => {
    try { localStorage.setItem(getAccountScopedKey(accountType, 'saved_qids'), JSON.stringify(savedQuestionIds)); } catch { /* quota safe */ }
  }, [savedQuestionIds, accountType]);

  useEffect(() => {
    try { localStorage.setItem(getAccountScopedKey(accountType, 'q_notes'), JSON.stringify(questionNotes)); } catch { /* quota safe */ }
  }, [questionNotes, accountType]);

  useEffect(() => {
    try { localStorage.setItem(getAccountScopedKey(accountType, 'wrong_qids'), JSON.stringify(wrongQuestionIds)); } catch { /* quota safe */ }
  }, [wrongQuestionIds, accountType]);

  useEffect(() => {
    try { localStorage.setItem(getAccountScopedKey(accountType, 'solved_qs'), JSON.stringify(solvedQuestions)); } catch { /* quota safe */ }
  }, [solvedQuestions, accountType]);

  useEffect(() => {
    try { localStorage.setItem(getAccountScopedKey(accountType, 'chapter_last_idx'), JSON.stringify(chapterLastIndex)); } catch { /* quota safe */ }
  }, [chapterLastIndex, accountType]);

  useEffect(() => {
    try { localStorage.setItem(getAccountScopedKey(accountType, 'custom_quizzes'), JSON.stringify(studentCustomQuizzes)); } catch { /* quota safe */ }
  }, [studentCustomQuizzes, accountType]);

  useEffect(() => {
    try { localStorage.setItem('medfur_clean_grades_v7', JSON.stringify(grades)); } catch { /* quota safe */ }
  }, [grades]);

  useEffect(() => {
    try { localStorage.setItem('medfur_clean_leaderboard_v7', JSON.stringify(leaderboard)); } catch { /* quota safe */ }
  }, [leaderboard]);

  useEffect(() => {
    try { localStorage.setItem('medfur_clean_appeals_v7', JSON.stringify(gradeAppeals)); } catch { /* quota safe */ }
  }, [gradeAppeals]);

  useEffect(() => {
    try { localStorage.setItem('medfur_clean_q_comments_v7', JSON.stringify(questionComments)); } catch { /* quota safe */ }
  }, [questionComments]);

  useEffect(() => {
    try { localStorage.setItem('medfur_clean_q_reports_v7', JSON.stringify(questionReports)); } catch { /* quota safe */ }
  }, [questionReports]);

  const isAdmin = user?.role === 'admin';

  // Switch between the 3 isolated temporary accounts (Admin, Standalone Student, Guest)
  const switchAccount = (targetAccount: AccountType) => {
    const nextProfile = buildAccountProfile(targetAccount, targetAccount === 'admin' ? 'admin' : undefined);
    setUser(nextProfile);
    try {
      localStorage.setItem('medfur_clean_user_v8', JSON.stringify(nextProfile));
    } catch {
      // ignore
    }
    // Load the target account's isolated automation statistics & notification read states
    setSavedQuestionIds(safeLoadStorage(getAccountScopedKey(targetAccount, 'saved_qids'), []));
    setQuestionNotes(safeLoadStorage(getAccountScopedKey(targetAccount, 'q_notes'), {}));
    setWrongQuestionIds(safeLoadStorage(getAccountScopedKey(targetAccount, 'wrong_qids'), []));
    setSolvedQuestions(safeLoadStorage(getAccountScopedKey(targetAccount, 'solved_qs'), {}));
    setChapterLastIndex(safeLoadStorage(getAccountScopedKey(targetAccount, 'chapter_last_idx'), {}));
    setStudentCustomQuizzes(safeLoadStorage(getAccountScopedKey(targetAccount, 'custom_quizzes'), []));
    setReadNotificationIds(safeLoadStorage(getAccountScopedKey(targetAccount, 'read_notifs'), []));
  };

  // Inside the Admin account ONLY: toggle between Admin mode and Student Preview mode
  const quickSwitchPersona = (role: 'admin' | 'student') => {
    if (accountType === 'admin' || canToggleRole) {
      const toggledAdminProfile = buildAccountProfile('admin', role);
      setUser(toggledAdminProfile);
      try {
        localStorage.setItem('medfur_clean_user_v8', JSON.stringify(toggledAdminProfile));
      } catch {
        // ignore
      }
    } else {
      switchAccount(role);
    }
  };

  // Auth Functions
  const loginWithGoogle = async (studentId: string, academicYear: string) => {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const isAdm = result.user.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();
      const profile: UserProfile = {
        uid: result.user.uid,
        email: result.user.email || 'user@univ.edu',
        displayName: result.user.displayName || 'طالب جامعي',
        studentId: studentId.trim() || '2024-1011',
        academicYear: academicYear || 'السنة الثالثة',
        batch: 'دفعة 30',
        role: isAdm ? 'admin' : 'student',
        photoURL: result.user.photoURL || undefined,
        createdAt: new Date().toISOString(),
      };
      setUser(profile);
      localStorage.setItem('uniportal_user_v3', JSON.stringify(profile));
      setIsAuthModalOpen(false);
    } catch (err: unknown) {
      console.error('Google Sign in error:', err);
      throw err;
    }
  };

  const loginWithEmail = async (email: string, pass: string, studentId = '2024-8842', academicYear = 'السنة الثالثة', isNew = false) => {
    try {
      let fbUser;
      if (isNew) {
        const res = await createUserWithEmailAndPassword(auth, email, pass);
        fbUser = res.user;
      } else {
        const res = await signInWithEmailAndPassword(auth, email, pass);
        fbUser = res.user;
      }
      const isAdm = email.toLowerCase() === ADMIN_EMAIL.toLowerCase();
      const profile: UserProfile = {
        uid: fbUser.uid,
        email: fbUser.email || email,
        displayName: email.split('@')[0],
        studentId: studentId.trim(),
        academicYear: academicYear,
        batch: 'دفعة 30',
        role: isAdm ? 'admin' : 'student',
        accountType: isAdm ? 'admin' : 'student',
        canToggleRole: isAdm,
        createdAt: new Date().toISOString(),
      };
      setUser(profile);
      localStorage.setItem('medfur_clean_user_v8', JSON.stringify(profile));
      setIsAuthModalOpen(false);
    } catch (err: unknown) {
      console.error('Email login error:', err);
      throw err;
    }
  };

  const signOut = async () => {
    try {
      await fbSignOut(auth);
    } catch {
      // fallback
    }
    switchAccount('guest');
  };

  const updateUserProfile = (profileUpdates: Partial<UserProfile>) => {
    if (!user) return;
    const updated = { ...user, ...profileUpdates };
    setUser(updated);
    localStorage.setItem('medfur_clean_user_v8', JSON.stringify(updated));
  };

  // Subjects & Chapters
  const addSubject = async (item: Partial<SubjectItem>) => {
    const newSub: SubjectItem = {
      id: `sub-${Date.now()}`,
      name: item.name || 'مقرر جديد',
      yearId: item.yearId || activeYear,
      semester: item.semester || activeSemester,
      icon: item.icon || 'BookOpen',
      color: item.color || '#10B981',
      questionsCount: item.questionsCount || 0,
      filesCount: item.filesCount || 0,
      department: item.department || 'القسم الأكاديمي',
      chapters: item.chapters || [{ id: `ch-${Date.now()}`, name: 'الفصل الأول: المفاهيم الأساسية', category: 'section', questionsCount: 0 }]
    };
    setSubjects(prev => [newSub, ...prev]);
  };

  const updateSubject = async (id: string, updates: Partial<SubjectItem>) => {
    setSubjects(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
  };

  const deleteSubject = async (id: string) => {
    setSubjects(prev => prev.filter(s => s.id !== id));
    setQuestions(prev => prev.filter(q => q.subjectId !== id));
    if (selectedSubjectId === id) setSelectedSubjectId(null);
  };

  const addChapterToSubject = async (subjectId: string, chapterName: string, category: import('../types').ChapterCategory = 'section') => {
    const newChapter = {
      id: `ch-${Date.now()}`,
      name: chapterName.trim(),
      category,
      questionsCount: 0
    };
    setSubjects(prev => prev.map(s => {
      if (s.id === subjectId) {
        return { ...s, chapters: [...(s.chapters || []), newChapter] };
      }
      return s;
    }));
  };

  const renameChapterInSubject = async (subjectId: string, chapterId: string, newName: string, category?: import('../types').ChapterCategory) => {
    const subjectObj = subjects.find(s => s.id === subjectId);
    const oldChapter = subjectObj?.chapters?.find(c => c.id === chapterId);
    const trimmedName = newName.trim();

    setSubjects(prev => prev.map(s => {
      if (s.id === subjectId) {
        return {
          ...s,
          chapters: (s.chapters || []).map(ch =>
            ch.id === chapterId
              ? { ...ch, name: trimmedName, ...(category ? { category } : {}) }
              : ch
          )
        };
      }
      return s;
    }));

    if (oldChapter && oldChapter.name !== trimmedName) {
      setQuestions(prev => prev.map(q => {
        if (q.subjectId === subjectId && (q.chapterId === chapterId || q.chapterName === oldChapter.name)) {
          return {
            ...q,
            chapterName: trimmedName,
            ...(category ? { category } : {})
          };
        }
        return q;
      }));
    }
  };

  const deleteChapterFromSubject = async (subjectId: string, chapterId: string) => {
    const subjectObj = subjects.find(s => s.id === subjectId);
    const chapterToDelete = subjectObj?.chapters?.find(c => c.id === chapterId);
    setSubjects(prev => prev.map(s => {
      if (s.id === subjectId) {
        return {
          ...s,
          chapters: (s.chapters || []).filter(ch => ch.id !== chapterId)
        };
      }
      return s;
    }));
    if (chapterToDelete) {
      setQuestions(prev => prev.filter(q => !(q.subjectId === subjectId && (q.chapterId === chapterId || q.chapterName === chapterToDelete.name))));
    }
  };

  // Questions
  const addQuestion = async (item: Omit<QuestionItem, 'id'>) => {
    const newQ: QuestionItem = sanitizeForFirestore({
      ...item,
      id: `q-${Date.now()}`,
      createdAt: new Date().toISOString()
    });
    setQuestions(prev => [...prev, newQ]);

    setSubjects(prev => prev.map(s => {
      if (s.id === item.subjectId) {
        return {
          ...s,
          questionsCount: (s.questionsCount || 0) + 1,
          chapters: (s.chapters || []).map(ch => (ch.id === item.chapterId || ch.name === item.chapterName) ? { ...ch, questionsCount: (ch.questionsCount || 0) + 1 } : ch)
        };
      }
      return s;
    }));

    try {
      await setDoc(doc(db, 'questions', newQ.id), sanitizeForFirestore(newQ));
    } catch {
      // safe local fallback
    }
  };

  const addQuestionsBatch = async (items: Omit<QuestionItem, 'id'>[]) => {
    if (!items || items.length === 0) return;
    const baseTimestamp = Date.now();
    const createdAtIso = new Date().toISOString();

    const newQuestions: QuestionItem[] = items.map((item, idx) =>
      sanitizeForFirestore({
        ...item,
        id: `q-${baseTimestamp}-${idx}`,
        createdAt: createdAtIso,
      })
    );

    setQuestions(prev => [...prev, ...newQuestions]);

    // Aggregate count increments per subject and chapter
    setSubjects(prev =>
      prev.map(s => {
        const forSubject = items.filter(it => it.subjectId === s.id);
        if (forSubject.length === 0) return s;

        return {
          ...s,
          questionsCount: (s.questionsCount || 0) + forSubject.length,
          chapters: (s.chapters || []).map(ch => {
            const forChapter = forSubject.filter(
              it => it.chapterId === ch.id || it.chapterName === ch.name
            );
            if (forChapter.length === 0) return ch;
            return {
              ...ch,
              questionsCount: (ch.questionsCount || 0) + forChapter.length,
            };
          }),
        };
      })
    );

    // Best-effort sync to Firestore with sanitized payload inside try/catch
    for (const qItem of newQuestions) {
      try {
        await setDoc(doc(db, 'questions', qItem.id), sanitizeForFirestore(qItem));
      } catch {
        // safe local fallback
      }
    }
  };

  const updateQuestion = async (id: string, updates: Partial<QuestionItem>) => {
    const cleanUpdates = sanitizeForFirestore(updates);
    setQuestions(prev => prev.map(q => q.id === id ? { ...q, ...cleanUpdates } : q));
    try {
      await updateDoc(doc(db, 'questions', id), cleanUpdates as Record<string, unknown>);
    } catch {
      // safe local fallback
    }
  };

  const deleteQuestion = async (id: string) => {
    const targetQ = questions.find(q => q.id === id);
    setQuestions(prev => prev.filter(q => q.id !== id));
    setSavedQuestionIds(prev => prev.filter(qId => qId !== id));
    setWrongQuestionIds(prev => prev.filter(qId => qId !== id));
    setSolvedQuestions(prev => {
      const copy = { ...prev };
      delete copy[id];
      return copy;
    });
    if (targetQ) {
      setSubjects(prev => prev.map(s => {
        if (s.id === targetQ.subjectId) {
          return {
            ...s,
            questionsCount: Math.max(0, (s.questionsCount || 1) - 1),
          };
        }
        return s;
      }));
    }
  };

  // Library Folders & Files
  const addLibraryFolder = async (folder: {
    name: string;
    parentId: string | null;
    isSubject?: boolean;
    subjectId?: string;
    icon?: string;
    department?: string;
    coverColor?: string;
    coverImage?: string;
    coverLabel?: string;
    semesterBadge?: '1' | '2';
  }) => {
    const siblings = libraryFolders.filter((f) => f.parentId === folder.parentId);
    const maxOrder = siblings.reduce((max, f, idx) => Math.max(max, f.orderIndex ?? idx + 1), 0);
    const newFld: LibraryFolderItem = {
      id: `fld-${Date.now()}`,
      name: folder.name.trim(),
      parentId: folder.parentId,
      type: 'folder',
      orderIndex: maxOrder + 1,
      isSubject: folder.isSubject ?? false,
      subjectId: folder.subjectId,
      icon: folder.icon,
      department: folder.department,
      coverColor: folder.coverColor,
      coverImage: folder.coverImage,
      coverLabel: folder.coverLabel,
      semesterBadge: folder.semesterBadge,
    };
    setLibraryFolders(prev => [...prev, newFld]);
  };

  const updateLibraryFolder = async (folderId: string, updates: Partial<LibraryFolderItem>) => {
    setLibraryFolders(prev =>
      prev.map(f => (f.id === folderId ? { ...f, ...updates, name: updates.name ? updates.name.trim() : f.name } : f))
    );
  };

  const renameLibraryFolder = async (folderId: string, newName: string) => {
    setLibraryFolders(prev => prev.map(f => f.id === folderId ? { ...f, name: newName.trim() } : f));
  };

  const deleteLibraryFolder = async (folderId: string) => {
    setLibraryFolders(prev => prev.filter(f => f.id !== folderId && f.parentId !== folderId));
    setLibraryFiles(prev => prev.filter(f => f.folderId !== folderId));
  };

  const moveLibraryFolder = async (folderId: string, direction: 'up' | 'down') => {
    setLibraryFolders(prev => {
      const target = prev.find(f => f.id === folderId);
      if (!target) return prev;
      const siblings = prev
        .filter(f => f.parentId === target.parentId)
        .sort((a, b) => (a.orderIndex ?? 9999) - (b.orderIndex ?? 9999));
      const idx = siblings.findIndex(f => f.id === folderId);
      if (idx === -1) return prev;
      const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (swapIdx < 0 || swapIdx >= siblings.length) return prev;

      const reordered = [...siblings];
      const [moved] = reordered.splice(idx, 1);
      reordered.splice(swapIdx, 0, moved);

      const orderMap = new Map<string, number>();
      reordered.forEach((item, i) => orderMap.set(item.id, i + 1));

      return prev.map(f =>
        orderMap.has(f.id) ? { ...f, orderIndex: orderMap.get(f.id)! } : f
      );
    });
  };

  // Local Notifications & Firebase Read-State Sync (Isolated per accountType)
  const [readNotificationIds, setReadNotificationIds] = useState<string[]>(() =>
    safeLoadStorage<string[]>(getAccountScopedKey(accountType, 'read_notifs'), [])
  );
  const [customNotifications, setCustomNotifications] = useState<AppNotificationItem[]>(() =>
    safeLoadStorage<AppNotificationItem[]>('medfur_custom_notifications_v1', [])
  );
  const [activeToastNotification, setActiveToastNotification] = useState<AppNotificationItem | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(getAccountScopedKey(accountType, 'read_notifs'), JSON.stringify(readNotificationIds));
    } catch {
      // ignore
    }
  }, [readNotificationIds, accountType]);

  useEffect(() => {
    localStorage.setItem('medfur_custom_notifications_v1', JSON.stringify(customNotifications));
  }, [customNotifications]);

  // Real-time Firebase sync for user read notifications
  useEffect(() => {
    const currentAuthUid = auth.currentUser?.uid || user?.uid;
    if (!currentAuthUid) return;

    const notifDocRef = doc(db, 'user_notifications', currentAuthUid);
    const unsubscribe = onSnapshot(
      notifDocRef,
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          if (Array.isArray(data.readNotificationIds)) {
            setReadNotificationIds((prev) => {
              const merged = Array.from(new Set([...prev, ...(data.readNotificationIds as string[])]));
              return merged.slice(-500);
            });
          }
        }
      },
      () => {
        // Offline or guest persona fallback uses localStorage seamlessly
      }
    );

    return () => unsubscribe();
  }, [user?.uid]);

  const syncReadNotificationsToFirebase = async (nextIds: string[]) => {
    const boundedIds = nextIds.slice(-500);
    const targetUid = auth.currentUser?.uid || user?.uid;
    if (!targetUid) return;

    try {
      await setDoc(
        doc(db, 'user_notifications', targetUid),
        sanitizeForFirestore({
          userId: targetUid,
          readNotificationIds: boundedIds,
          updatedAt: new Date().toISOString(),
        }),
        { merge: true }
      );
    } catch {
      // Safe local storage fallback when unauthenticated in Firebase Auth
    }
  };

  const triggerLocalNotification = (notif: AppNotificationItem) => {
    setCustomNotifications((prev) => [notif, ...prev.filter((n) => n.id !== notif.id)].slice(0, 60));
    setActiveToastNotification(notif);

    // Optional Web Notification API if granted
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(notif.title, { body: notif.message, icon: '/pwa-192x192.png' });
      } catch {
        // Ignore in restricted iframe
      }
    }
  };

  useEffect(() => {
    if (!activeToastNotification) return;
    const timer = setTimeout(() => {
      setActiveToastNotification(null);
    }, 5500);
    return () => clearTimeout(timer);
  }, [activeToastNotification]);

  const dismissToastNotification = () => setActiveToastNotification(null);

  // Combine custom real-time notifications with recent Announcements and Library Files
  const notifications: AppNotificationItem[] = React.useMemo(() => {
    const map = new Map<string, AppNotificationItem>();

    customNotifications.forEach((n) => {
      map.set(n.id, { ...n, isRead: readNotificationIds.includes(n.id) });
    });

    announcements.slice(0, 12).forEach((ann, idx) => {
      const id = `notif-ann-${ann.id}`;
      if (!map.has(id)) {
        map.set(id, {
          id,
          title: `إعلان جديد: ${ann.title}`,
          message: `${ann.category} • ${ann.content.slice(0, 90)}${ann.content.length > 90 ? '...' : ''}`,
          category: 'announcement',
          targetSection: 'announcements',
          createdAt: ann.date || 'مؤخراً',
          timestamp: Date.now() - (idx + 1) * 60000,
          isRead: readNotificationIds.includes(id),
        });
      }
    });

    libraryFiles.slice(0, 12).forEach((file, idx) => {
      const id = `notif-lib-${file.id}`;
      if (!map.has(id)) {
        map.set(id, {
          id,
          title: `ملف جديد في المكتبة: ${file.title}`,
          message: `${file.fileType} • إعداد: ${file.author} (${file.fileSize})`,
          category: 'library',
          targetSection: 'library',
          createdAt: file.date || 'مؤخراً',
          timestamp: Date.now() - (idx + 15) * 60000,
          isRead: readNotificationIds.includes(id),
        });
      }
    });

    return Array.from(map.values()).sort((a, b) => b.timestamp - a.timestamp);
  }, [customNotifications, announcements, libraryFiles, readNotificationIds]);

  const unreadNotificationsCount = React.useMemo(
    () => notifications.filter((n) => !readNotificationIds.includes(n.id)).length,
    [notifications, readNotificationIds]
  );

  const markNotificationAsRead = async (notificationId: string) => {
    if (readNotificationIds.includes(notificationId)) return;
    const next = Array.from(new Set([...readNotificationIds, notificationId])).slice(-500);
    setReadNotificationIds(next);
    await syncReadNotificationsToFirebase(next);
  };

  const markAllNotificationsAsRead = async () => {
    const allIds = notifications.map((n) => n.id);
    const next = Array.from(new Set([...readNotificationIds, ...allIds])).slice(-500);
    setReadNotificationIds(next);
    await syncReadNotificationsToFirebase(next);
  };

  const addLibraryFile = async (item: Omit<LibraryFileItem, 'id'>): Promise<string> => {
    const siblings = libraryFiles.filter(f => f.folderId === item.folderId);
    const minOrder = siblings.reduce((min, f, idx) => Math.min(min, f.orderIndex ?? idx + 1), 1);
    const newFileId = `lib-${Date.now()}`;
    const newFile: LibraryFileItem = {
      ...item,
      id: newFileId,
      downloadsCount: 0,
      date: new Date().toISOString().split('T')[0],
      orderIndex: item.orderIndex ?? Math.max(1, minOrder),
      isPinned: item.isPinned ?? false,
    };
    setLibraryFiles(prev => {
      // Shift existing unpinned files in the same folder down by 1 so the newest appears cleanly
      const updated = prev.map((f, i) =>
        f.folderId === item.folderId
          ? { ...f, orderIndex: (f.orderIndex ?? i + 1) + 1 }
          : f
      );
      return [newFile, ...updated];
    });

    triggerLocalNotification({
      id: `notif-lib-${newFile.id}`,
      title: `تمت إضافة ملف جديد في المكتبة`,
      message: `${newFile.title} (${newFile.fileType} • ${newFile.fileSize})`,
      category: 'library',
      targetSection: 'library',
      createdAt: 'الآن',
      timestamp: Date.now(),
      isRead: false,
    });

    try {
      // Avoid sending huge base64 strings (>800KB) to Firestore document
      const firestoreSafeCopy = {
        ...newFile,
        downloadUrl:
          newFile.downloadUrl && newFile.downloadUrl.length > 700000
            ? undefined
            : newFile.downloadUrl,
      };
      await setDoc(doc(db, 'library_items', newFile.id), sanitizeForFirestore(firestoreSafeCopy));
    } catch {
      // safe fallback
    }

    return newFileId;
  };

  const updateLibraryFile = async (id: string, updates: Partial<LibraryFileItem>) => {
    setLibraryFiles(prev => prev.map(f => f.id === id ? { ...f, ...updates } : f));
    try {
      const firestoreSafeUpdates = {
        ...updates,
        downloadUrl:
          updates.downloadUrl && updates.downloadUrl.length > 700000
            ? undefined
            : updates.downloadUrl,
      };
      await updateDoc(doc(db, 'library_items', id), sanitizeForFirestore(firestoreSafeUpdates) as Record<string, unknown>);
    } catch {
      // safe fallback
    }
  };

  const deleteLibraryFile = async (id: string) => {
    setLibraryFiles(prev => prev.filter(f => f.id !== id));
    try {
      await deleteDoc(doc(db, 'library_items', id));
    } catch {
      // safe fallback
    }
  };

  const moveLibraryFile = async (fileId: string, direction: 'up' | 'down') => {
    setLibraryFiles(prev => {
      const target = prev.find(f => f.id === fileId);
      if (!target) return prev;
      const siblings = prev
        .filter(f => f.folderId === target.folderId)
        .sort((a, b) => {
          if (Boolean(b.isPinned) !== Boolean(a.isPinned)) {
            return b.isPinned ? 1 : -1;
          }
          return (a.orderIndex ?? 9999) - (b.orderIndex ?? 9999);
        });
      const idx = siblings.findIndex(f => f.id === fileId);
      if (idx === -1) return prev;
      const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (swapIdx < 0 || swapIdx >= siblings.length) return prev;

      const reordered = [...siblings];
      const [moved] = reordered.splice(idx, 1);
      reordered.splice(swapIdx, 0, moved);

      const orderMap = new Map<string, number>();
      reordered.forEach((item, i) => orderMap.set(item.id, i + 1));

      return prev.map(f =>
        orderMap.has(f.id) ? { ...f, orderIndex: orderMap.get(f.id)! } : f
      );
    });
  };

  const togglePinLibraryFile = async (fileId: string) => {
    setLibraryFiles(prev =>
      prev.map(f => (f.id === fileId ? { ...f, isPinned: !f.isPinned } : f))
    );
  };

  // Marketplace
  const addMarketplaceItem = async (item: Omit<MarketplaceItem, 'id' | 'createdAt'>) => {
    const newItem: MarketplaceItem = {
      ...item,
      id: `mkt-${Date.now()}`,
      createdAt: 'الآن',
      views: 1
    };
    setMarketplaceItems(prev => [newItem, ...prev]);

    try {
      await setDoc(doc(db, 'marketplace_items', newItem.id), sanitizeForFirestore(newItem));
    } catch {
      // safe fallback
    }
  };

  const updateMarketplaceItem = async (id: string, updates: Partial<MarketplaceItem>) => {
    setMarketplaceItems(prev => prev.map(item => item.id === id ? { ...item, ...updates } : item));
  };

  const updateMarketplaceItemStatus = async (id: string, status: 'متاح' | 'تم البيع') => {
    setMarketplaceItems(prev => prev.map(item => item.id === id ? { ...item, status } : item));
  };

  const deleteMarketplaceItem = async (id: string) => {
    setMarketplaceItems(prev => prev.filter(item => item.id !== id));
  };

  // Announcements
  const addAnnouncement = async (item: Omit<AnnouncementItem, 'id'>) => {
    const newAnn: AnnouncementItem = {
      ...item,
      id: `ann-${Date.now()}`
    };
    setAnnouncements(prev => [newAnn, ...prev]);

    triggerLocalNotification({
      id: `notif-ann-${newAnn.id}`,
      title: `إعلان جديد من الكلية (${newAnn.category})`,
      message: newAnn.title,
      category: 'announcement',
      targetSection: 'announcements',
      createdAt: 'الآن',
      timestamp: Date.now(),
      isRead: false,
    });

    try {
      await setDoc(doc(db, 'announcements', newAnn.id), sanitizeForFirestore(newAnn));
    } catch {
      // safe fallback
    }
  };

  const updateAnnouncement = async (id: string, updates: Partial<AnnouncementItem>) => {
    setAnnouncements(prev => prev.map(a => a.id === id ? { ...a, ...updates } : a));
  };

  const deleteAnnouncement = async (id: string) => {
    setAnnouncements(prev => prev.filter(a => a.id !== id));
  };

  // Video Folders & Videos
  const addVideoFolder = async (folder: { name: string; parentId: string | null; subjectId?: string; yearId?: AcademicYearId; semester?: SemesterType }) => {
    const newFolder: VideoFolderItem = {
      id: `vfold-${Date.now()}`,
      name: folder.name.trim(),
      parentId: folder.parentId,
      subjectId: folder.subjectId,
      yearId: folder.yearId,
      semester: folder.semester
    };
    setVideoFolders(prev => [...prev, newFolder]);
  };

  const renameVideoFolder = async (folderId: string, newName: string) => {
    setVideoFolders(prev => prev.map(f => f.id === folderId ? { ...f, name: newName.trim() } : f));
  };

  const deleteVideoFolder = async (folderId: string) => {
    setVideoFolders(prev => prev.filter(f => f.id !== folderId && f.parentId !== folderId));
    setVideos(prev => prev.filter(v => v.folderId !== folderId));
  };

  const addVideo = async (video: Omit<VideoItem, 'id' | 'viewsCount'>): Promise<string> => {
    const newVidId = `vid-${Date.now()}`;
    const siblings = videos.filter(v => v.subjectId === video.subjectId);
    const maxOrder = siblings.reduce((max, v, idx) => Math.max(max, v.orderIndex ?? idx + 1), 0);
    const newVid: VideoItem = {
      ...video,
      id: newVidId,
      viewsCount: 0,
      uploadedAt: new Date().toISOString().split('T')[0],
      orderIndex: video.orderIndex ?? maxOrder + 1,
      isPinned: video.isPinned ?? false,
    };
    setVideos(prev => [...prev, newVid]);
    return newVidId;
  };

  const updateVideo = async (id: string, updates: Partial<VideoItem>) => {
    setVideos(prev => prev.map(v => v.id === id ? { ...v, ...updates } : v));
  };

  const deleteVideo = async (id: string) => {
    setVideos(prev => prev.filter(v => v.id !== id));
  };

  const moveVideo = async (videoId: string, direction: 'up' | 'down') => {
    setVideos(prev => {
      const target = prev.find(v => v.id === videoId);
      if (!target) return prev;
      const siblings = prev
        .filter(v => v.subjectId === target.subjectId)
        .sort((a, b) => {
          if (Boolean(b.isPinned) !== Boolean(a.isPinned)) {
            return b.isPinned ? 1 : -1;
          }
          return (a.orderIndex ?? 9999) - (b.orderIndex ?? 9999);
        });
      const idx = siblings.findIndex(v => v.id === videoId);
      if (idx === -1) return prev;
      const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (swapIdx < 0 || swapIdx >= siblings.length) return prev;

      const reordered = [...siblings];
      const [moved] = reordered.splice(idx, 1);
      reordered.splice(swapIdx, 0, moved);

      const orderMap = new Map<string, number>();
      reordered.forEach((item, i) => orderMap.set(item.id, i + 1));

      return prev.map(v =>
        orderMap.has(v.id) ? { ...v, orderIndex: orderMap.get(v.id)! } : v
      );
    });
  };

  const togglePinVideo = async (videoId: string) => {
    setVideos(prev =>
      prev.map(v => (v.id === videoId ? { ...v, isPinned: !v.isPinned } : v))
    );
  };

  const purgeAllDemoData = async () => {
    setSubjects(INITIAL_SUBJECTS);
    setQuestions([]);
    setLibraryFolders(INITIAL_LIBRARY_FOLDERS);
    setLibraryFiles([]);
    setMarketplaceItems([]);
    setAnnouncements([]);
    setVideoFolders([]);
    setVideos([]);
    setDiscussions([]);
    setDirectMessages([]);
    setCommunityMessages([]);
    setGrades([]);
    setLeaderboard([]);
    setGradeAppeals([]);
    setQuestionComments([]);
    setQuestionReports([]);
    setSavedQuestionIds([]);
    setWrongQuestionIds([]);
    setSolvedQuestions({});
    setChapterLastIndex({});
    setStudentCustomQuizzes([]);
    setCustomNotifications([]);
    setReadNotificationIds([]);
    try {
      (['admin', 'student', 'guest'] as AccountType[]).forEach((acct) => {
        localStorage.removeItem(getAccountScopedKey(acct, 'saved_qids'));
        localStorage.removeItem(getAccountScopedKey(acct, 'q_notes'));
        localStorage.removeItem(getAccountScopedKey(acct, 'wrong_qids'));
        localStorage.removeItem(getAccountScopedKey(acct, 'solved_qs'));
        localStorage.removeItem(getAccountScopedKey(acct, 'chapter_last_idx'));
        localStorage.removeItem(getAccountScopedKey(acct, 'custom_quizzes'));
        localStorage.removeItem(getAccountScopedKey(acct, 'read_notifs'));
      });
    } catch {
      // ignore
    }
  };

  // Discussions
  const addDiscussionPost = async (post: { title: string; content: string; academicYear: string }) => {
    if (!user || isGuest) {
      setIsAuthModalOpen(true);
      return;
    }
    const newPost: DiscussionPost = {
      id: `disc-${Date.now()}`,
      authorId: user.uid,
      authorName: user.displayName,
      authorRole: user.role === 'admin' ? 'admin' : 'student',
      academicYear: post.academicYear,
      title: post.title.trim(),
      content: post.content.trim(),
      likesCount: 0,
      comments: [],
      createdAt: 'الآن'
    };
    setDiscussions(prev => [newPost, ...prev]);
  };

  const addDiscussionComment = async (postId: string, content: string) => {
    if (!user || isGuest) {
      setIsAuthModalOpen(true);
      return;
    }
    const newComment: DiscussionComment = {
      id: `c-${Date.now()}`,
      authorId: user.uid,
      authorName: user.displayName,
      authorRole: user.role === 'admin' ? 'admin' : 'student',
      content: content.trim(),
      createdAt: 'الآن'
    };
    setDiscussions(prev => prev.map(post => {
      if (post.id === postId) {
        return { ...post, comments: [...post.comments, newComment] };
      }
      return post;
    }));
  };

  const deleteDiscussionPost = async (postId: string) => {
    setDiscussions(prev => prev.filter(p => p.id !== postId));
  };

  // Direct Peer-to-Peer Chat
  const openDirectChatWithUser = (partner: { uid: string; displayName: string; email?: string }) => {
    if (!user) {
      setIsAuthModalOpen(true);
      return;
    }
    setActiveChatPartner(partner);
    setIsChatOpen(true);
  };

  const sendDirectMessage = async (receiverId: string, receiverName: string, content: string) => {
    if (!user || !content.trim()) return;

    const newMsg: DirectMessage = {
      id: `msg-${Date.now()}`,
      senderId: user.uid,
      senderName: user.displayName,
      receiverId,
      receiverName,
      content: content.trim(),
      createdAt: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
      isRead: false
    };

    setDirectMessages(prev => [...prev, newMsg]);
  };

  // Telegram Community Methods
  const sendCommunityMessage = async (message: {
    channelId?: string;
    receiverId?: string;
    type: import('../types').ChatMessageType;
    content: string;
    mediaUrl?: string;
    fileName?: string;
    fileSize?: string;
    voiceDuration?: number;
    poll?: import('../types').PollData;
    mcq?: import('../types').MCQData;
  }) => {
    const isAdm = user?.role === 'admin' || user?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();
    let badge: '2' | '3' | '0' = '0';
    if (user?.yearBadge) {
      badge = user.yearBadge;
    } else if (user?.academicYear?.includes('ثالثة')) {
      badge = '3';
    } else if (user?.academicYear?.includes('ثانية')) {
      badge = '2';
    }

    const newMsg: import('../types').CommunityMessage = {
      id: `comm-msg-${Date.now()}`,
      channelId: message.channelId || activeChannelId,
      receiverId: message.receiverId,
      senderId: user?.uid || 'guest-user',
      senderName: user?.displayName || 'طالب زائر',
      senderLastName: user?.lastName || '',
      senderExamNumber: user?.examNumber || user?.studentId || 'لم يحدد',
      senderYearBadge: isAdm ? '0' : badge,
      senderRole: isAdm ? 'admin' : 'student',
      type: message.type,
      content: message.content,
      mediaUrl: message.mediaUrl,
      fileName: message.fileName,
      fileSize: message.fileSize,
      voiceDuration: message.voiceDuration,
      poll: message.poll,
      mcq: message.mcq,
      createdAt: 'الآن',
      timestamp: Date.now()
    };

    setCommunityMessages(prev => [...prev, newMsg]);
  };

  const votePoll = async (messageId: string, optionIndex: number) => {
    const userId = user?.uid || 'anon';
    setCommunityMessages(prev => prev.map(msg => {
      if (msg.id !== messageId || !msg.poll) return msg;

      const updatedOptions = msg.poll.options.map((opt, idx) => {
        const hasVoted = opt.votedUserIds.includes(userId);
        if (idx === optionIndex) {
          if (hasVoted) {
            return { ...opt, votes: Math.max(0, opt.votes - 1), votedUserIds: opt.votedUserIds.filter(id => id !== userId) };
          } else {
            return { ...opt, votes: opt.votes + 1, votedUserIds: [...opt.votedUserIds, userId] };
          }
        } else if (hasVoted) {
          return { ...opt, votes: Math.max(0, opt.votes - 1), votedUserIds: opt.votedUserIds.filter(id => id !== userId) };
        }
        return opt;
      });

      const totalVotes = updatedOptions.reduce((acc, curr) => acc + curr.votes, 0);

      return {
        ...msg,
        poll: {
          ...msg.poll,
          options: updatedOptions,
          totalVotes
        }
      };
    }));
  };

  const answerMCQInChat = async (messageId: string, optionIndex: number) => {
    const userId = user?.uid || 'anon';
    setCommunityMessages(prev => prev.map(msg => {
      if (msg.id !== messageId || !msg.mcq) return msg;
      return {
        ...msg,
        mcq: {
          ...msg.mcq,
          answeredUsers: {
            ...(msg.mcq.answeredUsers || {}),
            [userId]: optionIndex
          }
        }
      };
    }));
  };

  const requestChannelAccess = async (channelId: string, examNumber: string) => {
    const channel = channels.find(c => c.id === channelId);
    const req: import('../types').ChannelJoinRequest = {
      id: `req-${Date.now()}`,
      userId: user?.uid || 'guest',
      userName: `${user?.displayName || 'طالب'} ${user?.lastName || ''}`.trim(),
      examNumber: examNumber.trim(),
      targetChannelId: channelId,
      targetChannelName: channel?.name || 'قناة دراسية',
      status: 'pending',
      createdAt: new Date().toLocaleDateString('ar-SA')
    };
    setJoinRequests(prev => [req, ...prev]);
  };

  const approveJoinRequest = async (requestId: string) => {
    setJoinRequests(prev => prev.map(r => r.id === requestId ? { ...r, status: 'approved' } : r));
  };

  const toggleChannelRestriction = async (channelId: string, key: 'allowText' | 'allowVoice' | 'allowMedia' | 'allowPolls') => {
    setChannels(prev => prev.map(ch => {
      if (ch.id === channelId) {
        return {
          ...ch,
          restrictions: {
            ...ch.restrictions,
            [key]: !ch.restrictions[key]
          }
        };
      }
      return ch;
    }));
  };

  const createChannel = async (channelData: Omit<ChannelInfo, 'id' | 'membersCount'>) => {
    const newChan: ChannelInfo = {
      ...channelData,
      id: `channel-${Date.now()}`,
      membersCount: 1,
    };
    setChannels(prev => [...prev, newChan]);
    setActiveChannelId(newChan.id);
  };

  const toggleBlockUser = (targetIdOrExam: string) => {
    setBlockedUsers(prev => {
      const exists = prev.includes(targetIdOrExam);
      const next = exists ? prev.filter(x => x !== targetIdOrExam) : [...prev, targetIdOrExam];
      if (user) {
        setUser({ ...user, blockedUsers: next });
      }
      return next;
    });
  };

  const updateUserExamNumber = (examNumber: string) => {
    const clean = examNumber.trim();
    let badge: '2' | '3' | '0' = '0';
    let yr = 'السنة الثالثة';
    if (clean.startsWith('3') || clean.startsWith('30')) {
      badge = '3';
      yr = 'السنة الثالثة';
    } else if (clean.startsWith('2') || clean.startsWith('31')) {
      badge = '2';
      yr = 'السنة الثانية';
    }

    if (user) {
      const updated: UserProfile = {
        ...user,
        examNumber: clean,
        studentId: clean,
        yearBadge: badge,
        academicYear: yr
      };
      setUser(updated);
      localStorage.setItem('uniportal_user_v3', JSON.stringify(updated));
    }
  };

  // Grades & Leaderboard System Methods (Percentage Only)
  const savePreparatoryGrade = async (subjectName: string, mark: number, semester: SemesterType) => {
    setGrades(prev => {
      const existingIdx = prev.findIndex(g => g.yearId === 'year-prep' && g.subjectName === subjectName);
      if (existingIdx >= 0) {
        const copy = [...prev];
        copy[existingIdx] = { ...copy[existingIdx], mark, semester };
        return copy;
      }
      const newGrade: GradeItem = {
        id: `g-prep-${Date.now()}`,
        subjectName,
        mark,
        batchAverage: 82.0,
        semester,
        yearId: 'year-prep',
        isSelfEntered: true
      };
      return [...prev, newGrade];
    });
  };

  const savePreparatoryGradesBatch = async (batch: { subjectName: string; mark: number; semester: SemesterType }[]) => {
    setGrades(prev => {
      let copy = [...prev];
      batch.forEach(item => {
        const idx = copy.findIndex(g => g.yearId === 'year-prep' && g.subjectName === item.subjectName);
        if (idx >= 0) {
          copy[idx] = { ...copy[idx], mark: item.mark, semester: item.semester };
        } else {
          copy.push({
            id: `g-prep-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
            subjectName: item.subjectName,
            mark: item.mark,
            batchAverage: 82.0,
            semester: item.semester,
            yearId: 'year-prep',
            isSelfEntered: true
          });
        }
      });
      return copy;
    });
  };

  const updateStudentGrade = async (gradeId: string, newMark: number) => {
    setGrades(prev => prev.map(g => g.id === gradeId ? { ...g, mark: newMark } : g));
  };

  const submitGradeAppeal = async (ticket: Omit<GradeAppealTicket, 'id' | 'createdAt' | 'status'>) => {
    const newTicket: GradeAppealTicket = {
      ...ticket,
      id: `appeal-${Date.now()}`,
      status: 'pending',
      createdAt: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }) + ' ' + new Date().toLocaleDateString('ar-SA')
    };
    setGradeAppeals(prev => [newTicket, ...prev]);
  };

  const resolveGradeAppeal = async (ticketId: string, status: 'resolved' | 'rejected', replyNote?: string, updatedMark?: number) => {
    setGradeAppeals(prev => prev.map(t => {
      if (t.id !== ticketId) return t;
      return {
        ...t,
        status,
        replyNote: replyNote || (status === 'resolved' ? 'تم قبول الاعتراض وتصحيح العلامة بنجاح.' : 'تمت المراجعة وتأكيد دقة العلامة المسجلة.')
      };
    }));

    if (status === 'resolved' && updatedMark !== undefined) {
      const appeal = gradeAppeals.find(t => t.id === ticketId);
      if (appeal) {
        setGrades(prev => prev.map(g => {
          if (g.yearId === appeal.yearId && g.subjectName === appeal.subjectName) {
            return { ...g, mark: updatedMark };
          }
          return g;
        }));
      }
    }
  };

  const addAppealMessage = async (ticketId: string, text: string, sender: 'student' | 'admin', senderName: string) => {
    const newMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      sender,
      senderName,
      text,
      timestamp: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })
    };

    setGradeAppeals(prev => prev.map(t => {
      if (t.id !== ticketId) return t;
      const msgs = t.messages || [
        {
          id: `msg-init-${t.id}`,
          sender: 'student',
          senderName: t.studentName,
          text: t.description,
          timestamp: t.createdAt
        }
      ];
      return {
        ...t,
        messages: [...msgs, newMessage]
      };
    }));
  };

  const adminUpdateStudentGrades = async (studentExamNumber: string, updatedGrades: { subjectName: string; mark: number; semester: SemesterType }[]) => {
    setLeaderboard(prev => prev.map(entry => {
      if (entry.examNumber !== studentExamNumber) return entry;
      const newGrades = entry.grades.map(g => {
        const found = updatedGrades.find(ug => ug.subjectName === g.subjectName);
        if (found) {
          return { ...g, mark: found.mark };
        }
        return g;
      });
      const total = newGrades.reduce((acc, curr) => acc + curr.mark, 0);
      const newAvg = parseFloat((total / (newGrades.length || 1)).toFixed(3));
      return {
        ...entry,
        grades: newGrades,
        average: newAvg
      };
    }));

    if (user?.examNumber === studentExamNumber || studentExamNumber === '30421') {
      setGrades(prev => prev.map(g => {
        const found = updatedGrades.find(ug => ug.subjectName === g.subjectName);
        if (found) {
          return { ...g, mark: found.mark };
        }
        return g;
      }));
    }
  };

  // Automation Bank Methods
  const toggleSaveQuestion = (questionId: string) => {
    setSavedQuestionIds(prev => {
      if (prev.includes(questionId)) {
        return prev.filter(id => id !== questionId);
      } else {
        return [...prev, questionId];
      }
    });
  };

  const saveQuestionNote = (questionId: string, note: string) => {
    setQuestionNotes(prev => ({
      ...prev,
      [questionId]: note.trim()
    }));
  };

  const deleteQuestionNote = (questionId: string) => {
    setQuestionNotes(prev => {
      const copy = { ...prev };
      delete copy[questionId];
      return copy;
    });
  };

  const recordQuestionAnswer = (questionId: string, chosenOption: number, isCorrect: boolean) => {
    setSolvedQuestions(prev => {
      const next = {
        ...prev,
        [questionId]: { chosenOption, isCorrect }
      };
      if (user?.uid) {
        setDoc(
          doc(db, 'user_question_progress', `${user.uid}_${questionId}`),
          {
            userId: user.uid,
            questionId,
            chosenOption,
            isCorrect,
            updatedAt: new Date().toISOString()
          },
          { merge: true }
        ).catch(() => {
          // safe offline fallback
        });
      }
      return next;
    });

    if (!isCorrect) {
      setWrongQuestionIds(prev => prev.includes(questionId) ? prev : [...prev, questionId]);
    }
  };

  const removeWrongQuestions = (questionIds: string[]) => {
    if (questionIds.length === 0) return;
    setWrongQuestionIds(prev => prev.filter(id => !questionIds.includes(id)));
  };

  const setChapterQuestionIndex = (chapterId: string, index: number) => {
    setChapterLastIndex(prev => ({
      ...prev,
      [chapterId]: Math.max(0, index)
    }));
  };

  const saveStudentCustomQuiz = (quiz: StudentCustomQuiz) => {
    setStudentCustomQuizzes(prev => {
      const exists = prev.some(q => q.id === quiz.id);
      if (exists) {
        return prev.map(q => (q.id === quiz.id ? quiz : q));
      }
      return [quiz, ...prev];
    });
  };

  const deleteStudentCustomQuiz = (quizId: string) => {
    setStudentCustomQuizzes(prev => prev.filter(q => q.id !== quizId));
  };

  const resetQuestionStatus = (questionId: string) => {
    setSolvedQuestions(prev => {
      const copy = { ...prev };
      delete copy[questionId];
      return copy;
    });
    setWrongQuestionIds(prev => prev.filter(id => id !== questionId));
  };

  const resetQuestionsBatch = (questionIds: string[]) => {
    if (questionIds.length === 0) return;
    const idSet = new Set(questionIds);
    setSolvedQuestions(prev => {
      const copy = { ...prev };
      questionIds.forEach(id => {
        delete copy[id];
      });
      return copy;
    });
    setWrongQuestionIds(prev => prev.filter(id => !idSet.has(id)));
  };

  const resetAllQuestionStatus = () => {
    setSolvedQuestions({});
    setWrongQuestionIds([]);
    setChapterLastIndex({});
  };

  const exportStudyBackup = (): StudyBackupPayload => {
    return createStudyBackupPayload({
      accountType,
      solvedQuestions,
      savedQuestionIds,
      wrongQuestionIds,
      questionNotes,
      studentCustomQuizzes,
    });
  };

  const importStudyBackup = (rawJson: string): { valid: boolean; error?: string } => {
    const parsed = parseAndValidateStudyBackup(rawJson);
    if (!parsed.valid || !parsed.payload) {
      return { valid: false, error: parsed.error };
    }
    const { payload } = parsed;
    setSolvedQuestions(payload.solvedQuestions);
    setSavedQuestionIds(payload.savedQuestionIds);
    setWrongQuestionIds(payload.wrongQuestionIds);
    setQuestionNotes(payload.questionNotes);
    setStudentCustomQuizzes(payload.studentCustomQuizzes);
    return { valid: true };
  };

  // MedFur Question Discussions & Reports Actions
  const addQuestionComment = async (questionId: string, content: string) => {
    if (!content.trim()) return;
    const isAdm = user?.role === 'admin' || user?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();
    const authorFullName = user
      ? `${user.displayName}${user.lastName && !user.displayName.includes(user.lastName) ? ` ${user.lastName}` : ''}`
      : 'طالب طب بشري';

    const newComment: QuestionCommentItem = {
      id: `qcomm-${Date.now()}`,
      questionId,
      authorId: user?.uid || 'student-guest',
      authorName: authorFullName,
      authorRole: isAdm ? 'admin' : 'student',
      authorBatch: isAdm ? 'إشراف أكاديمي - مدفور' : (user?.batch || 'دفعة 30 - طب بشري'),
      content: content.trim(),
      createdAt: 'الآن',
      likesCount: 0,
      likedBy: []
    };

    setQuestionComments(prev => [...prev, newComment]);

    try {
      await setDoc(doc(db, 'question_comments', newComment.id), sanitizeForFirestore(newComment));
    } catch {
      // safe local fallback
    }
  };

  const updateQuestionComment = async (commentId: string, newContent: string) => {
    const trimmed = newContent.trim();
    if (!trimmed) return;
    setQuestionComments(prev =>
      prev.map(c => (c.id === commentId ? applyCommentUpdate(c, trimmed) : c))
    );
    try {
      await updateDoc(doc(db, 'question_comments', commentId), {
        content: trimmed,
        updatedAt: 'معدّل الآن',
        isEdited: true,
      });
    } catch {
      // safe local fallback
    }
  };

  const deleteQuestionComment = async (commentId: string) => {
    setQuestionComments(prev => prev.filter(c => c.id !== commentId));
    try {
      await deleteDoc(doc(db, 'question_comments', commentId));
    } catch {
      // safe local fallback
    }
  };

  const toggleLikeQuestionComment = async (commentId: string) => {
    const uid = user?.uid || 'student-guest';
    setQuestionComments(prev =>
      prev.map(c => {
        if (c.id !== commentId) return c;
        const alreadyLiked = c.likedBy.includes(uid);
        const nextLikedBy = alreadyLiked
          ? c.likedBy.filter(id => id !== uid)
          : [...c.likedBy, uid];
        const nextLikes = Math.max(0, alreadyLiked ? c.likesCount - 1 : c.likesCount + 1);
        return {
          ...c,
          likedBy: nextLikedBy,
          likesCount: nextLikes
        };
      })
    );
  };

  const submitQuestionReport = async (reportData: {
    questionId: string;
    issueType: QuestionReportIssueType;
    description: string;
  }) => {
    const targetQ = questions.find(q => q.id === reportData.questionId);
    const targetSub = subjects.find(s => s.id === targetQ?.subjectId);
    const reporterFullName = user
      ? `${user.displayName}${user.lastName && !user.displayName.includes(user.lastName) ? ` ${user.lastName}` : ''}`
      : 'طالب طب بشري';

    const newReport: QuestionReportItem = sanitizeForFirestore({
      id: `qrep-${Date.now()}`,
      questionId: reportData.questionId,
      subjectId: targetQ?.subjectId || '',
      subjectName: targetSub?.name || 'مقرر طبي',
      ...(targetQ?.chapterId ? { chapterId: targetQ.chapterId } : {}),
      chapterName: targetQ?.chapterName || 'قسم الأتمتة',
      questionTextSnapshot: targetQ?.questionText || 'سؤال أتمتة',
      reporterId: user?.uid || 'student-guest',
      reporterName: reporterFullName,
      reporterExamNumber: user?.examNumber || user?.studentId || 'غير محدد',
      issueType: reportData.issueType,
      description: reportData.description.trim(),
      status: 'pending',
      createdAt: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }) + ' - اليوم'
    });

    setQuestionReports(prev => [newReport, ...prev]);

    try {
      await setDoc(doc(db, 'question_reports', newReport.id), sanitizeForFirestore(newReport));
    } catch {
      // safe local fallback
    }
  };

  const resolveQuestionReport = async (
    reportId: string,
    status: 'resolved' | 'dismissed',
    resolutionNote?: string
  ) => {
    const resolverName = user
      ? `${user.displayName}${user.lastName && !user.displayName.includes(user.lastName) ? ` ${user.lastName}` : ''}`
      : 'مشرف أكاديمي';

    setQuestionReports(prev =>
      prev.map(r => {
        if (r.id !== reportId) return r;
        return {
          ...r,
          status,
          resolutionNote:
            resolutionNote?.trim() ||
            (status === 'resolved'
              ? 'تم تدقيق السؤال وتصحيح الملاحظة العلمية بنجاح.'
              : 'تمت مراجعة السؤال من اللجنة العلمية وتأكيد صحة الصياغة ومفتاح الحل.'),
          resolvedBy: resolverName,
          resolvedAt: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }) + ' - اليوم'
        };
      })
    );

    try {
      await updateDoc(doc(db, 'question_reports', reportId), {
        status,
        resolutionNote:
          resolutionNote?.trim() ||
          (status === 'resolved'
            ? 'تم تدقيق السؤال وتصحيح الملاحظة العلمية بنجاح.'
            : 'تمت مراجعة السؤال من اللجنة العلمية وتأكيد صحة الصياغة ومفتاح الحل.'),
        resolvedBy: resolverName,
        resolvedAt: new Date().toISOString()
      });
    } catch {
      // safe local fallback
    }
  };

  const deleteQuestionReport = async (reportId: string) => {
    setQuestionReports(prev => prev.filter(r => r.id !== reportId));
    try {
      await deleteDoc(doc(db, 'question_reports', reportId));
    } catch {
      // safe local fallback
    }
  };

  return (
    <AppContext.Provider
      value={{
        user,
        isAdmin,
        isGuest,
        accountType,
        canToggleRole,
        isAuthModalOpen,
        setIsAuthModalOpen,
        darkMode,
        setDarkMode,
        toggleDarkMode,
        darkModeSchedule,
        setDarkModeSchedule,
        colorTheme,
        setColorTheme,
        activeSection,
        setActiveSection,
        activeYear,
        setActiveYear,
        activeSemester,
        setActiveSemester,
        selectedSubjectId,
        setSelectedSubjectId,
        selectedChapterId,
        setSelectedChapterId,
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
        notifications,
        readNotificationIds,
        unreadNotificationsCount,
        activeToastNotification,
        dismissToastNotification,
        markNotificationAsRead,
        markAllNotificationsAsRead,
        subjects,
        questions,
        libraryFolders,
        libraryFiles,
        marketplaceItems,
        announcements,
        discussions,
        directMessages,
        quickSwitchPersona,
        switchAccount,
        loginWithGoogle,
        loginWithEmail,
        signOut,
        updateUserProfile,
        addSubject,
        updateSubject,
        deleteSubject,
        addChapterToSubject,
        renameChapterInSubject,
        deleteChapterFromSubject,
        addQuestion,
        addQuestionsBatch,
        updateQuestion,
        deleteQuestion,
        addLibraryFolder,
        updateLibraryFolder,
        renameLibraryFolder,
        deleteLibraryFolder,
        moveLibraryFolder,
        addLibraryFile,
        updateLibraryFile,
        deleteLibraryFile,
        moveLibraryFile,
        togglePinLibraryFile,
        addMarketplaceItem,
        updateMarketplaceItem,
        updateMarketplaceItemStatus,
        deleteMarketplaceItem,
        // Videos & Video Folders
        videoFolders,
        addVideoFolder,
        renameVideoFolder,
        deleteVideoFolder,
        videos,
        addVideo,
        updateVideo,
        deleteVideo,
        moveVideo,
        togglePinVideo,
        purgeAllDemoData,
        addAnnouncement,
        updateAnnouncement,
        deleteAnnouncement,
        addDiscussionPost,
        addDiscussionComment,
        deleteDiscussionPost,
        activeChatPartner,
        setActiveChatPartner,
        isChatOpen,
        setIsChatOpen,
        openDirectChatWithUser,
        sendDirectMessage,
        // Telegram-like Community & Channels
        channels,
        activeChannelId,
        setActiveChannelId,
        communityMessages,
        joinRequests,
        blockedUsers,
        toggleBlockUser,
        sendCommunityMessage,
        votePoll,
        answerMCQInChat,
        requestChannelAccess,
        approveJoinRequest,
        toggleChannelRestriction,
        createChannel,
        updateUserExamNumber,
        // Grades & Leaderboard System
        grades,
        leaderboard,
        gradeAppeals,
        savePreparatoryGrade,
        savePreparatoryGradesBatch,
        updateStudentGrade,
        submitGradeAppeal,
        resolveGradeAppeal,
        addAppealMessage,
        adminUpdateStudentGrades,
        // Enhanced Automation Bank
        savedQuestionIds,
        toggleSaveQuestion,
        questionNotes,
        saveQuestionNote,
        deleteQuestionNote,
        wrongQuestionIds,
        removeWrongQuestions,
        solvedQuestions,
        recordQuestionAnswer,
        resetQuestionStatus,
        resetQuestionsBatch,
        resetAllQuestionStatus,
        chapterLastIndex,
        setChapterQuestionIndex,
        studentCustomQuizzes,
        saveStudentCustomQuiz,
        deleteStudentCustomQuiz,
        questionComments,
        addQuestionComment,
        updateQuestionComment,
        deleteQuestionComment,
        toggleLikeQuestionComment,
        questionReports,
        submitQuestionReport,
        resolveQuestionReport,
        deleteQuestionReport,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};

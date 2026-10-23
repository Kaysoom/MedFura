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
  QuestionReportIssueType
} from '../types';
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
  isAuthModalOpen: boolean;
  setIsAuthModalOpen: (open: boolean) => void;
  darkMode: boolean;
  setDarkMode: (val: boolean | ((prev: boolean) => boolean)) => void;
  toggleDarkMode: () => void;
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

  // Collections
  subjects: SubjectItem[];
  questions: QuestionItem[];
  libraryFolders: LibraryFolderItem[];
  libraryFiles: LibraryFileItem[];
  marketplaceItems: MarketplaceItem[];
  announcements: AnnouncementItem[];
  discussions: DiscussionPost[];
  directMessages: DirectMessage[];

  // Persona
  quickSwitchPersona: (role: 'admin' | 'student') => void;

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
  addLibraryFolder: (folder: { name: string; parentId: string | null }) => Promise<void>;
  renameLibraryFolder: (folderId: string, newName: string) => Promise<void>;
  deleteLibraryFolder: (folderId: string) => Promise<void>;
  addLibraryFile: (item: Omit<LibraryFileItem, 'id'>) => Promise<void>;
  updateLibraryFile: (id: string, updates: Partial<LibraryFileItem>) => Promise<void>;
  deleteLibraryFile: (id: string) => Promise<void>;

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
  addVideo: (video: Omit<VideoItem, 'id' | 'viewsCount'>) => Promise<void>;
  updateVideo: (id: string, updates: Partial<VideoItem>) => Promise<void>;
  deleteVideo: (id: string) => Promise<void>;

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

  // Question Discussions & Reports (MedFur Advanced Module)
  questionComments: QuestionCommentItem[];
  addQuestionComment: (questionId: string, content: string) => Promise<void>;
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
  // Dark mode by default is true for the dark academic theme unless explicitly set to light
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('uniportal_theme');
    if (saved) return saved === 'dark';
    return true;
  });

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  useEffect(() => {
    // If no manual preference in localStorage, sync with system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => {
      const saved = localStorage.getItem('uniportal_theme');
      if (!saved) {
        setDarkMode(e.matches);
      }
    };
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  const toggleDarkMode = () => {
    setDarkMode(prev => {
      const next = !prev;
      localStorage.setItem('uniportal_theme', next ? 'dark' : 'light');
      return next;
    });
  };

  // Default User: Dr. Mohammed Al-Kaysoum (matching Screenshot 1: د. محمد)
  const [user, setUser] = useState<UserProfile | null>(() =>
    safeLoadStorage<UserProfile | null>('uniportal_user_v3', {
      uid: 'admin-uid-99',
      email: ADMIN_EMAIL,
      displayName: 'د. محمد',
      lastName: 'الكيصوم',
      studentId: 'ADMIN-001',
      examNumber: 'ADMIN-01',
      academicYear: 'السنة الثالثة',
      yearBadge: '0',
      batch: 'إشراف أكاديمي',
      role: 'admin',
      blockedUsers: [],
      createdAt: new Date().toISOString()
    })
  );

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Navigation
  const [activeSection, setActiveSection] = useState<ActiveSection>('home');
  const [activeYear, setActiveYear] = useState<AcademicYearId>('year-3'); // default year 3 matching screenshot
  const [activeSemester, setActiveSemester] = useState<SemesterType>('first');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);
  const [selectedChapterId, setSelectedChapterId] = useState<string | null>(null);

  // Study & Eye Comfort Preferences
  const [eyeComfortMode, setEyeComfortMode] = useState<boolean>(() => {
    return localStorage.getItem('uniportal_eye_comfort') === 'true';
  });
  const [questionFontScale, setQuestionFontScaleState] = useState<'normal' | 'large' | 'xlarge'>(() => {
    const saved = localStorage.getItem('uniportal_font_scale');
    if (saved === 'large' || saved === 'xlarge') return saved;
    return 'normal';
  });

  useEffect(() => {
    if (eyeComfortMode) {
      document.documentElement.classList.add('eye-comfort');
    } else {
      document.documentElement.classList.remove('eye-comfort');
    }
  }, [eyeComfortMode]);

  const toggleEyeComfortMode = () => {
    setEyeComfortMode(prev => {
      const next = !prev;
      localStorage.setItem('uniportal_eye_comfort', String(next));
      return next;
    });
  };

  const setQuestionFontScale = (scale: 'normal' | 'large' | 'xlarge') => {
    setQuestionFontScaleState(scale);
    localStorage.setItem('uniportal_font_scale', scale);
  };

  // Collections state
  const [subjects, setSubjects] = useState<SubjectItem[]>(() =>
    safeLoadStorage('uniportal_subjects_v6', INITIAL_SUBJECTS)
  );

  const [questions, setQuestions] = useState<QuestionItem[]>(() =>
    safeLoadStorage('uniportal_questions_v6', INITIAL_QUESTIONS)
  );

  const [libraryFolders, setLibraryFolders] = useState<LibraryFolderItem[]>(() =>
    safeLoadStorage('uniportal_folders_v3', INITIAL_LIBRARY_FOLDERS)
  );

  const [libraryFiles, setLibraryFiles] = useState<LibraryFileItem[]>(() =>
    safeLoadStorage('uniportal_libfiles_v3', INITIAL_LIBRARY_FILES)
  );

  const [marketplaceItems, setMarketplaceItems] = useState<MarketplaceItem[]>(() =>
    safeLoadStorage('uniportal_market_v3', INITIAL_MARKETPLACE)
  );

  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>(() =>
    safeLoadStorage('uniportal_announcements_v3', INITIAL_ANNOUNCEMENTS)
  );

  // Video Folders Tree (matching Library Folders)
  const [videoFolders, setVideoFolders] = useState<VideoFolderItem[]>(() =>
    safeLoadStorage('uniportal_videofolders_v4', INITIAL_VIDEO_FOLDERS)
  );

  // Videos (clean reset - no mock data)
  const [videos, setVideos] = useState<VideoItem[]>(() =>
    safeLoadStorage('uniportal_videos_v5', INITIAL_VIDEOS)
  );

  const [discussions, setDiscussions] = useState<DiscussionPost[]>(() =>
    safeLoadStorage('uniportal_discussions_v3', [])
  );

  const [directMessages, setDirectMessages] = useState<DirectMessage[]>(() =>
    safeLoadStorage('uniportal_direct_msgs_v3', [])
  );

  // Telegram-like Community Channels & Messages (clean reset - includes supervisors channel)
  const [channels, setChannels] = useState<ChannelInfo[]>(() =>
    safeLoadStorage('uniportal_channels_v4', INITIAL_CHANNELS)
  );
  const [activeChannelId, setActiveChannelId] = useState<string>('general');
  const [communityMessages, setCommunityMessages] = useState<import('../types').CommunityMessage[]>(() =>
    safeLoadStorage('uniportal_comm_msgs_v4', INITIAL_COMMUNITY_MESSAGES)
  );
  const [joinRequests, setJoinRequests] = useState<import('../types').ChannelJoinRequest[]>(() =>
    safeLoadStorage('uniportal_join_reqs_v3', [])
  );
  const [blockedUsers, setBlockedUsers] = useState<string[]>(() =>
    safeLoadStorage('uniportal_blocked_v3', [])
  );

  // Grades & Leaderboard System (Percentage only)
  const [grades, setGrades] = useState<GradeItem[]>(() =>
    safeLoadStorage('uniportal_grades_v5', INITIAL_GRADES)
  );
  const [leaderboard, setLeaderboard] = useState<StudentLeaderboardEntry[]>(() =>
    safeLoadStorage('uniportal_leaderboard_v5', INITIAL_LEADERBOARD)
  );
  const [gradeAppeals, setGradeAppeals] = useState<GradeAppealTicket[]>(() =>
    safeLoadStorage('uniportal_appeals_v5', INITIAL_GRADE_APPEALS)
  );

  // Enhanced Automation Bank State
  const [savedQuestionIds, setSavedQuestionIds] = useState<string[]>(() =>
    safeLoadStorage('uniportal_saved_qids', [])
  );
  const [questionNotes, setQuestionNotes] = useState<Record<string, string>>(() =>
    safeLoadStorage('uniportal_q_notes', {})
  );
  const [wrongQuestionIds, setWrongQuestionIds] = useState<string[]>(() =>
    safeLoadStorage('uniportal_wrong_qids', [])
  );
  const [solvedQuestions, setSolvedQuestions] = useState<Record<string, { chosenOption: number; isCorrect: boolean }>>(() =>
    safeLoadStorage('uniportal_solved_qs', {})
  );
  const [chapterLastIndex, setChapterLastIndex] = useState<Record<string, number>>(() =>
    safeLoadStorage('uniportal_chapter_last_idx', {})
  );

  // MedFur Question Discussions & Reports State
  const [questionComments, setQuestionComments] = useState<QuestionCommentItem[]>(() =>
    safeLoadStorage('medfur_q_comments_v1', INITIAL_QUESTION_COMMENTS)
  );

  const [questionReports, setQuestionReports] = useState<QuestionReportItem[]>(() =>
    safeLoadStorage('medfur_q_reports_v1', INITIAL_QUESTION_REPORTS)
  );

  // Direct Peer-to-Peer Chat
  const [activeChatPartner, setActiveChatPartner] = useState<{ uid: string; displayName: string; email?: string } | null>(null);
  const [isChatOpen, setIsChatOpen] = useState<boolean>(false);

  // Sync to local storage
  useEffect(() => {
    localStorage.setItem('uniportal_subjects_v6', JSON.stringify(subjects));
  }, [subjects]);

  useEffect(() => {
    localStorage.setItem('uniportal_questions_v6', JSON.stringify(questions));
  }, [questions]);

  useEffect(() => {
    localStorage.setItem('uniportal_folders_v3', JSON.stringify(libraryFolders));
  }, [libraryFolders]);

  useEffect(() => {
    localStorage.setItem('uniportal_libfiles_v3', JSON.stringify(libraryFiles));
  }, [libraryFiles]);

  useEffect(() => {
    localStorage.setItem('uniportal_market_v3', JSON.stringify(marketplaceItems));
  }, [marketplaceItems]);

  useEffect(() => {
    localStorage.setItem('uniportal_announcements_v3', JSON.stringify(announcements));
  }, [announcements]);

  useEffect(() => {
    localStorage.setItem('uniportal_discussions_v3', JSON.stringify(discussions));
  }, [discussions]);

  useEffect(() => {
    localStorage.setItem('uniportal_direct_msgs_v3', JSON.stringify(directMessages));
  }, [directMessages]);

  useEffect(() => {
    localStorage.setItem('uniportal_videofolders_v4', JSON.stringify(videoFolders));
  }, [videoFolders]);

  useEffect(() => {
    localStorage.setItem('uniportal_videos_v5', JSON.stringify(videos));
  }, [videos]);

  useEffect(() => {
    localStorage.setItem('uniportal_channels_v4', JSON.stringify(channels));
  }, [channels]);

  useEffect(() => {
    localStorage.setItem('uniportal_comm_msgs_v4', JSON.stringify(communityMessages));
  }, [communityMessages]);

  useEffect(() => {
    localStorage.setItem('uniportal_join_reqs_v3', JSON.stringify(joinRequests));
  }, [joinRequests]);

  useEffect(() => {
    localStorage.setItem('uniportal_blocked_v3', JSON.stringify(blockedUsers));
  }, [blockedUsers]);

  useEffect(() => {
    localStorage.setItem('uniportal_saved_qids', JSON.stringify(savedQuestionIds));
  }, [savedQuestionIds]);

  useEffect(() => {
    localStorage.setItem('uniportal_q_notes', JSON.stringify(questionNotes));
  }, [questionNotes]);

  useEffect(() => {
    localStorage.setItem('uniportal_wrong_qids', JSON.stringify(wrongQuestionIds));
  }, [wrongQuestionIds]);

  useEffect(() => {
    localStorage.setItem('uniportal_solved_qs', JSON.stringify(solvedQuestions));
  }, [solvedQuestions]);

  useEffect(() => {
    localStorage.setItem('uniportal_chapter_last_idx', JSON.stringify(chapterLastIndex));
  }, [chapterLastIndex]);

  useEffect(() => {
    localStorage.setItem('uniportal_grades_v5', JSON.stringify(grades));
  }, [grades]);

  useEffect(() => {
    localStorage.setItem('uniportal_leaderboard_v5', JSON.stringify(leaderboard));
  }, [leaderboard]);

  useEffect(() => {
    localStorage.setItem('uniportal_appeals_v5', JSON.stringify(gradeAppeals));
  }, [gradeAppeals]);

  useEffect(() => {
    localStorage.setItem('medfur_q_comments_v1', JSON.stringify(questionComments));
  }, [questionComments]);

  useEffect(() => {
    localStorage.setItem('medfur_q_reports_v1', JSON.stringify(questionReports));
  }, [questionReports]);

  const isAdmin = user?.role === 'admin' || user?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();

  const quickSwitchPersona = (role: 'admin' | 'student') => {
    if (role === 'admin') {
      const adminProfile: UserProfile = {
        uid: 'admin-uid-99',
        email: ADMIN_EMAIL,
        displayName: 'د. محمد',
        lastName: 'الكيصوم',
        studentId: 'ADMIN-001',
        examNumber: 'ADMIN-01',
        academicYear: 'السنة الثالثة',
        yearBadge: '0',
        batch: 'إشراف أكاديمي',
        role: 'admin',
        blockedUsers: [],
        createdAt: new Date().toISOString()
      };
      setUser(adminProfile);
      localStorage.setItem('uniportal_user_v3', JSON.stringify(adminProfile));
    } else {
      const studentProfile: UserProfile = {
        uid: 'student-uid-12',
        email: 'student.med@univ.edu',
        displayName: 'أحمد',
        lastName: 'الكيصوم',
        studentId: '2024-10492',
        examNumber: '30421',
        academicYear: 'السنة الثالثة',
        yearBadge: '3',
        batch: 'دفعة 30',
        role: 'student',
        blockedUsers: [],
        createdAt: new Date().toISOString()
      };
      setUser(studentProfile);
      localStorage.setItem('uniportal_user_v3', JSON.stringify(studentProfile));
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
        createdAt: new Date().toISOString(),
      };
      setUser(profile);
      localStorage.setItem('uniportal_user_v3', JSON.stringify(profile));
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
    setUser(null);
    localStorage.removeItem('uniportal_user_v3');
  };

  const updateUserProfile = (profileUpdates: Partial<UserProfile>) => {
    if (!user) return;
    const updated = { ...user, ...profileUpdates };
    setUser(updated);
    localStorage.setItem('uniportal_user_v3', JSON.stringify(updated));
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
  const addLibraryFolder = async (folder: { name: string; parentId: string | null }) => {
    const newFld: LibraryFolderItem = {
      id: `fld-${Date.now()}`,
      name: folder.name.trim(),
      parentId: folder.parentId,
      type: 'folder'
    };
    setLibraryFolders(prev => [...prev, newFld]);
  };

  const renameLibraryFolder = async (folderId: string, newName: string) => {
    setLibraryFolders(prev => prev.map(f => f.id === folderId ? { ...f, name: newName.trim() } : f));
  };

  const deleteLibraryFolder = async (folderId: string) => {
    // Delete folder and all its child folders/files
    setLibraryFolders(prev => prev.filter(f => f.id !== folderId && f.parentId !== folderId));
    setLibraryFiles(prev => prev.filter(f => f.folderId !== folderId));
  };

  const addLibraryFile = async (item: Omit<LibraryFileItem, 'id'>) => {
    const newFile: LibraryFileItem = {
      ...item,
      id: `lib-${Date.now()}`,
      downloadsCount: 0,
      date: new Date().toISOString().split('T')[0]
    };
    setLibraryFiles(prev => [newFile, ...prev]);
  };

  const updateLibraryFile = async (id: string, updates: Partial<LibraryFileItem>) => {
    setLibraryFiles(prev => prev.map(f => f.id === id ? { ...f, ...updates } : f));
  };

  const deleteLibraryFile = async (id: string) => {
    setLibraryFiles(prev => prev.filter(f => f.id !== id));
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

  const addVideo = async (video: Omit<VideoItem, 'id' | 'viewsCount'>) => {
    const newVid: VideoItem = {
      ...video,
      id: `vid-${Date.now()}`,
      viewsCount: 1,
      uploadedAt: 'الآن'
    };
    setVideos(prev => [newVid, ...prev]);
  };

  const updateVideo = async (id: string, updates: Partial<VideoItem>) => {
    setVideos(prev => prev.map(v => v.id === id ? { ...v, ...updates } : v));
  };

  const deleteVideo = async (id: string) => {
    setVideos(prev => prev.filter(v => v.id !== id));
  };

  // Discussions
  const addDiscussionPost = async (post: { title: string; content: string; academicYear: string }) => {
    if (!user) {
      setIsAuthModalOpen(true);
      return;
    }
    const newPost: DiscussionPost = {
      id: `disc-${Date.now()}`,
      authorId: user.uid,
      authorName: user.displayName,
      authorRole: user.role,
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
    if (!user) {
      setIsAuthModalOpen(true);
      return;
    }
    const newComment: DiscussionComment = {
      id: `c-${Date.now()}`,
      authorId: user.uid,
      authorName: user.displayName,
      authorRole: user.role,
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
        isAuthModalOpen,
        setIsAuthModalOpen,
        darkMode,
        setDarkMode,
        toggleDarkMode,
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
        subjects,
        questions,
        libraryFolders,
        libraryFiles,
        marketplaceItems,
        announcements,
        discussions,
        directMessages,
        quickSwitchPersona,
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
        renameLibraryFolder,
        deleteLibraryFolder,
        addLibraryFile,
        updateLibraryFile,
        deleteLibraryFile,
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
        questionComments,
        addQuestionComment,
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
